'use strict';
// Mode-aware content placement only; uses canonical shell classes and engine.
const E=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const p=x=>'<p>'+E(x)+'</p>';
function apply(h,r,{slot,section}){
 const l=r.presentation.instructionLayout;if(!l)return h;
 const s=Object.fromEntries(r.sections.map(s=>[s.id,s]));
 h=slot(h,'lesson-deck',E(l.studentContext));
 h=h.replace(/(<p class="today-mission"><strong>Today's Mission:<\/strong>)[\s\S]*?(<\/p>)/,(_,a,b)=>a+' '+E(l.studentMission)+b);
 h=h.replace('<li>'+E(r.tools[0].name+': '+r.tools[0].instructions)+'</li>','<li>'+E(r.tools[0].name+': '+l.toolInstructions)+'</li>');
 const vocab=/<section\b[^>]*\bid="lessonVocabulary"[^>]*>[\s\S]*?<\/section>/,v=h.match(vocab)?.[0];
 if(!v)throw Error('M1 presentation: missing vocabulary');h=h.replace(vocab,'');h=h.replace(/(<section\b[^>]*\bid="warmup"[^>]*>[\s\S]*?<\/section>)/,(_,a)=>a+v);
 const rawSteps=id=>s[id].steps.concat(r.activities.filter(a=>a.sectionId===id).map(a=>a.instructions));
 const steps=id=>'<ol class="steps perform-step-list">'+rawSteps(id).map(text=>'<li><details class="perform-step"><summary>'+E(text)+'</summary></details></li>').join('')+'</ol>';
 const outcomes=id=>r.activities.filter(a=>a.sectionId===id).map(a=>p(a.outcome)).join('');
 // Retain every original passage once, with complete essential instructions in
 // accessible closed summaries. No invented help or replacement teaching text.
 const practice='<section class="panel practice" id="groupPractice"><h2>'+E(s.group_practice.title)+'</h2>'+p(s.group_practice.text)+steps('group_practice')+outcomes('group_practice')+'</section>';
 h=section(h,'group_practice',practice);
 if(r.mode==='PERFORM')h=section(h,'perform','<section class="panel perform" id="perform"><h2>'+E(s.perform.title)+'</h2>'+p(s.perform.text)+steps('perform')+outcomes('perform')+'</section>');
 // Put the independent Daily checkpoint before independent project work, as
 // allocated in the native clock. Learn has only its connected Practice activity.
 if(r.mode==='PERFORM'){
  const re=/<section\b[^>]*\bid="perform"[^>]*>[\s\S]*?<\/section>/,a=h.match(re)?.[0];
  if(!a)throw Error('M1 presentation: missing Perform');h=h.replace(re,'');
  h=h.replace(/(<section\b[^>]*\bid="masteryOne"[^>]*>[\s\S]*?<\/section>)/,(_,b)=>b+a);
 }
 // Preserve source hand-in and bridge once, without promoting teacher metadata
 // or duplicating the evidence instructions in the header and teaching panel.
 const trailer='<h3>'+E(s.hand_in.title)+'</h3>'+p(s.hand_in.text)+'<h3>'+E(s.next_day_bridge.title)+'</h3>'+p(s.next_day_bridge.text);
 if(r.mode==='LEARN')h=h.replace(trailer,'');
 h=h.replace(/(<section\b[^>]*\bid="temperature")/,'<section class="panel" id="lessonClose"><h2>'+E(s.next_day_bridge.title)+'</h2>'+p(s.next_day_bridge.text)+'</section>$1');
 if(r.mode==='PERFORM')h=h.replace(trailer,'');
 h=slot(h,'warm-hook',E(s.warm_up.text));
 h=h.replace('I completed today\'s Perform work.',r.mode==='LEARN'?'I completed today\'s guided Player practice.':'I completed today\'s Perform work.');
 // Retain source temperature wording alongside the required feedback frame.
 // Existing master remains the owner of response eligibility/capture behavior.
 h=h.replace('<div class="slot" id="comicSlot">','<div class="slot" id="comicSlot" aria-label="Four-panel comic; scroll horizontally to read every panel" style="display:block;aspect-ratio:auto;min-height:0;max-width:100%;overflow-x:auto" tabindex="0">');
 h=h.replace(/(<div class="slot" id="comicSlot"[^>]*>[\s\S]*?<\/div>)/,(_,a)=>a+'<p class="micro">'+E(l.comicScrollHint)+'</p>');
 h=h.replace('</head>','<style data-wf-packaging>'+require('./wayfinder-presentation.cjs').comicRule(l)+'</style>\n</head>');
 // The HTML breadcrumb binds audit role selection to the validated source,
 // never to caller claims or retained historical prose labels.
 return h.replace('<body','<!-- WF-INSTRUCTION-ROLES '+JSON.stringify({dayid:r.identity.dayid,mode:r.mode})+' -->\n<body');
}
module.exports={apply};
