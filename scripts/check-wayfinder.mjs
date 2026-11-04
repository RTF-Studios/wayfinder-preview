import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/check-wayfinder.mjs Tech/3020101.html'); process.exit(2); }
const html = readFileSync(file, 'utf8');
const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
const required = ['sideNav','navToggle','targetArt','warmAnswer','warmStatus','q1assembled','q2assembled',
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
for (const type of ['warm','q1','q2','temp','labs']) {
 check(html.includes('data-submission="' + type + '"'), 'Missing submission: ' + type);
 check(javascript.includes(type + ":'https://"), 'Missing school Form URL for ' + type);
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
