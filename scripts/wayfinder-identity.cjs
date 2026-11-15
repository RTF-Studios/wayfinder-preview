'use strict';
// F1: source comparison only. This module never writes HTML or changes identities.
(function(root){
const courses={Tech:'3',CS:'2',AAVTC:'1'};
const fields=['course','dayid','unit','part','day','title'];
const text=x=>typeof x==='string'?x.normalize('NFC').replace(/\s+/g,' ').trim():'';
const calendar=/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Tues|Wed|Thu|Thurs|Fri|Sat|Sun)\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b|\b20\d{6}\b/i;
function canonical(r,label){
 if(!r||typeof r!=='object')throw Error(label+': missing identity');
 for(const f of fields)if(r[f]===undefined||r[f]===null||r[f]==='')throw Error(label+': missing '+f);
 if(!Object.hasOwn(courses,r.course))throw Error(label+': invalid course');
 if(typeof r.dayid!=='string'||!/^\d{7}$/.test(r.dayid))throw Error(label+': DayID must be a seven-digit string');
 const x={course:r.course,dayid:r.dayid,title:text(r.title)};
 for(const f of ['unit','part','day']){
  if(!/^[1-9]\d?$|^0[1-9]$/.test(String(r[f])))throw Error(label+': invalid '+f);
  x[f]=Number(r[f]);
 }
 if(!x.title)throw Error(label+': missing permanent title');
 if(calendar.test(x.title))throw Error(label+': calendar date/weekday in permanent title');
 const id=courses[x.course]+String(x.unit).padStart(2,'0')+String(x.part).padStart(2,'0')+String(x.day).padStart(2,'0');
 if(id!==x.dayid)throw Error(label+': course/Unit/Part/Day disagree with DayID '+x.dayid);
 // Full Control Station names may include identity; any explicit labels must agree.
 for(const f of ['unit','part','day'])for(const m of x.title.matchAll(new RegExp('\\b'+f+'\\s+(\\d+)\\b','gi')))
  if(Number(m[1])!==x[f])throw Error(label+': title '+f+' disagrees with DayID');
 return x;
}
function permanentTitle(r){
 return r.title.replace(/^(?:Tech|TECH|CS|AAVTC)\b\s*[·:—-]?\s*(?=Unit\b)/,'')
  .replace(/^Unit\s+\d+\s*[·|—-]\s*Part\s+\d+\s*[·|—-]\s*Day\s+\d+\s*[—:-]\s*/i,'').trim();
}
function assertIdentity(candidate,sources){
 const c=canonical(candidate,'builder');
 for(const name of ['summary','masterOutline','controlStation']){
  const s=sources?.[name];
  if(!s||!text(s.reference)||!text(s.revision)||!text(s.locator))throw Error(name+': missing source reference/revision/locator');
  if(name==='summary'&&s.approved!==true)throw Error('summary: Captain approval not recorded');
  if(!Array.isArray(s.identities))throw Error(name+': missing identities');
  const rows=s.identities.filter(r=>r?.dayid===c.dayid);
  if(rows.length!==1)throw Error(name+': expected exactly one identity for '+c.dayid+', found '+rows.length);
  const r=canonical(rows[0],name);
  for(const f of fields){
   const a=f==='title'?permanentTitle(c):c[f], b=f==='title'?permanentTitle(r):r[f];
   if(a!==b)throw Error(name+': '+f+' mismatch for '+c.dayid+' ('+a+' / '+b+')');
  }
 }
 return c;
}
function assertOutline(raw,c){
 // Selected native outline excerpt must name the same DayID and permanent title.
 if(typeof raw!=='string'||!raw.includes(c.dayid)||!raw.includes(c.title))throw Error('build outline excerpt: missing DayID or exact permanent title');
 const heading=raw.split(/\r?\n/).find(l=>/DAY\s*\d+\s*\|\s*(?:DAYID\s*)?\d{7}\s*\|/i.test(l)&&l.includes(c.dayid));
 if(heading){
  const m=heading.match(/DAY\s*(\d+)\s*\|\s*(?:DAYID\s*)?(\d{7})\s*\|\s*[^|]+\|\s*(.+)$/i);
  if(!m||Number(m[1])!==c.day||m[2]!==c.dayid||text(m[3])!==c.title)throw Error('build outline heading disagrees with candidate');
 }
}
function preflight(candidate,sources,raw){const c=assertIdentity(candidate,sources);assertOutline(raw,c);return c;}
const api={assertIdentity,assertOutline,preflight};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.WFIdentity=Object.freeze(api);
if(typeof require!=='undefined'&&require.main===module){
 try{const p=JSON.parse(require('fs').readFileSync(0,'utf8'));preflight(p.candidate,p.sources,p.raw);process.stdout.write('Identity pre-HTML PASS\n');}
 catch(e){process.stderr.write('Identity pre-HTML FAIL: '+e.message+'\n');process.exitCode=1;}
}
})(globalThis);
