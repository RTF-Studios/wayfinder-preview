#!/usr/bin/env python3
"""Idempotent canonical offline HTML packager. Originals are never overwritten.
Run: python scripts/wayfinder-media.py COURSE/DAY.html --root . --in-place
A failed build never replaces its input. Network is used only at build time.
"""
import argparse, base64, hashlib, html as htmlmod, io, json, re, urllib.request
import os, subprocess, tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote
from PIL import Image, ImageOps

VERSION = 'wf-offline-media-v2'
RASTER = re.compile(r'data:image/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)',re.I)
DATA = re.compile(r'data:(image/[\w.+-]+|font/[\w.+-]+|application/[\w.+-]+);base64,[A-Za-z0-9+/=]+',re.I)
ROOT_URL = 'https://rtf-studios.github.io/wayfinder-preview/'

def optimize(raw, width=1400, quality=82):
    with Image.open(io.BytesIO(raw)) as source:
        fmt=source.format
        source=ImageOps.exif_transpose(source)
        alpha='A' in source.getbands() or 'transparency' in source.info
        im=source.convert('RGBA' if alpha else 'RGB')
        before=im.size
        im.thumbnail((width, max(width*4,2400)),Image.Resampling.LANCZOS)
        if fmt=='WEBP' and before==im.size and len(raw)<=250*1024:
            return raw,before,im.size,alpha
        out=io.BytesIO();im.save(out,'WEBP',quality=quality,method=6,exact=True)
        result=out.getvalue()
        with Image.open(io.BytesIO(result)) as check:
            check.load()
            if alpha and im.getchannel('A').tobytes()!=check.convert('RGBA').getchannel('A').tobytes():
                raise ValueError('Alpha changed during WebP conversion')
        return result,before,im.size,alpha

