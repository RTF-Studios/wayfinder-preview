#!/usr/bin/env python3
"""Regression tests for alpha, deduplication, idempotence and atomic budget failure."""
import importlib.util,io,tempfile,unittest,subprocess,sys,base64
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('media',Path(__file__).with_name('wayfinder-media.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MediaTests(unittest.TestCase):
 def test_rgba_resize_preserves_alpha_and_original(self):
  im=Image.new('RGBA',(100,50),(20,80,140,70));b=io.BytesIO();im.save(b,'PNG');original=b.getvalue()
  raw,_,size,alpha=m.optimize(original,40,82)
  self.assertTrue(alpha);self.assertEqual(size,(40,20));self.assertEqual(Image.open(io.BytesIO(raw)).convert('RGBA').getextrema()[3],(70,70));self.assertEqual(b.getvalue(),original)
 def test_cli_failure_is_atomic(self):
  for source in ['<html><head></head><body>'+('x'*(2*1024*1024))+'</body></html>',
                 '<html><head></head><body><img src="missing.png"></body></html>',
                 '<html><head></head><body><img srcset="remote.png 2x"></body></html>',
                 '<!-- '+m.VERSION+' --><html><head><style>@import "remote.css";</style></head></html>']:
   with self.subTest(source=source[:90]),tempfile.TemporaryDirectory() as d:
    root=Path(d);p=root/'1234567.html';p.write_text(source);before=p.read_bytes()
    result=subprocess.run([sys.executable,str(Path(m.__file__)),str(p),'--root',str(root),'--in-place'],capture_output=True)
    self.assertNotEqual(result.returncode,0);self.assertEqual(p.read_bytes(),before);self.assertFalse((root/'assets').exists())
 def test_css_relative_font_and_full_cli_idempotence(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);(root/'assets/css').mkdir(parents=True);(root/'assets/fonts').mkdir();(root/'assets/fonts/a.woff2').write_bytes(b'test-font-bytes')
   (root/'assets/css/site.css').write_text('@font-face{font-family:x;src:url(../fonts/a.woff2)}')
   p=root/'1234567.html';p.write_text('<HTML><HEAD><link rel="stylesheet" href="assets/css/site.css"></HEAD><body>Keep lesson.</body></HTML>')
   cmd=[sys.executable,str(Path(m.__file__)),str(p),'--root',str(root),'--in-place']
   first=subprocess.run(cmd,capture_output=True);self.assertEqual(first.returncode,0,first.stdout+first.stderr);one=p.read_bytes()
   second=subprocess.run(cmd,capture_output=True);self.assertEqual(second.returncode,0,second.stdout+second.stderr);self.assertEqual(p.read_bytes(),one);self.assertIn(b'data:font/woff2;base64',one)
 def test_checker_detects_offline_regressions(self):
  checker=Path(m.__file__).with_name('check-offline-html.cjs')
  samples=['<img src="remote.webp">','<style>x{background:url(remote.webp)}</style>','<script>fetch("remote.json")</script>','<img data-wf-media="missing">','<script>let = ;</script>']
  for source in samples:
   with self.subTest(source=source),tempfile.TemporaryDirectory() as d:
    p=Path(d)/'x.html';p.write_text(source)
    self.assertNotEqual(subprocess.run(['node',str(checker),str(p)],capture_output=True).returncode,0)
 def test_palette_transparency(self):
  im=Image.new('P',(20,10));im.putpalette([255,255,255,20,30,40]+[0]*762);im.putpixel((5,5),1);im.info['transparency']=0;b=io.BytesIO();im.save(b,'PNG');raw,_,_,alpha=m.optimize(b.getvalue(),100,82)
  result=Image.open(io.BytesIO(raw)).convert('RGBA');self.assertTrue(alpha);self.assertEqual(result.getpixel((0,0))[3],0);self.assertEqual(result.getpixel((5,5))[3],255)
 def test_dedup_idempotence_content(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);(root/'assets').mkdir();im=Image.new('RGBA',(20,20),(5,10,15,100));im.save(root/'assets'/'x.png');p=root/'1234567.html'
   text='<html><head></head><body><img src="assets/x.png"><img src="assets/x.png"><textarea><img src="example.png"></textarea><script>const WAYFINDER_CONFIG={imagePools:{target:[{src:"assets/x.png"}]}};</script></body></html>'
   out,changed=m.Package(root,p,960,82).build(text);self.assertTrue(changed);self.assertEqual(out.count('data:image/webp;base64,'),1);self.assertIn('<textarea><img src="example.png"></textarea>',out);self.assertEqual(m.Package(root,p,960,82).build(out),(out,False))
if __name__=='__main__':unittest.main()
