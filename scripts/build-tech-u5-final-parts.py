#!/usr/bin/env python3
"""Approved source -> unchanged master shell, content/configuration only.
Captain owns rendered/student-function/Form acceptance; no student release.
"""
import sys,json,re,html,hashlib,importlib.util
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prototype',ROOT/'scripts/build-tech-u5-prototype.py')
P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
esc=html.escape
def paragraph(t):return '<p>'+esc(t)+'</p>'
def field(s,label):
    m=re.search(r'^'+re.escape(label)+r'\s*(.*)$',s,re.M)
    return m[1] if m else ''
def findfield(s,prefix):
    return next((line.split(': ',1)[1] for line in s.splitlines() if line.startswith(prefix) and ': ' in line),'')
def figure(kind):
    if kind=='story':
        body='<rect width="480" height="250" fill="#dbeafe"/><rect x="40" y="40" width="400" height="170" fill="#f9fbff" stroke="#142063"/><path d="M95 65v95m0 0-8-12m8 12 8-12" stroke="#142063"/><rect x="75" y="175" width="38" height="32" fill="#2563ae"/><rect x="80" y="65" width="30" height="20" fill="#d84545"/><text x="135" y="83">Rain-soaked books</text><text x="135" y="191">Library helper</text><text x="50" y="235">Same rules. A new world and a reason to care.</text>'
        caption='Teacher-made story model: a library helper saves books from a leaky roof. This is a diagram, not a finished-game screenshot.'
    elif kind=='contrast':
        body='<rect width="480" height="250" fill="#f9fbff"/><rect x="10" y="30" width="220" height="180" fill="#243047"/><rect x="250" y="30" width="220" height="180" fill="#243047"/><path d="M92 155v-50l20-25 20 25v50z" fill="#2b354b"/><path d="M332 155v-50l20-25 20 25v50z" fill="#ffd166" stroke="#fff" stroke-width="5"/><text x="18" y="23">A: dark on dark</text><text x="258" y="23">B: clear silhouette</text><text x="15" y="237">Classroom comparison: same character, different contrast.</text>'
        caption='Teacher-made comparison. Notice the hero outline against each identical dark stage. Use the visible examples to discuss recognition.'
    else:
        body='<rect width="480" height="250" fill="#f9fbff"/><rect x="58" y="146" width="40" height="40" fill="#2563ae"/><ellipse cx="167" cy="150" rx="90" ry="25" fill="#a3c8ef" stroke="#142063"/><path d="M163 142h8m-4-4v16" stroke="#d84545" stroke-width="3"/><text x="22" y="220">Player</text><text x="215" y="113">Wide costume reaches left</text><text x="215" y="140">even with its center farther away.</text><text x="215" y="178">Red mark = costume center</text>'
        caption='Teacher-made collision diagram: an oversized spaceship overlaps the player even though their centers look far apart. Inspect visible size and center before changing the game rules.'
    return '<figure><svg role="img" aria-label="'+esc(caption,quote=True)+'" viewBox="0 0 480 250" style="width:100%;height:auto;max-width:600px;font:14px sans-serif;fill:#142063">'+body+'</svg><figcaption>'+esc(caption)+'</figcaption></figure>'

