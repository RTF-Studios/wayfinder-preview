#!/usr/bin/env python3
"""M4 detection tests. All altered HTML, mappings and fake Drive copies are temporary."""
import importlib.util
import json
import shutil
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
            # Positive control only: current engine in temporary copies, never production.
            data = original.replace(b"['ASSESSMENT','RECOVERY'].includes(WAYFINDER_CONFIG.mode)", b"WAYFINDER_CONFIG.mode==='ASSESSMENT'")
            data = data.replace(b'.scaffold label{font-weight:750;', b'.scaffold label{font-weight:400;')
            data = data.replace(b'.scaffold legend{font-weight:800;', b'.scaffold legend{font-weight:400;')
            (self.root / 'Tech' / (did + '.html')).write_bytes(data)
            (self.drive / (did + '.html')).write_bytes(data)
            entry = self.evidence['entries'][did]
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
        self.assertTrue(all(len(row['checks']) == 8 for row in result['results']))

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

    def test_existing_engine_mismatch_detected(self):
        shutil.copyfile(A.ROOT / 'Tech/3050203.html', self.root / 'Tech/3050203.html')
        self.failure(self.run_audit(), gate='masterVersion')

    def test_external_resource_detected_without_short_circuit(self):
        with (self.root / 'Tech/3050203.html').open('ab') as output:
            output.write(b'<img src="https://example.invalid/offline.png">')
        row = self.failure(self.run_audit(), gate='offline')
        self.assertEqual(len(row['checks']), 8)

    def test_oversized_html_detected(self):
        with (self.root / 'Tech/3050203.html').open('ab') as output:
            output.write(b' ' * (2 * 1024 * 1024))
        self.failure(self.run_audit(), gate='fileSize')

if __name__ == '__main__':
    unittest.main(verbosity=2)
