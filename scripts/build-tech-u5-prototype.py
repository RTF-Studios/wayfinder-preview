#!/usr/bin/env python3
"""Render approved Prototype source through the unchanged universal master.
No engine forks. This does not certify browser, school intake or Drive parity.
"""
import json,re,html,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
from wayfinder_identity import preflight

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
        extra='<div data-answer-part data-type="dropdown"><label>'+html.escape(label)+'</label><select data-answer-select style="width:100%;max-width:100%;min-width:0" aria-label="'+html.escape(label)+'"><option value="">Choose one</option>'+''.join('<option value="'+html.escape(v,quote=True)+'">'+html.escape(v)+'</option>' for v in opts)+'</select></div>'
    return extra+'<div data-answer-part data-type="open-response"><label>'+html.escape(prompt)+'</label><textarea data-open-response rows="3" placeholder="'+html.escape(stem,quote=True)+'"></textarea></div>'
def assessment_card(n,title,prompt,stem):
    return f'''<section class="panel mastery assessment-section" data-n="{n}" id="assessmentSection{n}"><span class="kicker">Assessment Section {n}</span><h2>{html.escape(title)}</h2><p>{html.escape(prompt)}</p><div class="scaffold"><div class="answer-parts" data-assembler="assessment{n}">{answer_markup('Answer both parts in one brief response.',stem)}</div><details><summary>Extra Help</summary><p>Read one part at a time. Explain the change or prediction, then give the requested reason or test. Sentence starts: {html.escape(stem)}</p></details></div><div class="response"><div class="assembled-preview" id="preview{n}" hidden role="status" aria-live="polite"></div><div class="actions"><button class="btn copy-action section-build" data-n="{n}" type="button">Create My Response</button><button class="btn submit section-submit" data-n="{n}" type="button" disabled>Copy &amp; Submit My Answer</button></div><p class="status" id="sectionStatus{n}" aria-live="polite"></p></div></section>'''
def build(day):
    s=SOURCE['tabs'][day-1]['text'];did='305020'+str(day)
    mode=['STARTER','LEARN','PERFORM','PERFORM','PERFORM','ASSESSMENT','RECOVERY'][day-1]
    title=s.splitlines()[0].split(' | ')[3]
    preflight({'course':'Tech','dayid':did,'unit':5,'part':2,'day':day,'title':title},s)
    from wayfinder_lesson import build_from_outline
    return build_from_outline({'course':'Tech','dayid':did,'unit':5,'part':2,'day':day,'title':title},mode,MASTER,ROOT/'Tech'/f'{did}.html')
if __name__=='__main__':
    for day in range(1,8):print('BUILT / HOLD',build(day))
