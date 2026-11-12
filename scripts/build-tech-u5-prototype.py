#!/usr/bin/env python3
"""Render approved Prototype source through the unchanged universal master.
No engine forks. This does not certify browser, school intake or Drive parity.
"""
import json,re,html,hashlib
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
SOURCE=json.loads((ROOT/'scripts/tech-u5-prototype-source.json').read_text())
MASTER=(ROOT/'templates/wayfinder-master.html').read_text()
FORM='https://docs.google.com/forms/d/e/1FAIpQLSd0OVYW0cuObc1FCSQy55eSm6UNFcPTX_R9QROBtXrEF84fXw/viewform?usp=pp_url&entry.1954781253='
SKITS=[{'title':'Official Dress Code','lines':[{'speaker':'Tank','text':"Hi, I'm Tank."},{'speaker':'Joey','text':'We know, Tank.'},{'speaker':'Tank','text':"It's on my shirt."}]}]
PLAYER='''PLAYER — Events, Motion, Control, Sensing, Operators
when green flag clicked
go to x: (0) y: (-125)
forever
  if <key [right arrow] pressed?> then
    change x by (8)
  end
  if <key [left arrow] pressed?> then
    change x by (-8)
  end
  if <(x position) > (215)> then
    set x to (215)
  end
  if <(x position) < (-215)> then
    set x to (-215)
  end
end'''
FALL='''FALLINGOBJECT — Events, Motion, Control, Operators
when green flag clicked
forever
  go to x: (pick random (-210) to (210)) y: (170)
  repeat until <(y position) < (-175)>
    change y by (-5)
    wait (0.03) seconds
  end
end'''
def full_fall(score=False):
    return '''FALLINGOBJECT — create lives for ALL sprites;
create hitThisFall for THIS SPRITE ONLY.'''+(' Create score for ALL sprites.' if score else '')+'''
when green flag clicked
set [lives] to (3)
'''+('set [score] to (0)\n' if score else '')+'''forever
  set [hitThisFall] to (0)
  go to x: (pick random (-210) to (210)) y: (170)
  repeat until <(y position) < (-175)>
    change y by (-5)
    if <<touching [Player]?> and <(hitThisFall) = (0)>> then
      change [lives] by (-1)
      set [hitThisFall] to (1)
      if <(lives) < (1)> then
        say [Game Over — press the green flag to restart] for (2) seconds
        stop [all]
      end
    end
    wait (0.03) seconds
  end
'''+('  if <(hitThisFall) = (0)> then\n    change [score] by (1)\n  end\n' if score else '')+'''end'''
WARM=[
 'Imagine an arcade screen with only a square and a circle. There are no pictures, names or instructions yet. What movement would you expect the square to make?',
 'You press the right arrow on a game controller and watch a square on screen. Before learning any code, which way do you expect it to move?',
 'Imagine dropping a ball into a deep box. It eventually disappears below the rim. What would you expect to happen after a falling circle leaves the bottom of a game screen?',
 'A player brushes a hazard once, but the game takes away all three chances at once. Would one bump costing one chance feel clearer? Give a short reason.',
 'Imagine a game where a surprise arrives so quickly that nobody has time to react. Is a surprise alone enough to make a game fair? Give one reason.'
]
STEMS=[
 'Two sprites would help because … . I would test separate control by … .',
 'The script starts when … . While the key is held … . To test restart, I would … .',
 'The outer loop … . Resetting near the top … . Random x … .',
 'One coding change is … . To test that one contact counts once, I would … .',
 'I would change … and … . In two equal playtests I would compare … .'
]
IDEAS=[
 ['Try a larger player square and compare readability.','Compare circle and square shapes at the same size.','Sketch three possible story worlds on paper; keep the sprites plain.'],
 ['Try a slower x-change value in the guided control test.','Compare two movement speeds and return to a usable setting.','Write a clear one-line controls hint.'],
 ['Compare two safe falling speeds.','Compare fixed and random starting x positions.','Sketch a second object type without coding it.'],
 ['Sketch a readable life-counter icon.','Compare the feel of three lives with five lives.','Write a fair-game rule that a player could understand.'],
 ['Invent a clear title for this shape prototype.','Compare two control-instruction sentences.','Sketch a scoreboard that makes a successful dodge clear.'],
 ['Name a favorite arcade-style prototype.','Sketch a clearer life display.','Compare two control-instruction sentences.'],
 ['Sketch a character for the later art phase.','Name a possible world for this same game.','Compare two instruction designs.']
]
STEPS={
1:[('Open TurboWarp, create a new project and name it Falling Objects — first draft.','Use the teacher-approved TurboWarp editor. File > New starts an empty project; remove the default sprite only after a new empty file is confirmed. This is the one game you will keep.'),('Paint a 40-by-40 square sprite named Player, then paint a separate circle sprite named FallingObject.','At the bottom-right sprite chooser, select Paint. In Costumes choose Rectangle, pick a fill, draw a square. Rename the sprite in its name field. Use the chooser again for the circle; do not draw both costumes inside Player.'),('Select each sprite and put the shapes in different stage positions; confirm each has its own Code workspace.','Click the Player thumbnail, then FallingObject. Watch the selected border and sprite-name field. Drag on the stage to separate them. No motion script or decorative artwork is required yet.'),('Save the same editable project, then reload that saved file to confirm both named sprites remain.','File > Save to your computer downloads an .sb3 project. Keep the file in the school-approved folder. File > Load from your computer opens that saved .sb3. Confirm both sprites before replacing the saved copy.')],
2:[('Load your saved Falling Objects .sb3 and select Player.','Use File > Load from your computer. Confirm Player is selected before opening Code. Leave FallingObject unchanged.'),('With the teacher, build the Player block recipe below, including both arrow checks and edge limits.','Start with Events > when green flag clicked. Motion supplies position blocks; Control supplies forever and if. Sensing supplies key pressed; Operators supplies greater/less-than. Drag the two input checks inside forever, not above it.'),('Predict and test right arrow, left arrow, both edges and green-flag restart.','Release the keys: the square should stop moving. Hold each key at an edge: the shape should remain visible. Move away from the center, stop the project, then click green flag; expect x 0 and y -125.'),('Save and reload the same project after the isolated controls practice.','Do not start a new game or add art. Confirm the same two sprites and working controls before keeping the updated .sb3.')],
3:[('Load the same project and select FallingObject; leave the Player script attached to Player.','Click the sprite thumbnail before adding blocks. Confirm its name in the sprite panel.'),('Build the repeated-fall recipe below on FallingObject.','Use Motion > go to x/y and change y. Put Operators > pick random in x. Put repeat until inside forever and the y-motion/wait inside repeat until. Drag the y-position reporter into the less-than operator.'),('Watch five full drops and test the player at the same time.','A changing x is not guaranteed on every pair of drops. Observe several rounds. Each new drop starts near the top, moves downward and restarts. If it moves upward, inspect the minus sign on change y.'),('Record a changing spawn position, fall direction and restart observation; save the same file.','A brief paper test note is enough. Record what actually happened, not what you hoped would happen. Keep both sprites plain.')],
4:[('Load the same game and create lives for all sprites and hitThisFall for FallingObject only.','Variables > Make a Variable. Choose For all sprites for lives and For this sprite only for hitThisFall while FallingObject is selected. Leave the lives monitor visible on the stage.'),('Replace only the FallingObject script with the one-hit recipe below; retain the Player controls.','Use the single hitThisFall guard shown here. Do not combine it with an extra immediate-reset collision method. The touching check uses Player, not mouse-pointer or edge.'),('Test three deliberate contacts, three misses and green-flag restart.','A long overlap counts once for that drop. At zero lives the game says Game Over and stops; press green flag to test again. Misses must not lower lives. Restart must restore three lives.'),('Record expected versus observed behavior and save the same .sb3.','If a test fails, compare the guard placement with the complete supplied recipe. Restore a saved working version before changing unrelated blocks.')],
5:[('Load the same game, create score for all sprites and show its monitor.','Variables > Make a Variable > For all sprites. Keep lives and hitThisFall. Do not delete the Player script.'),('Use the completed FallingObject recipe below to add one point after a safe drop.','Set score to zero once at green flag, not inside forever. The score change belongs after repeat until and inside the hitThisFall = 0 check. A hit must not also count as a successful dodge.'),('Test one safe dodge, one hit and a restart; add a clear controls sentence.','Expect safe dodge: score +1, same lives. Expect hit: lives -1, no dodge point. Expect restart: score zero, lives three and Player reset. Put the instruction in the teacher-designated project description or a short paper note.'),('Run two equal 30-second playtests, change one speed or spawn setting, and compare an observed result.','Keep the same tester and test duration where possible. Note a bug or fairness problem, the one controlled change and whether it improved the observed result. Finish with a playable setting and save the same .sb3. Keep the placeholder shapes.')],
7:[('Open the same saved prototype and run the five core checks below.','Check player controls and reset; repeated randomized falls; exactly one life per hit; one point per safe dodge; restart of the whole game. Use the complete Player and FallingObject recipes to compare a broken script.'),('Play one 30-second round, record one expected/observed result and fix one error.','Keep the square and circle. Story costumes belong in the next Part. Save the same editable .sb3; keep a backup only through the confirmed school save workflow.'),('Submit the prototype through the existing teacher-designated class assignment.','Use the assignment your teacher identifies in the school system. This guide does not invent an assignment link. The project file and academic Form answers have separate destinations.'),('Read posted Skyward feedback and improve only weaker original Daily answers or original assessment sections.','Use the original guide from your teacher’s library and its original Form route. If the new Major feedback is not yet posted, postpone Major recovery and work on earlier Daily feedback or a real prototype problem instead. Stronger verified evidence can improve the same assignment.')]
}
def frag(s):return BeautifulSoup(s,'html.parser')
def lines(text):return [x.strip() for x in text.splitlines() if x.strip()]
def field(s,label):
    return next((x.split(': ',1)[1] for x in s.splitlines() if x.startswith(label) and ': ' in x),'')