STORY_STEPS={
1:[('Open the SAME saved game and review its square, circle, score and lives.','Load the saved .sb3 using File > Load from your computer. Keep this file unchanged while planning; today needs no new game code.'),('Make one Story Map on paper or in your teacher-approved editor.','Include a game title, audience, protagonist, two-sentence backstory, conflict, what the falling circle means, player objective, mood/colors and three tiny scene thumbnails. Label each part.'),('Connect the existing square, circle and background to your world.','State who the player becomes, what falls, and why it matters. Keep movement, falling, score and three lives as the same rules. Save art replacement for the next work session.'),('Check your map against the story model and save it with the same project.','A reader should understand who, where, why and the goal. Ask a partner to describe the story without adding a new mechanic; revise one unclear detail.')],
2:[('Load your SAME story game and keep basic-shape backups.','Select Player > Costumes. Right-click the shape costume thumbnail and choose Duplicate; rename the backup. Repeat inside FallingObject. Leave each sprite’s Code unchanged.'),('Draw an original player and falling-object costume in their own sprites.','Select the intended sprite, then Costumes. Use rectangle, oval, line, fill, outline and eraser to make the story-map designs. Use a clear silhouette; check size and costume center. No external artwork is needed.'),('Choose Stage > Backdrops and make a simple original background.','Use a solid fill or your own simple shapes. Keep the hero, falling object, score and lives easy to see. Compare light/dark contrast at the normal stage size.'),('Test recognition while moving, then save the SAME editable game.','Look at a smaller stage view as well as normal size. Change one outline, color or size that is hard to read. Keep the backup costumes and existing scripts intact; File > Save to your computer.')],
3:[('Load the SAME game and compare costumes with your Story Map.','Select each sprite and use its original costume. Keep the saved plain-shape backups. Check that the displayed hero and falling object match your intended story.'),('Finish the themed background and a readable world/goal introduction.','Stage > Backdrops: add the title and one or two short sentences with the text tool. Include left/right controls and what the player should dodge. Keep score/lives visible.'),('Run all five prototype checks and record expected versus actual results.','Green flag resets; left/right works; falls repeat; one collision loses exactly one life; one safe drop scores once. Check the larger costume’s dimensions/center if collisions look unfair. Use the backup recipes here only if needed.'),('Fix one art-related problem, repeat the same test and save a milestone.','Change the costume size, center, silhouette or background before rewriting working scripts. Keep a short observed issue/fix note, preserve the same game and save the tested version.')],
5:[('Open the SAME game and use the Story Map as a finish checklist.','Complete the original hero, falling object, world, title and simple goal. Only backup costumes may remain plain shapes; do not discard working code.'),('Check all five functions and revise one visual problem.','Test movement, repeated falling, one life per hit, one safe-dodge point and reset. Ask a partner to play if classroom access allows; record a real observation and one improvement.'),('Save and submit the milestone using the teacher’s existing class assignment.','Keep the editable .sb3, story map and test note. Save the SAME project; use only the teacher-confirmed artifact route. No public publishing is required.'),('Use posted Skyward feedback for original Major and Daily recovery.','Return to the original Day 4 assessment sections or original Daily guide. Improve the specific weak/missing answer and submit through its original Form. If new Major feedback is not posted, recover earlier Daily work and move Major recovery to a later opportunity.')]
}
INNOVATION_STEPS={
1:[('Open the SAME story game and choose one meaningful feature.','Keep the existing hero/world and working movement, falling, lives and score. Choose a shield, gradual speed level, or extra enemy; today is planning, not implementation.'),('Make a one-page Feature Card.','Include feature name, story reason, sketch/screen location, before/after rule, trigger, state change, visible feedback, chosen supported recipe, required art and two test cases.'),('Check that the feature creates a fair player decision.','Explain what a player can choose, what warning they receive and what expected result will show success. Limit the idea to one feature you can finish.'),('Save the plan and preserve a working milestone backup.','File > Save to your computer before making later modifications. Keep this continuing game and a clearly named backup, not a new unrelated project.')],
2:[('Save a working backup and select ONE Feature Card recipe below.','Load the SAME game and confirm its original five checks first. Implement only shield, progressive speed, or extra enemy. The Daily shield question uses the shared example even if your project chooses another feature.'),('Put the selected complete recipe in the correct sprite.','Create the listed global/local variables with the exact shown names. Keep the Player movement script. Replace only the named FallingObject script when directed; do not attach two competing falling loops.'),('Adapt only the named values or graphics to your story.','Keep state names, one-hit guard, reset and score behavior intact. Make the feature’s visible warning understandable. Use the teacher’s help before changing a new code structure.'),('Test the old rules, then trigger your new feature three times and save.','Record expected and actual results: normal play, feature active and an edge case such as another key press during cooldown. If it breaks, reopen the working backup and retry the supported pattern; keep your story art.')],
3:[('Open the SAME game and exchange a three-minute playtest when possible.','Ask the player to describe the goal and controls. Record what they tried, expected and actually observed; collect two observations and choose one priority improvement.'),('Test the core loop and unique feature separately.','Run normal play, trigger the new feature, then try an edge/error case. Compare expected versus actual behavior; distinguish unclear feedback from incorrect code.'),('Repair exactly one consequential problem and repeat the same test.','Improve a title, controls hint, visible state, difficulty warning, collision guard or reset. Preserve the five original core checks and the single selected feature; do not add a new feature list.'),('Save the same project and its short change log.','Record the observation, specific change and retest result. Polish end/restart feedback and sound only if already available; keep time for the Temperature Check and Studio.')],
5:[('Open the SAME final game and finish its acceptance checklist.','Confirm original title/world/hero/falling object; controls and HUD; movement/fall loop; fair hits/lives and dodge score; reset; one original supported mechanic; clear ending or replay. Use the complete recipes here if recovery is needed.'),('Save the editable game and submit through the teacher’s confirmed assignment.','Keep the working .sb3 and test notes. Do not promise public publishing or collect personal information. Use a family-demo route only after your teacher verifies the school’s sharing method.'),('Give a short classroom arcade demonstration or reciprocal playtest.','Explain your story and unique feature. Record one positive observation and one constructive observation. Reflection: My idea was …; my code recipe made … possible; testing taught me … . This does not replace academic answers.'),('Recover original Major/Daily evidence after posted feedback.','Use the original assessment/Daily guide and Form for each weak section; improve that same grade using stronger evidence. If feedback is delayed, continue earlier Daily recovery or productive finishing and reschedule Major recovery.')]
}
STEMS={
'story':['My main character is … in … . The falling objects represent … . The conflict matters because … .','I would change … and … . These choices improve recognition because … .','First I would check … . Next I would check … . I would repeat … and look for … .'],
'innovation':['My feature triggers when … . The player can … . A fair test is … .','When shieldActive is 1, collision logic should … . A limit matters because … .','I would show or change … . I would repeat … and observe … .']}
IDEAS={
'story':[['Brainstorm three different worlds using the same mechanic.','Write a villain monologue.','Draw a tiny concept thumbnail.'],['Create an alternate expressive face costume.','Compare outline strengths.','Draw a tiny icon for the life display.'],['Design a story-setting sign.','Experiment with two backdrop colors.','Write a dramatic one-line title description.'],['Design an original title sticker.','Draw an alternate villain silhouette.','Draw a game-goal icon.'],['Write an original story teaser.','Draw an alternative costume.','Sketch a future level.']],
'innovation':[['Draw an enemy silhouette.','Invent an upgrade icon.','Describe a dramatic level transition without coding it.'],['Design shield visual feedback.','Choose level-up sound notation.','Sketch an enemy that fits the story.'],['Design a future-update poster.','Sketch the player’s game-over expression.','Make a one-line trailer tagline.'],['Sketch a sequel concept.','Invent a future enemy on paper.','Write a playful tagline.'],['Create an original game-cover image.','Write a short design diary.','Draw a future boss idea.']]}
def source_records(s):
    records=[]
    m=re.search(r'DAILY ACADEMIC QUESTION — FULL KEY (\d+): ([^\n]+)\nPINNED RUBRIC: ([^\n]+)',s)
    if m:records.append({'key':m[1],'prompt':m[2],'rubric':m[3],'kind':'daily'})
    for m in re.finditer(r'SECTION (\d)(?:[: —]+)([^\n]+)\nFULL KEY (\d+)\nSTUDENT PROMPT: ([^\n]+)\n(?:PINNED )?(?:HOLISTIC )?RUBRIC: ([^\n]+)',s):
        records.append({'key':m[3],'prompt':m[4],'rubric':m[5],'kind':'major','n':int(m[1]),'title':m[2]})
    return records
