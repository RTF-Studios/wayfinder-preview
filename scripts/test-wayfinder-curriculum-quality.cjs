'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('./wayfinder-content-contract.cjs'),M2=require('./wayfinder-curriculum-quality.cjs'),{make,TYPES}=require('./fixtures/m1-source-fixtures.cjs'),{pilotReview}=require('./fixtures/m2-review-fixtures.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),root=path.resolve(__dirname,'..');
const master=fs.readFileSync(path.join(root,'templates/wayfinder-master.html'),'utf8'),rows=[];
function test(name,fn){fn();rows.push({name,status:'PASS'});}
// Verify lean QA still selects browser checks when runtime/layout actually changes.
const workflow=fs.readFileSync(path.join(root,'.github/workflows/wayfinder-qa.yml'),'utf8');
const scope=workflow.split("node - <<'JS'\n")[1].split('\n          JS')[0].split('\n').map(l=>l.slice(10)).join('\n');
for(const [name,files,expected] of [['curriculum-only diff','scripts/wayfinder-content-contract.cjs\nscripts/wayfinder-curriculum-quality.cjs\n',false],['master diff','templates/wayfinder-master.html\n',true],['lesson layout diff','Tech/3050201.html\n',true],['renderer diff','scripts/wayfinder-record-renderer.cjs\n',true]])test('reuse runtime checks: '+name,()=>{let output='';require('node:vm').runInNewContext(scope,{require:n=>n==='node:fs'?{appendFileSync:(p,s)=>output+=s}:{execFileSync:()=>files},process:{env:{BASE_SHA:'known-base',GITHUB_OUTPUT:'mock-output'}}});assert.equal(output,'runtime='+expected+'\n');});
const valid=make(),record=C.extractLesson(valid.source,valid.payload.identity.dayid),review=valid.source.curriculumReviews[valid.payload.identity.dayid];
for(const course of ['Tech','CS','AAVTC'])for(const mode of ['STARTER','LEARN','PERFORM','ASSESSMENT'])test('source-bound reviewed '+course+' '+mode,()=>{const f=make(course,mode),r=C.extractLesson(f.source,f.payload.identity.dayid);assert.equal(M2.preflight(r,f.source.curriculumReviews[f.payload.identity.dayid]).status,'PASS');});
for(const type of TYPES)test('approved structure '+type+' does not force A/B/C',()=>{const f=make('CS','PERFORM',type);C.buildRecord(master,C.extractLesson(f.source,f.payload.identity.dayid),f.source,f.identities)});
const cases=[
 ['missing review',r=>null,'REVIEW_REQUIRED'],
 ['unreviewed status',r=>({...r,status:'UNTESTED'}),'CURRICULUM_HOLD'],
 ['failed status',r=>({...r,status:'FAIL'}),'CURRICULUM_HOLD'],
 ['stale revision',r=>{r.binding.revision='old';return r},'REVIEW_STALE'],
 ['stale source text',r=>{r.binding.sourceSha256='0'.repeat(64);return r},'REVIEW_STALE'],
 ['detached lesson content',r=>{r.binding.payloadSha256='0'.repeat(64);return r},'REVIEW_STALE'],
 ['wrong WHAT',r=>{r.learningTarget.what='Unrelated task';return r},'LEARNING_TARGET_MISMATCH'],
 ['missing target',r=>{r.targets=[];return r},'COVERAGE_MISMATCH'],
 ['duplicate target',r=>{r.targets.push(r.targets[0]);return r},'COVERAGE_MISMATCH'],
 ['wrong TEKS wording',r=>{r.targets[0].wording='Other standard';return r},'TARGET_MISMATCH'],
 ['absent target explanation',r=>{r.targets[0].reason=' ';return r},'MISSING_REASON'],
 ['unknown evidence key',r=>{r.targets[0].evidenceKeys=['399999990001'];return r},'TARGET_EVIDENCE'],
 ['unmapped question',r=>{r.targets[0].evidenceKeys=[];return r},'UNMAPPED_QUESTION'],
 ['fabricated teaching quote',r=>{r.targets[0].teaching[0].quote='This is not taught here.';return r},'TEACHING_MISMATCH'],
 ['Perform-only question support',r=>{r.questions[0].parts[0].teaching=[{sectionId:'perform',quote:'Use the supplied fixture.'}];return r},'INVALID_TEACHING'],
 ['missing question',r=>{r.questions=[];return r},'COVERAGE_MISMATCH'],
 ['wrong question prompt',r=>{r.questions[0].prompt='Different task';return r},'QUESTION_RUBRIC_MISMATCH'],
 ['changed rubric',r=>{r.questions[0].rubricText='Grade another skill';return r},'QUESTION_RUBRIC_MISMATCH'],
 ['missing answer part',r=>{r.questions[0].parts.pop();return r},'COVERAGE_MISMATCH'],
 ['criterion not elicited',r=>{r.questions[0].parts[0].scoringCriteria=['Unrequested requirement'];return r},'CRITERIA_MISMATCH'],
 ['wrong accepted answer',r=>{r.questions[0].parts[0].acceptedAnswers=['Wrong solution'];return r},'CRITERIA_MISMATCH'],
 ['project prerequisite',r=>{r.questions[0].projectIndependent=false;return r},'PROJECT_DEPENDENCY'],
 ['missing non-cascading case',r=>{r.questions[0].independenceCases.pop();return r},'COVERAGE_MISMATCH'],
 ['no full-credit-later answer',r=>{r.questions[0].independenceCases[0].correctLaterAnswer='';return r},'MISSING_REASON'],
 ['missing pace review',r=>{delete r.pacing;return r},'PACING_REQUIRED'],
 ['unreviewed feasibility',r=>{r.pacing.status='UNTESTED';return r},'PACING_HOLD'],
 ['work exceeds source minutes',r=>{r.pacing.allocations[0].workMinutes+=5;return r},'PACING_MISMATCH'],
 ['no transition allowance',r=>{r.pacing.allocations.forEach(a=>{a.workMinutes+=a.transitionMinutes;a.transitionMinutes=0});return r},'TRANSITIONS_MISSING'],
 ['no submission allowance',r=>{r.pacing.allocations.forEach(a=>{a.workMinutes+=a.submissionMinutes;a.submissionMinutes=0});return r},'SUBMISSION_TIME_MISSING'],
 ['wrong handoff count',r=>{r.pacing.submissionCount=0;return r},'SUBMISSION_TIME_MISSING'],
 ['unresolved instructional defect',r=>{r.findings=[{id:'T1',status:'FAIL',detail:'Question requires an untaught skill.'}];return r},'UNRESOLVED_FINDING'],
 ['missing verification',r=>{r.findings=[{id:'T1',status:'UNTESTED',detail:'Teaching source is unknown.'}];return r},'UNRESOLVED_FINDING']
];
for(const [name,mutate,code] of cases)test('reject '+name,()=>{const r=mutate(clone(review)),s=clone(valid.source);s.curriculumReviews={[valid.payload.identity.dayid]:r};assert.throws(()=>C.buildRecord(master,record,s,valid.identities),new RegExp('M2 '+code));});
test('changing source invalidates an otherwise PASS review',()=>{const f=make(),p=clone(f.payload);p.sections.find(s=>s.id==='group_learn'&&s.status==='applicable');p.learningTarget.why='different intent';p.learningTarget.text='I can '+p.learningTarget.what+' because '+p.learningTarget.why;const changed=f.sourceFor(p);changed.curriculumReviews=f.source.curriculumReviews;const r=C.extractLesson(changed,p.identity.dayid);assert.throws(()=>C.buildRecord(master,r,changed,f.identities),/M2 REVIEW_STALE/);});
test('55-minute structural allowance cannot masquerade as 50-minute curriculum fit',()=>{const f=make(),p=clone(f.payload);p.pacing[1].minutes+=5;const s=f.sourceFor(p),r=C.extractLesson(s,p.identity.dayid);assert.throws(()=>C.buildRecord(master,r,s,f.identities),/M2 PACING_OVERLOAD/);});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'m2-isolated-'));let pilot;
try{
 const source=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m1c-3050201/source-copy.json'))),r=C.extractLesson(source,'3050201');source.curriculumReviews={'3050201':pilotReview(r)};
 const ids=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m1b-3050201/identity-sources.json'))),original=fs.readFileSync(path.join(root,'Tech/3050201.html'));
 test('real single-response pilot review fits exact source and frozen evidence',()=>{pilot=M2.preflight(r,source.curriculumReviews['3050201']);assert.equal(pilot.status,'PASS');assert.equal(source.curriculumReviews['3050201'].questions[0].parts.length,1);});
 const out=path.join(temp,'3050201.html'),src=path.join(temp,'source.json'),idFile=path.join(temp,'identities.json');fs.writeFileSync(idFile,JSON.stringify(ids));
 const code='import sys;sys.path.insert(0,'+JSON.stringify(path.join(root,'scripts'))+');from wayfinder_lesson import build_from_outline;from pathlib import Path;build_from_outline('+JSON.stringify(r.payload.identity)+',"STARTER",Path('+JSON.stringify(path.join(root,'templates/wayfinder-master.html'))+').read_text(),'+JSON.stringify(out)+')';
 const run=s=>{fs.writeFileSync(src,JSON.stringify(s));return cp.spawnSync('python',['-c',code],{encoding:'utf8',env:{...process.env,WF_MASTER_OUTLINE_SOURCE:src,WF_IDENTITY_SOURCES:idFile}});};
 test('actual native F1+M1+M2 build stays byte-identical to M1c',()=>{const result=run(source);assert.equal(result.status,0,result.stderr);assert.equal(sha(fs.readFileSync(out)),'9f43ef8f317e56241ffe40ef77d3d92848f779f1dd5cb0e58d57a8a6e28ff0bc');});
 const good=fs.readFileSync(out);
 for(const [name,mutate] of [['missing review',s=>delete s.curriculumReviews],['failed teaching',s=>s.curriculumReviews['3050201'].status='FAIL'],['stale review',s=>s.curriculumReviews['3050201'].binding.revision='stale'],['untaught scoring demand',s=>s.curriculumReviews['3050201'].questions[0].parts[0].scoringCriteria=['Untaught requirement']],['overfull pace',s=>s.curriculumReviews['3050201'].pacing.allocations[0].workMinutes+=20]])for(const [kind,bytes] of [['original',original],['previous build',good]])test('native '+name+' preserves '+kind,()=>{const bad=clone(source);mutate(bad);fs.writeFileSync(out,bytes);const result=run(bad);assert.notEqual(result.status,0);assert.match(result.stderr,/M2/);assert.deepEqual(fs.readFileSync(out),bytes);});
 assert.deepEqual(fs.readFileSync(path.join(root,'Tech/3050201.html')),original);assert.equal(sha(master),'9b0ce775bca5d73b71e9b3968db6b697665389e86c28fb412c3f1756a857ae93');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const result={status:'PASS',tests:rows.length,checks:rows,pilot,productionGuideWrites:0,masterChanges:0,clipboardForm:'existing proven implementation reused; no repeated integration tests',scope:'M2 source-bound assistant review, not automatic semantic proof, release or student grading'};
if(process.env.M2_RESULTS_PATH)fs.writeFileSync(process.env.M2_RESULTS_PATH,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
