#!/usr/bin/env python3
"""Build only the approved Part1 Day6 assessment through the unchanged master."""
import json,re,html,hashlib,importlib.util
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prototype',ROOT/'scripts/build-tech-u5-prototype.py')
P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
source=json.loads((ROOT/'scripts/tech-u5-part1-day6-source.json').read_text())
records=[{'key':r[0],'suffix':r[1],'prompt':r[2],'rubric':r[3]} for r in source['collector']['values']]
assert [r['key'] for r in records]==['30501063999'+str(i) for i in range(1,5)]
assert all(r['prompt'] in source['outline'] for r in records)
d=BeautifulSoup(P.MASTER,'html.parser')
def para(t):return '<p>'+html.escape(t)+'</p>'
def slot(k,v,raw=False):P.replace_slot(d,k,v,raw)
for k,v in {
 'course-meta':'Tech · Unit 5 · Part 1 · Day 6',
 'lesson-mode':'Day 6 · Assessment Focused',
 'lesson-title':'Game Design & TurboWarp Foundations',
 'lesson-deck':'Show what you learned in four short sections, then improve earlier work using posted feedback.',
 'learning-target':'I can explain technology changes, player-centered choices and repeatable design tests <strong>because</strong> clear reasoning helps me improve an interactive experience.',
 'priority-teks':'§126.18(c)(4)(A): Explain how technology changes affect design; (4)(B): Explain trends in technology; (3)(B): Use digital tools to solve a problem; (3)(C): Explain the design process and its roles. Today’s assessment reviews only the Part’s taught ideas.',
 'supporting-teks':'§126.18(c)(2)(A): Apply programming concepts. Review sprites, variables, events and testing from our desktop skills lab; writing about a test is separate from demonstrating running software.',
 'labs-intro':'After the assessment, prioritize your earlier graded recovery. Use a brief creative pause with these already taught ideas and record what you tried. You can sketch on paper; no software project is required today.',
 'lab-one-title':'One-line arcade invitation',
 'lab-one-instructions':'Write a playful, clear invitation to a game you know. Try two short versions and choose the one that tells a new player what to expect.',
 'lab-two-title':'Tiny studio badge',
 'lab-two-instructions':'On paper, sketch a small symbol for one studio role you learned. Adjust one detail so a classmate can recognize its job.',
 'lab-three-title':'A new look for the same idea',
 'lab-three-instructions':'Sketch two appearances for a simple game character on paper. Compare which would stand out more clearly on the same imagined background.'
}.items():slot(k,v,k=='learning-target')
mission=d.select_one('.today-mission');mission.clear();mission.append(P.frag('<strong>Today’s Mission:</strong> Submit four assessment responses, then use posted Skyward feedback to strengthen previously graded Daily work.'))
for id in ['warmup','groupLearn','groupPractice','masteryOne','masteryTwo','perform','gateway']:d.find(id=id).decompose()
study='''<section class="panel learn" id="studyRecall"><h2>Study &amp; Recall</h2>
<p>You may consult these short notes. Use your own reasoning for the new situations below; these are reminders, not worked answers.</p>
<ul><li>Technology changes the possibilities and limits of an interactive experience.</li><li>UI is what a player sees and uses; UX is how the experience works and feels for that player.</li><li>A rule shapes what can happen. A playtest compares what you expected with what actually happened.</li><li>Studio teams divide responsibilities and use feedback to improve a design. AI output still needs human judgment.</li><li>A sprite is a separate object; a costume is its appearance. A variable stores a value, and an event starts a script.</li><li>A repeatable test checks the same behavior again under comparable starting conditions.</li></ul>
<p>First half: about 25 minutes for these notes, four short responses and four Form submissions. Four equally weighted sections make <strong>one Major grade</strong>. No game building during the assessment.</p>
<p>For each section, explain all requested parts briefly. Select Create My Response, review the purple preview, then Copy &amp; Submit My Answer. In the school Form, paste and submit. Copying alone does not submit your answer.</p></section>'''
d.find(id='learningTarget').insert_after(P.frag(study));anchor=d.find(id='studyRecall')
titles=['Technology & the Player','Fair Rules & Testing','Studio Teamwork & Responsible AI','Desktop Tools & Reliable Restarts']
stems=[
 'One technology change is … . This lets designers … . For a younger player, I would … because … .',
 'The fairness problem is … . I would change … . To compare before and after, I would … and observe … .',
 'The two jobs are … and … . They work together by … . Before using the AI material, I would check … .',
 'For separate objects, I would … . The score and start event use … . To test the reset twice, I would … and expect … .'
]
criteria=[
 'Name an accurate technology change, a workable UI/control choice and its benefit for the younger player.',
 'Identify the cause, propose a feasible rule change and explain a comparable test with a visible outcome.',
 'Name two accurate roles, explain their collaboration and give a specific responsible-use check.',
 'Identify appropriate sprite, variable and event tools, then explain a repeatable reset check.'
]
for i,record in enumerate(records,1):
 card=BeautifulSoup(P.assessment_card(i,titles[i-1],record['prompt'],stems[i-1]),'html.parser')
 section=card.find('section');section['id']='section'+str(i)
 area=section.find('textarea');area['id']='sectionAnswer'+str(i);area['rows']='3'
 lab=section.select_one('[data-answer-part] label');lab['for']=area['id'];lab.string='Answer every requested part in one short response.'
 section.select_one('details p').string='Read one part at a time. '+stems[i-1]+' Use your own words and reasoning.'
 section.append(P.frag('<p>What counts: '+html.escape(criteria[i-1])+'</p>'))
 anchor.insert_after(card);anchor=d.find(id='section'+str(i))
