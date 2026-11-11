#!/usr/bin/env node
// Mandatory offline media preflight. Reports issues; does not release lessons.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const courses = ['Tech','CS','AAVTC'];
const maxFile = 2 * 1024 * 1024;
const maxImage = 250 * 1024;
let failed = 0;
for (const course of courses) {
  const folder = path.join(root, course);
  if (!fs.existsSync(folder)) continue;
  for (const name of fs.readdirSync(folder).filter(n => /^\d{7}\.html$/.test(n))) {
    const filename = path.join(folder, name);
    const data = fs.readFileSync(filename);
    const html = data.toString('utf8');
    const issues = [];
    if (data.length > maxFile) issues.push('HTML larger than 2 MiB');
    const dataUrls = [...html.matchAll(/data:image\/([\w.+-]+);base64,([A-Za-z0-9+/=]+)/g)];
    const distinct = new Map();
    for (const m of dataUrls) {
      if (m[1].toLowerCase() !== 'webp' && m[1].toLowerCase() !== 'svg+xml')
        issues.push('unoptimized embedded image: ' + m[1]);
      const payload = m[2];
      const digest = crypto.createHash('sha256').update(payload).digest('hex');
      if (distinct.has(digest)) issues.push('duplicate embedded image: ' + digest.slice(0,12));
      distinct.set(digest, true);
      if (Buffer.byteLength(payload, 'base64') > maxImage)
        issues.push('embedded image larger than 250 KiB');
    }
    for (const m of html.matchAll(/<(?:img|script|source|iframe|link)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const tag = m[0].match(/^<\w+/)[0].toLowerCase();
      const url = m[1].trim();
      if (/^data:/i.test(url) || url.startsWith('#')) continue;
      if (tag === '<link' && !/rel\s*=\s*["'](?:icon|stylesheet|preload|modulepreload)/i.test(m[0])) continue;
      issues.push('non-embedded resource: ' + url.slice(0,130));
    }
    for (const m of html.matchAll(/url\(\s*["']?([^)'"]+)/gi)) {
      const url = m[1].trim();
      if (/^data:/i.test(url) || url.startsWith('#')) continue;
      issues.push('non-embedded CSS resource: ' + url.slice(0,130));
    }
    if (issues.length) {
      failed++;
      console.error(course+'/'+name+': '+[...new Set(issues)].join(' | '));
    } else console.log('PASS '+course+'/'+name+' '+data.length+' bytes');
  }
}
if (failed) {
  console.error('HOLD: '+failed+' guide(s) fail offline-media preflight. Never treat this as browser QA.');
  process.exitCode = 1;
}