def replace_slot(doc,name,value,raw=False):
    el=doc.select_one('[data-slot="'+name+'"]')
    if el:
        el.clear();el.append(frag(value) if raw else value)
def section(doc,id):return doc.find(id=id)
def para(t):return '<p>'+html.escape(t)+'</p>'
def recipe(text):return '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;padding:14px;border-radius:10px;color:#192244" aria-label="Block recipe">'+html.escape(text)+'</pre>'
def diagram():
    return '''<figure aria-label="Classroom prototype diagram"><svg viewBox="0 0 480 360" role="img" aria-label="A plain circle above a player square. The player moves left and right. A score and three lives are visible." style="width:100%;max-width:480px;background:white;border:2px solid #142063;border-radius:8px"><text x="12" y="24" fill="#142063">Score: 0     Lives: 3</text><circle cx="240" cy="75" r="19" fill="#d84545"/><text x="272" y="80" fill="#142063">FallingObject</text><path d="M240 105 V225 l-9 -13 M240 225 l9 -13" fill="none" stroke="#142063" stroke-width="3"/><rect x="220" y="284" width="40" height="40" fill="#2563ae"/><text x="272" y="310" fill="#142063">Player</text><path d="M125 305 H205 M125 305 l12 -9 M125 305 l12 9 M355 305 H270 M355 305 l-12 -9 M355 305 l-12 9" fill="none" stroke="#142063" stroke-width="3"/></svg><figcaption>Classroom design model, not a screenshot: move the square to dodge the circle. Plain shapes let us test rules before making artwork.</figcaption></figure>'''
