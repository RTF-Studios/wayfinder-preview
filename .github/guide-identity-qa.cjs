#!/usr/bin/env node
'use strict';
// Small, dependency-free identity gate; importable by the mandatory browser QA.
const fs = require('fs');
const path = require('path');
const DAY = /^(Tech|CS|AAVTC)\/(\d{7})\.html$/;
const WEEKDAY = /\b(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\s*,?\s+(?:Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|\d{1,2})\b/i;
function plain(s) {return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function validate(file,html){
  const errors=[];
  const match=file.match(DAY);
  if(!match)return ['filename must be Course/7-digit-DayID.html'];
  const [,course,id]=match;
  const expectedCourse={Tech:'3',CS:'2',AAVTC:'1'}[course];
  if(id[0]!==expectedCourse)errors.push(`DayID ${id} does not belong to ${course}`);
  const unit=Number(id.slice(1,3)),part=Number(id.slice(3,5)),day=Number(id.slice(5,7));
  if(!unit||!part||!day)errors.push('DayID unit/part/day must be positive');
  const expected=new RegExp(`\\bUnit\\s+${unit}\\s*[·•|:-]\\s*Part\\s+${part}\\s*[·•|:-]\\s*Day\\s+${day}\\b`,'i');
  const eyebrow=html.match(/<div\b[^>]*class=["'][^"']*\beyebrow\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if(!eyebrow||!expected.test(plain(eyebrow[1])))errors.push(`visible header must say Unit ${unit} · Part ${part} · Day ${day}`);
  const kicker=html.match(/<span\b[^>]*class=["'][^"']*\bkicker\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if(kicker&&/\bUnit\s+\d+/.test(plain(kicker[1]))&&!expected.test(plain(kicker[1])))errors.push('Learning Target identity disagrees with DayID');
  const head=html.match(/<header\b[\s\S]*?<\/header>/i)?.[0]||'';
  if(WEEKDAY.test(plain(head)))errors.push('header contains a calendar weekday/date; use permanent Unit/Part/Day title');
  const title=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if(!title||!plain(title[1]))errors.push('missing visible lesson title');
  if(title&&WEEKDAY.test(plain(title[1])))errors.push('lesson title contains a weekday/date');
  return errors;
}
function selfTest(){
  const good='<header><div class="eyebrow">RTF · CS · Unit 9 · Part 3 · Day 2</div><h1>Turkey Escape: Build</h1></header>';
  const wrong=good.replace('Day 2','Day 3');
  const dated=good.replace('Turkey Escape: Build','Tue Nov 17 — Turkey Escape');
  const tests=[
    [validate('CS/2090302.html',good).length===0,'valid identity'],
    [validate('CS/2090302.html',wrong).length>0,'wrong day'],
    [validate('CS/2090302.html',dated).length>0,'calendar date'],
    [validate('Tech/2090302.html',good).length>0,'wrong course'],
    [validate('CS/2090302-extra.html',good).length>0,'wrong filename']
  ];
  for(const [ok,label] of tests)if(!ok)throw Error('identity QA self-test failed: '+label);
  console.log('Identity QA self-tests PASS ('+tests.length+')');
}
if(require.main===module){
  if(process.argv.includes('--self-test'))selfTest();
  else{
    const files=process.argv.slice(2),errors=[];
    if(!files.length)throw Error('Pass guide paths or --self-test');
    for(const file of files){
      const html=fs.readFileSync(path.resolve(file),'utf8');
      for(const issue of validate(file,html))errors.push(file+': '+issue);
    }
    console.log(JSON.stringify({status:errors.length?'FAIL':'PASS',files:files.length,errors},null,2));
    if(errors.length)process.exitCode=1;
  }
}
module.exports={validate,selfTest};
