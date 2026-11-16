#!/usr/bin/env python3
"""Read-only, explicit-DayID delivery audit. No build, sync, receipt or release actions."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd0OVYW0cuObc1FCSQy55eSm6UNFcPTX_R9QROBtXrEF84fXw/viewform?usp=pp_url&entry.1954781253='
COURSES = {'3': 'Tech', '2': 'CS', '1': 'AAVTC'}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def check(condition, message):
    if not condition:
        raise ValueError(message)

def normalize(value):
    return ' '.join(value.split())

def selected(value):
    match = re.fullmatch(r'(?:(Tech|CS|AAVTC)/)?([123]\d{6})(?:\.html)?', value)
    check(match, 'Selection must be an explicit seven-digit DayID or Course/DayID')
    course = COURSES[match[2][0]]
    check(not match[1] or match[1] == course, 'Selected course disagrees with DayID')
    return course, match[2], course + '/' + match[2] + '.html'

def configuration(doc, require_json=True):
    scripts = [tag.string or '' for tag in doc.find_all('script')]
    matches = [text for text in scripts if 'const WAYFINDER_CONFIG=' in text]
    check(len(matches) == 1, 'Expected exactly one shared engine/configuration')
    script = matches[0]
    match = re.search(r'const WAYFINDER_CONFIG=(.*?);', script)
    check(match, 'Missing shared configuration')
    cfg = json.loads(re.sub(r'window\.__WF_MEDIA\["[^"]+"\]', 'null', match[1])) if require_json else {}
    return cfg, script[:match.start(1)] + '{}' + script[match.end(1):]

def master_checks(data):
    doc = BeautifulSoup(data.decode('utf-8'), 'html.parser')
    _, engine = configuration(doc)
    master = BeautifulSoup((ROOT / 'templates/wayfinder-master.html').read_text(), 'html.parser')
    _, master_engine = configuration(master, require_json=False)
    findings = []
    if engine != master_engine:
        findings.append('Shared engine differs from current master')
    if not doc.find('style') or doc.find('style').string != master.find('style').string:
        findings.append('Master CSS differs')
    check(not findings, '; '.join(findings) + '; no normalization/automatic repair permitted')
    return {'engineSha256': sha(engine.encode()), 'cssSha256': sha(doc.find('style').string.encode())}

def content_checks(data, entry):
    """Same source/target/TEKS/pin/engine/ID checks as existing production QA.

    This first adapter audits the native Tech single-daily format used by the pilot.
    Unsupported source formats fail explicitly; they never disappear from a batch.
    M1/M2 remain the build gates, not inferred approvals for these legacy guides.
    """
    raw = entry['source']['text']
    identity = entry['identity']
    did = identity['dayid']
    check(identity['course'] == 'Tech', 'Unsupported native content adapter: course')
    doc = BeautifulSoup(data.decode('utf-8'), 'html.parser')
    cfg, _ = configuration(doc)
    check(doc.title and doc.title.string == 'RTF Learning Guide', 'Browser title differs')
    check(cfg['mode'] == entry['mode'] and entry['mode'] in ['STARTER', 'LEARN', 'PERFORM', 'ASSESSMENT'], 'Mode differs')
    heading = re.search(r'^DAY (\d+) \| DAYID (\d{7}) \| ([A-Z]+) \| (.+)$', raw, re.M)
    check(heading and heading[2] == did and heading[3] == cfg['mode'] and heading[4] == identity['title'], 'Source heading differs')
    check(doc.h1 and doc.h1.get_text(' ', strip=True) == identity['title'], 'Visible title differs from source')
    ids = [tag['id'] for tag in doc.select('[id]')]
    check(len(ids) == len(set(ids)), 'Duplicate HTML IDs')
    visible = doc.get_text(' ', strip=True)
    check(not re.search(r'\b\d{12}\b', visible), 'Hidden evidence key exposed in visible text')
    target = re.search(r'^LEARNING TARGET: (.+)$', raw, re.M)
    teks = re.search(r'Priority TEKS — In Our Words\n((?:§[^\n]+\n)+)', raw)
    check(target and teks, 'Missing native target/priority TEKS')
    for slot, expected in [('learning-target', target[1]), ('priority-teks', normalize(teks[1]))]:
        tag = doc.select_one('[data-slot="' + slot + '"]')
        check(tag and normalize(tag.get_text(' ', strip=True)) == normalize(expected), slot + ' differs from source')
    records = list(re.finditer(r'DAILY MASTERY STUDENT QUESTION — FULL KEY (\d{12}): ([^\n]+)\nPINNED HOLISTIC RUBRIC: ([^\n]+)', raw))
    check(len(records) == 1, 'Unsupported or missing native single-daily question structure')
    key, prompt, rubric = records[0].groups()
    pins = [row for row in entry['collector'] if str(row[0]) == key]
    check(len(pins) == 1 and pins[0][1:3] == [prompt, rubric], 'Native prompt/rubric differs from live Collector snapshot')
    prompt_tag = doc.select_one('[data-slot="mastery-q1"]')
    check(prompt_tag and normalize(prompt_tag.get_text(' ', strip=True)) == normalize(prompt), 'Visible question differs from native prompt')
    expected = {did + '29999', did + '20000', did + '09998', key}
    urls = list(cfg['destinations'].values())
    check(set(urls) == {FORM + k for k in expected} and len(urls) == len(expected), 'Missing/duplicate/incorrect Form destination')
    check(doc.select_one('[data-slot="q1-help"]'), 'Missing question help')
    check(len(doc.select('[data-assembler="one"] textarea')) == 1, 'Native single-response field differs')
    check(len(doc.select('.gate-check')) == 4, 'Missing completion checks')
    check(len(doc.select('.perform-step')) >= 4, 'Missing Perform scaffold')
    check(len(doc.select('.lab-grid .lab')) == 3 and len(doc.select('#studioEvidence')) == 1, 'Studio structure differs')
    check(not doc.select('template'), 'Unused template remains')
    return {'mode': cfg['mode'], 'questionKeys': [key], 'sourceRevision': entry['source']['revision'],
            'sourceSha256': sha(raw.encode()), 'scope': 'Existing native source delivery fidelity; no new curriculum approval'}

def node_checks(file, local_path, entry):
    # Reuse the existing validators without changing their thresholds or source contracts.
    code = """
