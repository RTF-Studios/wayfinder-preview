'use strict';
// Bind native inline recipes to the ACTUAL executed Scratch block graph. Formatting
// may differ; opcode order, nesting, conditions, signs and all values must agree.
const assert=require('assert/strict'),C=require('../scripts/wayfinder-content-contract.cjs'),source=require('../scripts/fixtures/f4a3-production/current-native-source.json');
const normalize=s=>s.replace(/−/g,'-').replace(/[\s()[\];→]/g,'');
function graphRecipe(project,name){
 const target=project.targets.find(t=>t.name===name);assert(target,'Missing executed sprite');const blocks=target.blocks,roots=Object.keys(blocks).filter(id=>blocks[id].topLevel&&!blocks[id].shadow);assert.equal(roots.length,1,'Expected one supplied recipe');
 function input(b,k,seen){const value=b.inputs[k]?.[1];assert(value!==undefined,'Missing block input '+k);return Array.isArray(value)?String(value[1]):emit(value,seen)}
 function chain(id,seen=new Set()){const list=[];while(id){assert(!seen.has(id),'Cycle in executed recipe');seen=new Set(seen).add(id);list.push(emit(id,seen));id=blocks[id].next}return list.join(';')}
 function emit(id,seen=new Set()){
  const b=blocks[id];assert(b,'Missing executed block '+id);const v=k=>input(b,k,seen),sub=k=>chain(b.inputs[k]?.[1],new Set(seen));
  switch(b.opcode){
   case 'event_whenflagclicked':return 'when green flag clicked';
   case 'motion_gotoxy':return 'go to x:'+v('X')+' y:'+v('Y');
   case 'control_forever':return 'forever {'+sub('SUBSTACK')+'}';
   case 'control_if':return 'if '+v('CONDITION')+' then '+sub('SUBSTACK');
   case 'sensing_keypressed':return 'key ['+v('KEY_OPTION')+'] pressed?';
   case 'sensing_keyoptions':return b.fields.KEY_OPTION[0];
   case 'motion_changexby':return 'change x by '+v('DX');
   case 'motion_setx':return 'set x to '+v('X');
   case 'operator_gt':return v('OPERAND1')+' > '+v('OPERAND2');
   case 'operator_lt':return v('OPERAND1')+' < '+v('OPERAND2');
   case 'motion_xposition':return 'x position';
   case 'motion_yposition':return 'y position';
   case 'operator_random':return 'pick random '+v('FROM')+' to '+v('TO');
   case 'control_repeat_until':return 'repeat until ('+v('CONDITION')+') {'+sub('SUBSTACK')+'}';
   case 'motion_changeyby':return 'change y by '+v('DY');
   case 'control_wait':return 'wait '+v('DURATION')+' seconds';
   default:throw Error('Unsupported executed opcode '+b.opcode);
  }
 }
 return chain(roots[0]);
}
function binding(fixture,visibleText,html){
 assert([2,3].includes(fixture.day),'Native binding scope is Day2/3');const id='305020'+fixture.day,r=C.extractLesson(source,id);
 const provenance=html.match(/<!-- M1 source ([\s\S]*?) -->/);assert(provenance,'Missing production source provenance');const p=JSON.parse(provenance[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));assert.deepEqual(p,r.provenance,'Changed native source binding');
 const section=r.payload.sections.find(s=>s.id===(fixture.day===2?'group_learn':'group_practice')),text=section.text;
 assert(visibleText.replace(/\s+/g,' ').includes(text.replace(/\s+/g,' ')),'Complete native recipe teaching is not visibly delivered');
 const re=fixture.day===2?/models this exact Player script: ([\s\S]*?)\. Students/:/Exact teacher recipe: ([\s\S]*?})\./,match=text.match(re);assert(match,'Missing source-declared recipe');
 const sprite=fixture.day===2?'Player':'FallingObject',executed=graphRecipe(fixture.project,sprite);assert.equal(normalize(match[1]),normalize(executed),'Displayed native recipe differs from executed graph');return {sprite,sourceSha256:r.provenance.sourceSha256,comparison:'Exact opcode-derived inline recipe, including conditions/values/nesting'};
}
module.exports={binding,graphRecipe};
