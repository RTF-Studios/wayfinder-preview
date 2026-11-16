'use strict';
// F4a2 isolated mapping checks only. Never invokes buildRecord or a renderer.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const C=require('../../wayfinder-content-contract.cjs'),M2=require('../../wayfinder-curriculum-quality.cjs'),F1=require('../../wayfinder-identity.cjs');
const dir=__dirname,root=path.resolve(dir,'../../..'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'mapping-manifest.json')));
const identityEvidence=JSON.parse(fs.readFileSync(path.join(dir,'../m4-delivery/evidence.json')));
const clone=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const protectedPaths=['Tech/3050201.html','Tech/3050202.html','Tech/3050203.html','templates/wayfinder-master.html','scripts/wayfinder-identity.cjs','scripts/wayfinder-content-contract.cjs','scripts/schema/wayfinder-lesson.schema.json','scripts/wayfinder-curriculum-quality.cjs','scripts/wayfinder-record-renderer.cjs','scripts/wayfinder-presentation.cjs','scripts/wayfinder-outline-builder.js','scripts/build-tech-u5-prototype.py','scripts/build-tech-u5-final-parts.py','scripts/build-tech-u5-part1-day5.py','scripts/build-tech-u5-part1-day6.py','scripts/check-batch-delivery.py'];
const before=Object.fromEntries(protectedPaths.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
const rows=[],guides=[];function test(name,fn){fn();rows.push({name,status:'PASS'});}
function preservation(source,p,m){
 const original=source.derivedFrom.paragraphs.join('\n');
 assert.equal(sha(original),m.nativeTextSha256);assert.equal(source.derivedFrom.originalTextSha256,m.nativeTextSha256);
 assert.equal(source.tabs[0].text.slice(0,source.tabs[0].text.indexOf('\n\n:::lesson ')),original);
 assert.deepEqual(source.derivedFrom.paragraphs,m.originalParagraphs);
 assert.equal(m.coverage.length,m.originalParagraphs.length);m.coverage.forEach((x,i)=>assert.equal(x.sha256,sha(m.originalParagraphs[i])));
 const surfaces=p.sections.filter(s=>s.status==='applicable').flatMap(s=>[s.text,s.steps.join(' ')]).concat(p.activities.map(a=>a.instructions));
 for(const placement of Object.values(m.instructionPlacements)){
  const occurrences=surfaces.map(x=>x.split(placement.paragraph).length-1).reduce((a,b)=>a+b,0);
  assert.equal(occurrences,1,'Approved instruction omitted or duplicated: '+placement.field);
 }
 const raw=m.originalParagraphs.join('\n'),question=raw.match(/DAILY MASTERY STUDENT QUESTION — FULL KEY (\d{12}): ([^\n]+)/),rubric=raw.match(/PINNED HOLISTIC RUBRIC: ([^\n]+)/)[1];
 const q=p.evidence.graded.items[0];assert.equal(q.fullKey,question[1]);assert.equal(q.prompt,question[2]);assert.equal(q.rubric.text,rubric);
 const section=id=>p.sections.find(s=>s.id===id);
 assert.equal(p.learningTarget.text,raw.match(/^LEARNING TARGET: (.+)$/m)[1]);
 assert.equal(section('warm_up').text,raw.match(/^WARM-UP \([^\n]+\): (.+)$/m)[1]);
 assert.equal(section('hand_in').text,raw.match(/^INDEPENDENCE: (.+)$/m)[1]);
 assert.equal(section('temperature').text,raw.match(/^TEKS TEMPERATURE CHECK: (.+)$/m)[1]);
 assert.equal(section('next_day_bridge').text,raw.match(/^NEXT DAY PREPARATION: (.+)$/m)[1]);
 const studio=raw.match(/^CREATIVE STUDIO [^\n]+: (.+)$/m)[1];
 assert.deepEqual(p.presentation.studioIdeas.items.map(x=>x.instructions),studio.split(';').map(x=>x.trim()));
 assert.equal(q.parts.length,1);assert.equal(q.parts[0].answerType,'short_text');assert.deepEqual(q.parts[0].acceptedAnswers,[rubric.match(/70–89 (.+?);/)[1]]);
 assert.equal(p.evidence.xtra.warmUp.fullKey,p.identity.dayid+'09998');assert.equal(p.evidence.xtra.temperature.fullKey,p.identity.dayid+'29999');assert.equal(p.evidence.xtra.studio.fullKey,p.identity.dayid+'20000');
 assert.deepEqual(p.pacing.map(x=>x.minutes),[4,13,7,6,15,5]);assert.equal(p.pacing.reduce((n,x)=>n+x.minutes,0),50);
 m.pacing.forEach((x,i)=>{assert.equal(x.minutes,x.workMinutes+x.transitionMinutes+x.submissionMinutes);assert.equal(x.sourceLabel,p.pacing[i].id);assert.equal(x.mappedSectionId,p.pacing[i].sectionId);});
 assert.equal(m.pacing.reduce((n,x)=>n+x.workMinutes,0),42);assert.equal(m.pacing.reduce((n,x)=>n+x.transitionMinutes,0),4);assert.equal(m.pacing.reduce((n,x)=>n+x.submissionMinutes,0),4);
}
const fixtures={};
for(const id of ['3050202','3050203']){
 const source=JSON.parse(fs.readFileSync(path.join(dir,id+'.source.json'))),m=manifest.mappings[id],record=C.extractLesson(source,id),p=record.payload,review=source.curriculumReviews[id];fixtures[id]={source,m,record,p,review};
 test(id+' is isolated; original native source preserved',()=>{assert.equal(source.fixtureOnly,true);preservation(source,p,m);});
 test(id+' F1 independent identity comparison',()=>F1.preflight(p.identity,identityEvidence.entries[id].identitySources,record.sourceText));
 test(id+' strict M1 extraction and provenance validation',()=>assert.deepEqual(C.validateRecord(record,source),record));
 test(id+' unchanged M2 exact-source review',()=>assert.equal(M2.preflight(record,review).status,'PASS'));
 test(id+' four handoffs inside the approved50minutes',()=>{assert.equal(review.pacing.submissionCount,4);assert.equal(review.pacing.allocations.reduce((n,x)=>n+x.workMinutes+x.transitionMinutes+x.submissionMinutes,0),50);});
 test(id+' source vocabulary definitions are not invented',()=>p.vocabulary.forEach(v=>assert(m.instructionPlacements.learn.paragraph.includes(v.definition))));
 guides.push({dayid:id,mode:p.mode,M1:'PASS',M2:'PASS',F1:'PASS',originalNativeTextSha256:m.nativeTextSha256,mappedSourceTextSha256:record.provenance.sourceSha256,payloadSha256:M2.binding(record).payloadSha256,originalParagraphs:m.originalParagraphs.length,question:qSummary(p),instructionOccurrences:'Every original Learn/Practice/Perform passage exactly once in mapped instruction surfaces',pacing:{sourceSlots:p.pacing.map(x=>x.minutes),workMinutes:42,transitionMinutes:4,submissionMinutes:4,totalMinutes:50,handoffs:4},liveNativeSourceConverted:false});
}
function qSummary(p){const q=p.evidence.graded.items[0];return {fullKey:q.fullKey,responseFields:q.parts.length,answerType:q.parts[0].answerType,promptAndRubric:'verbatim'};}
test('Learn has one connected guided activity; no separate Perform workload',()=>{const p=fixtures['3050202'].p;assert.equal(p.sections.find(s=>s.id==='perform').status,'not_applicable');assert.equal(p.activities.length,1);assert.equal(p.activities[0].id,'connected-player-controls');assert.equal(p.activities[0].sectionId,'group_practice');assert.equal(p.pacing.filter(x=>x.sectionId==='group_practice').reduce((n,x)=>n+x.minutes,0),22);});
test('Perform preserves preparation and independent five-drop project',()=>{const p=fixtures['3050203'].p;assert.equal(p.sections.find(s=>s.id==='group_learn').status,'not_applicable');assert(p.sections.find(s=>s.id==='group_practice').text.includes('Compare one loop that repeats the entire game'));assert(p.activities[0].instructions.includes('changes only one parameter'));assert(p.sections.find(s=>s.id==='perform').steps.join(' ').includes('test at least five drops'));assert(p.sections.find(s=>s.id==='perform').steps.join(' ').includes('observed spawn x changes, fall direction and restart behavior'));});
test('M1 still rejects active Perform in Learn',()=>{const p=clone(fixtures['3050202'].p),s=p.sections.find(x=>x.id==='perform');Object.assign(s,{status:'applicable',title:'Project',text:'Unapproved separate project',steps:['Unapproved step']});delete s.reason;assert.throws(()=>C.validatePayload(p),/perform: must be explicitly not_applicable for LEARN/);});
test('M1 still rejects active Group Learn in Perform',()=>{const p=clone(fixtures['3050203'].p),s=p.sections.find(x=>x.id==='group_learn');Object.assign(s,{status:'applicable',title:'New Learn workload',text:'Unapproved duplicate teaching',steps:[]});delete s.reason;assert.throws(()=>C.validatePayload(p),/group_learn: must be explicitly not_applicable for PERFORM/);});
test('missing native Practice cannot pass preservation',()=>{const f=fixtures['3050203'],p=clone(f.p);p.activities[0].instructions='Omitted source activity';assert.throws(()=>preservation(f.source,p,f.m),/Approved instruction omitted or duplicated/);});
test('duplicate guided build cannot pass preservation',()=>{const f=fixtures['3050202'],p=clone(f.p);p.activities.push({...p.activities[0],id:'duplicate-guided-build'});assert.throws(()=>preservation(f.source,p,f.m),/Approved instruction omitted or duplicated/);});
test('omitting five-drop observation cannot pass preservation',()=>{const f=fixtures['3050203'],p=clone(f.p);p.sections.find(s=>s.id==='perform').steps[0]='Build without the approved tests';assert.throws(()=>preservation(f.source,p,f.m),/Approved instruction omitted or duplicated/);});
test('original raw source cannot be silently edited',()=>{const f=fixtures['3050202'],s=clone(f.source);s.derivedFrom.paragraphs[0]='Changed authoritative heading';assert.throws(()=>preservation(s,f.p,f.m));});
test('M2 still rejects missing review',()=>assert.throws(()=>M2.preflight(fixtures['3050202'].record,null),/REVIEW_REQUIRED/));
test('M2 still rejects stale source review',()=>{const f=fixtures['3050203'],r=clone(f.review);r.binding.sourceSha256='0'.repeat(64);assert.throws(()=>M2.preflight(f.record,r),/REVIEW_STALE/);});
test('M2 still rejects changed frozen rubric',()=>{const f=fixtures['3050202'],r=clone(f.review);r.questions[0].rubricText='Different scoring';assert.throws(()=>M2.preflight(f.record,r),/QUESTION_RUBRIC_MISMATCH/);});
test('M2 still rejects extra workload beyond source slot',()=>{const f=fixtures['3050203'],r=clone(f.review);r.pacing.allocations[0].workMinutes+=1;assert.throws(()=>M2.preflight(f.record,r),/PACING_MISMATCH/);});
test('M2 still rejects unbudgeted handoffs',()=>{const f=fixtures['3050202'],r=clone(f.review);r.pacing.submissionCount=0;assert.throws(()=>M2.preflight(f.record,r),/SUBMISSION_TIME_MISSING/);});
test('M2 still rejects Perform as a teaching anchor',()=>{const f=fixtures['3050203'],r=clone(f.review);r.questions[0].parts[0].teaching=[{sectionId:'perform',quote:f.p.sections.find(s=>s.id==='perform').text}];assert.throws(()=>M2.preflight(f.record,r),/INVALID_TEACHING/);});
test('M2 rejects unresolved findings rather than approving around them',()=>{const f=fixtures['3050202'],r=clone(f.review);r.findings.push({id:'UNRESOLVED',status:'UNTESTED',detail:'Unknown source'});assert.throws(()=>M2.preflight(f.record,r),/UNRESOLVED_FINDING/);});
test('optional historical presentation layout remains STARTER-only; no bypass',()=>{const oldSource=JSON.parse(fs.readFileSync(path.join(dir,'../m1c-3050201/source-copy.json'))),old=C.extractLesson(oldSource,'3050201').payload;for(const id of ['3050202','3050203']){const p=clone(fixtures[id].p);p.presentation.layout=old.presentation.layout;assert.throws(()=>C.validatePayload(p),/presentation.layout: this explicit roadmap layout requires applicable regular STARTER sections/);}});
test('all protected production, master, schema, builder and audit bytes unchanged',()=>protectedPaths.forEach(p=>assert.equal(sha(fs.readFileSync(path.join(root,p))),before[p],p)));
const result={status:'PASS',scope:'F4a2 isolated approved source mapping; not live-native source migration, HTML fidelity, production readiness or student release',tests:rows.length,checks:rows,guides,protectedSha256:before,productionGuideWrites:0,HTMLConstructed:0,coreRuleChanges:0,studentRelease:false,untested:['Classroom timing/tool execution','Rendered Learn/Perform presentation fidelity','Real browser permissions and Collector receipts','Fresh live-native typed-source intake'],requiredF4a3:['Authoritative source intake: approved typed fields are present only in isolated fixtures; do not deploy from them or claim native Docs were converted.','Preserve media/layout/resources/accessibility through representative Learn/Perform render verification under separate GO; current optional detailed presentation.layout is STARTER-only.','Audit should consume approved mapped section roles, not re-infer obsolete roles from retained original free-form headings/pacing labels.','Any live native revision/hash change requires a fresh M2 binding/review; fixture PASS is not a reusable waiver.'],instructionSchemaIncompatibilities:[],presentationLimit:'Reusing optional rich presentation.layout for either mapped mode is rejected: M1 presentation.layout: this explicit roadmap layout requires applicable regular STARTER sections. Core instruction mapping needs no rule change.'};
if(process.argv.includes('--write-results'))fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,tests:rows.length,guides:guides.map(x=>({dayid:x.dayid,mode:x.mode,M1:x.M1,M2:x.M2})),HTMLConstructed:0,coreRuleChanges:0}));
