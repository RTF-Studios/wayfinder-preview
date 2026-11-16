#!/usr/bin/env python3
"""Read-only, explicit-DayID delivery audit. No build, sync, receipt or release actions."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup, Comment

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
    match = re.search(r'const WAYFINDER_CONFIG=([^\n]*);', script)
    check(match, 'Missing shared configuration')
    cfg = json.loads(re.sub(r'window\.__WF_MEDIA\["[^"]+"\]', 'null', match[1])) if require_json else {}
    return cfg, script[:match.start(1)] + '{}' + script[match.end(1):]

def baseline_profiles():
    # Repository-controlled evidence, never an allowlist supplied by the caller.
    return json.loads((ROOT / 'scripts/fixtures/m4-delivery/template-baselines.json').read_text())

def master_checks(data, entry):
    doc = BeautifulSoup(data.decode('utf-8'), 'html.parser')
    _, engine = configuration(doc)
    master = BeautifulSoup((ROOT / 'templates/wayfinder-master.html').read_text(), 'html.parser')
    _, master_engine = configuration(master, require_json=False)
    css = doc.find('style').string if doc.find('style') else ''
    hashes = {'engineSha256': sha(engine.encode()), 'cssSha256': sha((css or '').encode())}
    current = engine == master_engine and css == master.find('style').string
    if current:
        return dict(hashes, classification='CURRENT_MASTER', currentMasterMatch=True)
    handoffs = []
    for text in doc.find_all(string=lambda item: isinstance(item, Comment)):
        if str(text).strip().startswith('WF-HANDOFF '):
            try:
                handoffs.append(json.loads(str(text).strip()[len('WF-HANDOFF '):]))
            except ValueError:
                pass
    did = entry['identity']['dayid']
    for profile in baseline_profiles()['historicalTemplates']:
        if (did in profile['dayids'] and all(hashes[key] == profile[key] for key in hashes)
                and len(handoffs) == 1 and handoffs[0].get('dayid') == did
                and handoffs[0].get('master_sha256') == profile['templateSha256']):
            return dict(hashes, classification='VERIFIED_HISTORICAL_TEMPLATE', currentMasterMatch=False,
                        baseline=profile, scope='Template age only; no exemption for content, packaging, identity or parity')
    return dict(hashes, auditStatus='FAIL', currentMasterMatch=False, classification='UNRECOGNIZED_TEMPLATE_CHANGE',
                defects=['Engine/CSS differ from current master and no exact, provenance-bound historical baseline matches'])

def mapped_record(entry):
    """Re-extract approved roles from native source, never caller role labels."""
    envelope = entry.get('sourceEnvelope')
    if envelope is None:
        return None
    code = "const C=require('./scripts/wayfinder-content-contract.cjs'),x=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(C.extractLesson(x.source,x.dayid)))"
    run = subprocess.run(['node', '-e', code], cwd=ROOT,
                         input=json.dumps({'source': envelope, 'dayid': entry['identity']['dayid']}),
                         text=True, capture_output=True)
    check(run.returncode == 0, 'Invalid mapped native source: ' + run.stderr[-500:])
    record = json.loads(run.stdout)
    check(record['sourceText'] == entry['source']['text'], 'Mapped raw native source differs')
    for key in ['documentId', 'revision', 'tabId']:
        check(record['provenance'][key] == entry['source'][key], 'Mapped source provenance differs: ' + key)
    check(record['payload']['identity'] == entry['identity'] and record['payload']['mode'] == entry['mode'], 'Mapped identity/mode differs')
    check(record['payload']['presentation'].get('instructionLayout'), 'Unsupported mapped presentation')
    return record

def packaging_checks(data, entry):
    """Inventory all style/script blocks, inline styling and event handlers.

    Only exact inspected hashes/attributes are recognized. A known template never
    grants permission to append a new style/script or change answer behavior.
    """
    doc = BeautifulSoup(data.decode('utf-8'), 'html.parser')
    did = entry['identity']['dayid']
    record = mapped_record(entry)
    profiles = baseline_profiles()['packaging']
    profile = profiles.get('mapped:' + did) if record else profiles.get(did)
    check(profile, 'No inspected packaging profile for selected guide; review required')
    styles = [{'index': n, 'sha256': sha((tag.string or '').encode())} for n, tag in enumerate(doc.find_all('style'))]
    scripts = []
    for n, tag in enumerate(doc.find_all('script')):
        text = tag.string or ''
        scripts.append({'index': n, 'sha256': sha(text.encode()), 'src': tag.get('src'),
                        'role': 'shared-engine' if 'const WAYFINDER_CONFIG=' in text else 'lesson-addition'})
    inline = [{'tag': tag.name, 'style': tag['style'], 'id': tag.get('id'),
               'slot': tag.get('data-slot'), 'role': tag.get('aria-label')} for tag in doc.select('[style]')]
    handlers = [{'tag': tag.name, 'attribute': key} for tag in doc.find_all(True)
                for key in tag.attrs if key.lower().startswith('on')]
    defects = []
    if Counter(item['sha256'] for item in styles[1:]) != Counter(profile['extraStyles']):
        defects.append('Added/removed/changed lesson-specific style block outside inspected profile')
    extra_scripts = [item['sha256'] for item in scripts if item['role'] != 'shared-engine']
    if Counter(extra_scripts) != Counter(item['sha256'] for item in profile['extraScripts']):
        defects.append('Added/removed/changed lesson-specific script outside inspected profile')
    if any(item['src'] for item in scripts):
        defects.append('External script is not permitted in this standalone packaging profile')
    serialized = lambda rows: Counter(json.dumps(item, sort_keys=True) for item in rows)
    if serialized(inline) != serialized(profile['inlineStyles']):
        defects.append('Added/removed/changed inline styling outside inspected profile')
    if handlers:
        defects.append('Unreviewed inline event handler')
    return {'auditStatus': 'FAIL' if defects else 'PASS', 'defects': defects,
            'styles': styles, 'scripts': scripts, 'inlineStyles': inline, 'inlineEventHandlers': handlers,
            'classification': 'DOCUMENTED_LESSON_PACKAGING' if not defects else 'UNREVIEWED_LESSON_CHANGE',
            'reference': profile['reference'], 'knownAdditions': profile['extraScripts'],
            'scope': 'Exact M4a-inspected packaging; not global template approval or browser verification'}

def section_checks(data, entry):
    doc = BeautifulSoup(data.decode('utf-8'), 'html.parser')
    raw, mode = entry['source']['text'], entry['mode']
    defects, review = [], []
    aliases = {'learn': '#groupLearn, #group_learn', 'practice': '#groupPractice, #group_practice',
               'perform': '#perform'}
    def present(selector):
        tag = doc.select_one(selector)
        return tag if tag and not any(parent.has_attr('hidden') for parent in [tag, *tag.parents]
                                     if getattr(parent, 'attrs', None) is not None) else None
    for identifier in ['learningTarget', 'warmup', 'masteryOne', 'temperature', 'gateway']:
        if present('#' + identifier) is None:
            defects.append('Missing/hidden required section: ' + identifier)
    # Studio is correctly hidden until the four checks; presence still is required.
    if doc.find(id='creativeLabs') is None:
        defects.append('Missing required section: creativeLabs')
    learn, practice, perform = [present(aliases[key]) for key in ['learn', 'practice', 'perform']]
    mapped = mapped_record(entry)
    if mapped:
        payload = mapped['payload']
        by_id = {s['id']: s for s in payload['sections']}
        names = {'group_learn': learn, 'group_practice': practice, 'perform': perform}
        surfaces = []
        for identifier, tag in names.items():
            source = by_id[identifier]
            if source['status'] == 'not_applicable':
                if tag is not None:
                    defects.append('Inapplicable mapped section rendered: ' + identifier)
                continue
            if tag is None:
                defects.append('Missing mapped section: ' + identifier)
                continue
            visible = BeautifulSoup(str(tag), 'html.parser')
            for hidden in visible.select('[hidden], script, style, template'):
                hidden.decompose()
            text = normalize(visible.get_text(' ', strip=True))
            surfaces.append(text)
            expected = [source['text'], *source['steps']]
            expected += [a['instructions'] for a in payload['activities'] if a['sectionId'] == identifier]
            expected += [a['outcome'] for a in payload['activities'] if a['sectionId'] == identifier]
            for passage in expected:
                if text.count(normalize(passage)) != 1:
                    defects.append('Mapped passage omitted/duplicated: ' + identifier)
        # Enforce all original approved instruction passages exactly once across
        # mapped surfaces; reject duplication into another section too.
        for prefix in ['GROUP LEARN / HOOK: ', 'GROUP PRACTICE: ', 'PERFORM / PROJECT DEVELOPMENT: ']:
            passage = re.search('^' + re.escape(prefix) + '(.+)$', raw, re.M)
            if passage and sum(text.count(normalize(passage[1])) for text in surfaces) != 1:
                defects.append('Original instruction omitted/duplicated across roles: ' + prefix)
        for identifier in ['group_practice', 'perform']:
            if by_id[identifier]['status'] == 'applicable':
                tag = names[identifier]
                expected = len(by_id[identifier]['steps']) + sum(a['sectionId'] == identifier for a in payload['activities'])
                if tag is None or len(tag.select('details.perform-step')) != expected:
                    defects.append('Mapped novice instruction disclosure count differs: ' + identifier)
        ordered = [tag.get('id') for tag in doc.select('section[id]')]
        required_order = [('groupLearn' if 'groupLearn' in ordered else 'group_learn'), 'groupPractice', 'masteryOne'] if mode == 'LEARN' else ['groupPractice', 'masteryOne', 'perform']
        if any(name not in ordered for name in required_order) or [ordered.index(name) for name in required_order if name in ordered] != sorted(ordered.index(name) for name in required_order if name in ordered):
            defects.append('Mapped preparation/evidence/project order differs')
        return {'auditStatus': 'FAIL' if defects else 'PASS', 'defects': defects, 'needsReview': [],
                'mode': mode, 'sections': ordered,
                'scope': 'Validated current native mapped roles and literal passage fidelity; no curriculum waiver'}
    source_learn = re.search(r'^GROUP LEARN / HOOK: (.+)$', raw, re.M)
    source_practice = re.search(r'^GROUP PRACTICE: (.+)$', raw, re.M)
    source_perform = re.search(r'^PERFORM / PROJECT DEVELOPMENT: (.+)$', raw, re.M)
    source_pacing = re.search(r'^50-MINUTE RHYTHM: (.+)$', raw, re.M)
    def source_matches(tag, source, label):
        visible = BeautifulSoup(str(tag), 'html.parser') if tag is not None else None
        if visible:
            for hidden in visible.select('[hidden], script, style, template'):
                hidden.decompose()
        if source and (visible is None or normalize(source[1]) not in normalize(visible.get_text(' ', strip=True))):
            defects.append('Native ' + label + ' instructions omitted or altered')
    if mode in ['STARTER', 'LEARN']:
        source_matches(learn, source_learn, 'Group Learn')
        if learn is None:
            defects.append(mode + ' requires Group Learn')
    if source_practice or mode in ['STARTER', 'PERFORM']:
        source_matches(practice, source_practice, 'Group Practice')
        if practice is None and not source_practice:
            defects.append(mode + ' requires Group Practice')
    if mode == 'PERFORM':
        source_matches(perform, source_perform, 'Perform')
        if perform is None:
            defects.append('PERFORM requires a Perform section')
        if learn is not None:
            defects.append('PERFORM contains a full Group Learn section')
        if source_learn:
            review.append('Native Perform source still plans full Group Learn; reconcile its sections/pacing without silently rewriting it')
        if source_pacing and re.search(r'[1-9]\d* min Group Learn', source_pacing[1]):
            review.append('Native Perform pacing allocates Group Learn time; mode/source decision required')
    if mode == 'LEARN' and source_pacing and re.search(r'[1-9]\d* min project\b', source_pacing[1]):
        review.append('Native Learn pacing allocates project work; isolated-practice/source mapping requires review')
    if mode == 'LEARN' and perform is not None:
        title = perform.find(['h2', 'h3'])
        isolated = title and title.get_text(' ', strip=True) == 'Guided Tool Practice'
        if isolated and entry['identity']['dayid'] == '3050202':
            source_matches(perform, source_perform, 'Learn tool practice')
            review.append('Native Learn tool-practice/Perform representation conflicts with the current M1 contract; F4a2 decision outstanding')
        else:
            defects.append('LEARN contains a project/Perform section instead of source-declared isolated practice')
    elif mode == 'LEARN' and source_perform:
        review.append('Native Learn source specifies Perform/project work absent from HTML; source/mode reconciliation required')
    if mode in ['STARTER', 'PERFORM'] or (mode == 'LEARN' and perform is not None):
        if perform is None or not 3 <= len(perform.select('.perform-step')) <= 5:
            defects.append('Mode-applicable novice scaffold requires 3–5 Perform/tool-practice steps')
    return {'auditStatus': 'FAIL' if defects else 'UNTESTED' if review else 'PASS',
            'defects': list(dict.fromkeys(defects)), 'needsReview': review,
            'mode': mode, 'sections': [tag.get('id') for tag in doc.select('section')],
            'scope': 'Literal native section fidelity and mode compatibility; not semantic curriculum certification'}

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
    destinations = dict(cfg['destinations'])
    if destinations.get('q2') == '' and doc.find(id='masteryTwo') is None:
        del destinations['q2']  # unchanged regular shell's explicitly unused second checkpoint
    urls = list(destinations.values())
    check(set(urls) == {FORM + k for k in expected} and len(urls) == len(expected), 'Missing/duplicate/incorrect Form destination')
    check(doc.select_one('[data-slot="q1-help"]'), 'Missing question help')
    check(len(doc.select('[data-assembler="one"] textarea')) == 1, 'Native single-response field differs')
    check(len(doc.select('.gate-check')) == 4, 'Missing completion checks')
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
                    status = detail.get('auditStatus', 'PASS') if isinstance(detail, dict) else 'PASS'
                    check(status in ['PASS', 'FAIL', 'UNTESTED'], 'Invalid audit check status')
                    checks[name] = {'status': status, 'detail': detail}
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
            record('masterVersion', lambda: master_checks(data, entry))
            record('packaging', lambda: packaging_checks(data, entry))
            record('sections', lambda: section_checks(data, entry))
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
            required = ['githubReadback', 'identity', 'offline', 'content', 'masterVersion', 'packaging', 'sections', 'fileSize', 'byteParity', 'mappingsAndPreservation']
            check(all(name in checks for name in required), 'Selected guide check skipped')
            statuses = [checks[name]['status'] for name in required]
            result['status'] = 'FAIL' if 'FAIL' in statuses else 'UNTESTED' if 'UNTESTED' in statuses else 'PASS'
        except Exception as error:
            result['finding'] = str(error)
    check(len(results) == len(dayids), 'Selected guide result missing')
    statuses = [row['status'] for row in results]
    return {'status': 'FAIL' if 'FAIL' in statuses else 'UNTESTED' if 'UNTESTED' in statuses else 'PASS',
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
    parser.add_argument('--acceptance', action='store_true', help='Require exact-revision final-delivery evidence, including downloaded-file controls; missing or stale evidence is HOLD')
    parser.add_argument('dayids', nargs='+', help='Explicit DayIDs; never inferred from evidence or changed files')
    args = parser.parse_args()
    try:
        evidence = json.loads(args.evidence.read_text())
        report = delivery_acceptance(args.dayids, evidence, args.root, args.drive_root) if args.acceptance else audit(args.dayids, evidence, args.root, args.drive_root)
    except Exception as error:
        report = {'status': 'FAIL', 'finding': str(error)}
    print(json.dumps(report, indent=2))
    return 0 if report['status'] == 'PASS' else 1

def delivery_acceptance(selections, evidence, root=ROOT, drive_root=None):
    """Final acceptance, separate from the legacy static audit's limited PASS.

    This checks actual downloaded bytes plus exact-revision, attributed test records.
    It cannot authenticate caller assertions or replace fresh connector readbacks.
    It never synchronizes, submits, changes visibility or grants student readiness.
    """
    check(selections, 'Explicit selected guide paths required')
    entries = evidence.get('f5FinalRepair', {}).get('deliveryAcceptance', {})
    results, seen = [], set()
    for selection in selections:
        row = {'path': selection, 'status': 'HOLD', 'findings': []}
        results.append(row)
        try:
            match = re.fullmatch(r'(Tech|CS|AAVTC)/(\d{5}|\d{7})(?:\.html)?', selection)
            check(match, 'Explicit course/DayID selection required')
            path = match[1] + '/' + match[2] + '.html'
            check(path not in seen, 'Duplicate selection'); seen.add(path)
            data = (Path(root) / path).read_bytes()
            digest = sha(data); row.update(path=path, sha256=digest)
            entry = entries.get(path, {})
            check(entry.get('driveId'), 'Missing existing Drive ID evidence')
            check(drive_root, 'Fresh authenticated downloaded bytes required')
            delivered = (Path(drive_root) / path).read_bytes()
            check(data == delivered, 'Downloaded bytes differ from canonical source')
            row['byteParity'] = 'PASS'
            # Re-run the existing checker; a saved packaging PASS is not sufficient.
            code = "const f=require('fs'),c=require('./scripts/check-offline-html.cjs');process.stdout.write(JSON.stringify(c.inspect(f.readFileSync(process.argv[1]))))"
            run = subprocess.run(['node', '-e', code, str((Path(root) / path).resolve())], cwd=ROOT, capture_output=True, text=True)
            check(run.returncode == 0, 'Offline checker failed to execute')
            issues = json.loads(run.stdout); check(not issues, 'Offline packaging: ' + '; '.join(issues))
            row['offlinePackaging'] = 'PASS'
            for name in ['validation', 'synchronization', 'readback', 'preservation', 'offlineControls', 'clipboard', 'collector']:
                gate = entry.get(name, {})
                if gate.get('status') != 'PASS':
                    row['findings'].append(name + ': ' + gate.get('status', 'MISSING'))
                elif gate.get('sha256') != digest:
                    row['findings'].append(name + ': STALE source hash')
                elif not gate.get('evidence'):
                    row['findings'].append(name + ': missing evidence attribution')
                if name in ['synchronization', 'readback'] and gate.get('driveId') != entry['driveId']:
                    row['findings'].append(name + ': wrong existing Drive ID')
            readback = entry.get('readback', {})
            if not readback.get('downloadedAt') or not readback.get('modifiedTime'):
                row['findings'].append('Missing delivery download/version timestamps')
            if not row['findings']: row['status'] = 'PASS'
        except Exception as error:
            row['findings'].append(str(error))
    return {'status': 'PASS' if results and all(r['status'] == 'PASS' for r in results) else 'HOLD',
            'scope': 'Exact-revision delivery acceptance; not student release. Evidence must come from authenticated current reads and actual tests.',
            'results': results, 'productionWrites': 0, 'studentRelease': False}

if __name__ == '__main__':
    sys.exit(main())