const fs=require('fs'),x=JSON.parse(fs.readFileSync(0,'utf8'));
const html=fs.readFileSync(x.localPath), result={};
const identity=require('./.github/guide-identity-qa.cjs');
result.identity=identity.validate(x.file,html.toString('utf8'));
try {require('./scripts/wayfinder-identity.cjs').preflight(x.entry.identity,x.entry.identitySources,x.entry.source.text);}
catch(e){result.identity.push(e.message);}
result.offline=require('./scripts/check-offline-html.cjs').inspect(html);
process.stdout.write(JSON.stringify(result));
"""
    run = subprocess.run(['node', '-e', code], cwd=ROOT, input=json.dumps({'file': file, 'localPath': str(local_path), 'entry': entry}), text=True, capture_output=True)
    check(run.returncode == 0, 'Existing validator execution failed: ' + run.stderr[-1500:])
    return json.loads(run.stdout)

def mapping_checks(entry):
    before, after = entry['before'], entry['after']
    identity = entry['identity']
    did = identity['dayid']
    course = identity['course']
    for name in ['drive', 'control', 'library', 'downloadFormula', 'visibilityFormula']:
        check(before[name] == after[name], 'Production state changed: ' + name)
    drive, control, library = after['drive'], after['control'], after['library']
    check(control['dayid'] == library['dayid'] == did, 'Mapping DayID mismatch')
    check(isinstance(control['show'], bool), 'Show state missing/nonboolean')
    check(library['driveId'] == drive['id'] and bool(drive['id']), 'Existing Drive ID mismatch')
    check(entry['expectedFolder'] in drive['parents'], 'Drive folder mismatch')
    check(drive['mimeType'] == 'text/html', 'Drive file MIME differs')
    expected_name = rf'.*Unit\s+0?{identity["unit"]}\s+Part\s+0?{identity["part"]}\s+Day\s+0?{identity["day"]}.*\.html'
    check(re.fullmatch(expected_name, drive['name'], re.I), 'Drive readable filename identity differs')
    check(control['preview'] == f'https://rtf-studios.github.io/wayfinder-preview/{course}/{did}.html', 'Teacher preview destination differs')
    check(identity['title'] in control['title'], 'Control Station title differs')
    check(re.search(rf'Unit\s+{identity["unit"]}\b.*Part\s+{identity["part"]}\b', control['section']), 'Control Station section differs')
    check('https://drive.google.com/uc?export=download&id=' in after['downloadFormula'] and 'VLOOKUP' in after['downloadFormula'] and "'File Links'!A:B" in after['downloadFormula'], 'Student download formula is not Drive ID lookup')
    check('INDEX(raw,0,1)=TRUE' in after['visibilityFormula'] and 'Tech!C2:H' in after['visibilityFormula'], 'Visibility filter source differs; inspect current headers/formula')
    return {'driveId': drive['id'], 'show': control['show'], 'preview': control['preview'],
            'download': 'https://drive.google.com/uc?export=download&id=' + drive['id'],
            'scope': 'Authenticated metadata/mapping/formula readback; hidden guides not released or clicked as students'}

def audit(dayids, evidence, root=ROOT, drive_root=None):
    check(isinstance(dayids, list) and len(dayids) > 0, 'Explicit nonempty DayID list required; no default inventory')
    root = Path(root).resolve()
    drive_root = Path(drive_root).resolve() if drive_root else None
    results, seen = [], set()
    for value in dayids:
        result = {'selection': value, 'status': 'FAIL', 'checks': {}}
        results.append(result)  # Register before parsing/reading: missing guides still receive a result.
        try:
            course, did, file = selected(value)
            result.update(dayid=did, path=file)
            check(did not in seen, 'Duplicate selected DayID')
            seen.add(did)
            entry = evidence['entries'].get(did)
            check(entry, 'Missing selected guide audit evidence')
            check(entry['identity']['dayid'] == did and entry['identity']['course'] == course, 'Evidence identity differs from selection')
            local = root / file
            data = local.read_bytes()
            result.update(bytes=len(data), githubSha256=sha(data))
            checks = result['checks']
            def record(name, action):
                try:
                    detail = action()
                    checks[name] = {'status': 'PASS', 'detail': detail}
                except Exception as error:
                    checks[name] = {'status': 'FAIL', 'finding': str(error)}
            def github_binding():
                check(entry['github']['commit'], 'Missing GitHub source commit')
                blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
                check(blob == entry['github']['blobSha'], 'Read bytes do not match selected GitHub blob')
                return {'commit': entry['github']['commit'], 'blobSha': blob}
            record('githubReadback', github_binding)
            try:
                native = node_checks(file, local, entry)
                for name in ['identity', 'offline']:
                    checks[name] = {'status': 'FAIL' if native[name] else 'PASS', 'findings': native[name]}
            except Exception as error:
                for name in ['identity', 'offline']:
                    checks[name] = {'status': 'FAIL', 'finding': str(error)}
            record('content', lambda: content_checks(data, entry))
            record('masterVersion', lambda: master_checks(data))
            def size():
                check(len(data) <= 2 * 1024 * 1024, 'HTML exceeds 2 MiB')
                return {'bytes': len(data), 'maximumBytes': 2 * 1024 * 1024}
            record('fileSize', size)
            def parity():
                check(drive_root, 'Downloaded Drive bytes required; hash assertion alone is insufficient')
                other = (drive_root / (did + '.html')).read_bytes()
                result['driveBytes'], result['driveSha256'] = len(other), sha(other)
                check(len(other) == entry['after']['drive']['size'], 'Drive readback size differs from metadata')
                check(data == other and sha(data) == sha(other), 'GitHub/JISD bytes or hashes differ')
                return {'bytesEqual': True, 'sha256Equal': True}
            record('byteParity', parity)
            record('mappingsAndPreservation', lambda: mapping_checks(entry))
            required = ['githubReadback', 'identity', 'offline', 'content', 'masterVersion', 'fileSize', 'byteParity', 'mappingsAndPreservation']
            check(all(name in checks for name in required), 'Selected guide check skipped')
            result['status'] = 'PASS' if all(checks[name]['status'] == 'PASS' for name in required) else 'FAIL'
        except Exception as error:
            result['finding'] = str(error)
    check(len(results) == len(dayids), 'Selected guide result missing')
    return {'status': 'PASS' if all(r['status'] == 'PASS' for r in results) else 'FAIL',
            'scope': 'Read-only batch delivery audit; not publication/student readiness or release',
            'selected': dayids, 'selectedCount': len(dayids), 'resultCount': len(results), 'results': results,
            'untested': ['Real school-browser permissions', 'Actual Collector receipts', 'Student-account download access',
                         'New M1 structured-source/M2 curriculum-review acceptance of these existing legacy guides'],
            'productionWrites': 0, 'studentRelease': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--drive-root', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('dayids', nargs='+', help='Explicit DayIDs; never inferred from evidence or changed files')
    args = parser.parse_args()
    try:
        report = audit(args.dayids, json.loads(args.evidence.read_text()), args.root, args.drive_root)
    except Exception as error:
        report = {'status': 'FAIL', 'finding': str(error)}
    print(json.dumps(report, indent=2))
    return 0 if report['status'] == 'PASS' else 1

if __name__ == '__main__':
    sys.exit(main())
