'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const vm=require('node:vm');
const gate=require('./wayfinder-identity.cjs');
const root=path.resolve(__dirname,'..');
const clone=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label);}
const c={course:'Tech',dayid:'3050201',unit:5,part:2,day:1,title:'Build a Game from Shapes'};
// Synthetic inputs exercise comparisons; these are NOT production approval records.
function sources(x=c){return Object.fromEntries(['summary','masterOutline','controlStation'].map(name=>[name,{reference:'test-fixture:'+name,revision:'test-v1',locator:'fixture selected day',approved:true,identities:[clone(x)]}]))}
const raw='DAY 1 | DAYID 3050201 | STARTER | Build a Game from Shapes\nLEARNING TARGET: I can test because results matter.';
function reject(x=c,s=sources(),r=raw){assert.throws(()=>gate.preflight(x,s,r));}
test('valid Tech source comparison',()=>gate.preflight(c,sources(),raw));
for(const [course,id] of [['CS','2090301'],['AAVTC','1040101']])test('valid '+course,()=>{
 const x={...c,course,dayid:id,unit:Number(id.slice(1,3)),part:Number(id.slice(3,5))};gate.assertIdentity(x,sources(x));
});
for(const field of ['course','dayid','unit','part','day','title'])test('missing '+field,()=>{const x=clone(c);delete x[field];reject(x)});
for(const [field,value] of [['course','CS'],['dayid','305020'],['unit',4],['part',1],['day',2],['title','Wrong permanent title']])test('wrong '+field,()=>reject({...c,[field]:value}));
for(const name of ['summary','masterOutline','controlStation']){
 for(const field of ['reference','revision','locator','identities'])test(name+' missing '+field,()=>{const s=sources();delete s[name][field];reject(c,s)});
 test(name+' missing selected day',()=>{const s=sources();s[name].identities=[];reject(c,s)});
 test(name+' duplicate selected day',()=>{const s=sources();s[name].identities.push(c);reject(c,s)});
 test(name+' title mismatch',()=>{const s=sources();s[name].identities[0].title='Different';reject(c,s)});
 test(name+' wrong Part',()=>{const s=sources();s[name].identities[0].part=1;reject(c,s)});
}
test('summary approval absent',()=>{const s=sources();delete s.summary.approved;reject(c,s)});
for(const title of ['Monday — Lesson','Tue Nov 17 — Lesson','November 16 — Lesson','16 November — Lesson','2026-11-16 Lesson','11/16/2026 Lesson','20261116 Lesson'])test('calendar name '+title,()=>reject({...c,title}));
test('permanent prefixed Control Station title accepted',()=>{const s=sources();s.controlStation.identities[0].title='Unit 5 · Part 2 · Day 1 — '+c.title;gate.preflight(c,s,raw)});
test('incorrect Part in title rejected',()=>reject({...c,title:'Unit 5 · Part 1 · Day 1 — '+c.title}));
test('missing outline identity',()=>reject(c,sources(),'LEARNING TARGET only'));
test('wrong outline Day heading',()=>reject(c,sources(),raw.replace('DAY 1 |','DAY 2 |')));
test('wrong outline permanent title',()=>reject(c,sources(),raw.replace(c.title,'Other title')));
for(const [id,part,title] of [['3050201',1,'Build a Game from Shapes'],['3050301',2,'Give the Game a World'],['3050401',3,'Invent One Special Game Mechanic']])test('previous Tech phase-as-Part error '+id,()=>assert.throws(()=>gate.assertIdentity({...c,dayid:id,part,title},sources())));
// Exercise the actual JS production entry point: invalid inputs must fail before
// touching master HTML (the sentinel throws if construction even starts).
require('./wayfinder-outline-builder.js');
const m={...c,mode:'PERFORM',keys:[],identitySources:sources()};
test('JS production refuses absent sources before HTML construction',()=>assert.throws(()=>globalThis.WFBuilder.build(null,raw,{...m,identitySources:undefined},{}),/summary/));
test('JS production refuses bad Part before HTML construction',()=>assert.throws(()=>globalThis.WFBuilder.build(null,raw,{...m,part:1},{}),/Part/));
test('JS production accepts valid identity and constructs in memory',()=>{
 const lesson=raw+'\nWARM-UP\nThink about a familiar game.\nRECALL\nUse previous controls.\nPERFORM\n1. Open the file. 2. Save the file.\n';
 const h=globalThis.WFBuilder.build(fs.readFileSync(path.join(root,'templates/wayfinder-master.html'),'utf8'),lesson,m,{});
 assert.ok(h.includes('Tech · Unit 5 · Part 2 · Day 1'));assert.ok(h.includes(c.title));
});
test('browser production refuses missing validator',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'wayfinder-outline-builder.js'),'utf8'),ctx);
 assert.throws(()=>ctx.WFBuilder.build(null,raw,m,{}),/load wayfinder-identity/);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'wayfinder-identity.cjs'),'utf8'),ctx);
 assert.throws(()=>ctx.WFBuilder.build(null,raw,{...m,part:1},{}),/Part/);
});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wf-f1-'));
try{
 fs.mkdirSync(path.join(temp,'scripts'));fs.mkdirSync(path.join(temp,'templates'));fs.mkdirSync(path.join(temp,'Tech'));
 for(const file of fs.readdirSync(__dirname).filter(f=>/^(?:build-tech.*\.py|tech-u5.*source\.json|wayfinder_identity\.py|wayfinder-identity\.cjs)$/.test(f)))fs.copyFileSync(path.join(__dirname,file),path.join(temp,'scripts',file));
 fs.copyFileSync(path.join(root,'templates/wayfinder-master.html'),path.join(temp,'templates/wayfinder-master.html'));
 function run(file,args=[],env={}){const e={...process.env,...env};if(!env.WF_IDENTITY_SOURCES)delete e.WF_IDENTITY_SOURCES;return cp.spawnSync('python',[path.join(temp,'scripts',file),...args],{env:e,encoding:'utf8'});}
 for(const [file,args] of [['build-tech-u5-prototype.py',[]],['build-tech-u5-final-parts.py',['story']],['build-tech-u5-final-parts.py',['innovation']],['build-tech-u5-part1-day5.py',[]],['build-tech-u5-part1-day6.py',[]]])test('production '+file+' '+args+' stops without sources and preserves output',()=>{
  const r=run(file,args);assert.notEqual(r.status,0);assert.match(r.stderr,/WF_IDENTITY_SOURCES is required/);assert.equal(fs.readdirSync(path.join(temp,'Tech')).length,0);
 });
 // Previous phase-as-Part invalid cases remain above. Reconciled production
 // functions must now accept valid records and render the permanent Part.
 for(const [file,expr,x] of [
  ['build-tech-u5-prototype.py','m.build(1)',c],
  ['build-tech-u5-final-parts.py',"m.build('story',1)",{...c,dayid:'3050301',part:3,title:'Give the Game a World'}],
  ['build-tech-u5-final-parts.py',"m.build('innovation',1)",{...c,dayid:'3050401',part:4,title:'Invent One Special Game Mechanic'}]
 ])test('reconciled production '+x.dayid+' accepts valid identity',()=>{
  const input=path.join(temp,'sources.json');fs.writeFileSync(input,JSON.stringify(sources(x)));
  const script=path.join(temp,'scripts',file);
  const code="import sys,importlib.util;sys.path.insert(0,"+JSON.stringify(path.join(temp,'scripts'))+");s=importlib.util.spec_from_file_location('native',"+JSON.stringify(script)+");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"+expr;
  const r=cp.spawnSync('python',['-c',code],{env:{...process.env,WF_IDENTITY_SOURCES:input},encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const output=path.join(temp,'Tech',x.dayid+'.html');assert.match(fs.readFileSync(output,'utf8'),new RegExp('Unit 5 · Part '+x.part+' · Day 1'));fs.unlinkSync(output);
 });
 test('invalid native build preserves an existing file byte for byte',()=>{
  const x={course:'Tech',dayid:'3050105',unit:5,part:1,day:5,title:'Wrong source title'};
  fs.writeFileSync(path.join(temp,'sources.json'),JSON.stringify(sources(x)));
  const output=path.join(temp,'Tech/3050105.html'),sentinel=Buffer.from('existing immutable lesson\n');fs.writeFileSync(output,sentinel);
  const r=run('build-tech-u5-part1-day5.py',[],{WF_IDENTITY_SOURCES:path.join(temp,'sources.json')});assert.notEqual(r.status,0);assert.match(r.stderr,/title mismatch/);assert.deepEqual(fs.readFileSync(output),sentinel);
 });
 test('valid native builder writes only isolated temporary output',()=>{
  const x={course:'Tech',dayid:'3050105',unit:5,part:1,day:5,title:'TurboWarp Desktop Fundamentals'};
  fs.writeFileSync(path.join(temp,'sources.json'),JSON.stringify(sources(x)));
  const r=run('build-tech-u5-part1-day5.py',[],{WF_IDENTITY_SOURCES:path.join(temp,'sources.json')});assert.equal(r.status,0,r.stderr);
  assert.ok(fs.readFileSync(path.join(temp,'Tech/3050105.html'),'utf8').includes(x.title));
 });
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',tests:passed,canonicalHTMLWrites:0}));