def add_steps(d,steps):
    P.replace_slot(d,'perform-steps',''.join('<li><details class="perform-step"><summary>'+esc(a)+'</summary><div class="perform-step-help">'+paragraph(b)+'</div></details></li>' for a,b in steps),True)
def add_code(shelf,title,text):shelf.append(P.frag('<details><summary>'+esc(title)+'</summary>'+P.recipe(text)+'</details>'))
def recipes(shelf):
    add_code(shelf,'Original Player controls — backup',P.PLAYER)
    add_code(shelf,'Original FallingObject lives/score — backup',P.full_fall(True))
def build(phase,day):
    src=json.loads((ROOT/f'scripts/tech-u5-{phase}-source.json').read_text());tab=src['tabs'][day];s=tab['text'];did=('30503' if phase=='story' else '30504')+f'{day:02d}'
    d=BeautifulSoup(P.MASTER,'html.parser');mode='STARTER' if day==1 else 'ASSESSMENT' if day==4 else 'RECOVERY' if day==5 else 'PERFORM'
    label='Story & Art' if phase=='story' else 'Innovation';part=2 if phase=='story' else 3
    first=s.splitlines()[0];title=first.split(' | ')[-1] if day<=3 else ('Storytelling & Visual Design — Assessment' if phase=='story' else 'Innovation Skills — Assessment') if day==4 else ('Finish Your Story World & Recover Evidence' if phase=='story' else 'Final Game Showcase & Recovery')
    for k,v in {'course-meta':f'Tech · Unit 5 · {label} · Phase {part} of 3 · Day {day}','lesson-mode':f'Day {day} · {mode.title()} Focused','lesson-title':title,'lesson-deck':'One continuing game: preserve your working mechanics, make it meaningful and test purposeful improvements.'}.items():P.replace_slot(d,k,v)
    target=field(s,'LEARNING TARGET:');P.replace_slot(d,'learning-target',esc(target).replace(' because ',' <strong>because</strong> '),True)
    teks=re.search(r'Priority TEKS — In Our Words\n((?:§[^\n]+\n)+)',s).group(1);P.replace_slot(d,'priority-teks',' '.join(teks.splitlines()));P.replace_slot(d,'supporting-teks',field(s,'Supporting TEKS:') or 'Apply the design-process and transfer skills named above; actual project tests provide performance evidence.')
    mission=d.find(id='learningTarget').select_one('.today-mission');mission.clear();mission.append(P.frag('<strong>Today’s Mission:</strong> '+esc(title)+'. Keep the same continuing game.'))
    for id in ['masteryTwo']:d.find(id=id).decompose()
    records=source_records(s);dest={'temp':P.FORM+did+'29999','labs':P.FORM+did+'20000'}
    if day<=3:
        dest.update(warm=P.FORM+did+'09998',q1=P.FORM+records[0]['key']);P.replace_slot(d,'warm-hook',findfield(s,'WARM-UP ('));d.select_one('[data-slot="warm-specimen"]').decompose();d.select_one('[data-warm-choices]').decompose();d.find(id='warmAnswer')['placeholder']='Write a brief answer from your own observation or imagination.'
        notes=['Tank: Keep the same game; make one purposeful improvement.','Forge: Save a working backup before changing the project.','Joey: A player needs to see what matters.','Percival.12: Describe what your test actually showed.']
        for i,note in enumerate(notes,1):P.replace_slot(d,f'rtf-note-{i}',note)
        P.replace_slot(d,'mastery-q1',records[0]['prompt']);r=d.select_one('[data-assembler="one"]');r.clear();r.append(P.frag(P.answer_markup('Explain every requested part of the scenario.',STEMS[phase][day-1])))
        P.replace_slot(d,'q1-help','Use the shared example; a finished game is not required to explain your reasoning. '+STEMS[phase][day-1])
        d.find(id='masteryOne').append(P.frag(paragraph('Daily mastery: explain the requested design choices and test. Find grades and corrective feedback in Skyward; improve the weak part and resubmit through this same question and Form.')))
        if phase=='story' and day in [2,3]:d.find(id='masteryOne').find('h2').insert_after(P.frag(figure('contrast' if day==2 else 'collision')))
    else:
        d.find(id='warmup').decompose();d.find(id='masteryOne').decompose()
    if day==1:
        P.replace_slot(d,'group-learn',field(s,'LEARN:'));P.replace_slot(d,'authentic-example','Professional design connection: Nintendo’s Super Mario games use a recognizable hero, world, goals and feedback to give running and jumping rules meaning. Our classroom game keeps its own original art and story. Source: Nintendo, Super Mario.');P.replace_slot(d,'leader-discussion','<p><strong>Discuss:</strong> Which design decision changes the player’s experience without creating an unrelated game? Explain one reason.</p>',True)
        for slot in ['learn-design-guidance','rtf-learning-skit']:d.select_one('[data-slot="'+slot+'"]').decompose()
        d.select_one('[data-slot="learn-content"]').replace_with(P.frag(figure('story') if phase=='story' else paragraph('Feature pitch: story reason → trigger → changed state/rule → visible feedback → fair test. A precise feature describes what happens and how the player notices it.')))
        P.replace_slot(d,'group-practice',field(s,'GROUP PRACTICE:'));P.replace_slot(d,'practice-steps','<li>Observe the teacher’s shared example.</li><li>Identify what stays the same and what changes.</li><li>Predict one way to test the design choice.</li>',True);d.select_one('[data-slot="practice-specimen"]').decompose()
        road='<section class="panel starter-roadmap" id="partRoadmap"><h2>Our '+label+' Roadmap</h2>'+paragraph(src['tabs'][0]['text'].splitlines()[1])+('<ol><li>Plan your character, world, conflict and audience.</li><li>Make original readable costumes and backdrop.</li><li>Test that the art preserves the working rules.</li><li>Assess taught skills, finish the milestone and recover posted feedback.</li></ol>' if phase=='story' else '<ol><li>Pitch one story-related feature and a fair test.</li><li>Adapt one supported code recipe.</li><li>Playtest, fix one problem and polish.</li><li>Assess taught concepts, finish the arcade showcase and recover posted feedback.</li></ol>')+paragraph('Success: '+(field(s,'MILESTONE:') or 'One purposeful feature plan that builds on the same working story game.'))+'</section>'
        d.find(id='learningTarget').insert_after(P.frag(road))
    else:
        d.find(id='groupLearn').decompose();d.find(id='groupPractice').decompose()
    if day!=4:
        steps=(STORY_STEPS if phase=='story' else INNOVATION_STEPS)[day];P.replace_slot(d,'perform-goal',findfield(s,'PERFORM (') if day<=3 else 'Use about half the class to finish and submit the same game milestone; use the other half for recovery from posted feedback.');add_steps(d,steps)
        shelf=d.select_one('[data-slot="perform-resources"]');shelf.attrs.pop('hidden',None);shelf.clear();shelf.append(P.frag('<h3>Resources for today’s work</h3>'+paragraph('Use the teacher-approved TurboWarp editor, your SAME saved .sb3, and your '+('Story Map' if phase=='story' else 'Feature Card')+'. Original drawing uses built-in tools; no external art download or account is needed. File > Save to your computer keeps the editable project.')))
        if day in [2,3]:shelf.append(P.frag('<details><summary>Tool reminder and teacher demonstration</summary>'+paragraph(field(s,'LEARN:'))+paragraph(field(s,'GROUP PRACTICE:'))+'</details>'))
        if phase=='story' and day>=3:recipes(shelf)
        if phase=='innovation':
            if day>=2:add_innovation_recipes(shelf)
            else:shelf.append(P.frag(paragraph('Choose one supported direction for your plan: a timed shield, gradual speed progression, or one additional enemy. Implement it during the next work session.')))
        exemplar=d.select_one('[data-slot="perform-exemplar"]');exemplar.replace_with(P.frag(figure('story') if phase=='story' else paragraph('Test note: player action → expected result → observed result → one change → repeated test. Record your own actual results.')))
        P.replace_slot(d,'perform-criteria',field(s,'MILESTONE:') or field(s,'MILESTONE CRITERIA:') or 'Same game saved and submitted, core behavior preserved, one real test/revision recorded; original evidence recovery uses posted feedback.')
        if day==5:
            d.find(id='perform').find('h2').string='Finish, Showcase & Recover';d.find(id='gateway').decompose()
    else:
        d.find(id='perform').decompose();d.find(id='gateway').decompose();study=findfield(s,'PARTIAL STUDY & RECALL') or findfield(s,'STUDY & RECALL')
        guide='<section class="panel learn" id="studyRecall"><h2>Study & Recall</h2>'+paragraph(study)+paragraph('A protagonist acts; a setting is the world; a conflict creates stakes. A costume is a sprite’s artwork; contrast separates visual elements. A mechanic is a repeatable rule; a variable stores changing state; a condition checks a rule. A playtest compares expected and observed results; a targeted revision addresses an observed problem.')+paragraph('Consult these notes during the short assessment. Budget about 25 minutes, including four Form trips. Four equally weighted sections make one Major grade. No game building during the test.')+'</section>'
        d.find(id='learningTarget').insert_after(P.frag(guide));anchor=d.find(id='studyRecall')
        for rec in records:
            n=rec['n'];stem=['My design choice is … because … .','I would change … so the player … .','I would check … and repeat … .','The useful observation is … . I would revise … and verify … .'][n-1]
            card=P.frag(P.assessment_card(n,rec['title'],rec['prompt'],stem).replace('id="assessmentSection','id="section'));anchor.insert_after(card);anchor=d.find(id='section'+str(n));dest['section'+str(n)]=P.FORM+rec['key']
        anchor.insert_after(P.frag('<section class="panel practice" id="priorDailyRecovery"><h2>After the Assessment: Earlier Daily Recovery</h2>'+paragraph('Use posted Skyward feedback to improve earlier Daily answers through their original guides and Form routes. Do not recover the new Major before section feedback is posted. If that feedback is delayed, move its recovery opportunity and continue genuine Daily recovery.')+'</section>'))
    if day<=3:
        for label,text in zip(d.find(id='gateway').select('label'),['I recorded my Warm-Up.','I submitted the Daily question through its school Form.','I completed and saved today’s planned work.','I submitted my TEKS Temperature Check.']):
            c=label.find('input');c.extract();label.clear();label.append(c);label.append(' '+text)
    for i,word in enumerate(['one','two','three']):P.replace_slot(d,'lab-'+word+'-title','Idea '+str(i+1));P.replace_slot(d,'lab-'+word+'-instructions',IDEAS[phase][day-1][i]);d.select_one('[data-slot="lab-'+word+'-example"]').decompose()
    P.replace_slot(d,'labs-intro','Use today’s taught tools for one playful extension. Try, combine or adapt one of these ideas, then record what you tried or discovered. A meaningful attempt counts; you do not need three finished products.')
    for t in d.find_all('template'):t.decompose()
    d.select_one('.footer').string='RTF Wayfinder · Tech · Game Design Studio'
    comic=d.find(id='comicSlot');comic['style']='display:block;aspect-ratio:auto;min-height:0;max-width:100%;overflow-x:auto';comic['tabindex']='0';comic['aria-label']='Four-panel comic; scroll horizontally to read every panel';comic.insert_after(P.frag('<p class="micro">Swipe or use arrow keys to read all four comic panels.</p>'))
    style=d.new_tag('style');style.string='#comicSlot img{width:100%;height:auto;min-width:560px;max-width:none}';d.head.append(style)
    config={'mode':mode,'imagePools':{'target':[{'src':'../assets/learning-target/pixel-archery-target.webp','alt':'Pixel holding a learning target'}],'temperature':[],'labs':[],'comics':[{'src':'../assets/rtf-comics/comic-pet-supervision.webp','alt':'Approved pet-supervision office comic with Pixel, Onion.exe and Percival'}],'skits':P.SKITS},'destinations':dest}
    for mirror in d.select('[data-mirror]'):
        orig=d.select_one('[data-slot="'+mirror['data-mirror']+'"]');mirror.string=orig.get_text(' ',strip=True)
    out=str(d);out=re.sub(r'const WAYFINDER_CONFIG=.*?;',lambda m:'const WAYFINDER_CONFIG='+json.dumps(config,ensure_ascii=False)+';',out,count=1)
    meta={'dayid':did,'source_document':src['documentId'],'source_revision':src['revision'],'source_tab':tab['id'],'master_sha256':hashlib.sha256(P.MASTER.encode()).hexdigest(),'Captain_checks':'UNTESTED — Forms, visual layout and student-facing functionality; no release','pinned_records':records}
    out=out.replace('<body','<!-- WF-HANDOFF '+json.dumps(meta,ensure_ascii=False)+' -->\n<body',1);out=out.replace('</head>','<meta name="robots" content="noindex"/>\n</head>');(ROOT/'Tech'/f'{did}.html').write_text(out);return did

