'use strict';
// Exact approved native-source projection. No fixture input, fallback curriculum,
// source writes, review generation, or independent lesson registry.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),mapping=require('./source-mappings/prototype-approved.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function project(source,tabs,dayid){
 const m=mapping.mappings[dayid];if(!m)return null;
 const fail=why=>{throw Error('M1 approved source intake: '+why)};
 if(source.fixtureOnly)fail('isolated fixture cannot enter production mapping');
 if(source.documentId!==mapping.documentId||source.summaryApprovalReference!==mapping.summaryApprovalReference)fail('document/approved summary differs');
 const overview=tabs.find(t=>t.id===mapping.overviewTab);if(!overview||sha(overview.text)!==mapping.overviewSha256)fail('current Part Overview differs from approved mode mapping');
 const selected=tabs.filter(t=>new RegExp('^DAY \\d+ \\| DAYID '+dayid+' \\|','m').test(t.text));
 if(selected.length!==1||selected[0].id!==m.tabId)fail('missing/duplicate/wrong native Day tab');
 const tab=selected[0];if(sha(tab.text)!==m.nativeTextSha256)fail('native Day text changed; explicit mapping and fresh curriculum review required');
 const bank=new Map(tabs.map(t=>[t.id,t.text.split('\n').filter(p=>p.trim())]));
 function resolve(x){if(x&&typeof x==='object'&&Object.hasOwn(x,'$asset')){if(!/^assets\/(learning-target|rtf-comics)\/[a-z0-9-]+\.webp$/.test(x.$asset)||x.mimeType!=='image/webp')fail('unapproved asset path');const bytes=fs.readFileSync(path.resolve(__dirname,'..',x.$asset));if(sha(bytes)!==x.sha256)fail('approved artwork bytes changed');return 'data:'+x.mimeType+';base64,'+bytes.toString('base64');}if(x&&typeof x==='object'&&Object.hasOwn(x,'$source')){const p=bank.get(x.$source)?.[x.paragraph];if(typeof p!=='string'||x.start+x.length>p.length)fail('invalid source span');return p.slice(x.start,x.start+x.length);}if(Array.isArray(x))return x.map(resolve);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,resolve(v)]));return x;}
 const blocks=resolve(m.projection);
 const surfaces=blocks.sections.filter(s=>s.status==='applicable').flatMap(s=>[s.text,s.steps.join(' ')]).concat(blocks.activities.map(a=>a.instructions));
 for(const p of Object.values(m.instructionPlacements))if(surfaces.reduce((n,s)=>n+s.split(p.paragraph).length-1,0)!==1)fail('omitted/duplicate instructional passage');
 return {blocks,tab};
}
module.exports={project};
