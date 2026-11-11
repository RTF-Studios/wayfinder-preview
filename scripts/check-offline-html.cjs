#!/usr/bin/env node
// Structural media checks only; real browser and Collector QA remain separate gates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function inspect(data){
 const raw=data.toString('utf8'),issues=[];
 // Literal student code snippets are content, not live resource requests.
 const html=raw.replace(/<(textarea|pre)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 if(data.length>2*1024*1024)issues.push('HTML exceeds 2 MiB');
 const seen=new Set();
 const pools=[...html.matchAll(/window\.__WF_MEDIA\s*=\s*(\{[\s\S]*?\});/g)];
 let media={};
 try{for(const pool of pools)Object.assign(media,JSON.parse(pool[1]));}catch{issues.push('invalid embedded media map')}
 for(const m of html.matchAll(/data-wf-media=["']([^"']+)["']/g))if(!media[m[1]])issues.push('missing media key '+m[1]);
 for(const m of html.matchAll(/window\.__WF_MEDIA\[["']([^"']+)["']\]/g))if(!media[m[1]])issues.push('missing script media key '+m[1]);
 for(const m of html.matchAll(/data:image\/([\w.+-]+);base64,([A-Za-z0-9+/=]+)/g)){
  const bytes=Buffer.from(m[2],'base64'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
  if(!['webp','svg+xml'].includes(m[1].toLowerCase()))issues.push('unoptimized image '+m[1]);
  if(seen.has(hash))issues.push('duplicate image payload '+hash.slice(0,12));seen.add(hash);
  if(bytes.length>250*1024)issues.push('image exceeds 250 KiB');
  if(m[1]==='webp'&&(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'))issues.push('incorrect WebP bytes');
 }
 for(const tag of html.matchAll(/<(img|script|source|iframe|video|audio|link)\b[^>]*>/gi)){
  if(tag[1].toLowerCase()==='link'&&!/rel\s*=\s*["'](?:icon|shortcut icon|stylesheet|preload|modulepreload)/i.test(tag[0]))continue;
  for(const attr of tag[0].matchAll(/\b(?:src|href|poster|srcset)\s*=\s*["']([^"']*)["']/gi))if(attr[1]&&!/^(data:|#)/i.test(attr[1]))issues.push('nonembedded resource '+attr[1].slice(0,100));
 }
 for(const m of html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').matchAll(/url\(\s*["']?([^)'"]+)/gi))if(!/^(data:|#)/i.test(m[1].trim()))issues.push('nonembedded CSS resource '+m[1].slice(0,80));
 if(/@import\b/i.test(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')))issues.push('CSS import requires network');
 if(/\bfetch\s*\(/.test(html))issues.push('runtime fetch requires offline review');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/type=["'](?:application\/json|text\/plain)/i.test(m[1]))continue;
  try{new vm.Script(m[2])}catch(e){issues.push('JavaScript syntax: '+e.message)}
 }
 return [...new Set(issues)];
}
if(require.main===module){
 let failed=0,checked=0;
 const requested=process.argv.slice(2);
 const files=requested.length?requested: ['Tech','CS','AAVTC'].flatMap(course=>fs.readdirSync(path.join(root,course)).filter(n=>/^\d+\.html$/.test(n)).map(n=>course+'/'+n));
 for(const file of files){
  checked++;let data,issues;
  try{data=fs.readFileSync(path.resolve(root,file));issues=inspect(data)}catch(e){issues=[e.message]}
  if(issues.length){failed++;console.error('HOLD '+file+': '+issues.join(' | '))}else console.log('PASS '+file+' '+data.length+' bytes');
 }
 console.log(JSON.stringify({checked,failed}));if(failed)process.exitCode=1;
}
module.exports={inspect};