def add_innovation_recipes(shelf):
    # The original controls continue unchanged for every branch.
    add_code(shelf,'Player movement — keep this original script',P.PLAYER)
    shelf.append(P.frag(paragraph('Implement only ONE branch below, matching your Feature Card. Use a saved working milestone first. The recipes use the same names Player, FallingObject, lives, score and the sprite-local hitThisFall. Keep your story costumes and backdrop.')))
    shield='''PLAYER — add shieldActive and shieldReady for ALL sprites.
Keep the movement script; add these TWO separate event scripts.
when green flag clicked
set [shieldActive] to (0)
set [shieldReady] to (1)

when [s] key pressed
if <<(shieldReady) = (1)> and <(lives) > (0)>> then
  set [shieldReady] to (0)
  set [shieldActive] to (1)
  say [Shield ON] for (1) seconds
  wait (3) seconds
  set [shieldActive] to (0)
  say [Shield recharging]
  wait (7) seconds
  set [shieldReady] to (1)
  say [Shield ready — press S]
end'''
    shield_fall=P.full_fall(True).replace('      change [lives] by (-1)','      if <(shieldActive) = (0)> then\n        change [lives] by (-1)\n      end')
    add_code(shelf,'Branch 1: timed shield — Player state and key scripts',shield)
    add_code(shelf,'Branch 1: replace the FallingObject loop with this shield-aware loop',shield_fall)
    shelf.append(P.frag(paragraph('Shield test: S activates protection for four seconds (the one-second message plus three-second wait), then seven seconds of recharge. One contact marks that fall even when protected, so it cannot award a dodge point. Pressing S during recharge has no effect. Test life loss with shield on/off, repeated key presses and green-flag reset.')))
    speed=P.full_fall(True).replace('set [score] to (0)','set [score] to (0)\nset [gameSpeed] to (5)').replace('    change y by (-5)','    change y by ((0) - (gameSpeed))').replace('    change [score] by (1)','    change [score] by (1)\n    set [gameSpeed] to ((5) + ([floor] of ((score) / (5))))\n    if <(gameSpeed) > (10)> then\n      set [gameSpeed] to (10)\n    end')
    add_code(shelf,'Branch 2: gradual speed — create gameSpeed for ALL sprites; replace FallingObject loop',speed)
    shelf.append(P.frag(paragraph('Use Operators for subtraction, division and the math dropdown floor. Keep gameSpeed visible as the speed meter and label its meaning in your instructions. Speed starts at 5, becomes 6 after five safe dodges, 7 after ten and stops increasing at 10. Hits do not add points. Test score 4→5, 9→10, the cap and restart.')))
    enemy='''ENEMY — right-click FallingObject sprite > Duplicate, rename Enemy.
Keep its original artwork backup; draw a distinct story enemy.
Delete the duplicated Code scripts, then build ONLY this script.
Create enemyHit for THIS SPRITE ONLY. Use global lives from FallingObject.
when green flag clicked
forever
  set [enemyHit] to (0)
  go to x: (pick random (-200) to (200)) y: (170)
  repeat until <(y position) < (-175)>
    change y by (-3)
    if <<<touching [Player]?> and <(enemyHit) = (0)>> and <(lives) > (0)>> then
      set [enemyHit] to (1)
      change [lives] by (-1)
      if <(lives) < (1)> then
        say [Game Over — press the green flag to restart] for (2) seconds
        stop [all]
      end
    end
    wait (0.03) seconds
  end
  wait (1) seconds
end'''
    add_code(shelf,'Branch 3: extra enemy — add one slower, distinct hazard',enemy)
    enemy_base=P.full_fall(True).replace('if <<touching [Player]?> and <(hitThisFall) = (0)>> then','if <<<touching [Player]?> and <(hitThisFall) = (0)>> and <(lives) > (0)>> then').replace('if <(hitThisFall) = (0)> then','if <<(hitThisFall) = (0)> and <(lives) > (0)>> then')
    add_code(shelf,'Branch 3: FallingObject loop — guard both hazards after game-over',enemy_base)
    shelf.append(P.frag(paragraph('Enemy rule: one life per Enemy drop, slower movement plus a pause between drops; Enemy misses award no normal dodge points. Only FallingObject initializes global lives/score. Keep one loop per hazard. Make both hazards readable and test their separate hits, simultaneous hazards and reset before choosing the final difficulty.')))

if __name__=='__main__':
    phase=sys.argv[1]
    for day in range(1,6):print('BUILT / CAPTAIN CHECKS UNTESTED',build(phase,day))
