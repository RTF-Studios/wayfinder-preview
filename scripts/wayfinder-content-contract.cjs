'use strict';
// M1 validates structure and provenance only. It does not score pedagogy (M2),
// migrate old curricula (M3), certify deployment (M4), or grant source approval.
const fs=require('node:fs'),crypto=require('node:crypto');
const schema=require('./schema/wayfinder-lesson.schema.json');
const F1=require('./wayfinder-identity.cjs');
const REQUIRED_SECTIONS=['prior_learning_hook','warm_up','group_learn','group_practice','perform','assessment_runway','exemplar','temperature','studio','hand_in','next_day_bridge'];
const SOURCE_BLOCKS=Object.keys(schema.properties);
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const nonblank=x=>typeof x==='string'&&x.trim().length>0;
const error=(p,m)=>{throw Error('M1 '+p+': '+m);};
function shape(v,s,p='$'){
 if(s.$ref)return shape(v,schema.$defs[s.$ref.split('/').pop()],p);
 if(s.oneOf){const valid=s.oneOf.filter(x=>{try{shape(v,x,p);return true;}catch{return false;}});if(valid.length!==1)error(p,'must match exactly one explicit applicable/not_applicable shape');return;}
 if('const'in s&&v!==s.const)error(p,'expected '+JSON.stringify(s.const));
 if(s.enum&&!s.enum.includes(v))error(p,'unsupported value '+JSON.stringify(v));
 if(s.type==='object'){
  if(!v||typeof v!=='object'||Array.isArray(v))error(p,'expected object');
  for(const k of s.required||[])if(!Object.hasOwn(v,k))error(p+'.'+k,'required field missing');
  for(const k of Object.keys(v)){if(!Object.hasOwn(s.properties,k))error(p+'.'+k,'unsupported field');shape(v[k],s.properties[k],p+'.'+k);}return;
 }
 if(s.type==='array'){
  if(!Array.isArray(v))error(p,'expected array');if(v.length<(s.minItems||0)||(s.maxItems!==undefined&&v.length>s.maxItems))error(p,'invalid item count');v.forEach((x,i)=>shape(x,s.items,p+'['+i+']'));return;
 }
 if(s.type==='string'){
  if(typeof v!=='string'||(s.minLength&&!v.trim()))error(p,'nonblank source text required');
  if(s.pattern&&!new RegExp(s.pattern).test(v))error(p,'invalid format');
 }
 if(s.type==='number'||s.type==='integer'){
  if(typeof v!=='number'||!Number.isFinite(v)||(s.type==='integer'&&!Number.isInteger(v)))error(p,'invalid number');
  if(s.minimum!==undefined&&v<s.minimum||s.maximum!==undefined&&v>s.maximum||s.exclusiveMinimum!==undefined&&v<=s.exclusiveMinimum)error(p,'out of range');
 }
}
function unique(items,label,key='id'){const seen=new Set();for(const x of items){if(seen.has(x[key]))error(label,'duplicate '+x[key]);seen.add(x[key]);}}
function checkURL(url,key){let u;try{u=new URL(url);}catch{error('submissionUrl','invalid URL');}if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||!u.pathname.startsWith('/forms/')||u.searchParams.get('entry.1954781253')!==key)error('submissionUrl','must preserve the exact school Form full key');}
function validatePayload(r){
 shape(r,schema);const id=r.identity.dayid;
 // F1 remains the owner of identity semantics, independently executed at build.
 unique(r.sections,'sections');unique(r.activities,'activities');unique(r.pacing,'pacing');unique(r.vocabulary,'vocabulary','term');
 const sections=new Map(r.sections.map(s=>[s.id,s]));
 for(const name of REQUIRED_SECTIONS)if(!sections.has(name))error('sections.'+name,'must be explicit, including not_applicable reason');
 for(const s of r.sections)if(!REQUIRED_SECTIONS.includes(s.id))error('sections','unsupported section '+s.id);
 const active=name=>sections.get(name).status==='applicable';
 for(const name of ['prior_learning_hook','hand_in','next_day_bridge'])if(!active(name))error(name,'required in every mode');
 const required={STARTER:['group_learn','group_practice','perform'],LEARN:['group_learn'],PERFORM:['group_practice','perform'],ASSESSMENT:['assessment_runway']}[r.mode];
 for(const name of required)if(!active(name))error(name,'required by '+r.mode);
 const absent={STARTER:['assessment_runway'],LEARN:['perform','assessment_runway'],PERFORM:['group_learn','assessment_runway'],ASSESSMENT:['group_learn','group_practice','perform']}[r.mode];
 for(const name of absent)if(active(name))error(name,'must be explicitly not_applicable for '+r.mode);
 for(const name of ['perform','assessment_runway'])if(active(name)&&sections.get(name).steps.length===0)error(name,'explicit runway steps required');
 for(const a of r.activities)if(!sections.has(a.sectionId)||!active(a.sectionId))error('activities','unknown or inapplicable section '+a.sectionId);
 for(const p of r.pacing)if(!sections.has(p.sectionId)||!active(p.sectionId))error('pacing','unknown or inapplicable section '+p.sectionId);
 const minutes=r.pacing.reduce((n,p)=>n+p.minutes,0);if(minutes<45||minutes>55)error('pacing','numeric total must be approximately 50 minutes (45–55); realism is M2');
 if(!r.learningTarget.text.includes(r.learningTarget.what)||!r.learningTarget.text.includes(r.learningTarget.why)||!/^I can\b/.test(r.learningTarget.text)||!r.learningTarget.text.includes('because'))error('learningTarget','explicit WHAT and WHY must occur in the unchanged I can/because text');
 const assets=r.media.status==='applicable'?r.media.items:[];unique(assets,'media');const mediaIds=new Set(assets.map(m=>m.id));
 if(active('exemplar')&&!assets.some(a=>a.purpose==='exemplar'))error('exemplar','applicable exemplar requires explicit source reference/rights/offline metadata');
 if(active('warm_up')!==(r.presentation.notes.status==='applicable'))error('presentation.notes','notes applicability must follow the source warm-up section');
 for(const a of assets){const compatible={image:['image/webp'],diagram:['image/svg+xml'],code:['text/plain'],text:['text/plain'],document:['application/pdf'],video:['video/mp4'],audio:['audio/mpeg']};if(!compatible[a.kind].includes(a.mimeType)||!a.dataUri.startsWith('data:'+a.mimeType+';base64,')||!/^data:[^;]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(a.dataUri))error('media.'+a.id,'unsupported asset or nonembedded bytes');if(Buffer.from(a.dataUri.split(',')[1],'base64').length===0)error('media.'+a.id,'empty asset');const bytes=Buffer.from(a.dataUri.split(',')[1],'base64');if(a.kind==='image'&&(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'))error('media.'+a.id,'invalid WebP bytes');if(a.kind==='diagram'&&(!bytes.toString('utf8').includes('<svg')||/<script\b/i.test(bytes.toString('utf8'))))error('media.'+a.id,'invalid or executable SVG');if(['target','studio','comic'].includes(a.purpose)&&!['image','diagram'].includes(a.kind))error('media.'+a.id,'artwork pool requires image/diagram');}
 // Inline diagram placement is content, never an execution or network surface.
 for(const a of assets.filter(a=>a.kind==='diagram')){
  const svg=Buffer.from(a.dataUri.split(',')[1],'base64').toString('utf8');
  if([...svg.matchAll(/<\s*\/?\s*([A-Za-z][\w:-]*)/g)].some(m=>!['svg','g','defs','title','desc','text','tspan','rect','circle','ellipse','line','polyline','polygon','path','clippath','lineargradient','radialgradient','stop','pattern'].includes(m[1].toLowerCase()))||/\bon[a-z]+\s*=|\b(?:href|src)\s*=|url\s*\(|expression\s*\(|@import|<!DOCTYPE|<!ENTITY/i.test(svg))error('media.'+a.id,'diagram must be static, self-contained SVG');
 }
 const graded=r.evidence.graded.status==='applicable'?r.evidence.graded.items:[];
 if(r.mode==='ASSESSMENT'&&(graded.length!==4||graded.some(q=>q.category!=='MAJOR')))error('evidence','ASSESSMENT requires four explicit Major section definitions');
 if(r.mode!=='ASSESSMENT'&&graded.some(q=>q.category!=='DAILY'))error('evidence','regular modes use DAILY evidence');
 const keys=new Set();
 for(const q of graded){if(!q.fullKey.startsWith(id)||keys.has(q.fullKey))error('evidence','wrong DayID or duplicate full key');keys.add(q.fullKey);checkURL(q.submissionUrl,q.fullKey);unique(q.parts,'answer parts');
  // Response fields are declared by the approved question, never inferred as A/B/C.
  unique(q.rubric.bands,'rubric bands','name');
  const bands=[...q.rubric.bands].sort((a,b)=>a.minimum-b.minimum);let next=0;
  for(const b of bands){if(!Number.isInteger(b.minimum)||!Number.isInteger(b.maximum)||b.minimum!==next||b.minimum>b.maximum)error('rubric','complete nonoverlapping integer bands covering 0–100 required');next=b.maximum+1;}
  if(next!==101)error('rubric','incomplete 0–100 coverage');
  for(const p of q.parts){unique(p.options,'options','value');
   if(new Set(p.acceptedAnswers).size!==p.acceptedAnswers.length)error('parts.'+p.id,'duplicate accepted answer');
   if(['selected_choice','multiple_choice','checkbox','dropdown','true_false'].includes(p.answerType)&&p.acceptedAnswers.some(a=>!p.options.some(o=>o.value===a)))error('parts.'+p.id,'accepted answer must reference an explicit option value');
   if(p.answerType==='true_false'&&p.options.length!==2)error('parts.'+p.id,'true_false requires exactly two explicit options');
   if(p.answerType!=='fill_blank'&&(p.blanks!==0||p.sentence!==''))error('parts.'+p.id,'blank structure belongs only to fill_blank');
   if(['selected_choice','multiple_choice','checkbox','dropdown','true_false'].includes(p.answerType)&&p.options.length<2)error('parts.'+p.id,'explicit options required');if(['short_text','fill_blank','comparison_diagram_response'].includes(p.answerType)&&p.options.length)error('parts.'+p.id,'text format cannot carry choice options');if(p.answerType==='fill_blank'&&(p.blanks<1||p.sentence.split('{blank}').length-1!==p.blanks))error('parts.'+p.id,'blank count and source sentence disagree');if(p.answerType==='comparison_diagram_response'&&!p.stimulusIds.length)error('parts.'+p.id,'explicit comparison/diagram stimulus required');for(const m of p.stimulusIds)if(!mediaIds.has(m))error('parts.'+p.id,'unknown source stimulus '+m);}
 }
 for(const [name,suffix,section]of [['warmUp','09998','warm_up'],['temperature','29999','temperature'],['studio','20000','studio']]){
  const x=r.evidence.xtra[name];if((x.status==='applicable')!==active(section))error('xtra.'+name,'section applicability disagrees');
  if(x.status==='applicable'){if(x.fullKey!==id+suffix||keys.has(x.fullKey))error('xtra.'+name,'reserved participation identity mismatch');keys.add(x.fullKey);checkURL(x.submissionUrl,x.fullKey);}
 }
 if(active('studio')){if(r.presentation.studioIdeas.status!=='applicable'||r.presentation.studioIdeas.items.length!==3)error('studio','exactly three explicit source ideas required');}else if(r.presentation.studioIdeas.status!=='not_applicable')error('studio','ideas must be explicitly not_applicable');
 const composed=r.presentation.instructionLayout;
 if(composed){
  if(r.presentation.layout||!['LEARN','PERFORM'].includes(r.mode))error('presentation.instructionLayout','requires exclusive Learn/Perform composition');
  if(!['warm_up','group_practice','studio','temperature'].every(active))error('presentation.instructionLayout','missing regular mapped section');
  if(!assets.some(a=>a.purpose==='comic'))error('presentation.instructionLayout','approved comic required with skit');
 }
 const layout=r.presentation.layout;
 if(layout){
  if(r.mode!=='STARTER'||!['warm_up','group_learn','group_practice','perform','exemplar','studio','temperature'].every(active))error('presentation.layout','this explicit roadmap layout requires applicable regular STARTER sections');
  for(const id of [layout.roadmap.mediaId,layout.learn.mediaId,layout.perform.mediaId])if(!assets.some(a=>a.id===id&&a.kind==='diagram'))error('presentation.layout','missing static diagram reference '+id);
  if(layout.perform.steps.length!==sections.get('perform').steps.length||layout.perform.steps.some((x,n)=>x.summary+' '+x.help!==sections.get('perform').steps[n]))error('presentation.layout','disclosures must preserve each complete approved Perform step');
  for(const v of r.vocabulary)if(!sections.get('group_learn').text.includes(v.term))error('presentation.layout','inline vocabulary missing from Learn '+v.term);
  unique(layout.answerPlaceholders.map(x=>({id:x.fullKey+':'+x.partId})),'answer placeholders');
  const expected=graded.flatMap(q=>q.parts.map(p=>q.fullKey+':'+p.id)).sort();
  const actual=layout.answerPlaceholders.map(x=>x.fullKey+':'+x.partId).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))error('presentation.layout','placeholder identities must match actual question fields exactly');
 }
 return r;
}
function tabText(t){if(typeof t.text==='string')return t.text;function walk(o){if(!o||typeof o!=='object')return '';if(o.textRun)return o.textRun.content||'';return Object.values(o).map(v=>Array.isArray(v)?v.map(walk).join(''):typeof v==='object'?walk(v):'').join('');}return walk(t.body||t.documentTab?.body);}
function sourceTabs(source){
 for(const k of ['documentId','revision','summaryApprovalReference'])if(!nonblank(source?.[k]))error('source.'+k,'current Personal Master Outline provenance required');
 if(source.account!=='Personal')error('source.account','authoritative outline must be Personal');
 if(!Array.isArray(source.tabs)||!source.tabs.length)error('source.tabs','native document tabs required');
 const tabs=source.tabs.map(t=>({id:t.id||t.tabId||t.tabProperties?.tabId,text:tabText(t)}));for(const t of tabs)if(!nonblank(t.id))error('source.tabId','exact native tab ID required');unique(tabs,'source tabs');return tabs;
}
// Explicit blocks live IN the approved native outline. JSON is only the typed
// value notation within each source section; no separately authored lesson JSON
// is accepted. Legacy prose never gets filled with guessed/default content.
// :::lesson 3050201 ... :::identity\n{...}\n ... :::endlesson
function parseTypedJSON(text,label){
 const parsed=JSON.parse(text),tokens=text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)||[],stack=[];
 for(let n=0;n<tokens.length;n++){const t=tokens[n];if(t==='{')stack.push(new Set());else if(t==='[')stack.push(null);else if(t==='}'||t===']')stack.pop();else if(t.startsWith('"')&&tokens[n+1]===':'){const key=JSON.parse(t),keys=stack[stack.length-1];if(keys?.has(key))error(label,'duplicate JSON field '+key);keys?.add(key);}}
 return parsed;
}
function extractLesson(source,dayid){
 const tabs=sourceTabs(source),found=new Map();
 for(const tab of tabs){const lines=tab.text.split(/\r?\n/);let current=null,block=null,body=[],blocks={};
  const finish=()=>{if(block){if(Object.hasOwn(blocks,block))error('source.sections','duplicate section '+block);try{blocks[block]=parseTypedJSON(body.join('\n'),'source.'+block);}catch{error('source.'+block,'invalid typed section JSON');}body=[];block=null;}};
  for(const line of lines){let m;
   if((m=line.match(/^:::lesson (\d{7})\s*$/))){if(current)error('source','nested lesson');if(found.has(m[1]))error('source','duplicate DayID '+m[1]);current=m[1];blocks={};continue;}
   if(line===':::endlesson'){if(!current)error('source','orphan lesson end');finish();found.set(current,{blocks,tab});current=null;continue;}
   if((m=line.match(/^:::([A-Za-z][A-Za-z0-9]*)\s*$/))){if(!current)error('source','section outside lesson');finish();block=m[1];if(!SOURCE_BLOCKS.includes(block))error('source.sections','unsupported section '+block);continue;}
   if(current){if(block)body.push(line);else if(line.trim())error('source','unlabeled content within typed lesson');}
  }
  if(current)error('source','unterminated lesson');
 }
 const selected=found.get(dayid)||require('./wayfinder-source-intake.cjs').project(source,tabs,dayid);if(!selected)error('source','no structured lesson block for '+dayid+'; legacy free-form outline requires explicit source fields, not defaults');
 const payload=validatePayload(selected.blocks);if(payload.identity.dayid!==dayid)error('identity','source block DayID mismatch');
 const headers=selected.tab.text.split(/\r?\n/).filter(l=>new RegExp('^DAY \\d+ \\| DAYID '+dayid+' \\|').test(l));if(headers.length>1)error('source','duplicate explicit Day header');if(headers.length){const fields=headers[0].split(' | ');if(Number(fields[0].slice(4))!==payload.identity.day||fields[2]!==payload.mode||fields[3]!==payload.identity.title)error('source','typed identity/mode disagrees with explicit Day heading');}
 const provenance={documentId:source.documentId,revision:source.revision,tabId:selected.tab.id,summaryApprovalReference:source.summaryApprovalReference,sourceSha256:sha(selected.tab.text)};
 const record={payload,provenance,sourceText:selected.tab.text};return deepFreeze(record);
}
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x);}return x;}
function validateRecord(record,currentSource){
 const fresh=extractLesson(currentSource,record?.payload?.identity?.dayid);
 if(JSON.stringify(record)!==JSON.stringify(fresh))error('provenance','stale, modified or detached extracted record; re-extract current outline');return fresh;
}
function buildRecord(master,record,currentSource,identitySources){
 const r=validateRecord(record,currentSource);F1.preflight(r.payload.identity,identitySources,r.sourceText);
 if(!identitySources.masterOutline.reference.includes(r.provenance.documentId)||!identitySources.masterOutline.revision.includes(r.provenance.revision))error('provenance','F1 Master Outline document/revision disagrees with current source');
 if(identitySources.summary.reference!==r.provenance.summaryApprovalReference)error('provenance','summary approval reference disagrees with F1 summary');
 // Curriculum review is source-bound and assistant-owned, not another Captain gate.
 require('./wayfinder-curriculum-quality.cjs').preflight(r,currentSource.curriculumReviews?.[r.payload.identity.dayid]);
 return require('./wayfinder-record-renderer.cjs').render(master,r.payload,r.provenance);
}
if(require.main===module){try{const input=JSON.parse(fs.readFileSync(0,'utf8'));const r=extractLesson(input.source,input.dayid);if(input.expectedIdentity&&JSON.stringify(input.expectedIdentity)!==JSON.stringify(r.payload.identity)){for(const k of ['course','dayid','unit','part','day','title'])if(input.expectedIdentity[k]!==r.payload.identity[k])error('identity','native candidate disagrees with current source '+k);}if(input.expectedMode&&input.expectedMode!==r.payload.mode)error('mode','native candidate disagrees with current source');if(input.action==='build'){process.stdout.write(buildRecord(input.master,r,input.source,input.identitySources));}else process.stdout.write(JSON.stringify(r));}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}}
module.exports={schema,REQUIRED_SECTIONS,validatePayload,extractLesson,validateRecord,buildRecord};