def answer_markup(prompt,stem,choice=None):
    extra=''
    if choice:
        label,opts=choice
        extra='<div data-answer-part data-type="dropdown"><label>'+html.escape(label)+'</label><select data-answer-select aria-label="'+html.escape(label)+'"><option value="">Choose one</option>'+''.join('<option value="'+html.escape(v,quote=True)+'">'+html.escape(v)+'</option>' for v in opts)+'</select></div>'
    return extra+'<div data-answer-part data-type="open-response"><label>'+html.escape(prompt)+'</label><textarea data-open-response rows="3" placeholder="'+html.escape(stem,quote=True)+'"></textarea></div>'
def assessment_card(n,title,prompt,stem):
    return f'''<section class="panel mastery assessment-section" data-n="{n}" id="assessmentSection{n}"><span class="kicker">Assessment Section {n}</span><h2>{html.escape(title)}</h2><p>{html.escape(prompt)}</p><div class="scaffold"><div class="answer-parts" data-assembler="assessment{n}">{answer_markup('Answer both parts in one brief response.',stem)}</div><details><summary>Extra Help</summary><p>Read one part at a time. Explain the change or prediction, then give the requested reason or test. Sentence starts: {html.escape(stem)}</p></details></div><div class="response"><div class="assembled-preview" id="preview{n}" hidden role="status" aria-live="polite"></div><div class="actions"><button class="btn copy-action section-build" data-n="{n}" type="button">Create My Response</button><button class="btn submit section-submit" data-n="{n}" type="button" disabled>Copy &amp; Submit My Answer</button></div><p class="status" id="sectionStatus{n}" aria-live="polite"></p></div></section>'''