recovery='''<section class="panel practice" id="priorDailyRecovery"><h2>Second Half · Recover Previously Graded Work</h2>
<p>Use about 20 minutes for earlier Daily corrections, with the remaining few minutes for reflection and a brief Creative Studio attempt. This is the recovery half of today’s period.</p>
<ol class="steps"><li>Open Skyward and read feedback on an earlier graded Daily answer. Choose a weak or missing part identified by that feedback.</li><li>Open that original learning guide from your teacher’s established class library. Review its question, help and feedback; revise the part that needs stronger evidence.</li><li>Use that original question’s Create My Response and Copy &amp; Submit controls. Paste and submit through its original Form route so your improved evidence goes to the same assignment.</li></ol>
<p>Today’s Major score and section feedback will appear in Skyward after grading. Correct its weaker sections through this assessment’s original section buttons on the next final Perform day, <strong>after feedback is posted</strong>. If feedback is delayed, continue earlier graded recovery and take the Major correction opportunity when feedback is available.</p>
<p>If you have no earlier feedback to act on, ask your teacher which previously graded skill to review; do not invent feedback or claim that today’s ungraded Major has been recovered. Complete the short Temperature Check below.</p></section>'''
anchor.insert_after(P.frag(recovery))
d.select_one('.temperature-choice legend').string='How ready do you feel with technology changes, player needs, fairness, studio roles, responsible AI and desktop testing?'
for word in ['one','two','three']:d.select_one('[data-slot="lab-'+word+'-example"]').decompose()
for t in d.find_all('template'):t.decompose()
for mirror in d.select('[data-mirror]'):mirror.clear();mirror.append(d.select_one('[data-slot="'+mirror['data-mirror']+'"]').get_text(' ',strip=True))
d.select_one('.footer').string='RTF Wayfinder · Tech · Game Design Studio'
config={'mode':'ASSESSMENT','imagePools':{'target':[{'src':'../assets/learning-target/pixel-archery-target.webp','alt':'Pixel holding a paper bullseye target'}],'temperature':[],'labs':[],'comics':[{'src':'../assets/rtf-comics/comic-pet-supervision.webp','alt':'Approved office comic: Pixel disrupts Onion.exe while Percival records pet supervision'}],'skits':P.SKITS},'destinations':{**{'section'+str(i):P.FORM+r['key'] for i,r in enumerate(records,1)},'temp':P.FORM+'305010629999','labs':P.FORM+'305010620000'}}
out=re.sub(r'const WAYFINDER_CONFIG=.*?;',lambda m:'const WAYFINDER_CONFIG='+json.dumps(config,ensure_ascii=False)+';',str(d),count=1)
meta={'authorization':'Captain GO T1–T6/F1–F3; only3050106; no release','source_document':source['documentId'],'source_revision':source['revision'],'master_sha256':hashlib.sha256(P.MASTER.encode()).hexdigest(),'pinned_records':records,'verification':'Code/offline/runtime/parity reported in scripts/tech-u5-part1-day6-results.json; actual school receipt and Captain acceptance UNTESTED','next':'3050107 FINAL PERFORM separate batch; preserve all existing evidence/Show'}
out=out.replace('<body','<!-- WF-HANDOFF '+json.dumps(meta,ensure_ascii=False)+' -->\n<body',1)
(ROOT/'Tech/3050106.html').write_text(out)
print('BUILT3050106: four exact pinned sections; master unchanged; no release')
