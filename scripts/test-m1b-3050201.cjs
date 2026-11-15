'use strict';
// Isolated production-entry compatibility pilot. Never writes course HTML.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(__dirname,'fixtures/m1b-3050201'),base=path.join(__dirname,'fixtures/m1a-3050201');
const source=JSON.parse(fs.readFileSync(path.join(dir,'source-copy.json'))),identities=JSON.parse(fs.readFileSync(path.join(dir,'identity-sources.json'))),C=require('./wayfinder-content-contract.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const original=fs.readFileSync(path.join(root,'Tech/3050201.html')),master=fs.readFileSync(path.join(root,'templates/wayfinder-master.html'));
assert.equal(sha(original),'7471096fba1388814b6330f6ac4baca5b57f7ce72601aeb3846816caf4679b41');assert.deepEqual(original,fs.readFileSync(path.join(base,'original.html.txt')));
const record=C.extractLesson(source,'3050201'),q=record.payload.evidence.graded.items[0];
assert.equal(q.fullKey,'305020130059');assert.equal(q.parts.length,1);assert.equal(q.parts[0].answerType,'short_text');
const native=fs.readFileSync(path.join(base,'original-day.txt'),'utf8');assert.equal(source.tabs[0].text.split('\n:::lesson')[0],native);assert.ok(native.includes('FULL KEY '+q.fullKey+': '+q.prompt));assert.ok(native.includes('PINNED HOLISTIC RUBRIC: '+q.rubric.text));
const temp=process.env.M1B_PILOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'m1b-pilot-'));fs.mkdirSync(temp,{recursive:true});
const output=path.join(temp,'3050201.html'),src=path.join(temp,'source.json'),ids=path.join(temp,'identities.json');fs.writeFileSync(src,JSON.stringify(source));fs.writeFileSync(ids,JSON.stringify(identities));
const code='import sys;sys.path.insert(0,'+JSON.stringify(path.join(root,'scripts'))+');from wayfinder_lesson import build_from_outline;from pathlib import Path;build_from_outline('+JSON.stringify(record.payload.identity)+',"STARTER",Path('+JSON.stringify(path.join(root,'templates/wayfinder-master.html'))+').read_text(),'+JSON.stringify(output)+')';
function run(){return cp.spawnSync('python',['-c',code],{encoding:'utf8',env:{...process.env,WF_MASTER_OUTLINE_SOURCE:src,WF_IDENTITY_SOURCES:ids}});}
let r=run();assert.equal(r.status,0,r.stderr);const built=fs.readFileSync(output,'utf8');assert.equal((built.match(/data-open-response/g)||[]).length>=1,true);assert.ok(built.includes(q.prompt));assert.ok(!built.includes(q.rubric.text));
const scripts=h=>[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.includes('function assemble(which){')).map(x=>x.replace(/const WAYFINDER_CONFIG=\{[^\n]*\};/,'const WAYFINDER_CONFIG={};'));
assert.deepEqual(scripts(built),scripts(master.toString()));assert.deepEqual([...built.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]),[...master.toString().matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]));
const before=fs.readFileSync(output);let negatives=0;
for(const mutate of [p=>p.evidence.graded.items[0].parts[0].acceptedAnswers=[],p=>p.evidence.graded.items[0].parts[0].answerType='invented',p=>p.evidence.graded.items.push(p.evidence.graded.items[0]),p=>p.evidence.graded.items[0].rubric.bands.pop()]){
 const bad=JSON.parse(JSON.stringify(source)),payload=JSON.parse(JSON.stringify(record.payload));mutate(payload);bad.tabs[0].text=native+'\n:::lesson 3050201\n'+Object.entries(payload).map(([k,v])=>':::'+k+'\n'+JSON.stringify(v)).join('\n')+'\n:::endlesson\n';fs.writeFileSync(src,JSON.stringify(bad));r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/M1/);assert.deepEqual(fs.readFileSync(output),before);negatives++;
}
fs.writeFileSync(src,JSON.stringify(source));const badIds=JSON.parse(JSON.stringify(identities));badIds.controlStation.identities[0].part=1;fs.writeFileSync(ids,JSON.stringify(badIds));r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/identity|F1|controlStation/i);assert.deepEqual(fs.readFileSync(output),before);negatives++;
// Repeat failed validation with an exact original HTML copy as the output target.
fs.writeFileSync(output,original);r=run();assert.notEqual(r.status,0);assert.deepEqual(fs.readFileSync(output),original);
fs.writeFileSync(ids,JSON.stringify(identities));const bad=JSON.parse(JSON.stringify(source));
// Mutate through the typed payload rather than relying on whitespace in its serialization.
const invalidPayload=JSON.parse(JSON.stringify(record.payload));invalidPayload.evidence.graded.items[0].parts[0].acceptedAnswers=[];bad.tabs[0].text=native+'\n:::lesson 3050201\n'+Object.entries(invalidPayload).map(([k,v])=>':::'+k+'\n'+JSON.stringify(v)).join('\n')+'\n:::endlesson\n';fs.writeFileSync(src,JSON.stringify(bad));r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/M1/);assert.deepEqual(fs.readFileSync(output),original);fs.writeFileSync(src,JSON.stringify(source));r=run();assert.equal(r.status,0,r.stderr);fs.writeFileSync(path.join(temp,'original.html'),original);
assert.deepEqual(fs.readFileSync(path.join(root,'Tech/3050201.html')),original);assert.deepEqual(fs.readFileSync(path.join(root,'templates/wayfinder-master.html')),master);
const result={status:'PASS',scope:'isolated production native bridge with F1 and M1',question:q.fullKey,responseFields:1,answerType:'short_text',promptAndRubric:'verbatim',negativeBuilds:negatives+2,failedBuildPreservesOriginal:true,failedBuildPreservesPreviousBuild:true,masterEngineAndCSS:'unchanged',canonicalWrites:0,originalSha256:sha(original),outputSha256:sha(fs.readFileSync(output)),browser:'UNTESTED by this script',contentAndLayoutComparison:'separate comparison required'};
if(process.env.M1B_RESULTS_PATH)fs.writeFileSync(process.env.M1B_RESULTS_PATH,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(!process.env.M1B_PILOT_DIR)fs.rmSync(temp,{recursive:true,force:true});
