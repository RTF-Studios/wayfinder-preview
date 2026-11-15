'use strict';
// Optional, fully source-declared regular-lesson presentation. This module only
// fills canonical shell content. It never owns CSS, engines, keys or rubrics.
const E=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const p=x=>'<p>'+E(x)+'</p>';
function apply(h,r,{slot,section,parts}){
 const l=r.presentation.layout;if(!l)return h;
 const s=Object.fromEntries(r.sections.map(s=>[s.id,s]));
 const media=new Map(r.media.items.map(m=>[m.id,m]));
 const diagram=id=>{const m=media.get(id); // validated static SVG; no executable or external resources
  const svg=Buffer.from(m.dataUri.split(',')[1],'base64').toString('utf8').replace(/\bviewbox=/g,'viewBox=');
  return '<figure aria-label="Classroom prototype diagram">'+svg+'<figcaption>'+E(m.attribution)+'</figcaption></figure>';
 };
 h=slot(h,'course-meta',E(r.identity.course+' · Unit '+r.identity.unit+' · Part '+r.identity.part+' · Day '+r.identity.day+' — '+l.metaSuffix));
 h=slot(h,'lesson-mode',E('Day '+r.identity.day+' · '+r.mode[0]+r.mode.slice(1).toLowerCase()+' Focused'));
 h=slot(h,'priority-teks',E(r.teks.priority.map(x=>x.code+': '+x.wording).join(' ')));
 h=h.replace(/(<span data-mirror="priority-teks">)[\s\S]*?(<\/span>)/,(_,a,b)=>a+E(r.teks.priority.map(x=>x.code+': '+x.wording).join(' '))+b);
 h=h.replace(/<p class="today-mission">[\s\S]*?<\/p>\s*<p class="micro">[\s\S]*?<\/p>/,'<p class="today-mission"><strong>Today’s Mission:</strong> '+E(l.mission)+'</p>');
 h=section(h,'lessonVocabulary',''); // vocabulary already occurs in the approved Learn prose
 const road=l.roadmap;
 const roadmap='<section class="panel starter-roadmap" id="partRoadmap"><h2>'+E(road.title)+'</h2>'+p(road.intro)+diagram(road.mediaId)+'<ol>'+road.steps.map(x=>'<li>'+E(x)+'</li>').join('')+'</ol><p><strong>Success:</strong> '+E(road.success)+'</p></section>';
 h=h.replace(/(<section\b[^>]*\bid="learningTarget"[^>]*>[\s\S]*?<\/section>)/,(_,a)=>a+roadmap);
 h=slot(h,'warm-hook',E(s.warm_up.text));h=h.replace('<fieldset data-warm-choices hidden></fieldset>','');
 h=h.replace(/(<textarea id="warmAnswer"[^>]*placeholder=")[^"]*(")/,(_,a,b)=>a+E(l.warmPlaceholder)+b);
 const learn='<section class="panel learn" id="groupLearn"><span class="kicker">02 · Listen, talk, examine</span><h2>'+E(s.group_learn.title)+'</h2>'+
 '<p class="leader-intro">🎙️ <strong>Learning Leader:</strong> '+E(l.learn.leaderIntro)+'</p><p data-slot="group-learn">'+E(s.group_learn.text)+'</p>'+
 '<figure class="slot" data-slot="authentic-example" aria-label="Real-world professional example">'+E(s.exemplar.text).replace(/^Real-world design process:/,'<strong>Real-world design process:</strong>')+'</figure>'+
 '<div class="leader-discussion" data-slot="leader-discussion"><p><strong>Discuss:</strong> '+E(l.learn.discussionQuestion)+'</p>'+p(l.learn.discussionFollowup)+'</div>'+diagram(l.learn.mediaId)+'</section>';
 h=section(h,'group_learn',learn);h=section(h,'exemplar','');
 // The legacy renderer's exemplar media was outside its panel. It must not be
 // left behind when the approved source places it within Learn/roadmap/Perform.
 for(const m of r.media.items.filter(m=>m.purpose==='exemplar')){
  const re=new RegExp('<figure><img src="'+m.dataUri.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"[\\s\\S]*?<\\/figure>','g');h=h.replace(re,'');
 }
 h=section(h,'group_practice','<section class="panel practice" id="groupPractice"><span class="kicker">03 · Watch the teacher demonstrate</span><h2>'+E(s.group_practice.title)+'</h2><p data-slot="group-practice">'+E(s.group_practice.text)+'</p><ol class="steps" data-slot="practice-steps">'+s.group_practice.steps.map(x=>'<li>'+E(x)+'</li>').join('')+'</ol></section>');
 h=section(h,'perform','<section class="panel perform" id="perform"><span class="kicker">05 · Apply it</span><h2>'+E(s.perform.title)+'</h2><p data-slot="perform-goal">'+E(s.perform.text)+'</p><div class="perform-resources" data-slot="perform-resources" aria-label="Required resources for today\'s work"><h3>'+E(l.perform.resourcesTitle)+'</h3>'+p(l.perform.resourcesText)+'</div><ol class="steps perform-step-list" data-slot="perform-steps">'+l.perform.steps.map(x=>'<li><details class="perform-step"><summary>'+E(x.summary)+'</summary><div class="perform-step-help">'+p(x.help)+'</div></details></li>').join('')+'</ol>'+diagram(l.perform.mediaId)+'<p class="micro" data-slot="perform-criteria">'+E(l.perform.criteria)+'</p></section>');
 for(const [n,q] of r.evidence.graded.items.entries()){
  const which=n===0?'one':'two';
  h=h.replace(new RegExp('(<div class="answer-parts" data-assembler="'+which+'">)[\\s\\S]*?(<\\/div><details>)'),(_,a,b)=>a+parts(q,false,l.answerPlaceholders)+b);
  h=h.replace(new RegExp('(<div aria-live="polite" class="status" id="q'+(n+1)+'Status"><\\/div><\\/div>)(<\\/section>)'),(_,a,b)=>a+'<p class="hint">'+E(l.masteryFeedback)+'</p>'+b);
 }
 h=slot(h,'labs-intro',E(s.studio.text));
 h=h.replace(/<div class="checks">[\s\S]*?<\/div>/,'<div class="checks">'+l.checklist.map(x=>'<label><input class="gate-check" type="checkbox"/> '+E(x)+'</label>').join('')+'</div>');
 // Restore the unchanged compact reflection instructions from the master.
 h=h.replace(/(<label for="temperatureFeedback">[\s\S]*?<\/label><p class="hint">)[\s\S]*?(<\/p>)/,(_,a,b)=>a+'Name one thing that helped or one thing we should improve.'+b);
 h=h.replace(/<footer class="footer">[\s\S]*?<\/footer>/,'<footer class="footer">'+E(l.footer)+'</footer>');
 h=h.replace('<div class="slot" id="comicSlot">','<div class="slot" id="comicSlot" aria-label="Four-panel comic; scroll horizontally to read every panel" style="display:block;aspect-ratio:auto;min-height:0;max-width:100%;overflow-x:auto" tabindex="0">');
 h=h.replace(/(<div class="slot" id="comicSlot"[^>]*>[\s\S]*?<\/div>)/,(_,a)=>a+'<p class="micro">'+E(l.comicScrollHint)+'</p>');
 // Preserve the existing guide’s bounded comic-reading rule as source-declared
 // packaging. The canonical master style block and JavaScript stay byte-identical.
 h=h.replace('</head>','<style data-wf-packaging>'+comicRule(l)+'</style>\n</head>');
 return h;
}
function comicRule(l){return '#comicSlot img{width:100%;height:auto;min-width:'+l.comicImageMinWidth+'px;max-width:none}';}
module.exports={apply,comicRule};
