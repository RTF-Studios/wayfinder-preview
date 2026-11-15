'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),C=require('./wayfinder-content-contract.cjs');
process.env.M1_PILOT_FIXTURE=path.join(__dirname,'fixtures/m1c-3050201');
process.env.M1B_PILOT_DIR=process.env.M1C_PILOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'m1c-pilot-'));
require('./test-m1b-3050201.cjs'); // unchanged production entry + seven F1/M1 rejection cases
const source=JSON.parse(fs.readFileSync(path.join(process.env.M1_PILOT_FIXTURE,'source-copy.json'))),record=C.extractLesson(source,'3050201'),native=source.tabs[0].text.split('\n:::lesson')[0];
source.curriculumReviews={'3050201':require('./fixtures/m2-review-fixtures.cjs').pilotReview(record)};
const original=fs.readFileSync(path.join(root,'Tech/3050201.html')),master=fs.readFileSync(path.join(root,'templates/wayfinder-master.html')),output=path.join(process.env.M1B_PILOT_DIR,'3050201.html'),good=fs.readFileSync(output);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const testDir=fs.mkdtempSync(path.join(os.tmpdir(),'m1c-negative-')),src=path.join(testDir,'source.json'),out=path.join(testDir,'preserve.html');
const code='import sys;sys.path.insert(0,'+JSON.stringify(path.join(root,'scripts'))+');from wayfinder_lesson import build_from_outline;from pathlib import Path;build_from_outline('+JSON.stringify(record.payload.identity)+',"STARTER",Path('+JSON.stringify(path.join(root,'templates/wayfinder-master.html'))+').read_text(),'+JSON.stringify(out)+')';
const cases=[
 ['missing disclosure help',p=>delete p.presentation.layout.perform.steps[0].help],
 ['changed disclosure content',p=>p.presentation.layout.perform.steps[0].help='Invented instruction'],
 ['missing diagram',p=>p.presentation.layout.roadmap.mediaId='missing'],
 ['invalid placeholder identity',p=>p.presentation.layout.answerPlaceholders[0].fullKey='305020130060'],
 ['duplicate placeholder identity',p=>p.presentation.layout.answerPlaceholders.push(p.presentation.layout.answerPlaceholders[0])],
 ['missing skit lines',p=>p.presentation.layout.skits[0].lines=[]],
 ['incomplete checklist',p=>p.presentation.layout.checklist.pop()],
 ['unsupported presentation field',p=>p.presentation.layout.customScript='invalid'],
 ['inline vocabulary omission',p=>p.sections.find(s=>s.id==='group_learn').text='Missing vocabulary'],
 ['network-bearing SVG',p=>p.media.items.find(m=>m.id==='classroom-model').dataUri='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.org/a"/></svg>').toString('base64')],
 ['executable SVG',p=>p.media.items.find(m=>m.id==='classroom-model').dataUri='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>').toString('base64')]
];
let rejected=0;
try{for(const [label,mutate] of cases){const p=JSON.parse(JSON.stringify(record.payload));mutate(p);const bad=JSON.parse(JSON.stringify(source));bad.tabs[0].text=native+'\n:::lesson 3050201\n'+Object.entries(p).map(([k,v])=>':::'+k+'\n'+JSON.stringify(v)).join('\n')+'\n:::endlesson\n';fs.writeFileSync(src,JSON.stringify(bad));for(const bytes of [original,good]){fs.writeFileSync(out,bytes);const r=cp.spawnSync('python',['-c',code],{encoding:'utf8',env:{...process.env,WF_MASTER_OUTLINE_SOURCE:src,WF_IDENTITY_SOURCES:path.join(__dirname,'fixtures/m1b-3050201/identity-sources.json')}});assert.notEqual(r.status,0,label);assert.match(r.stderr,/M1/);assert.deepEqual(fs.readFileSync(out),bytes,label+' overwrite');rejected++;}}
 // Renderer/packaging failures also happen before the native output write.
 const noSlot=master.toString().replace('data-slot="lesson-title"','data-slot="missing-title"');
 assert.throws(()=>C.buildRecord(noSlot,record,source,JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m1b-3050201/identity-sources.json')))),/missing master slot/);
 assert.deepEqual(fs.readFileSync(output),good);
}finally{fs.rmSync(testDir,{recursive:true,force:true})}
assert.deepEqual(fs.readFileSync(path.join(root,'Tech/3050201.html')),original);assert.deepEqual(fs.readFileSync(path.join(root,'templates/wayfinder-master.html')),master);
const result={status:'PASS',nativeBuild:'F1 + M1 production entry',question:'305020130059',responseFields:1,originalSha256:sha(original),masterSha256:sha(master),outputSha256:sha(good),outputBytes:good.length,sourceSha256:record.provenance.sourceSha256,negativeNativeBuilds:7+rejected,rendererFailure:'rejects before output write',canonicalWrites:0,clipboard:'UNTESTED',collectorReceipt:'UNTESTED'};
fs.writeFileSync(path.join(process.env.M1B_PILOT_DIR,'static-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
