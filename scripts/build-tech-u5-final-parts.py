#!/usr/bin/env python3
"""Approved source -> unchanged master shell, content/configuration only.
Captain owns rendered/student-function/Form acceptance; no student release.
"""
import sys,json,re,html,hashlib,importlib.util
from pathlib import Path
from bs4 import BeautifulSoup
from wayfinder_identity import preflight
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
    mode='STARTER' if day==1 else 'ASSESSMENT' if day==4 else 'RECOVERY' if day==5 else 'PERFORM'
    label='Story & Art' if phase=='story' else 'Innovation';part=3 if phase=='story' else 4
    first=s.splitlines()[0];title=first.split(' | ')[3]
    preflight({'course':'Tech','dayid':did,'unit':5,'part':part,'day':day,'title':title},s)
    from wayfinder_lesson import build_from_outline
    return build_from_outline({'course':'Tech','dayid':did,'unit':5,'part':part,'day':day,'title':title},mode,P.MASTER,ROOT/'Tech'/f'{did}.html')

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
