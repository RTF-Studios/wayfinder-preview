#!/usr/bin/env node
// Wayfinder Stage 2 static preflight. No student data, auth or network writes.
import fs from 'node:fs';
import path from 'node:path';
const [file, mode='preview', library] = process.argv.slice(2);
if (!file || !['preview','student'].includes(mode)) {
  console.error('Usage: node scripts/wayfinder-preflight.mjs <day.html> preview|student [library.html]');
  process.exit(2);
}
const html = fs.readFileSync(file,'utf8');
const issues = [], warnings = [];
const fail = (test, message) => { if (!test) issues.push(message); };
const warn = (test, message) => { if (!test) warnings.push(message); };
const id = path.basename(file).match(/^(\d{7})\.html$/)?.[1];
fail(Boolean(id), 'Filename must be DayID.html (seven digits).');
fail(/TEACHING SYSTEMS — EMBEDDED DEVELOPMENT HANDOFF/.test(html), 'Missing source-embedded handoff comment.');
fail(/Learning Target/i.test(html) && /We will/i.test(html) && /so that/i.test(html), 'Missing selectable WHAT+WHY Learning Target.');
fail(/TEKS Temperature Check/i.test(html), 'Missing TEKS Temperature Check.');
fail(/Extra Help/i.test(html), 'Missing white framed Extra Help.');
fail(/Creative Labs/i.test(html), 'Missing optional Creative Labs.');
fail(/<input\b[^>]*type=["']checkbox["']|<input\b[^>]*type=checkbox/i.test(html), 'Missing required completion checks.');
const notes = [...html.matchAll(/class=["'][^"']*(?:rtf-note-grid|notes)[^"']*["']/gi)];
warn(notes.length >= 2, 'Inspect two properly placed four-sticky RTF rows in rendered HTML.');
const labs = [...html.matchAll(/<h3[^>]*>\s*[ABC] · /g)];
warn(labs.length === 3, 'Regular instructional day should have exactly three independently scaffolded labs; check Closeout exception.');
const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]);
warn(imgs.length > 0, 'No character artwork present; verify approved target-art rotation.');
for (const img of imgs) {
 fail(/\balt=/.test(img),'Image lacks alt text.');
 fail(!/src=["']data:image\//.test(img),'Inline base64 art conflicts with current GitHub asset hosting policy.');
}
const keys = [...html.matchAll(/entry\.1954781253=(\d{9})/g)].map(x=>x[1]);
fail(new Set(keys).size === keys.length, 'Duplicate Form keys.');
if (id) for (const key of keys) fail(key.startsWith(id), 'Form key from different DayID: '+key);
if (mode==='student') {
 fail(keys.length>0,'Student page must have registered Forms prefill links.');
 fail(!/(under review|teacher review|preview only|submission disabled|available after release)/i.test(html.replace(/<!--[^]*?-->/g,'')), 'Student-facing review-only text found.');
 fail(!/href=["']#["']\s+onclick=["']event\.preventDefault/.test(html), 'Inert answer button on student page.');
 fail(/target=["']_blank["']/.test(html) && /noopener noreferrer/.test(html), 'Missing safe external-form link attributes.');
}
if (library) {
 const index = fs.readFileSync(library,'utf8');
 fail(!/(under review|teacher review)/i.test(index), 'Review-only copy found in student library.');
 for (const match of index.matchAll(/href=["']\.\/([^"'#?]+\.html)["']/g)) {
   fail(fs.existsSync(path.join(path.dirname(library),match[1])), 'Missing local library destination: '+match[1]);
 }
 if (mode==='student' && id) fail(index.includes(id+'.html'), 'Student library missing current DayID.');
}
for(const x of warnings) console.warn('REVIEW:',x);
for(const x of issues) console.error('FAIL:',x);
console.log(JSON.stringify({file,mode,errors:issues.length,warnings:warnings.length,keys:keys.length},null,2));
process.exit(issues.length?1:0);
