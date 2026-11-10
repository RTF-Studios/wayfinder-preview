#!/usr/bin/env node
// Current authoritative submission preflight is .github/submission-contract-qa.cjs.
// The former nav/three-button checks are obsolete for standalone offline Wayfinders.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'.github/submission-contract-qa.cjs');
const args=process.argv.slice(2);
const result=spawnSync(process.execPath,[script,...(args.length?args:['--changed'])],{cwd:root,stdio:'inherit'});
process.exit(result.status===null?1:result.status);
