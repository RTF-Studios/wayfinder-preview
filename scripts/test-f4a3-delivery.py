"""Isolated M4 compatibility checks; fake Drive copies are explicitly test-only."""
import copy, importlib.util, json, os, unittest, hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('delivery',Path(__file__).with_name('check-batch-delivery.py'));A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)
ROOT=Path(os.environ.get('F4A3_OUTPUT','/tmp/f4a3'))
class MappedDelivery(unittest.TestCase):
 def setUp(self):
  self.e=json.loads((A.ROOT/'scripts/fixtures/m4-delivery/evidence.json').read_text());self.source=json.loads((A.ROOT/'scripts/fixtures/f4a3-production/current-native-source.json').read_text());self.drive=ROOT/'test-only-drive';self.drive.mkdir(exist_ok=True)
  for id in ['3050202','3050203']:
   x=self.e['entries'][id];t=next(t for t in self.source['tabs'] if t['id']==x['source']['tabId']);x['source']['text']=t['text'];x['sourceEnvelope']=self.source
   data=(ROOT/'Tech'/f'{id}.html').read_bytes();(self.drive/f'{id}.html').write_bytes(data);x['github']['blobSha']=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();x['before']['drive']['size']=x['after']['drive']['size']=len(data)
 def test_isolated_all_m4_checks(self):
  r=A.audit(['3050202','3050203'],self.e,ROOT,self.drive);self.assertEqual(r['status'],'PASS',json.dumps(r,indent=2));r['scope']='F4a3 isolated M4 harness; local test-only Drive mirrors, not authenticated deployment parity';(ROOT/'isolated-m4-results.json').write_text(json.dumps(r,indent=2)+'\n')
 def test_each_instruction_cannot_be_removed(self):
  for id in ['3050202','3050203']:
   entry=self.e['entries'][id];original=(ROOT/'Tech'/f'{id}.html').read_text()
   for selector in ['#groupPractice p','#groupPractice summary']+(['#perform summary'] if id=='3050203' else ['#group_learn p']):
    d=A.BeautifulSoup(original,'html.parser');tag=d.select_one(selector);self.assertIsNotNone(tag);tag.decompose();self.assertEqual(A.section_checks(str(d).encode(),entry)['auditStatus'],'FAIL',selector)
 def test_duplicate_content_fails(self):
  for id in ['3050202','3050203']:
   d=A.BeautifulSoup((ROOT/'Tech'/f'{id}.html').read_text(),'html.parser');p=d.select_one('#groupPractice p');p.insert_after(copy.copy(p));self.assertEqual(A.section_checks(str(d).encode(),self.e['entries'][id])['auditStatus'],'FAIL')
 def test_false_roles_and_stale_native_fail(self):
  for id in ['3050202','3050203']:
   e=copy.deepcopy(self.e['entries'][id]);next(t for t in e['sourceEnvelope']['tabs'] if t['id']==e['source']['tabId'])['text']+='changed';data=(ROOT/'Tech'/f'{id}.html').read_bytes()
   with self.assertRaisesRegex(ValueError,'Invalid mapped native source'):A.section_checks(data,e)
 def test_arbitrary_packaging_fails(self):
  for id in ['3050202','3050203']:
   data=(ROOT/'Tech'/f'{id}.html').read_bytes()+b'<style>.unapproved{color:red}</style><script>window.unapproved=true</script>';self.assertEqual(A.packaging_checks(data,self.e['entries'][id])['auditStatus'],'FAIL')
 def test_missing_parity_fails(self):
  (self.drive/'3050203.html').write_bytes(b'wrong copy');r=A.audit(['3050203'],self.e,ROOT,self.drive);self.assertEqual(r['results'][0]['checks']['byteParity']['status'],'FAIL')
if __name__=='__main__':unittest.main(verbosity=2)
