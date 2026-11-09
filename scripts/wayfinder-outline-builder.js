(function setupBuilder(){
const E=x=>String(x||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const T=x=>String(x||"").replace(/\r\n?/g,"\n").trim();
function parse(raw,m){
let f={},k="",match=null;
const P=[["target",/^LEARNING TARGET(?:\s*[—:]\s*(.*))?$/i],["teks",/^(?:PRIORITY TEKS|TEKS)(?:\s*[—:]\s*(.*)|\s+(§.*))?$/i],["mission",/^TODAY'S MISSION(?:\s*[—:]\s*(.*))?$/i],["warm",/^WARM-UP.*?(?:[—:]\s*(.*))?$/i],["learnlab",/^LEARN LAB\b.*$/i],["recall",/^RECALL\b.*$/i],["learn",/^(?:LEARN|GROUP LEARN)\b.*$/i],["example",/^(?:REAL.*EXAMPLE.*|REAL GAME STUDIO CASE.*|FICTIONAL.*EXAMPLE.*|CLIENT.*EXAMPLE.*|EXAMPLE TO EXAMINE.*|AUTHENTIC.*EXEMPLAR.*)$/i],["practice",/^(?:GROUP PRACTICE.*|GUIDED PRACTICE.*)$/i],["perform",/^(?:PERFORM.*|INDEPENDENT TASK.*)$/i],["test",/^(?:SELF-TEST.*|TEST.*|DEBUG AND TEST.*|SUCCESS CRITERIA.*)$/i],["help",/^EXTRA HELP.*$/i],["studio",/^CREATIVE STUDIO.*$/i],["resources",/^RESOURCES?.*$/i],["pace",/^50-MINUTE.*$/i],["ignore",/^(?:BEFORE CREATIVE.*|MASTERY QUESTION.*|QUESTION REGISTRY SOURCE.*|KEY \d{5}.*|EXACT QUESTION.*|SOURCE RUBRIC.*|MODE EVIDENCE RULES.*|TEKS TEMPERATURE.*|OFFLINE.*|PRINTABLE.*|STUDENT.*|CLOSING CHECK.*|SOURCE STUDENT.*)$/i]];
for(const line of T(raw).split("\n")){const s=line.trim();if(!s)continue;match=P.map(([key,re])=>({key,x:s.match(re)})).find(a=>a.x);if(match){k=match.key;if(!f[k])f[k]=[];if(match.x[1]||match.x[2])f[k].push(match.x[1]||match.x[2]);continue;}if(!k||k==="ignore")continue;if(/^_{5,}$/.test(s)||/^(Your answer|Response|Answer independently|Write expected|Write your own|My remaining question)/i.test(s))continue;f[k].push(s)}
let x={};for(const name of ["target","teks","mission","warm","learn","learnlab","recall","example","practice","perform","test","help","studio","resources","pace"])x[name]=(f[name]||[]).join("\n");
if(!/^I can\b/i.test(x.target)){let skill=x.target.replace(/\.$/,"").trim();if(/^A client brief explains/i.test(skill))skill="explain how a client brief defines a website's audience, requirements and success";else if(/^A web page|^A designer|^A student/i.test(skill))skill="explain "+skill[0].toLowerCase()+skill.slice(1);else if(/^(TurboWarp|HTML|CSS|Sprites|Keyboard|Collision|Random)/i.test(skill))skill="use and explain "+skill[0].toLowerCase()+skill.slice(1);else if(!/^(explain|analyze|identify|design|create|build|compare|improve|test|describe|plan|evaluate|use|apply|adapt)\b/i.test(skill))skill="explain "+skill[0].toLowerCase()+skill.slice(1);x.target="I can "+skill+" because careful decisions create a clearer, more useful result.";}
x.target=x.target.replace(/^(?:I can\s+)(?:(?:explain|use and explain)\s+I can\s+)+/i,"I can ");
x.target=x.target.replace(/(\. because careful decisions create a clearer, more useful result\.)+/gi,".");
if(/^I can explain a responsive webpage/i.test(x.target))x.target="I can use responsive CSS and viewport testing to keep web content readable because real visitors use different devices.";
if(/^I can a client brief explains/i.test(x.target))x.target="I can explain how a client brief defines a website’s audience and requirements because clear requirements help people use the result.";
if(/^I can (?:a|an) (?:web|designer|student)/i.test(x.target))x.target="I can explain how design choices guide implementation because effective technology serves real users.";
if(!/because/i.test(x.target))x.target=x.target.replace(/\.$/,"")+" because understanding the design helps me improve the product.";
x.target=x.target.replace(/^I can explain (define|use|create|build|improve|analyze|test|plan|compare|evaluate)\b/i,(_,v)=>"I can "+v);
x.warm=x.warm.replace(/^(?:INDEPENDENT FIRST RESPONSE|INDEPENDENT|STUDENT FIRST)\n/i,"").trim();
if(!x.warm)throw new Error(`Missing approved, independent Warm-Up for ${m.title}; do not publish a generic placeholder.`);
x.learn=x.learn||`Use the supplied design example to learn today's key ideas. Compare what was planned with what a player or visitor experiences.`;
x.example=x.example||x.test||`Classroom comparison of a first version with a tested improvement.`;
x.practice=x.practice||`Teacher models the first essential step, predicts an outcome with the class, and checks the result.`;
x.perform=x.perform||x.mission||"Complete the lesson's assigned project and test the result.";
x.test=x.test||"Check that the user can complete the goal and understand the feedback.";
x.help=x.help||"Test one change at a time. Compare what you expected with what happened.";
return x;
}
function ideas(f,m){let a=[...f.studio.matchAll(/(?:^|\n)(?:A|B|C|1|2|3)\.\s*([^\n]+)/g)].map(x=>x[1]);if(a.length<3)a=m.course==="Tech"?["Change one game rule and test the result.","Improve the player instructions or feedback.","Compare a beginner and expert challenge setting."]:["Improve page readability with spacing.","Compare narrow and wide viewport layouts.","Test navigation and accessibility for beginners."];return a.slice(0,3)}
function steps(text){const matches=[...T(text).matchAll(/(?:^|[\s])(\d{1,2})\.\s+(?=\S)/g)];if(matches.length<2)return T(text).split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean).slice(0,8);return matches.map((a,i)=>T(text.slice(a.index+a[0].length,i+1<matches.length?matches[i+1].index:text.length))).filter(Boolean).slice(0,9)}
function outline(raw,m,Q){const f=parse(raw,m),qs=(m.keys||[]).map(key=>`KEY ${key} / TEKS ${Q[key]?.teks||"MISSING"}\nEXACT QUESTION: ${Q[key]?.question||"MISSING"}\nSOURCE RUBRIC: ${Q[key]?.rubric||"MISSING"}`).join("\n\n");return `AUTHORITATIVE COMPLETE DAY MASTER OUTLINE — HTML SOURCE, NOT OFFLINE\nDAYID ${m.dayid} | ${m.course} | Unit ${m.course==="Tech"?5:9} | Part ${m.part} | Day ${m.day} | ${m.mode}\nTITLE: ${m.title}\nPILLARS: ${m.course==="Tech"?"Gaming industry, game-design principles, TurboWarp implementation, fun and fairness, choice-based capstone.":"Professional web design, HTML/CSS, accessible UI/UX, responsive testing, fictional nonprofit client project."}\nIMPLEMENTATION NOTE: HTML must use the unmodified canonical master shell; questions in the student HTML must elicit every source rubric criterion; on-paper guide is derived AFTER the verified HTML, never the reverse.\n\nLEARNING TARGET\n${f.target}\nPRIORITY TEKS\n${f.teks}\nTODAY'S MISSION\n${f.mission||f.perform}\nWARM-UP\n${f.warm}\nGROUP LEARN\n${f.learn}\nAUTHENTIC EXEMPLAR\n${f.example}\nGROUP PRACTICE\n${f.practice}\nPERFORM\n${f.perform}\nSUCCESS CRITERIA\n${f.test}\nEXTRA HELP\n${f.help}\nCREATIVE STUDIO\n${ideas(f,m).map((x,i)=>`${i+1}. ${x}`).join("\n")}\nRESOURCES\n${f.resources||"All required text/examples are supplied in this lesson."}\n50-MINUTE PLAN\n${f.pace||"5 warm-up, 10 concept/demo, 27 independent work, 8 tests and transitions."}\nQUESTION REGISTRY SOURCE (TEACHER ONLY)\n${qs||"No new academic mastery question on this day."}\nMODE EVIDENCE RULES: ${m.mode==="RECOVERY"?"Use actual recent grading gaps and existing evidence; no new registered keys, no Xtra recovery.":m.mode==="ASSESS"?"Independent registered evidence; do not require regular Creative Studio.":"Warm-Up and Temperature participation; academic TEKS only from registered questions; one creative exploration zone with three choices."}\n`;}
const put=(h,slot,val)=>h.replace(new RegExp('(<(h1|h3|p|span)\\b[^>]*data-slot="'+slot+'"[^>]*>)[\\s\\S]*?(<\\/\\2>)'),(_,a,tag,b)=>a+val+b);
const FORM="https://docs.google.com/forms/d/e/1FAIpQLSd0OVYW0cuObc1FCSQy55eSm6UNFcPTX_R9QROBtXrEF84fXw/viewform?usp=pp_url&entry.1954781253=";
const SKITS=[{title:"Office Mystery",lines:[{speaker:"Forge",text:"The notes disappeared."},{speaker:"Tank",text:"Pixel is sitting on them."},{speaker:"Percival.12",text:"I have begun an investigation."}]},{title:"Paper Chase",lines:[{speaker:"Joey",text:"Who took the pencils?"},{speaker:"Forge",text:"Check the ferret tunnel."},{speaker:"Percival.36",text:"I'M NOT THE INVENTORY MANAGER."}]}];
function questionPart(k,Q){const prompt=Q[k]?.question||"";let claim={"30050":"All random obstacles are fair to players.","30052":"Every audience should have identical controls and difficulty.","30054":"Newer 3D graphics always make games more enjoyable.","30056":"AI-generated game levels never need human review.","20124":"Phone and desktop content should always use the same three-column width."}[String(k)];let html="";
if(claim)html=`<div data-answer-part data-type="true-false-why"><fieldset><legend>${E(claim)}</legend><label class="option"><input type="radio" name="claim-${k}" value="true" data-phrase="I think the statement is true"/>True</label><label class="option"><input type="radio" name="claim-${k}" value="false" data-phrase="I think the statement is false"/>False</label></fieldset><label>Why?</label><textarea data-open-response placeholder="This claim is ... because ..."></textarea></div>`;
const stems=k==="20121"?"The HTML element ... . A class/id/test selector finds it by ... .":k==="20122"||k==="20124"?"At a narrow width ... . At a wide width ... . I would test ... .":k==="30053"?"One hardware change was ... and it helped designers ... . A second change was ... .":"My specific example is ... . My reason is ... . I would verify this by ... .";
html+=`<div data-answer-part data-type="open-response"><label>${E(prompt)}</label><textarea data-open-response aria-label="Reasoning for registered mastery question" placeholder="${E(stems)}"></textarea><p class="micro">Optional stems only; explain every part in your own words.</p></div>`;return html;}
function build(master,raw,m,Q){const f=parse(raw,m),keys=m.keys||[],normal=!["RECOVERY","ASSESS"].includes(m.mode);let h=master;const target=f.target.replace(/^I can\s*/i,"").split(/\bbecause\b/i);const line=`I can ${E(target[0].trim().replace(/\.$/,""))} <strong>because</strong> ${E(target.slice(1).join(" because ").trim().replace(/\.$/,""))}.`;
for(const [name,val] of [["course-meta",`${m.course} · Unit ${m.course==="Tech"?5:9} · Part ${m.part} · Day ${m.day}`],["lesson-title",m.title],["lesson-deck",m.mode==="ASSESS"?"Independent evidence and final showcase":m.course==="Tech"?"Design, build and playtest a game":"Build accessible client websites"],["learning-target",line],["priority-teks",E(f.teks)],["supporting-teks",m.course==="Tech"?"Earlier algorithms and programming concepts":"Semantic HTML, CSS and browser testing"],["warm-hook",E(f.warm)],["group-learn",E(f.learn)],["group-practice",E(f.practice)],["perform-goal",E(f.mission||f.perform.slice(0,250))],["perform-criteria",E(f.test)],["labs-intro",E("Explore today's design using the same taught tools. Choose a suggested idea or your own relevant extension; document what you learned.")]])h=put(h,name,val);
h=h.replace(/(<p class="today-mission"><strong>Today's Mission:<\/strong>)[\s\S]*?(<\/p>)/,(_,a,b)=>a+" "+E(f.mission||f.perform.slice(0,180))+b);
h=h.replace(/<div class="slot" data-slot="warm-specimen">[\s\S]*?<\/div>/,"").replace(/<fieldset data-warm-choices hidden>[\s\S]*?<\/fieldset>/,'<fieldset data-warm-choices hidden></fieldset>');
h=h.replace(/<p class="hint">\[Easy question[\s\S]*?<\/p>/,"").replace(/placeholder="\[One brief thought about the hook\]"/,'placeholder="Answer the Warm-Up question using your own thinking..."');
["Tank: Look for evidence before choosing.","Forge: Test just one change at a time.","Joey: Make the controls easy to find.","Percival.12: Fair rules support every user."].forEach((v,i)=>{h=h.replace(new RegExp('(<div class="sticky" data-slot="rtf-note-'+(i+1)+'">)[\\s\\S]*?(<\\/div>)'),(_,a,b)=>a+E(v)+b)});
h=h.replace(/<figure class="slot" data-slot="authentic-example"[^>]*>[\s\S]*?<\/figure>/,`<figure class="specimen" data-slot="authentic-example"><figcaption><strong>Examine this example:</strong> ${E(f.example)}</figcaption></figure>`);
h=h.replace(/<div class="leader-discussion" data-slot="leader-discussion">[\s\S]*?<\/div>/,'<div class="leader-discussion" data-slot="leader-discussion"><p><strong>💬 Ask:</strong> What design choice is most important in the example?</p><p><strong>⏸ Pause:</strong> Hear two possible explanations.</p><p><strong>✅ Check:</strong> How could someone test whether the choice works?</p></div>');
h=h.replace(/<p class="hint" data-slot="learn-design-guidance">[\s\S]*?<\/p>/,"").replace(/<div class="slot" data-slot="learn-content">[\s\S]*?<\/div><\/div>/,"").replace(/<div class="slot" data-slot="rtf-learning-skit">[\s\S]*?<\/div>/,"");
h=h.replace(/<ol class="steps" data-slot="practice-steps">[\s\S]*?<\/ol>/,`<ol class="steps" data-slot="practice-steps"><li>${E(f.practice)}</li><li>Predict the result and compare it with what actually happens.</li><li>Identify one detail you should test in your own work.</li></ol>`).replace(/<div class="slot" data-slot="practice-specimen">[\s\S]*?<\/div>/,"");
h=h.replace(/<div class="slot art" id="labArt"[^>]*>[\s\S]*?<\/div><\/div>/,'<div class="slot art" id="labArt" hidden></div>');
h=h.replace(/<span data-mirror="learning-target">[\s\S]*?<\/span>/,'<span data-mirror="learning-target">'+E(f.target)+'</span>');
h=h.replace(/<span data-mirror="priority-teks">[\s\S]*?<\/span>/,'<span data-mirror="priority-teks">'+E(f.teks)+'</span>');
const act=steps(f.perform);h=h.replace(/<ol class="steps perform-step-list" data-slot="perform-steps">[\s\S]*?<\/ol>/,`<ol class="steps perform-step-list" data-slot="perform-steps">${act.map(t=>`<li><details class="perform-step"><summary>${E(t)}</summary><div class="perform-step-help"><strong>Extra Help:</strong> ${E(f.help)} <strong>Check:</strong> ${E(f.test)}</div></details></li>`).join("")}</ol>`);
h=h.replace(/<div class="slot" data-slot="perform-exemplar">[\s\S]*?<\/div>/,"");
let urls=[...new Set([...(f.resources+"\n"+f.perform).matchAll(/https?:\/\/[^\s<>"')]+/g)].map(a=>a[0].replace(/[.;,]$/,"")))].filter(a=>a.startsWith("https://"));h=h.replace(/<div class="perform-resources" data-slot="perform-resources" aria-label="Required resources for today's work" hidden>[\s\S]*?<\/div>/,urls.length?`<div class="perform-resources" data-slot="perform-resources" aria-label="Required resources for today's work"><h3>Resources for today's work</h3>${urls.map((u,i)=>`<p><a href="${E(u)}" rel="noopener noreferrer" target="_blank">Resource ${i+1}: ${E(u)}</a></p>`).join("")}</div>`:"");
const I=ideas(f,m);["one","two","three"].forEach((word,i)=>{h=put(h,`lab-${word}-title`,E(["Change One Rule","Improve the Interface","Test Another Option"][i]));h=put(h,`lab-${word}-instructions`,E(I[i]));h=h.replace(new RegExp('<div class="slot" data-slot="lab-'+word+'-example">[\\s\\S]*?<\\/div>'),"")});
for(let i=0;i<2;i++){const which=i?"two":"one",num=i+1,k=keys[i];if(k){h=put(h,`mastery-q${num}`,E(Q[k]?.question));const a=h.indexOf('<div class="type-sample" data-scaffold-slot="">',h.indexOf(`data-assembler="${which}"`));if(a>=0){const b=h.indexOf("</div>",a)+6;h=h.slice(0,a)+questionPart(k,Q)+h.slice(b)}h=put(h,`q${num}-help`,"Optional stems: One example is ... . This matters because ... . I would test by ... .");}else{h=h.replace(`id="mastery${i?"Two":"One"}"` ,`id="mastery${i?"Two":"One"}" hidden`);h=put(h,`mastery-q${num}`,"");}}
for(let i=0;i<2;i++){if(!keys[i])h=h.replace(new RegExp('<section class="panel mastery" data-question="'+(i?"two":"one")+'" id="mastery'+(i?"Two":"One")+'" hidden>[\\s\\S]*?<\\/section>'),"");}
const cfg={libraryUrl:`./${m.course}_Library.html`,imagePools:{target:[{src:"../assets/learning-target/pixel-learning-target.png",alt:"Approved Pixel learning-target illustration"}],temperature:[],labs:[],comics:[],skits:SKITS},destinations:{warm:FORM+m.dayid+"09998",q1:keys[0]?FORM+m.dayid+keys[0]:"",q2:keys[1]?FORM+m.dayid+keys[1]:"",temp:FORM+m.dayid+"29999",labs:normal?FORM+m.dayid+"20000":""}};
h=h.replace(/const WAYFINDER_CONFIG=\{libraryUrl:'',imagePools:\{target:\[\],temperature:\[\],labs:\[\],comics:\[\],skits:\[\]\},destinations:\{warm:'',q1:'',q2:'',temp:'',labs:''\}\};/,`const WAYFINDER_CONFIG=${JSON.stringify(cfg)};`);
if(!normal){h=h.replace('id="gateway"','id="gateway" hidden').replace('id="creativeLabs" hidden','id="creativeLabs" hidden');if(m.mode==="ASSESS")h=h.replace('id="temperature"','id="temperature" hidden');h=h.replace("function updateGate(){","function updateGate(){if(true){$('#creativeLabs').hidden=true;$('#labLock').hidden=true;return;}");}
h=h.replace('<footer class="footer">RTF Wayfinder · Reusable HTML master shell · Lesson content is inserted during an approved build.</footer>',`<footer class="footer">RTF Wayfinder · ${E(m.course)} Unit ${m.course==="Tech"?5:9} · Visibility controlled by teacher.</footer>`);
if(keys.length>2){let extra="",js="";keys.slice(2).forEach((k,i)=>{const n=i+3;extra+=`<section class="panel mastery" id="extraQ${n}"><h2>Mastery Question ${n}</h2><p>${E(Q[k]?.question)}</p><div class="scaffold"><label for="extraText${n}">Explain fully in your own words</label><textarea id="extraText${n}" rows="6"></textarea></div><div class="assembled-preview" id="extraPreview${n}" hidden></div><div class="actions"><button type="button" class="btn copy-action" id="extraCreate${n}">Create My Response</button><button type="button" class="btn submit" id="extraSend${n}" disabled>Copy and Submit My Answer</button></div><div id="extraStatus${n}" aria-live="polite"></div></section>`;js+=`(function(){const t=document.getElementById('extraText${n}'),v=document.getElementById('extraPreview${n}'),c=document.getElementById('extraCreate${n}'),b=document.getElementById('extraSend${n}'),status=document.getElementById('extraStatus${n}');let snap='';t.addEventListener('input',()=>{snap='';v.hidden=true;b.disabled=true;});c.addEventListener('click',()=>{snap=t.value.trim();if(!snap){status.textContent='Write your answer first.';return;}v.textContent=snap;v.hidden=false;b.disabled=false;});b.addEventListener('click',async()=>{if(!snap||snap!==t.value.trim())return;try{await navigator.clipboard.writeText(snap);window.open(${JSON.stringify(FORM+m.dayid+k)},'_blank','noopener,noreferrer');status.textContent='Copied; paste and submit.';}catch(e){t.focus();t.select();status.textContent='Copy manually and open the Form:';const a=document.createElement('a');a.href=${JSON.stringify(FORM+m.dayid+k)};a.target='_blank';a.textContent='Open Form';status.append(a);}})})();`});h=h.replace(/<section class="panel temp" id="temperature"( hidden)?>/,(_,hidden)=>extra+'<section class="panel temp" id="temperature"'+(hidden||"")+">");h=h.replace("</body></html>",`<script>${js}</script></body></html>`)}
// HARD MODE GATE: the canonical master remains common, but sections must match the approved day purpose.
if(m.mode==="LEARN"){
 const source=f.learnlab||"";
 if(!source)throw new Error("LEARN day is missing substantive approved Learn Lab content");
 h=h.replace(/<section\b[^>]*\bid="perform"[^>]*>[\s\S]*?<\/section>/i,"");
 const paras=source.split("\n").map(x=>x.trim()).filter(Boolean).map(x=>"<p>"+E(x)+"</p>").join("");
 h=h.replace(/<section\b[^>]*\bid="groupPractice"[^>]*>[\s\S]*?<\/section>/i,'<section class="panel learn" id="groupPractice"><span class="kicker">Explore and respond</span><h2>Read, Discuss and Check Understanding</h2>'+paras+'</section>');
 h=h.replace("I completed today's Perform work.","I completed today's reading and comprehension checks.");
}
if(m.mode==="PERFORM"){
 if(!f.recall)throw new Error("PERFORM day is missing a short, approved recall section");
 h=h.replace(/<section\b[^>]*\bid="groupLearn"[^>]*>[\s\S]*?<\/section>/i,"");
 h=h.replace(/<section\b[^>]*\bid="groupPractice"[^>]*>[\s\S]*?<\/section>/i,'<section class="panel practice" id="groupPractice"><span class="kicker">Recall</span><h2>What You Already Know</h2><p>'+E(f.recall)+'</p></section>');
 if(!/id="perform"/.test(h))throw new Error("PERFORM day missing actual task instructions");
}
return h;}
function offline(html,m,Q){
const decode=x=>String(x||"").replace(/&nbsp;/g," ").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const plain=x=>decode(String(x||"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
const slot=name=>{
 const re=new RegExp('data-slot="'+name+'"[^>]*>([\\s\\S]*?)<\\/(?:p|span|h1|h2|h3)>');
 return plain(html.match(re)?.[1]);
};
const section=id=>html.match(new RegExp('<section\\b[^>]*\\bid="'+id+'"[^>]*>[\\s\\S]*?<\\/section>','i'))?.[0]||"";
const mode=String(m.mode||"").toUpperCase(),warm=slot("warm-hook"),target=slot("learning-target"),teks=slot("priority-teks");
if(!warm||!target||!teks)throw new Error("Offline guide missing HTML Warm-Up, learning target or TEKS");
if(!["LEARN","PERFORM","RECOVERY","ASSESS"].includes(mode))throw new Error("Unapproved lesson mode");
const lines=[
"OFFLINE LEARNING GUIDE — "+mode,
m.course+" UNIT "+(m.course==="Tech"?5:9)+" PART "+m.part+" DAY "+m.day+" · "+m.title,
"Student _____________________ Period ______",
"LEARNING TARGET",target,"PRIORITY TEKS",teks,
"WARM-UP — ANSWER BEFORE THE LESSON",warm,
"Response: _______________________________________________________"
];
if(mode==="LEARN"){
 if(section("perform"))throw new Error("LEARN must not contain Perform");
 const learn=slot("group-learn"),discussion=plain(section("groupPractice"));
 if(!learn||!discussion)throw new Error("LEARN requires substantive reading and comprehension");
 lines.push("LEARN — READ AND DISCUSS",learn,"EXAMINE THIS CASE",plain(section("groupLearn").match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1]),"COMPREHENSION ACTIVITIES",discussion);
}else if(mode==="PERFORM"){
 if(section("groupLearn"))throw new Error("PERFORM must not introduce a Group Learn");
 const recall=plain(section("groupPractice")),block=section("perform");
 const steps=[...block.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(x=>plain(x[1]));
 if(!block||steps.length<3)throw new Error("PERFORM requires detailed step-by-step instructions");
 lines.push("RECALL — PRIOR LEARNING ONLY",recall,"PERFORM — COMPLETE THESE STEPS IN ORDER",...steps.map((x,i)=>(i+1)+". "+x),"TEST AND TROUBLESHOOT","Compare actual behavior with each expected result. Correct one step at a time; record only tests actually performed.");
}else{
 lines.push(mode+" — FOLLOW THE APPROVED DAY DIRECTIONS",plain(section("groupPractice")),plain(section("perform")));
}
const renderedQuestions=[...html.matchAll(/<p data-slot="mastery-q[12]">([\s\S]*?)<\/p>/g)].map(x=>plain(x[1])).filter(Boolean);
const expected=m.keys||[];
if(renderedQuestions.length!==expected.length)throw new Error("Registered HTML mastery question count differs from approved keys");
for(let i=0;i<renderedQuestions.length;i++){
 const k=String(expected[i]),approved=Q[k]?.question;
 if(!approved||plain(approved)!==renderedQuestions[i])throw new Error("Registered mastery question mismatch: "+k);
 lines.push("REGISTERED MASTERY QUESTION "+k,renderedQuestions[i],"My answer:","________________________________________________________________","________________________________________________________________","________________________________________________________________");
}
if(mode==="LEARN"||mode==="PERFORM"){
 const ideas=["one","two","three"].map(x=>slot("lab-"+x+"-instructions"));
 if(ideas.some(x=>!x))throw new Error("Missing Creative Studio choices");
 lines.push("CREATIVE STUDIO — TODAY'S LEARNING",...ideas.map((x,i)=>(i+1)+". "+x),"My reflection: ___________________________________________________",
 "TEKS TEMPERATURE CHECK","Circle: Need help / Developing / Confident. Give meaningful feedback: ______________________________");
}
lines.push("OFFLINE NOTE: Paper answers show thinking, not proof that software ran. Submit through your approved classroom method.");
return lines.filter(x=>x).join("\n")+"\n";
}
globalThis.WFBuilder={parse,outline,build,offline,E,steps};
})();