def build(day):
    s=SOURCE['tabs'][day-1]['text'];d=BeautifulSoup(MASTER,'html.parser');did='305020'+str(day)
    mode=['STARTER','LEARN','PERFORM','PERFORM','PERFORM','ASSESSMENT','RECOVERY'][day-1]
    title=['Build a Game from Shapes','Make the Player Move','Make the Circle Fall Forever','Lives, Hits and Fair Rules','Score, Challenge and Playtesting','Prototype Skills — Assessment & Daily Recovery','Finish the Prototype & Recover Evidence'][day-1]
    replace_slot(d,'course-meta',f'Tech · Unit 5 · Prototype · Phase 1 of 3 · Day {day}')
    replace_slot(d,'lesson-mode',f'Day {day} · {mode.title()} Focused')
    replace_slot(d,'lesson-title',title)
    replace_slot(d,'lesson-deck','One game, three phases: build the engine, add your story and art, then invent and test a feature.')
    target=field(s,'LEARNING TARGET:');replace_slot(d,'learning-target',html.escape(target).replace(' because ',' <strong>because</strong> '),True)
    teks=s.split('Priority TEKS — In Our Words\n',1)[1].split('\nSupporting TEKS:',1)[0].split('\n50-MINUTE',1)[0].split('\nTIME:',1)[0].split('\nFIRST HALF',1)[0].split('\nGRADE:',1)[0]
    replace_slot(d,'priority-teks',' '.join(lines(teks)))
    support=field(s,'Supporting TEKS:')
    replace_slot(d,'supporting-teks',support or 'Design, test and revise the same game using skills from this Part.')
    mission=section(d,'learningTarget').select_one('.today-mission');mission.clear();mission.append(frag('<strong>Today’s Mission:</strong> '+html.escape(['Create and save two separate placeholder sprites.','Observe, predict and practice the isolated Player controls.','Add repeated falls to the same shape game.','Make each contact count only once per drop.','Add dodge points and compare two fair playtests.','Submit four short assessment sections, then recover earlier Daily evidence.','Finish and submit the prototype; recover only evidence with posted feedback.'][day-1])))
    # Only approved content varies; the master CSS and submission engine do not.
    if day<=5:
        replace_slot(d,'warm-hook',WARM[day-1]);d.select_one('[data-slot="warm-specimen"]').decompose();d.select_one('[data-warm-choices]').decompose();d.find(id='warmAnswer')['placeholder']='Write one short answer from the opening scenario.'
        for n,note in enumerate(['Tank: Test the smallest working idea first.','Forge: Select the sprite before adding its blocks.','Joey: Clear shapes make behavior easy to see.','Percival.12: Record what happened, not what was expected.'],1):replace_slot(d,f'rtf-note-{n}',note)
    else:section(d,'warmup').decompose()
    # Keep only the question shells used by this source day.
    section(d,'masteryTwo').decompose()
    destinations={'temp':FORM+did+'29999','labs':FORM+did+'20000'}
    if day<=5:
        destinations['warm']=FORM+did+'09998';destinations['q1']=FORM+did+str(30058+day)
        prompt=field(s,'DAILY MASTERY STUDENT QUESTION — FULL KEY ')
        prompt=re.search(r'DAILY MASTERY STUDENT QUESTION — FULL KEY \d+: ([^\n]+)',s).group(1)
        replace_slot(d,'mastery-q1',prompt)
        root=d.select_one('[data-assembler="one"]');root.clear()
        choices={2:('Which x-change direction is right?', ['A positive change to x moves right','A negative change to x moves right']),3:('What should repeat?', ['The whole fall repeats','Only the first drop runs'])}
        root.append(frag(answer_markup('Explain the complete scenario and include the requested test or reason.',STEMS[day-1],choices.get(day))))
        replace_slot(d,'q1-help',STEMS[day-1]+' Use the scenario and taught example; you can answer without having a finished project.')
        section(d,'masteryOne').append(frag('<p class="hint">This is Daily mastery evidence. A strong answer explains the requested behavior and gives a specific reason or test. Find your grade and corrective feedback in Skyward; revise weaker parts through this same question and Form route.</p>'))
    else:section(d,'masteryOne').decompose()
    learn=field(s,'GROUP LEARN / HOOK:')
    if day<=2:
        replace_slot(d,'group-learn',learn)
        example=d.select_one('[data-slot="authentic-example"]');example.clear();example.append(frag('<strong>Real-world design process:</strong> Nintendo’s Super Mario Maker 2 invites makers to build courses and play through them to test them. Our smaller prototype also tests its rules before presentation. Source: Nintendo, Super Mario Maker 2.'))
        replace_slot(d,'leader-discussion','<p><strong>Discuss:</strong> Why might we test simple shapes before adding detailed art?</p><p>Pause for two different ideas. Ask which observation would count as a useful test.</p>',True)
        d.select_one('[data-slot="learn-design-guidance"]').decompose();d.select_one('[data-slot="learn-content"]').replace_with(frag(diagram()))
        d.select_one('[data-slot="rtf-learning-skit"]').decompose()
        replace_slot(d,'group-practice',field(s,'GROUP PRACTICE:'))
        replace_slot(d,'practice-steps',''.join('<li>'+html.escape(x[0])+'</li>' for x in STEPS[day][:3]),True)
        d.select_one('[data-slot="practice-specimen"]').decompose()
    else:
        section(d,'groupLearn').decompose();section(d,'groupPractice').decompose()
    if day in STEPS:
        perf=section(d,'perform');perf.h2.string='Guided Tool Practice' if day==2 else 'Prototype Milestone & Recovery' if day==7 else 'Perform'
        replace_slot(d,'perform-goal',field(s,'PERFORM / PROJECT DEVELOPMENT:') if day<=5 else 'Spend about half the period completing the prototype and half recovering graded evidence after feedback is posted.')
        shelf=d.select_one('[data-slot="perform-resources"]');shelf.attrs.pop('hidden',None);shelf.clear();shelf.append(frag('<h3>Resources for today’s work</h3><p>Use the teacher-approved TurboWarp editor and your same saved Falling Objects .sb3. The complete block recipes and checks needed today are included here. No art downloads or account sign-in are required.</p>'))
        if day>=2:shelf.append(frag('<details><summary>Player controls — complete block recipe</summary>'+recipe(PLAYER)+'</details>'))
        if day>=3:shelf.append(frag('<details><summary>FallingObject — '+('complete score/lives recipe' if day>=5 else 'one-hit/lives recipe' if day==4 else 'repeated-fall recipe')+'</summary>'+recipe(full_fall(True) if day>=5 else full_fall() if day==4 else FALL)+'</details>'))
        if day>=3:shelf.append(frag(para('Recall: Player keeps its own input script. FallingObject keeps its own drop script. A loop repeats steps; x is horizontal and y is vertical. The supplied recipe makes the next required behavior explicit.')))
        stepbox=d.select_one('[data-slot="perform-steps"]');stepbox.clear();stepbox.append(frag(''.join('<li><details class="perform-step"><summary>'+html.escape(a)+'</summary><div class="perform-step-help">'+para(b)+'</div></details></li>' for a,b in STEPS[day])))
        d.select_one('[data-slot="perform-exemplar"]').replace_with(frag(diagram()))
        replace_slot(d,'perform-criteria',['Two named sprites save and reload separately.','Player responds both ways, stays visible and resets.','Five repeated drops; player remains controllable.','One life per contact; no loss for a miss; reset to three.','One point per safe drop, no point for a hit; reset works.','', 'A reliable playable square-and-circle prototype; original academic evidence is recovered through its original question only.'][day-1])
    else:section(d,'perform').decompose()
    if day==1:
        roadmap='<section class="panel starter-roadmap" id="partRoadmap"><h2>Our Prototype Roadmap</h2><p>We will make one Falling Objects Game to show our families after three phases. First, we build the engine with plain shapes. Later, your own story, artwork and one new mechanic make it yours.</p>'+diagram()+'<ol><li>Create two separate shapes.</li><li>Control the player and repeat the falling challenge.</li><li>Add fair lives and dodge points; test and revise.</li><li>Take a short assessment, finish the milestone and recover graded evidence.</li></ol><p><strong>Success:</strong> One saved, repeatable playable prototype; visible controls, score and lives; one observed test and a justified improvement. Today we create only the two shapes.</p></section>'
        section(d,'learningTarget').insert_after(frag(roadmap))
    if day==6:
        notes=field(s,'STUDY & RECALL (no solutions):')
        guide='<section class="panel learn" id="studyRecall"><h2>Study & Recall</h2>'+para(notes)+para('You may consult these notes. Budget about 25 minutes, including four Form trips. Each section has one concise answer. The four equally weighted sections make one Major grade. No game building during the test.')+'</section>'
        section(d,'learningTarget').insert_after(frag(guide))
        assessments=list(re.finditer(r'SECTION (\d) \| FULL KEY (\d+) \| ([^\n]+)\nSTUDENT PROMPT: ([^\n]+)',s))
        anchor=section(d,'studyRecall')
        stems=['Separate sprites help because … . Before decorating I would … .','A change of +8 … . The event and repeated check … .','The next fall needs … . Random x … .','To count a hit once … . To reward a dodge … . I would test … .']
        for m in assessments:
            n=int(m[1]);card=frag(assessment_card(n,m[3],m[4],stems[n-1]).replace('id="assessmentSection','id="section'));anchor.insert_after(card);anchor=d.find(id='section'+str(n));destinations['section'+str(n)]=FORM+m[2]
        anchor.insert_after(frag('<section class="panel practice" id="priorDailyRecovery"><h2>After the Assessment: Earlier Daily Recovery</h2>'+para('Use the remaining 13–18 minutes to read already-posted Skyward Daily feedback. Return to the original question in the teacher’s library, improve its weaker part and resubmit through its original Form route. Do not recover this new Major until its section feedback has been posted. The next milestone day includes that recovery; it moves if feedback is delayed.')+'</section>'))
        section(d,'gateway').decompose()
    if day==7:section(d,'gateway').decompose()
    if day<=5:
        checks=section(d,'gateway').select('label')
        wording=['I recorded my Warm-Up answer.','I submitted the Daily question through its school Form.','I completed and saved today’s '+('guided tool practice.' if day==2 else 'prototype work.'),'I submitted my TEKS Temperature Check.']
        for label,text in zip(checks,wording):
            control=label.find('input');control.extract();label.clear();label.append(control);label.append(' '+text)
    for word,i in zip(['one','two','three'],range(3)):
        replace_slot(d,'lab-'+word+'-title',f'Idea {i+1}')
        replace_slot(d,'lab-'+word+'-instructions',IDEAS[day-1][i]);d.select_one('[data-slot="lab-'+word+'-example"]').decompose()
    d.select_one('[data-slot="labs-intro"]').string='Choose one playful extension with today’s tools. Tank suggests trying one small change; Forge suggests testing what it does. Record what you actually tried or discovered.'
    # Remove content-empty component templates; keep the live master script unchanged.
    for template in d.find_all('template'):template.decompose()
    d.select_one('.footer').string='RTF Wayfinder · Tech · Game Design Studio'
    config={'mode':mode,'imagePools':{'target':[{'src':'../assets/learning-target/pixel-archery-target.webp','alt':'Pixel holding a learning target'}],'temperature':[],'labs':[],'comics':[{'src':'../assets/rtf-comics/comic-pet-supervision.webp','alt':'Pixel, Onion.exe and Percival in the approved pet-supervision office comic'}],'skits':SKITS},'destinations':destinations}
    for mirror in d.select('[data-mirror]'):
        original=d.select_one('[data-slot="'+mirror['data-mirror']+'"]')
        if original:mirror.string=original.get_text(' ',strip=True)
    visible=d.get_text(' ',strip=True)
    if re.search(r'\[[^\]]*(?:During build|During lesson|Configured question|Mirrored|Suggested idea|Learning Guide Title)',visible):raise ValueError('Unfilled master content: '+visible)
    out=str(d);out=re.sub(r'const WAYFINDER_CONFIG=.*?;',lambda m:'const WAYFINDER_CONFIG='+json.dumps(config,ensure_ascii=False)+';',out,count=1)
    out=out.replace('</head>','<meta name="robots" content="noindex"/>\n</head>')
    # Hidden teacher provenance; no QIDs appear in visible student text or copy text.
    meta={'dayid':did,'source_document':SOURCE['documentId'],'source_revision':SOURCE['revision'],'source_tab':SOURCE['tabs'][day-1]['id'],'status':'BUILT BUT HOLD — browser/offline/clipboard/code-recipe runtime and JISD parity unverified','master_sha256':hashlib.sha256(MASTER.encode()).hexdigest()}
    out=out.replace('<body','<!-- WF-HANDOFF '+json.dumps(meta)+' -->\n<body',1)
    (ROOT/'Tech'/f'{did}.html').write_text(out)
    return did
if __name__=='__main__':
    for day in range(1,8):print('BUILT / HOLD',build(day))
