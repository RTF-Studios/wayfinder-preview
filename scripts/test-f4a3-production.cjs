'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const C=require('./wayfinder-content-contract.cjs'),M2=require('./wayfinder-curriculum-quality.cjs');
const root=path.resolve(__dirname,'..'),base=path.join(__dirname,'fixtures/f4a3-production'),source=JSON.parse(fs.readFileSync(path.join(base,'current-native-source.json'))),e=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m4-delivery/evidence.json')));
const out=process.env.F4A3_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'f4a3-production-'));fs.mkdirSync(path.join(out,'Tech'),{recursive:true});
const master=fs.readFileSync(path.join(root,'templates/wayfinder-master.html'),'utf8'),clone=x=>JSON.parse(JSON.stringify(x)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),rows=[];
const protectedFiles=cp.execFileSync('git',['ls-files','Tech/*.html','CS/*.html','AAVTC/*.html','templates/wayfinder-master.html'],{cwd:root,encoding:'utf8'}).trim().split('\n');const before=Object.fromEntries(protectedFiles.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
function test(name,fn){fn();rows.push({name,status:'PASS'})}
const identities={};for(const id of ['3050202','3050203']){
 const identitySources=e.entries[id].identitySources;identities[id]=identitySources;
 const r=C.extractLesson(source,id);test(id+' raw native extraction + M1/M2',()=>{assert.equal(r.sourceText,source.tabs.find(t=>t.id===r.provenance.tabId).text);C.validateRecord(r,source);assert.equal(M2.preflight(r,source.curriculumReviews[id]).status,'PASS')});
 const html=C.buildRecord(master,r,source,identitySources);fs.writeFileSync(path.join(out,'Tech',id+'.html'),html);
 test(id+' strict offline + hidden key + current master',()=>{assert.deepEqual(require('./check-offline-html.cjs').inspect(Buffer.from(html)),[]);assert.deepEqual(require('../.github/guide-identity-qa.cjs').validate('Tech/'+id+'.html',html),[]);assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1],master.match(/<style>([\s\S]*?)<\/style>/)[1]);});
 // Normal JS entry, same source/tab; no typed block or audit-fixture loader.
 test(id+' normal WFBuilder entry',()=>{require('./wayfinder-outline-builder.js');assert.equal(globalThis.WFBuilder.build(master,r.sourceText,{...r.payload.identity,mode:r.payload.mode,source,identitySources},{}),html)});
 const src=path.join(out,'native-source.json'),ids=path.join(out,'identity-sources.json'),dest=path.join(out,'native-'+id+'.html');fs.writeFileSync(src,JSON.stringify(source));fs.writeFileSync(ids,JSON.stringify(identitySources));
 const pythonCode='import sys;sys.path.insert(0,'+JSON.stringify(path.join(root,'scripts'))+');from wayfinder_lesson import build_from_outline;from pathlib import Path;build_from_outline('+JSON.stringify(r.payload.identity)+','+JSON.stringify(r.payload.mode)+',Path('+JSON.stringify(path.join(root,'templates/wayfinder-master.html'))+').read_text(),'+JSON.stringify(dest)+')';
 const run=s=>{fs.writeFileSync(src,JSON.stringify(s));return cp.spawnSync('python',['-c',pythonCode],{env:{...process.env,WF_MASTER_OUTLINE_SOURCE:src,WF_IDENTITY_SOURCES:ids},encoding:'utf8'})};
 test(id+' normal Python native entry',()=>{const x=run(source);assert.equal(x.status,0,x.stderr);assert.equal(fs.readFileSync(dest,'utf8'),html)});
 const cases=[['changed native instruction',s=>s.tabs.find(t=>t.id===r.provenance.tabId).text+='\nAltered instruction'],['missing current overview',s=>s.tabs=s.tabs.filter(t=>t.id!=='t.0')],['duplicate native day',s=>s.tabs.push({...s.tabs.find(t=>t.id===r.provenance.tabId),id:'duplicate'})],['wrong document',s=>s.documentId='other-doc'],['fixture input',s=>s.fixtureOnly=true],['missing curriculum review',s=>delete s.curriculumReviews[id]],['stale review',s=>s.curriculumReviews[id].binding.sourceSha256='0'.repeat(64)],['stale revision',s=>s.revision+='-changed'],['changed rubric review',s=>s.curriculumReviews[id].questions[0].rubricText='Different rubric']];
 for(const [name,mutate]of cases)test(id+' rejects '+name+' before overwrite',()=>{const bad=clone(source);mutate(bad);const bytes=fs.readFileSync(dest),x=run(bad);assert.notEqual(x.status,0,name);assert.deepEqual(fs.readFileSync(dest),bytes)});
 test(id+' unknown instruction presentation field rejected',()=>{const p=clone(r.payload);p.presentation.instructionLayout.customScript='bad';assert.throws(()=>C.validatePayload(p),/unsupported field/)});
 test(id+' wrong mode composition rejected',()=>{const p=clone(r.payload);p.mode='ASSESSMENT';assert.throws(()=>C.validatePayload(p))});
}
fs.writeFileSync(path.join(out,'identity-sources-by-day.json'),JSON.stringify(identities,null,2));
test('all production HTML and universal master unchanged',()=>protectedFiles.forEach(p=>assert.equal(sha(fs.readFileSync(path.join(root,p))),before[p],p)));
const results={status:'PASS',tests:rows.length,checks:rows,output:out,protectedSha256:before,productionWrites:0,sourceWrites:0,studentRelease:false};fs.writeFileSync(path.join(out,'static-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:results.status,tests:rows.length,output:out,productionWrites:0}));
