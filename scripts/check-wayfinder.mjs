import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/check-wayfinder.mjs Tech/3020101.html'); process.exit(2); }
const html = readFileSync(file, 'utf8');
const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
// Prevent malformed copied targets (e.g. "I can repeated actions can ...").
const targetStart=html.indexOf('<p data-slot="learning-target">');
const targetEnd=html.indexOf('</p>',targetStart);
const targetText=targetStart>=0&&targetEnd>targetStart?html.slice(targetStart,targetEnd).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim():'';
check(/^I can\s+\S+/i.test(targetText), 'Learning Target must begin with I can and an action');
check(/\bbecause\b/i.test(targetText), 'Learning Target must include a grammatical because reason');
check(!/^I can\s+(?:can|repeated|the|a|an|my|this|that)\b/i.test(targetText), 'Malformed I-can target; replace a sentence fragment with an action verb');
const required = ['sideNav','navToggle','targetArt','warmAnswer','warmStatus','q1assembled',
 'temperatureFeedback','creativeLabs','labLock','labCopy','comicSlot','skitSlot'];
for (const id of required) check(ids.has(id), 'Required element missing: ' + id);
// New Studio builds use one shared entry; preserve validation of historical three-field lessons.
if (ids.has('studioEvidence')) {
 check(/Your own idea means a creative extension of today['’]s work[—-]not permission to switch to an unrelated activity or tool\./.test(html), 'Missing Creative Studio on-task boundary');
 check(!['labOneResponse','labTwoResponse','labThreeResponse'].some(id => ids.has(id)), 'Studio must use one shared evidence field');
 check((html.match(/class="lab"/g) || []).length === 3, 'Studio needs three suggested idea cards');
} else {
 for (const id of ['labOneResponse','labTwoResponse','labThreeResponse']) check(ids.has(id), 'Legacy Lab element missing: ' + id);
}
const javascript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
check(Boolean(javascript), 'Missing inline JavaScript');
try { new Script(javascript); } catch (error) { problems.push('Invalid JavaScript: ' + error.message); }
for (const match of javascript.matchAll(/(?<!\$)\$\('#([A-Za-z][\w-]*)'\)/g)) {
 if (match[1] === 'miniLearn') continue;
 check(ids.has(match[1]), 'JavaScript references missing element: ' + match[1]);
}
check(javascript.includes('querySelectorAll'), 'No collection selection for checklist');
const hasQ2 = ids.has('masteryTwo') || ids.has('q2assembled');
if(hasQ2)check(ids.has('q2assembled'), 'Second mastery question missing preview');
const configured = (key) =>
 javascript.includes('"'+key+'":"https://') ||
 javascript.includes(key+":'https://") ||
 javascript.includes(key+':"https://');
for(const key of ['warm','temp','labs']){
 check(html.includes('data-submission="'+key+'"'), 'Missing submission: '+key);
 check(configured(key), 'Missing verified Form URL for '+key);
}
for(const [key,which] of [['q1','one'], ...(hasQ2?[['q2','two']]:[])]){
 check(html.includes('data-question="'+which+'"'), 'Missing registered mastery controls: '+key);
 check(configured(key), 'Missing verified mastery Form URL: '+key);
}
const sevenDigitDay=file.match(/(\\d{7})\\.html$/)?.[1];
if(sevenDigitDay){
 const keys=[...html.matchAll(/entry\\.1954781253=(\\d{12})/g)].map(m=>m[1]);
 check(keys.length >= (hasQ2?5:4), 'Not enough twelve-digit school Form keys');
 check(keys.every(k=>k.startsWith(sevenDigitDay)), 'Incorrect DayID in one or more Form keys');
}
check((html.match(/class="sticky"/g) || []).length === 4, 'Need exactly four text-only notes');
check(!/comics:\s*\[\s*\]/.test(javascript), 'Comic pool missing approved art');
check(!/skits:\s*\[\s*\]/.test(javascript), 'Text skit pool is empty');
check(!html.includes('approved rotating image from populated pool'), 'Unpopulated art placeholder');
if (problems.length) {
 console.error('WAYFINDER PREFLIGHT FAILED\n' + problems.map(x => '- ' + x).join('\n'));
 process.exit(1);
}
console.log('Static preflight PASS. Real browser/clipboard/Form receipt tests still required.');
