'use strict';
// Content/configuration adapter only. The universal master owns every CSS/JS
// function. No source inference, question rewriting, rubric rendering or defaults.
const fs=require('node:fs'),path=require('node:path');
const E=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const p=x=>'<p>'+E(x)+'</p>';
function slot(h,name,value){const re=new RegExp('(<(h1|h2|h3|p|span|div)\\b[^>]*data-slot="'+name+'"[^>]*>)[\\s\\S]*?(<\\/\\2>)');if(!re.test(h))throw Error('M1 renderer: missing master slot '+name);return h.replace(re,(_,a,t,b)=>a+value+b);}
function section(h,id,value){const re=new RegExp('<section\\b[^>]*\\bid="'+id+'"[^>]*>[\\s\\S]*?<\\/section>');if(!re.test(h))throw Error('M1 renderer: missing master section '+id);return h.replace(re,value);}
function parts(q,includeHelp=true,placeholders=[]){return q.parts.map(a=>{
 const name=E(q.fullKey+'-'+a.id);let controls='';
 if(['selected_choice','multiple_choice','true_false'].includes(a.answerType))controls='<fieldset><legend>'+E(a.prompt)+'</legend>'+a.options.map(o=>'<label class="option"><input type="radio" name="'+name+'" value="'+E(o.value)+'" data-phrase="'+E(o.label)+'"/> '+E(o.label)+'</label>').join('')+'</fieldset>';
 else if(a.answerType==='checkbox')controls='<fieldset><legend>'+E(a.prompt)+'</legend>'+a.options.map(o=>'<label class="option"><input type="checkbox" value="'+E(o.value)+'" data-phrase="'+E(o.label)+'"/> '+E(o.label)+'</label>').join('')+'</fieldset>';
 else if(a.answerType==='dropdown')controls='<label>'+E(a.prompt)+'<select data-answer-select><option value=""></option>'+a.options.map(o=>'<option value="'+E(o.value)+'" data-phrase="'+E(o.label)+'">'+E(o.label)+'</option>').join('')+'</select></label>';
 else if(a.answerType==='fill_blank')controls='<label>'+E(a.prompt)+'</label>'+p(a.sentence)+Array.from({length:a.blanks},(_,i)=>'<input type="text" data-blank aria-label="'+E(a.prompt+' '+(i+1))+'"/>').join('');
 else controls='<label>'+E(a.prompt)+'</label><textarea data-open-response rows="3" placeholder="'+E(placeholders.find(p=>p.fullKey===q.fullKey&&p.partId===a.id)?.text||'')+'"></textarea>';
 return '<div data-answer-part data-type="'+(a.answerType==='fill_blank'?'fill-blank':'open-response')+'"'+(a.answerType==='fill_blank'?' data-sentence="'+E(a.sentence)+'"':'')+'>'+controls+(includeHelp?'<details><summary>Extra Help</summary>'+p(a.help)+'</details>':'')+'</div>';
}).join('');}
function assessment(q,n,stimuli){return '<section class="panel mastery assessment-section" data-n="'+n+'" id="assessmentSection'+n+'"><span class="kicker">Assessment Section '+n+'</span><h2>'+E(q.title)+'</h2>'+p(q.prompt)+stimuli+'<div class="scaffold"><div class="answer-parts" data-assembler="assessment'+n+'">'+parts(q)+'</div></div><div class="response"><div class="assembled-preview" id="preview'+n+'" hidden role="status" aria-live="polite"></div><div class="actions"><button class="btn copy-action section-build" data-n="'+n+'" type="button">Create My Response</button><button class="btn submit section-submit" data-n="'+n+'" type="button" disabled>Copy &amp; Submit My Answer</button></div><p class="status" id="sectionStatus'+n+'" aria-live="polite"></p></div></section>';}
function render(master,r,provenance){
 if(typeof master!=='string'||!master.includes('function assemble(which){'))throw Error('M1 renderer: canonical master required');
 const qs=r.evidence.graded.status==='applicable'?r.evidence.graded.items:[];
 if(r.mode!=='ASSESSMENT'&&qs.length>2)throw Error('M1 compatibility: unchanged regular master has two evidence shells; additional regular questions need a separately authorized renderer extension');
 const sections=Object.fromEntries(r.sections.map(s=>[s.id,s]));const active=id=>sections[id].status==='applicable';
 const media=r.media.status==='applicable'?r.media.items:[];
 const asset=m=>m.kind==='image'||m.kind==='diagram'?'<figure><img src="'+E(m.dataUri)+'" alt="'+E(m.alt)+'"/>'+p(m.attribution)+'</figure>':m.kind==='text'||m.kind==='code'?'<figure><pre>'+E(Buffer.from(m.dataUri.split(',')[1],'base64').toString('utf8'))+'</pre>'+p(m.attribution)+'</figure>':m.kind==='video'?'<video controls src="'+E(m.dataUri)+'" aria-label="'+E(m.alt)+'"></video>':m.kind==='audio'?'<audio controls src="'+E(m.dataUri)+'" aria-label="'+E(m.alt)+'"></audio>':'<a href="'+E(m.dataUri)+'" download>'+E(m.alt)+'</a>';
 const forPurpose=purpose=>media.filter(m=>m.purpose===purpose).map(asset).join('');
 const forQuestion=q=>media.filter(m=>q.parts.some(a=>a.stimulusIds.includes(m.id))).map(asset).join('');
 const activityText=id=>r.activities.filter(a=>a.sectionId===id).map(a=>a.instructions+'\n'+a.outcome).join('\n');
 const activities=id=>r.activities.filter(a=>a.sectionId===id).map(a=>p(a.instructions)+p(a.outcome)).join('');
 const primary=r.mode==='ASSESSMENT'?'assessment_runway':r.mode==='LEARN'?'group_learn':'perform';
 const content=id=>p(sections[id].text)+(sections[id].steps.length?'<ol class="steps">'+sections[id].steps.map(s=>'<li>'+E(s)+'</li>').join('')+'</ol>':'')+activities(id)+(id===primary?'<h3>'+E(sections.hand_in.title)+'</h3>'+p(sections.hand_in.text)+activities('hand_in')+'<h3>'+E(sections.next_day_bridge.title)+'</h3>'+p(sections.next_day_bridge.text)+activities('next_day_bridge'):'');
 const panel=(id,cls)=>'<section class="panel '+cls+'" id="'+id+'"><h2>'+E(sections[id].title)+'</h2>'+content(id)+'</section>';
 let h=master;const i=r.identity;
 h=slot(h,'course-meta',E(i.course+' · Unit '+i.unit+' · Part '+i.part+' · Day '+i.day));h=slot(h,'lesson-mode',E('Day '+i.day+' · '+r.mode+' Focused'));h=slot(h,'lesson-title',E(i.title));h=slot(h,'lesson-deck',E(sections.prior_learning_hook.text));
 h=slot(h,'learning-target',E(r.learningTarget.text).replace('because','<strong>because</strong>'));
 h=slot(h,'priority-teks',E(r.teks.priority.map(x=>x.code+': '+x.wording).join('\n')));
 h=slot(h,'supporting-teks',r.teks.supporting.status==='applicable'?E(r.teks.supporting.items.map(x=>x.code+': '+x.wording).join('\n')):'');
 h=h.replace(/(<p class="today-mission"><strong>Today's Mission:<\/strong>)[\s\S]*?(<\/p>)/,(_,a,b)=>a+' '+E(sections.hand_in.text)+b);
 h=h.replace(/(<p class="today-mission">[\s\S]*?<\/p>)/,(_,a)=>a+'<p class="micro">'+E(r.pacing.map(x=>sections[x.sectionId].title+': '+x.minutes+' min').join(' · '))+'</p>');
 h=h.replace(/<div class="slot" data-slot="warm-specimen">[\s\S]*?<\/div>/,forPurpose('warm')).replace(/<fieldset data-warm-choices hidden>[\s\S]*?<\/fieldset>/,'<fieldset data-warm-choices hidden></fieldset>');
 h=slot(h,'warm-hook',active('warm_up')?E(sections.warm_up.text+'\n'+activityText('warm_up')+'\n'+r.evidence.xtra.warmUp.prompt):'');
 h=h.replace(/placeholder="\[Answer the question in the scenario using one or two sentences\.\]"/,'placeholder=""');
 for(let k=0;k<4;k++)h=slot(h,'rtf-note-'+(k+1),r.presentation.notes.status==='applicable'?E(r.presentation.notes.items[k]):'');
 if(!active('warm_up'))h=section(h,'warmup','');
 const vocabulary='<section class="panel learn" id="lessonVocabulary"><h2>Vocabulary</h2><dl>'+r.vocabulary.map(x=>'<dt>'+E(x.term)+'</dt><dd>'+E(x.definition)+'</dd>').join('')+'</dl><ul>'+r.tools.map(t=>'<li>'+E(t.name+': '+t.instructions)+'</li>').join('')+'</ul></section>';
 h=h.replace(/(<section\b[^>]*\bid="warmup")/,vocabulary+'$1');
 h=section(h,'groupLearn',active('group_learn')?panel('group_learn','learn'):'');
 h=section(h,'groupPractice',active('group_practice')?panel('group_practice','practice'):'');
 h=section(h,'perform',active('perform')?panel('perform','perform'):'');
 const exemplar=active('exemplar')?panel('exemplar','learn')+forPurpose('exemplar'):forPurpose('exemplar');
 h=h.replace(/(<section\b[^>]*\bid="masteryOne")/,exemplar+'$1');
 if(r.mode==='ASSESSMENT'){
  const runway=panel('assessment_runway','learn')+qs.map((q,n)=>assessment(q,n+1,forQuestion(q))).join('');
  h=section(h,'masteryOne',runway);h=section(h,'masteryTwo','');
 }else{
  for(let n=1;n<=2;n++){
   const q=qs[n-1],which=n===1?'one':'two',id=n===1?'masteryOne':'masteryTwo';
   if(!q){h=section(h,id,'');continue;}
   h=slot(h,'mastery-q'+n,E(q.prompt));h=slot(h,'q'+n+'-help',E(q.parts.map(a=>a.help).join('\n')));
   h=h.replace(new RegExp('(<div class="answer-parts" data-assembler="'+which+'">)[\\s\\S]*?(<\\/div><details>)'),(_,a,b)=>a+forQuestion(q)+parts(q)+b);
  }
 }
 h=slot(h,'labs-intro',active('studio')?E(sections.studio.text+'\n'+activityText('studio')+'\n'+r.evidence.xtra.studio.prompt):'');
 for(const [n,word]of ['one','two','three'].entries()){
  const idea=r.presentation.studioIdeas.status==='applicable'?r.presentation.studioIdeas.items[n]:null;
  h=slot(h,'lab-'+word+'-title',idea?E(idea.title):'');h=slot(h,'lab-'+word+'-instructions',idea?E(idea.instructions):'');
  h=h.replace(new RegExp('<div class="slot" data-slot="lab-'+word+'-example">[\\s\\S]*?<\\/div>'),'');
 }
 if(!active('studio')){h=section(h,'creativeLabs','');h=section(h,'gateway','');}
 if(!active('temperature'))h=section(h,'temperature','');
 else{h=h.replace('<label for="temperatureFeedback">Learning Guide feedback — required</label>','<label for="temperatureFeedback">'+E(r.evidence.xtra.temperature.prompt)+'</label>');h=h.replace('Name one thing that helped or one thing we should improve.',E(sections.temperature.text+'\n'+activityText('temperature')));}
 h=h.replace(/<span data-mirror="learning-target">[\s\S]*?<\/span>/,'<span data-mirror="learning-target">'+E(r.learningTarget.text)+'</span>');
 h=h.replace(/<span data-mirror="priority-teks">[\s\S]*?<\/span>/,'<span data-mirror="priority-teks">'+E(r.teks.priority.map(x=>x.code+': '+x.wording).join('\n'))+'</span>');

 h=require('./wayfinder-presentation.cjs').apply(h,r,{slot,section,parts});
 const config={mode:r.mode,imagePools:{target:media.filter(m=>m.purpose==='target').map(m=>({src:m.dataUri,alt:m.alt})),temperature:[],labs:media.filter(m=>m.purpose==='studio').map(m=>({src:m.dataUri,alt:m.alt})),comics:media.filter(m=>m.purpose==='comic').map(m=>({src:m.dataUri,alt:m.alt})),skits:r.presentation.layout?.skits||[]},destinations:{warm:r.evidence.xtra.warmUp.status==='applicable'?r.evidence.xtra.warmUp.submissionUrl:'',temp:r.evidence.xtra.temperature.status==='applicable'?r.evidence.xtra.temperature.submissionUrl:'',labs:r.evidence.xtra.studio.status==='applicable'?r.evidence.xtra.studio.submissionUrl:'',q1:'',q2:''}};
 qs.forEach((q,n)=>{config.destinations[r.mode==='ASSESSMENT'?'section'+(n+1):'q'+(n+1)]=q.submissionUrl;});
 h=h.replace(/const WAYFINDER_CONFIG=\{[^\n]*\};/,()=> 'const WAYFINDER_CONFIG='+JSON.stringify(config).replace(/</g,'\\u003c')+';');
 // Standalone packaging: the unchanged master already falls back to placeArt
 // when WF_ART is absent. Use the declared embedded pools; never discover online
 // folders at runtime. Essential random rotation and error fallback stay intact.
 h=h.replace('<script src="../assets/shared/artwork-rotation.js"></script>','');
 const favicon=fs.readFileSync(path.resolve(__dirname,'../assets/shared/rtf-compass-favicon.svg'));
 h=h.replace(/(<link rel="icon"[^>]*href=")[^"]*(")/,(_,a,b)=>a+'data:image/svg+xml;base64,'+favicon.toString('base64')+b);
 h=h.replace(/<template\b[\s\S]*?<\/template>/g,'');
 if(!r.presentation.layout)h=h.replace(/<footer class="footer">[\s\S]*?<\/footer>/,'<footer class="footer">'+E(i.course+' · '+i.title)+'</footer>');
 return h.replace('<body','<!-- M1 source '+E(JSON.stringify(provenance))+' -->\n<body');
}
module.exports={render};
