'use strict';
// M2 checks source-bound instructional review before rendering. It does not
// infer pedagogy from keyword counts, score students, or add Captain signoffs.
const crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const text=x=>typeof x==='string'&&x.trim().length>0;
function binding(record){return {...record.provenance,payloadSha256:sha(record.payload)};}
function inspect(record,review){
 const errors=[],p=record.payload,fail=(code,detail)=>errors.push({code,detail});
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const required=(x,label)=>{if(!text(x))fail('MISSING_REASON',label+' needs a substantive review explanation');};
 const exactSet=(rows,expected,key,label)=>{if(!Array.isArray(rows)){fail('MISSING_COVERAGE',label);return [];}const ids=rows.map(x=>x?.[key]);if(new Set(ids).size!==ids.length||!same([...ids].sort(),[...expected].sort()))fail('COVERAGE_MISMATCH',label+' must cover each source identity exactly once');return rows;};
 const sections=new Map(p.sections.map(s=>[s.id,s]));
 const anchors=(rows,label)=>{if(!Array.isArray(rows)||!rows.length){fail('MISSING_TEACHING',label+' has no preceding instruction/practice reference');return;}
  for(const a of rows){const s=sections.get(a?.sectionId);if(!s||s.status!=='applicable'||!['prior_learning_hook','group_learn','group_practice','exemplar','assessment_runway'].includes(a.sectionId)){fail('INVALID_TEACHING',label+' references absent/noninstructional section');continue;}
   const supplied=[s.title,s.text,...s.steps].join('\n');if(!text(a.quote)||!supplied.includes(a.quote))fail('TEACHING_MISMATCH',label+' quoted instruction does not exist in '+a.sectionId);
  }
 };
 if(!review||review.version!==1)return {status:'HOLD',errors:[{code:'REVIEW_REQUIRED',detail:'Assistant curriculum review is required for this exact source before HTML construction.'}]};
 const expected=binding(record);if(!review.binding||Object.keys(expected).some(k=>review.binding[k]!==expected[k]))fail('REVIEW_STALE','Source document/revision/tab/text or lesson content changed; repeat the affected curriculum review.');
 if(review.status!=='PASS')fail('CURRICULUM_HOLD','Review reports '+(review.status||'UNKNOWN')+'; do not construct HTML.');
 required(review.reviewer,'reviewer');required(review.basis,'owning curriculum requirements');
 if(!review.learningTarget||['text','what','why'].some(k=>review.learningTarget[k]!==p.learningTarget[k]))fail('LEARNING_TARGET_MISMATCH','WHAT/WHY target review differs from the exact current target.');
 else {anchors(review.learningTarget.teaching,'learning target');required(review.learningTarget.reason,'learning target alignment');}
 const questions=p.evidence.graded.status==='applicable'?p.evidence.graded.items:[];
 const keys=questions.map(q=>q.fullKey);
 const targetRows=exactSet(review.targets,p.teks.priority.map(t=>t.code),'code','priority TEKS');
 for(const t of targetRows){if(!t)continue;const original=p.teks.priority.find(x=>x.code===t.code);if(!original)continue;
  if(t.wording!==original.wording)fail('TARGET_MISMATCH',t.code+' wording differs from the selected outline');
  if(!['introduced','practiced','assessed'].includes(t.coverage))fail('TARGET_COVERAGE',t.code+' needs an honest introduced/practiced/assessed designation');
  anchors(t.teaching,t.code);required(t.reason,t.code+' instruction/evidence alignment');
  if(!Array.isArray(t.evidenceKeys)||t.evidenceKeys.some(k=>!keys.includes(k))||(t.coverage==='assessed'&&!t.evidenceKeys.length))fail('TARGET_EVIDENCE',t.code+' references missing question evidence');
 }
 for(const k of keys)if(!targetRows.some(t=>t?.evidenceKeys?.includes(k)))fail('UNMAPPED_QUESTION',k+' has no reviewed priority target relationship');
 for(const q of exactSet(review.questions,keys,'fullKey','graded questions')){
  if(!q)continue;const source=questions.find(x=>x.fullKey===q.fullKey);if(!source)continue;
  if(q.prompt!==source.prompt||q.rubricText!==source.rubric.text)fail('QUESTION_RUBRIC_MISMATCH',q.fullKey+' must match the exact frozen prompt and rubric');
  required(q.rubricReason,q.fullKey+' rubric coverage');required(q.projectIndependentReason,q.fullKey+' answerability without finished Perform');
  if(q.projectIndependent!==true)fail('PROJECT_DEPENDENCY',q.fullKey+' depends on completing the project');
  const parts=exactSet(q.parts,source.parts.map(x=>x.id),'id',q.fullKey+' answer parts');
  for(const part of parts){if(!part)continue;const original=source.parts.find(x=>x.id===part.id);if(!original)continue;
   if(part.prompt!==original.prompt||!same(part.scoringCriteria,original.scoringCriteria)||!same(part.acceptedAnswers,original.acceptedAnswers))fail('CRITERIA_MISMATCH',q.fullKey+'/'+part.id+' evidence, accepted answer or scoring criteria differ');
   anchors(part.teaching,q.fullKey+'/'+part.id);required(part.reason,q.fullKey+'/'+part.id+' taught/requested/scored alignment');
  }
  // No forced A/B/C: each declared response structure owns its actual cases.
  const pairs=source.parts.flatMap((later,i)=>source.parts.slice(0,i).map(earlier=>earlier.id+'>'+later.id));
  const cases=exactSet(q.independenceCases,pairs,'pair',q.fullKey+' wrong-earlier/full-credit-later cases');
  for(const c of cases){if(!c)continue;required(c.wrongEarlierAnswer,'counterexample');required(c.correctLaterAnswer,'independent correct answer');required(c.creditReason,'independent credit justification');}
 }
 const pacing=review.pacing;
 if(!pacing)fail('PACING_REQUIRED','Review actual reading, task, save, transition and submission workload, not just a 50-minute sum.');
 else {
  required(pacing.reason,'pacing realism');if(pacing.status!=='PASS')fail('PACING_HOLD','Workload is not reviewed as feasible.');
  let total=0,transitions=0,submissions=0;
  const rows=exactSet(pacing.allocations,p.pacing.map(x=>x.id),'id','pacing allocations');
  for(const a of rows){if(!a)continue;const source=p.pacing.find(x=>x.id===a.id);if(!source)continue;
   for(const k of ['workMinutes','transitionMinutes','submissionMinutes'])if(typeof a[k]!=='number'||!Number.isFinite(a[k])||a[k]<0)fail('PACING_INVALID',a.id+' invalid '+k);
   const subtotal=a.workMinutes+a.transitionMinutes+a.submissionMinutes;
   if(subtotal!==source.minutes)fail('PACING_MISMATCH',a.id+' reviewed time does not fit its source allocation');
   total+=subtotal;transitions+=a.transitionMinutes;submissions+=a.submissionMinutes;required(a.workload,a.id+' reading/task/save workload');
  }
  if(total!==p.pacing.reduce((n,a)=>n+a.minutes,0)||total>50)fail('PACING_OVERLOAD','Reviewed total must equal source timing and fit a 50-minute class.');
  if(transitions<=0)fail('TRANSITIONS_MISSING','Class transitions need explicit time.');
  const count=questions.length+Object.values(p.evidence.xtra).filter(x=>x.status==='applicable').length;
  if(pacing.submissionCount!==count||submissions<=0&&count>0)fail('SUBMISSION_TIME_MISSING','All planned evidence handoffs need explicit realistic time.');
 }
 if(!Array.isArray(review.findings))fail('FINDINGS_REQUIRED','Explicit unresolved findings list required, empty when none.');
 else for(const f of review.findings){if(!f||!text(f.id)||!text(f.detail)||!['PASS','FAIL','UNTESTED'].includes(f.status))fail('FINDING_INVALID','Malformed curriculum finding');else if(f.status!=='PASS')fail('UNRESOLVED_FINDING',f.id+': '+f.detail);}
 return {status:errors.length?'HOLD':'PASS',errors,source:expected,limitations:'Checks review coverage, exact source anchors and freshness. Instructional judgment remains an explicit assistant review, not automated semantic proof or student mastery certification.'};
}
function preflight(record,review){const report=inspect(record,review);if(report.status!=='PASS'){const e=Error(report.errors.map(x=>'M2 '+x.code+': '+x.detail).join('\n'));e.report=report;throw e;}return report;}
module.exports={binding,inspect,preflight};