class Package:
    def __init__(self,root,lesson,width,quality):
        self.root=root.resolve();self.lesson=lesson;self.width=width;self.quality=quality
        self.media={};self.cache={};self.audit=[];self.derivatives={}
    def read(self,url):
        url=htmlmod.unescape(url)
        if url.startswith('data:'):
            header,payload=url.split(',',1)
            return base64.b64decode(payload) if ';base64' in header else unquote(payload).encode(),header[5:].split(';')[0],None
        if url.startswith(ROOT_URL): path=self.root/url[len(ROOT_URL):]
        elif not urlparse(url).scheme: path=(self.lesson.parent/url).resolve()
        else:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=45) as r: return r.read(),r.headers.get_content_type(),None
        if not path.resolve().is_relative_to(self.root):raise ValueError('Resource escapes repository: '+url)
        raw=path.read_bytes()
        ext=path.suffix.lower()
        mime={'.svg':'image/svg+xml','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.woff':'font/woff'}.get(ext,'image/'+ext.lstrip('.'))
        return raw,mime,path
    def add(self,url,category='learning-guide-assets'):
        if url in self.cache:return self.cache[url]
        raw,mime,path=self.read(url);old=len(raw);alpha=None;dims=None
        if mime.startswith('image/') and mime!='image/svg+xml':
            width=self.width if category=='lesson-content-assets' else min(self.width,960)
            source_raw=raw
            for fit in (width,min(width,1200),min(width,960),min(width,800)):
                for quality in (self.quality,76,68,60):
                    raw,before,after,alpha=optimize(source_raw,fit,quality)
                    if len(raw)<=250*1024:break
                if len(raw)<=250*1024:break
            mime='image/webp';dims=[before,after]
            if len(raw)>250*1024: raise ValueError('Image exceeds 250 KiB: '+url[:150])
            if path and 'assets' in path.parts:
                target=path.with_suffix('.webp')
                # Never overwrite an established derivative used by another source.
                if target.exists() and target.read_bytes()!=raw:target=target.with_name(target.stem+'-'+hashlib.sha256(raw).hexdigest()[:12]+'.webp')
            else:target=self.root/'assets'/category/(self.lesson.parent.name if category=='lesson-content-assets' else '')/(self.lesson.stem if category=='lesson-content-assets' else '')/('embedded-'+hashlib.sha256(raw).hexdigest()[:16]+'.webp')
            self.derivatives[target]=raw
        value='data:'+mime+';base64,'+base64.b64encode(raw).decode()
        key='m'+hashlib.sha256(raw).hexdigest()[:20]
        self.media[key]=value;self.cache[url]=key
        self.audit.append({'source':url[:250] if not url.startswith('data:') else 'embedded-original:'+hashlib.sha256(self.read(url)[0]).hexdigest(),'id':key,'prior_bytes':old,'final_bytes':len(raw),'dimensions':dims,'alpha':alpha})
        return key
    def css(self,text,base=None):
        if re.search(r'@import\b',text,re.I):
            raise ValueError('CSS @import must be resolved before packaging')
        def sub(m):
            url=m.group(2).strip()
            if url.startswith('#'):return m.group(0)
            if base and not urlparse(url).scheme:
                target=(base/url).resolve()
                if not target.is_relative_to(self.root):raise ValueError('CSS resource escapes repository')
                url=os.path.relpath(target,self.lesson.parent)
            key=self.add(url)
            return 'var(--wf-'+key+')'
        return re.sub(r'url\(\s*([\"\']?)(.*?)\1\s*\)',sub,text,flags=re.S)
    def build(self,text):
        if '<!-- '+VERSION+' -->' in text:
            live=re.sub(r'<(textarea|pre)\b[^>]*>[\s\S]*?</\1>','',text,flags=re.I)
            for tag in re.findall(r'<(?:img|source|script|link)\b[^>]*>',live,re.I):
                for value in re.findall(r'''(?:src|href)=["']([^"']+)["']''',tag,re.I):
                    if not value.startswith(('data:','#')):raise ValueError('Packaged source has a new external resource; rebuild media from its original source')
            return text,False
        # Literal teaching examples must remain byte-for-byte intact.
        protected=[]
        def protect(m):protected.append(m.group());return 'WF_PROTECTED_BLOCK_'+str(len(protected)-1)+'_END'
        text=re.sub(r'<(textarea|pre)\b[^>]*>[\s\S]*?</\1>',protect,text,flags=re.I)
        # Freeze rotation to the supplied approved pools; directory fetching is not offline.
        rotation='''<script>window.WF_ART={rotate:function(slot,kind,provided){if(!slot)return;var pool=(provided||[]).filter(function(x){return x&&x.src});if(!pool.length){slot.hidden=true;return}var start=Math.floor(Math.random()*pool.length),n=0;function next(){if(n>=pool.length){slot.hidden=true;return}var item=pool[(start+n++)%pool.length],im=new Image();im.alt=item.alt||'';im.onload=function(){slot.replaceChildren(im);slot.hidden=false};im.onerror=next;im.src=item.src}next()}};</script>'''
        text=re.sub(r'<script\b[^>]*src=[\"\'][^\"\']*artwork-rotation\.js[\"\'][^>]*>\s*</script>',lambda m:rotation,text,flags=re.I)
        def script(m):
            attrs,body=m.group(1),m.group(2)
            src=re.search(r'\bsrc=[\"\']([^\"\']+)[\"\']',attrs)
            if src:body=self.read(src.group(1))[0].decode('utf-8');attrs=re.sub(r'\bsrc=[\"\'][^\"\']+[\"\']','',attrs)
            # Existing config image src literals and data URIs; other JS is unchanged.
            pattern=r'''(["'])(data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+|(?:\.\./)*assets/[^"']+\.(?:png|jpe?g|webp|svg)|https://rtf-studios\.github\.io/wayfinder-preview/assets/[^"']+\.(?:png|jpe?g|webp|svg))\1'''
            body=re.sub(pattern,lambda x:'window.__WF_MEDIA['+json.dumps(self.add(x.group(2)))+']',body,flags=re.I)
            protected.append('<script'+attrs+'>'+body+'</script>');return 'WF_PROTECTED_BLOCK_'+str(len(protected)-1)+'_END'
        text=re.sub(r'<script\b([^>]*)>([\s\S]*?)</script>',script,text,flags=re.I)
        def link(m):
            tag=m.group();href=re.search(r'\bhref=[\"\']([^\"\']+)[\"\']',tag)
            if not href:return tag
            if re.search(r'rel=[\"\']stylesheet[\"\']',tag,re.I):
                raw,_,path=self.read(href.group(1))
                if path is None:raise ValueError('Remote stylesheet must be saved locally before packaging')
                return '<style>'+self.css(raw.decode(),path.parent)+'</style>'
            if re.search(r'rel=[\"\'](?:icon|shortcut icon)[\"\']',tag,re.I):
                key=self.add(href.group(1));return tag[:href.start()]+'data-wf-media="'+key+'"'+tag[href.end():]
            if re.search(r'rel=[\"\'](?:preconnect|dns-prefetch)[\"\']',tag,re.I):return ''
            return tag
        text=re.sub(r'<link\b[^>]*>',link,text,flags=re.I)
        def img(m):
            tag=m.group()
            def src(x):return 'data-wf-media="'+self.add(x.group(2),'lesson-content-assets')+'"'
            return re.sub(r'\bsrc\s*=\s*([\"\'])(.*?)\1',src,tag,flags=re.I)
        text=re.sub(r'<(?:img|source)\b[^>]*>',img,text,flags=re.I)
        text=re.sub(r'<style\b([^>]*)>([\s\S]*?)</style>',lambda m:'<style'+m.group(1)+'>'+self.css(m.group(2))+'</style>',text,flags=re.I)
        # Required image resource links (full sheets for snipping) are embedded too.
        text=re.sub(r'''(href=)(["'])([^"']+\.(?:png|jpe?g|webp|svg))\2''',lambda m:'data-wf-media="'+self.add(m.group(3),'lesson-content-assets')+'"',text,flags=re.I)
        for i,block in enumerate(protected):text=text.replace('WF_PROTECTED_BLOCK_'+str(i)+'_END',block)
        bootstrap='''<!-- VERSION -->
<script>window.__WF_MEDIA=MEDIA;
Object.keys(window.__WF_MEDIA).forEach(function(k){document.documentElement.style.setProperty('--wf-'+k,'url("'+window.__WF_MEDIA[k]+'")')});
function wfHydrateMedia(){document.querySelectorAll('[data-wf-media]').forEach(function(el){var v=window.__WF_MEDIA[el.dataset.wfMedia];if(v)el.setAttribute(el.tagName==='LINK'||el.tagName==='A'?'href':'src',v)})}
document.addEventListener('DOMContentLoaded',wfHydrateMedia);
</script>'''.replace('VERSION',VERSION).replace('MEDIA;',json.dumps(self.media,separators=(',',':'))+';',1)
        # Must precede config scripts and CSS consumers.
        if not re.search(r'</head>',text,re.I):raise ValueError('HTML needs a head closing tag')
        text=re.sub(r'</head>',lambda m:bootstrap+'\n'+m.group(),text,count=1,flags=re.I)
        return text,True

