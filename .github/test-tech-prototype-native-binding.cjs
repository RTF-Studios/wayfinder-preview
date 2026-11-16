'use strict';
const fs=require('fs'),assert=require('assert/strict'),C=require('../scripts/wayfinder-content-contract.cjs'),s=require('../scripts/fixtures/f4a3-production/current-native-source.json'),data=require('./tech-prototype-code-fixtures.json'),B=require('./tech-prototype-native-binding.cjs');let tests=0;
for(const original of data.fixtures.filter(f=>[2,3].includes(f.day))){const id='305020'+original.day,r=C.extractLesson(s,id),html=fs.readFileSync(require('path').resolve(__dirname,'..',original.path),'utf8'),text=r.payload.sections.filter(x=>x.status==='applicable').map(x=>x.text).join('\n');B.binding(original,text,html);tests++;
 const name=original.day===2?'Player':'FallingObject';
 for(const change of ['value','condition','nesting','opcode']){const f=structuredClone(original),blocks=f.project.targets.find(t=>t.name===name).blocks;if(change==='value'){const b=Object.values(blocks).find(b=>b.opcode===(original.day===2?'motion_changexby':'motion_changeyby'));b.inputs[original.day===2?'DX':'DY'][1][1]='99'}else if(change==='condition')Object.values(blocks).find(b=>['operator_gt','operator_lt'].includes(b.opcode)).opcode='operator_gt';else if(change==='nesting')Object.values(blocks).find(b=>b.opcode==='control_forever').inputs.SUBSTACK[1]=null;else Object.values(blocks).find(b=>b.opcode==='motion_gotoxy').opcode='unsupported';
  if(change==='condition'&&original.day===2)Object.values(blocks).find(b=>b.opcode==='operator_lt').opcode='operator_gt';
  assert.throws(()=>B.binding(f,text,html));tests++;
 }
 assert.throws(()=>B.binding(original,'missing source recipe',html));tests++;
 assert.throws(()=>B.binding(original,text,html.replace(r.provenance.sourceSha256,'0'.repeat(64))));tests++;
}
console.log('Native inline/executed-graph binding tests PASS',tests);
