"""Synthetic detection tests only; never evidence of a real Drive/browser transaction."""
import copy,hashlib,importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('audit',Path(__file__).with_name('check-batch-delivery.py'))
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)

class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'source';self.drive=Path(self.tmp.name)/'download'
        self.path='Tech/3050102.html';self.raw=b'<html><head></head><body>Test-only fixture A</body></html>'
        for root in [self.root,self.drive]:
            (root/'Tech').mkdir(parents=True);(root/self.path).write_bytes(self.raw)
        digest=hashlib.sha256(self.raw).hexdigest()
        entry={'driveId':'TEST_ONLY_EXISTING_ID'}
        for name in ['validation','synchronization','readback','preservation','offlineControls','clipboard','collector']:
            entry[name]={'status':'PASS','sha256':digest,'evidence':'SYNTHETIC TEST ONLY','driveId':entry['driveId']}
        entry['readback'].update(downloadedAt='TEST_ONLY',modifiedTime='TEST_ONLY')
        self.entry=entry;self.evidence={'f5FinalRepair':{'deliveryAcceptance':{self.path:entry}}}
    def run_check(self):return A.delivery_acceptance([self.path],self.evidence,self.root,self.drive)
    def test_positive_fixture(self):self.assertEqual(self.run_check()['status'],'PASS')
    def test_missing_runtime_holds(self):
        del self.entry['offlineControls'];self.assertEqual(self.run_check()['status'],'HOLD')
    def test_untested_clipboard_holds(self):
        self.entry['clipboard']['status']='UNTESTED';self.assertEqual(self.run_check()['status'],'HOLD')
    def test_stale_even_same_size_holds(self):
        changed=self.raw.replace(b'fixture A',b'fixture B')
        for root in [self.root,self.drive]:(root/self.path).write_bytes(changed)
        self.assertEqual(self.run_check()['status'],'HOLD')
    def test_download_corruption_holds(self):
        (self.drive/self.path).write_bytes(self.raw.replace(b'fixture A',b'fixture B'));self.assertEqual(self.run_check()['status'],'HOLD')
    def test_wrong_drive_id_holds(self):
        self.entry['readback']['driveId']='DIFFERENT';self.assertEqual(self.run_check()['status'],'HOLD')
    def test_missing_version_holds(self):
        del self.entry['readback']['modifiedTime'];self.assertEqual(self.run_check()['status'],'HOLD')
    def test_missing_attribution_holds(self):
        self.entry['collector']['evidence']='';self.assertEqual(self.run_check()['status'],'HOLD')
    def test_duplicates_hold(self):self.assertEqual(A.delivery_acceptance([self.path,self.path],self.evidence,self.root,self.drive)['status'],'HOLD')
    def test_offline_failure_holds(self):
        (self.root/self.path).write_bytes(self.raw+b'<img src="remote.png">')
        (self.drive/self.path).write_bytes((self.root/self.path).read_bytes());self.assertEqual(self.run_check()['status'],'HOLD')
if __name__=='__main__':unittest.main()