def validate(raw):
    """Use the same fail-closed checker for fresh and previously packaged HTML."""
    checker=Path(__file__).with_name('check-offline-html.cjs')
    with tempfile.TemporaryDirectory() as folder:
        candidate=Path(folder)/'candidate.html';candidate.write_bytes(raw)
        result=subprocess.run(['node',str(checker),str(candidate)],capture_output=True,text=True)
    if result.returncode:raise ValueError((result.stderr or result.stdout).strip())

def atomic_write(path,raw):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw);stream.flush();os.fsync(stream.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('lesson',type=Path);ap.add_argument('--root',type=Path,default=Path('.'))
    group=ap.add_mutually_exclusive_group(required=True);group.add_argument('--in-place',action='store_true');group.add_argument('--out',type=Path)
    ap.add_argument('--width',type=int,default=1400);ap.add_argument('--quality',type=int,default=82)
    args=ap.parse_args();p=Package(args.root,args.lesson,args.width,args.quality)
    original=args.lesson.read_bytes()
    try:
        result,changed=p.build(original.decode('utf-8'));raw=result.encode('utf-8')
        if len(raw)>2*1024*1024:raise ValueError('HTML exceeds 2 MiB')
        validate(raw)
        # Decode and verify each unique raster; fail before any source/asset replacement.
        for value in p.media.values():
            if value.startswith('data:image/webp;'):
                with Image.open(io.BytesIO(base64.b64decode(value.split(',',1)[1]))) as im:im.verify()
        for path,data in p.derivatives.items():
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():atomic_write(path,data)
        out=args.lesson if args.in_place else args.out
        if changed or out!=args.lesson:atomic_write(out,raw)
        print(json.dumps({'lesson':str(args.lesson),'prior_bytes':len(original),'final_bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'changed':changed,'images':p.audit}))
    except Exception as e:
        print(json.dumps({'lesson':str(args.lesson),'status':'HOLD','error':str(e)}));raise SystemExit(1)
if __name__=='__main__':main()
