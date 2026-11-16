#!/usr/bin/env python3
"""M4 detection tests. All altered HTML, mappings and fake Drive copies are temporary."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('check-batch-delivery.py'))
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)
IDS = ['Tech/3050202', 'Tech/3050203']
FIXTURE = A.ROOT / 'scripts/fixtures/m4-delivery/evidence.json'

class DeliveryDetection(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='m4-audit-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'github'
        self.drive = Path(self.temp.name) / 'mock-drive'
        self.drive.mkdir()
        (self.root / 'Tech').mkdir(parents=True)
        self.evidence = json.loads(FIXTURE.read_text())
        for did in ['3050202', '3050203']:
            original = (A.ROOT / 'Tech' / (did + '.html')).read_bytes()
            # Synthetic coherent source/section positive controls ONLY in temp copies.
            # Keep the historical engine and exact inspected packaging unchanged.
            doc = A.BeautifulSoup(original, 'html.parser')
            entry = self.evidence['entries'][did]
            if did == '3050202':
                practice, perform = doc.find(id='groupPractice'), doc.find(id='perform')
                for child in list(perform.contents):
                    practice.append(child.extract())
                perform.decompose()
                entry['source']['text'] = entry['source']['text'].replace('PERFORM / PROJECT DEVELOPMENT:', 'ISOLATED TOOL PRACTICE:')
                entry['source']['text'] = entry['source']['text'].replace('15 min project build/test', '15 min isolated tool practice')
            else:
                paragraph = A.re.search(r'^GROUP PRACTICE: (.+)$', entry['source']['text'], A.re.M)[1]
                practice = doc.new_tag('section', id='groupPractice')
                practice['class'] = ['panel', 'practice']
                text = doc.new_tag('p'); text.string = paragraph; practice.append(text)
                doc.find(id='warmup').insert_after(practice)
                entry['source']['text'] = A.re.sub(r'^GROUP LEARN / HOOK: .+\n', '', entry['source']['text'], flags=A.re.M)
                entry['source']['text'] = entry['source']['text'].replace('13 min Group Learn with live teacher demo', '13 min guided tool practice')
            data = str(doc).encode()
            (self.root / 'Tech' / (did + '.html')).write_bytes(data)
            (self.drive / (did + '.html')).write_bytes(data)
            entry['github']['blobSha'] = A.hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
            entry['before']['drive']['size'] = entry['after']['drive']['size'] = len(data)

    def run_audit(self, ids=None):
        return A.audit(IDS if ids is None else ids, self.evidence, self.root, self.drive)

    def failure(self, report, day='3050203', gate=None):
        self.assertEqual(report['status'], 'FAIL')
        self.assertEqual(report['selectedCount'], report['resultCount'])
        row = next(r for r in report['results'] if r.get('dayid') == day)
        self.assertEqual(row['status'], 'FAIL')
        if gate:
            self.assertEqual(row['checks'][gate]['status'], 'FAIL')
        return row

    def test_two_guide_positive_control(self):
        result = self.run_audit()
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['resultCount'], 2)
        self.assertTrue(all(len(row['checks']) == 10 for row in result['results']))

    def test_empty_selection_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Explicit nonempty'):
            self.run_audit([])

    def test_bare_explicit_dayids_supported(self):
        self.assertEqual(self.run_audit(['3050202', '3050203'])['status'], 'PASS')

    def test_missing_github_file_not_skipped(self):
        (self.root / 'Tech/3050203.html').unlink()
        self.failure(self.run_audit())

    def test_missing_drive_file_not_skipped(self):
        (self.drive / '3050203.html').unlink()
        self.failure(self.run_audit(), gate='byteParity')

    def test_mismatched_drive_bytes(self):
        with (self.drive / '3050203.html').open('ab') as output:
            output.write(b'\n')
        self.failure(self.run_audit(), gate='byteParity')

    def test_same_size_mismatched_drive_bytes(self):
        path = self.drive / '3050203.html'
        data = path.read_bytes().replace(b'<html', b'<HTML', 1)
        path.write_bytes(data)
        self.failure(self.run_audit(), gate='byteParity')

    def test_duplicate_selection_rejected(self):
        report = self.run_audit(['3050203', '3050203'])
        self.assertEqual(report['status'], 'FAIL')
        self.assertEqual(report['resultCount'], 2)
        self.assertEqual(report['results'][1]['status'], 'FAIL')
        self.assertIn('Duplicate selected DayID', report['results'][1]['finding'])

    def test_missing_evidence_not_skipped(self):
        del self.evidence['entries']['3050203']
        self.failure(self.run_audit())

    def test_invalid_selection_still_gets_result(self):
        report = self.run_audit(['3050202', '../bad', '3050203'])
        self.assertEqual(report['resultCount'], 3)
        self.assertEqual(report['results'][1]['status'], 'FAIL')
        self.assertEqual(report['results'][2]['status'], 'PASS')

    def test_incorrect_github_blob_detected(self):
        self.evidence['entries']['3050203']['github']['blobSha'] = '0' * 40
        self.failure(self.run_audit(), gate='githubReadback')

    def test_show_change_detected(self):
        self.evidence['entries']['3050203']['after']['control']['show'] = True
        self.failure(self.run_audit(), gate='mappingsAndPreservation')

    def test_drive_id_change_detected(self):
        self.evidence['entries']['3050203']['after']['library']['driveId'] = 'wrong-id'
        self.failure(self.run_audit(), gate='mappingsAndPreservation')

    def test_question_mismatch_detected(self):
        self.evidence['entries']['3050203']['collector'][0][1] = 'Wrong frozen prompt'
        self.failure(self.run_audit(), gate='content')

    def test_unrecognized_engine_change_detected(self):
        self.mutate('3050203', lambda data: data.replace(b'function updateGate(){', b'function updateGate(){window.changed=true;', 1))
        self.failure(self.run_audit(), gate='masterVersion')

    def test_external_resource_detected_without_short_circuit(self):
        with (self.root / 'Tech/3050203.html').open('ab') as output:
            output.write(b'<img src="https://example.invalid/offline.png">')
        row = self.failure(self.run_audit(), gate='offline')
        self.assertEqual(len(row['checks']), 10)

    def test_oversized_html_detected(self):
        with (self.root / 'Tech/3050203.html').open('ab') as output:
            output.write(b' ' * (2 * 1024 * 1024))
        self.failure(self.run_audit(), gate='fileSize')

    def mutate(self, did, action):
        path = self.root / 'Tech' / (did + '.html')
        path.write_bytes(action(path.read_bytes()))

    def edit_dom(self, did, action):
        def change(data):
            doc = A.BeautifulSoup(data, 'html.parser'); action(doc); return str(doc).encode()
        self.mutate(did, change)

    def test_historical_template_is_distinguished(self):
        row = self.run_audit()['results'][1]
        result = row['checks']['masterVersion']
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['detail']['classification'], 'VERIFIED_HISTORICAL_TEMPLATE')
        self.assertFalse(result['detail']['currentMasterMatch'])

    def test_current_template_is_distinguished(self):
        self.mutate('3050203', lambda data: data.replace(b"['ASSESSMENT','RECOVERY'].includes(WAYFINDER_CONFIG.mode)", b"WAYFINDER_CONFIG.mode==='ASSESSMENT'").replace(b'.scaffold label{font-weight:750;', b'.scaffold label{font-weight:400;').replace(b'.scaffold legend{font-weight:800;', b'.scaffold legend{font-weight:400;'))
        result = self.run_audit()['results'][1]['checks']['masterVersion']
        self.assertEqual(result['status'], 'PASS')
        self.assertTrue(result['detail']['currentMasterMatch'])

    def test_historical_claim_without_provenance_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'85d89c64a1359b065e769ac032a7cf30a50030d84c35962643ec02bf5338b172', b'0' * 64))
        self.failure(self.run_audit(), gate='masterVersion')

    def test_unrecognized_primary_css_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'--navy:#142063', b'--navy:#ff0000', 1))
        self.failure(self.run_audit(), gate='masterVersion')

    def test_known_packaging_is_inventoried(self):
        result = self.run_audit()['results'][1]['checks']['packaging']
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(len(result['detail']['styles']), 2)
        self.assertEqual(len(result['detail']['scripts']), 3)
        self.assertEqual(len(result['detail']['inlineStyles']), 6)

    def test_added_style_fails(self):
        self.mutate('3050203', lambda data: data + b'<style>body{display:none}</style>')
        self.failure(self.run_audit(), gate='packaging')

    def test_changed_known_style_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'min-width:560px', b'min-width:900px'))
        self.failure(self.run_audit(), gate='packaging')

    def test_added_script_fails(self):
        self.mutate('3050203', lambda data: data + b'<script>window.unreviewed=true;</script>')
        self.failure(self.run_audit(), gate='packaging')

    def test_changed_art_helper_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'window.WF_ART={rotate:function', b'window.WF_ART={rotate:function /* changed */', 1))
        self.failure(self.run_audit(), gate='packaging')

    def test_changed_media_hydrator_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'function wfHydrateMedia(){', b'function wfHydrateMedia(){window.unreviewed=true;', 1))
        self.failure(self.run_audit(), gate='packaging')

    def test_changed_inline_style_fails(self):
        self.edit_dom('3050203', lambda doc: doc.select_one('select').__setitem__('style', 'width:200vw'))
        self.failure(self.run_audit(), gate='packaging')

    def test_added_inline_event_handler_fails(self):
        self.edit_dom('3050203', lambda doc: doc.body.__setitem__('onload', 'window.changed=true'))
        self.failure(self.run_audit(), gate='packaging')

    def test_required_section_removal_fails(self):
        for identifier in ['warmup', 'temperature', 'gateway', 'creativeLabs']:
            with self.subTest(section=identifier):
                original = (self.root / 'Tech/3050203.html').read_bytes()
                self.edit_dom('3050203', lambda doc: doc.find(id=identifier).decompose())
                self.failure(self.run_audit(), gate='sections')
                (self.root / 'Tech/3050203.html').write_bytes(original)

    def test_source_practice_omission_fails(self):
        self.edit_dom('3050203', lambda doc: doc.find(id='groupPractice').decompose())
        self.failure(self.run_audit(), gate='sections')

    def test_hidden_practice_cannot_count_as_delivery(self):
        self.edit_dom('3050203', lambda doc: doc.find(id='groupPractice').p.__setitem__('hidden', ''))
        self.failure(self.run_audit(), gate='sections')

    def test_native_practice_changes_fail(self):
        self.edit_dom('3050203', lambda doc: setattr(doc.find(id='groupPractice').p, 'string', 'Different practice'))
        self.failure(self.run_audit(), gate='sections')

    def test_valid_learn_without_perform_passes(self):
        result = self.run_audit(['3050202'])
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['results'][0]['checks']['sections']['status'], 'PASS')

    def test_learn_full_project_section_fails(self):
        def add(doc):
            section = doc.new_tag('section', id='perform'); title = doc.new_tag('h2')
            title.string = 'Perform'; section.append(title); doc.body.append(section)
        self.edit_dom('3050202', add)
        self.failure(self.run_audit(), day='3050202', gate='sections')

    def test_perform_full_learn_section_fails(self):
        self.edit_dom('3050203', lambda doc: doc.body.append(doc.new_tag('section', id='groupLearn')))
        self.failure(self.run_audit(), gate='sections')

    def test_mode_config_mismatch_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'"mode": "PERFORM"', b'"mode": "LEARN"', 1))
        self.failure(self.run_audit(), gate='content')

    def test_actual_pilot_is_not_promoted_to_pass(self):
        report = A.audit(IDS, json.loads(FIXTURE.read_text()), A.ROOT, self.drive)
        learn, perform = report['results']
        self.assertEqual(learn['checks']['sections']['status'], 'UNTESTED')
        self.assertEqual(perform['checks']['sections']['status'], 'FAIL')
        self.assertEqual(learn['checks']['masterVersion']['status'], 'PASS')
        self.assertEqual(perform['checks']['masterVersion']['status'], 'PASS')

    def test_frozen_rubric_mismatch_fails(self):
        self.evidence['entries']['3050203']['collector'][0][2] = 'Changed rubric'
        self.failure(self.run_audit(), gate='content')

    def test_priority_teks_mismatch_fails(self):
        self.edit_dom('3050203', lambda doc: setattr(doc.select_one('[data-slot="priority-teks"]'), 'string', 'Wrong TEKS'))
        self.failure(self.run_audit(), gate='content')

    def test_duplicate_html_identity_fails(self):
        self.edit_dom('3050203', lambda doc: doc.body.append(doc.new_tag('div', id='warmup')))
        self.failure(self.run_audit(), gate='content')

    def test_hidden_form_key_mismatch_fails(self):
        self.mutate('3050203', lambda data: data.replace(b'entry.1954781253=305020330061', b'entry.1954781253=305020330062'))
        self.failure(self.run_audit(), gate='content')

    def test_source_pacing_mode_mismatch_is_not_pass(self):
        entry = self.evidence['entries']['3050203']
        entry['source']['text'] = entry['source']['text'].replace('13 min guided tool practice', '13 min Group Learn with live teacher demo')
        result = self.run_audit()['results'][1]
        self.assertEqual(result['status'], 'UNTESTED')
        self.assertIn('pacing', ' '.join(result['checks']['sections']['detail']['needsReview']))

    def test_historical_profile_does_not_extend_to_other_days(self):
        entry = json.loads(FIXTURE.read_text())['entries']['3050203']
        entry['identity']['dayid'] = '3050303'
        data = (A.ROOT / 'Tech/3050203.html').read_bytes()
        self.assertEqual(A.master_checks(data, entry)['auditStatus'], 'FAIL')

if __name__ == '__main__':
    unittest.main(verbosity=2)
