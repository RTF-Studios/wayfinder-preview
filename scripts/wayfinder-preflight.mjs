#!/usr/bin/env node
// Wayfinder static navigation preflight. Run: node scripts/wayfinder-preflight.mjs
// Run BEFORE publishing. Source QA does not certify live Pages/Forms access.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = path.join(root, 'library.html');
const issues = [];
if (!fs.existsSync(lib)) issues.push('Missing library.html');
const library = fs.existsSync(lib) ? fs.readFileSync(lib, 'utf8') : '';
const targets = [...library.matchAll(/href=["'](\.\/[^"'#?]+\.html)(?:\?[^"']*)?["']/gi)].map(m => m[1]);
if (!targets.length) issues.push('No student pages linked in library.html');
for (const rel of new Set(targets)) {
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { issues.push('Missing library target: ' + rel); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const entries = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi)];
  const back = entries.filter(m => /Back to the Library/i.test(m[0]));
  if (back.length !== 1) { issues.push(rel + ': expected exactly one Back to the Library anchor; got ' + back.length); continue; }
  const url = back[0][1];
  const expected = 'https://rtf-studios.github.io/wayfinder-preview/library.html';
  const resolved = /^https?:\/\//i.test(url) ? url.split(/[?#]/)[0] : path.posix.normalize(path.posix.join(path.posix.dirname('/wayfinder-preview/' + rel.slice(2)), url.split(/[?#]/)[0]));
  if (resolved !== expected && resolved !== '/wayfinder-preview/library.html') issues.push(rel + ': broken Back to Library target ' + url);
  for (const anchor of ['Back to Top', 'Feedback']) {
    const link = entries.find(m => m[0].includes(anchor));
    if (!link) { issues.push(rel + ': missing menu link ' + anchor); continue; }
    const hash = link[1].match(/^#([\w-]+)$/);
    if (!hash || !new RegExp('id=["\\\']' + hash[1] + '["\\\']').test(html)) issues.push(rel + ': unresolved ' + anchor + ' destination ' + link[1]);
  }
}
if (issues.length) { console.error('Wayfinder navigation FAIL:\n' + issues.map(s => '- ' + s).join('\n')); process.exitCode = 1; }
else console.log('Wayfinder navigation PASS: ' + new Set(targets).size + ' student pages, all menu targets resolved in repository.');
