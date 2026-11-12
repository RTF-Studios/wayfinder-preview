#!/usr/bin/env python3
"""Fast source/identity/engine/offline checks; no Captain acceptance claims."""
import json,re,hashlib,subprocess,sys,importlib.util
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('parts',ROOT/'scripts/build-tech-u5-final-parts.py');B=importlib.util.module_from_spec(spec);spec.loader.exec_module(B)
master=(ROOT/'templates/wayfinder-master.html').read_text();ms=BeautifulSoup(master,'html.parser')
def config_engine(text):
    js=next(x.string for x in BeautifulSoup(text,'html.parser').find_all('script') if 'const WAYFINDER_CONFIG=' in (x.string or ''))
    match=re.search(r'const WAYFINDER_CONFIG=(.*?);',js)
    try:cfg=json.loads(re.sub(r'window\.__WF_MEDIA\["[^"]+"\]', '"EMBEDDED"',match[1]))
    except json.JSONDecodeError:cfg={}
    return cfg,js[:match.start(1)]+'{}'+js[match.end(1):]
_,engine=config_engine(master)
pins=json.loads((ROOT/'scripts/tech-u5-collector-pins.json').read_text())
pins={str(r[0]):{'prompt':r[1],'rubric':r[2]} for r in pins['daily']+[[r[0],r[2],r[3]] for r in pins['major']]}
results=[]
for phase in sys.argv[1:] or ['story','innovation']:
    source=json.loads((ROOT/f'scripts/tech-u5-{phase}-source.json').read_text())
    for i,tab in enumerate(source['tabs'][1:],1):
        did=('30503' if phase=='story' else '30504')+f'{i:02d}';p=ROOT/'Tech'/f'{did}.html';text=p.read_text();doc=BeautifulSoup(text,'html.parser');cfg,actual=config_engine(text)
        assert actual==engine,(did,'master script changed')
        assert doc.find('style').string==ms.find('style').string,(did,'master CSS changed')
        assert doc.title.string=='RTF Learning Guide'
        ids=[x['id'] for x in doc.select('[id]')];assert len(ids)==len(set(ids)),(did,'duplicate IDs')
        subprocess.run(['node','scripts/check-offline-html.cjs',str(p)],cwd=ROOT,check=True,capture_output=True)
        for js in doc.find_all('script'):
            r=subprocess.run(['node','--check'],input=js.string or '',text=True,capture_output=True);assert r.returncode==0,(did,r.stderr)
        records=B.source_records(tab['text']);assert len(records)==(1 if i<=3 else 4 if i==4 else 0),(did,'record count')
        destinations=cfg['destinations'];expected={did+'29999',did+'20000'}|({did+'09998'} if i<=3 else set())|{r['key'] for r in records}
        actualkeys=[url.split('entry.1954781253=')[1] for url in destinations.values()];assert set(actualkeys)==expected and len(actualkeys)==len(expected),(did,'Form identity count')
        assert all(url==B.P.FORM+key for url,key in zip(destinations.values(),actualkeys)),(did,'Form destination')
        visible=doc.get_text(' ',strip=True)
        for pre in doc.select('pre[aria-label="Block recipe"]'):
            stack=[];started=False
            for raw in pre.get_text().splitlines():
                line=raw.strip()
                if not line:continue
                if line.startswith('when '):assert not stack,(did,'event inside control');started=True;continue
                if not started:continue
                if line=='end':assert stack,(did,'unmatched end');stack.pop()
                elif line=='forever' or line.startswith(('if ','repeat until ')):stack.append(line)
                else:assert line.startswith(('set ','change ','go ','say ','wait ','stop ')),(did,'unknown displayed block',line)
            assert not stack,(did,'unclosed displayed block')
        assert not re.search(r'\b\d{12}\b',visible),(did,'visible hidden identity')
        target=B.field(tab['text'],'LEARNING TARGET:');assert doc.select_one('[data-slot="learning-target"]').get_text(' ',strip=True)==target
        for rec in records:
            assert rec['key'] in pins and pins[rec['key']]=={'prompt':rec['prompt'],'rubric':rec['rubric']},(did,'source/Collector mismatch',rec['key'])
            assert rec['prompt'] in visible,(did,'visible question mismatch')
        if i<=3:
            root=doc.select_one('[data-assembler="one"]');assert len(root.find_all('textarea'))==1
            assert doc.select_one('[data-slot="perform-steps"]') and len(doc.select('.perform-step'))>=4
            assert doc.select_one('[data-slot="q1-help"]')
            assert len(doc.select('.gate-check'))==4
        if i==1:assert doc.find(id='partRoadmap') and doc.find(id='groupLearn')
        if i in [2,3,4,5]:assert not doc.find(id='groupLearn') and not doc.find(id='groupPractice')
        if i==4:assert len(doc.select('.assessment-section'))==4 and not doc.find(id='perform') and doc.find(id='studyRecall')
        if i==5:assert cfg['mode']=='RECOVERY' and not records and not doc.find(id='masteryOne')
        assert len(doc.select('.lab-grid .lab'))==3 and len(doc.select('#studioEvidence'))==1
        assert not doc.select('template')
        assert not re.search(r'\[(?:During|Configured|Plain-language|Suggested|Mirrored)',visible),(did,'unfilled slot')
        b=p.read_bytes();results.append({'path':str(p.relative_to(ROOT)),'source_document':source['documentId'],'source_revision':source['revision'],'checks':'PASS — source/question/rubric/Collector/full keys; unchanged master JS/CSS; JS syntax; unique IDs; mode/scaffold; embedded offline checker','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'questions':len(records),'Captain_Forms_visual_student_function':'UNTESTED'})
    print(phase,'PASS',len(source['tabs'])-1)
(ROOT/'scripts'/('tech-u5-'+('-'.join(sys.argv[1:]) or 'final-parts')+'-results.json')).write_text(json.dumps({'master_sha256':hashlib.sha256(master.encode()).hexdigest(),'status':'ENGINEERING PASS — CAPTAIN INSPECTION UNTESTED','files':results},indent=2)+'\n')
