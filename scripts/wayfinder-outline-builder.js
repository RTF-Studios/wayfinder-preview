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
function outline(raw,m,Q){const f=parse(raw,m),qs=(m.keys||[]).map(key=>`KEY ${key} / TEKS ${Q[key]?.teks||"MISSING"}\nEXACT QUESTION: ${Q[key]?.question||"MISSING"}\nSOURCE RUBRIC: ${Q[key]?.rubric||"MISSING"}`).join("\n\n");return `AUTHORITATIVE COMPLETE DAY MASTER OUTLINE — HTML SOURCE, NOT OFFLINE\nDAYID ${m.dayid} | ${m.course} | Unit ${m.unit} | Part ${m.part} | Day ${m.day} | ${m.mode}\nTITLE: ${m.title}\nPILLARS: ${m.course==="Tech"?"Gaming industry, game-design principles, TurboWarp implementation, fun and fairness, choice-based capstone.":"Professional web design, HTML/CSS, accessible UI/UX, responsive testing, fictional nonprofit client project."}\nIMPLEMENTATION NOTE: HTML must use the unmodified canonical master shell; questions in the student HTML must elicit every source rubric criterion; on-paper guide is derived AFTER the verified HTML, never the reverse.\n\nLEARNING TARGET\n${f.target}\nPRIORITY TEKS\n${f.teks}\nTODAY'S MISSION\n${f.mission||f.perform}\nWARM-UP\n${f.warm}\nGROUP LEARN\n${f.learn}\nAUTHENTIC EXEMPLAR\n${f.example}\nGROUP PRACTICE\n${f.practice}\nPERFORM\n${f.perform}\nSUCCESS CRITERIA\n${f.test}\nEXTRA HELP\n${f.help}\nCREATIVE STUDIO\n${ideas(f,m).map((x,i)=>`${i+1}. ${x}`).join("\n")}\nRESOURCES\n${f.resources||"All required text/examples are supplied in this lesson."}\n50-MINUTE PLAN\n${f.pace||"5 warm-up, 10 concept/demo, 27 independent work, 8 tests and transitions."}\nQUESTION REGISTRY SOURCE (TEACHER ONLY)\n${qs||"No new academic mastery question on this day."}\nMODE EVIDENCE RULES: ${m.mode==="RECOVERY"?"Use actual recent grading gaps and existing evidence; no new registered keys, no Xtra recovery.":m.mode==="ASSESS"?"Independent registered evidence; do not require regular Creative Studio.":"Warm-Up and Temperature participation; academic TEKS only from registered questions; one creative exploration zone with three choices."}\n`;}
const put=(h,slot,val)=>h.replace(new RegExp('(<(h1|h3|p|span)\\b[^>]*data-slot="'+slot+'"[^>]*>)[\\s\\S]*?(<\\/\\2>)'),(_,a,tag,b)=>a+val+b);
const FORM="https://docs.google.com/forms/d/e/1FAIpQLSd0OVYW0cuObc1FCSQy55eSm6UNFcPTX_R9QROBtXrEF84fXw/viewform?usp=pp_url&entry.1954781253=";
const SKITS=[{title:"Office Mystery",lines:[{speaker:"Forge",text:"The notes disappeared."},{speaker:"Tank",text:"Pixel is sitting on them."},{speaker:"Percival.12",text:"I have begun an investigation."}]},{title:"Paper Chase",lines:[{speaker:"Joey",text:"Who took the pencils?"},{speaker:"Forge",text:"Check the ferret tunnel."},{speaker:"Percival.36",text:"I'M NOT THE INVENTORY MANAGER."}]}];
function questionPart(k,Q){const prompt=Q[k]?.question||"";let claim={"30050":"All random obstacles are fair to players.","30052":"Every audience should have identical controls and difficulty.","30054":"Newer 3D graphics always make games more enjoyable.","30056":"AI-generated game levels never need human review.","20124":"Phone and desktop content should always use the same three-column width."}[String(k)];let html="";
if(claim)html=`<div data-answer-part data-type="true-false-why"><fieldset><legend>${E(claim)}</legend><label class="option"><input type="radio" name="claim-${k}" value="true" data-phrase="I think the statement is true"/>True</label><label class="option"><input type="radio" name="claim-${k}" value="false" data-phrase="I think the statement is false"/>False</label></fieldset><label>Why?</label><textarea data-open-response placeholder="This claim is ... because ..."></textarea></div>`;
const stems=k==="20121"?"The HTML element ... . A class/id/test selector finds it by ... .":k==="20122"||k==="20124"?"At a narrow width ... . At a wide width ... . I would test ... .":k==="30053"?"One hardware change was ... and it helped designers ... . A second change was ... .":"My specific example is ... . My reason is ... . I would verify this by ... .";
html+=`<div data-answer-part data-type="open-response"><label>${E(prompt)}</label><textarea data-open-response aria-label="Reasoning for registered mastery question" placeholder="${E(stems)}"></textarea><p class="micro">Optional stems only; explain every part in your own words.</p></div>`;return html;}
// M1 production entry: no call to the legacy free-form/default parser.
function build(master,raw,m,Q){
 const identityGate=typeof require==='function'?require('./wayfinder-identity.cjs'):globalThis.WFIdentity;
 if(!identityGate)throw new Error('Identity pre-HTML FAIL: load wayfinder-identity.cjs before building');
 identityGate.preflight({course:m.course,dayid:m.dayid,unit:m.unit,part:m.part,day:m.day,title:m.title},m.identitySources,raw);
 const contract=typeof require==='function'?require('./wayfinder-content-contract.cjs'):globalThis.WFContentContract;
 if(!contract)throw new Error('M1 source extraction runtime unavailable; use the validated Node build entry');
 const record=contract.extractLesson(m.source,m.dayid);
 if(record.sourceText!==raw)throw new Error('M1 source text differs from the current native tab');
 if(record.payload.mode!==m.mode)throw new Error('M1 mode differs from explicit source mode');
 for(const field of ['course','dayid','unit','part','day','title'])if(record.payload.identity[field]!==m[field])throw new Error('M1 identity differs from builder '+field);
 return contract.buildRecord(master,record,m.source,m.identitySources);
}
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
m.course+" UNIT "+(m.unit)+" PART "+m.part+" DAY "+m.day+" · "+m.title,
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
const extraQuestions=[...html.matchAll(/<section class="panel mastery" id="extraQ\d+"><h2>Mastery Question \d+<\/h2><p>([\s\S]*?)<\/p>/g)].map(x=>plain(x[1]));renderedQuestions.push(...extraQuestions);
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