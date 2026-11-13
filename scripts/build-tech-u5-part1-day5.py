#!/usr/bin/env python3
"""One-guide approved desktop skills lab; master engine/styles remain unchanged."""
import json, re, hashlib, html
from pathlib import Path
from bs4 import BeautifulSoup
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prototype',ROOT/'scripts/build-tech-u5-prototype.py')
P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
src=json.loads((ROOT/'scripts/tech-u5-part1-repair-source.json').read_text())
key,prompt,rubric,*_=src['collector']['values'][0]
assert key=='305010530070' and prompt in src['outline']
d=BeautifulSoup(P.MASTER,'html.parser')
def slot(k,v,raw=False):P.replace_slot(d,k,v,raw)
def para(t):return '<p>'+html.escape(t)+'</p>'
values={
 'course-meta':'Tech · Unit 5 · Part 1 · Day 5',
 'lesson-mode':'Day 5 · PERFORM Focused',
 'lesson-title':'TurboWarp Desktop Fundamentals',
 'lesson-deck':'A guided skills lab: explore the installed editor before building our arcade prototype.',
 'learning-target':'I can use sprites, a score variable and start/stop controls in TurboWarp Desktop <strong>because</strong> repeatable tests help me check an interactive design.',
 'priority-teks':'§126.18(c)(3)(B): Use a suitable digital tool to develop a solution and test whether it works. Today: navigate the editor and explain a repeatable test.',
 'supporting-teks':'§126.18(c)(2)(A): Use programming concepts such as variables and events. Today’s short written answer supports tool/test understanding; teacher observation checks the running sandbox.',
 'warm-hook':'A game tester starts the same tiny game twice and gets different scores before doing anything. That makes it hard to compare tests. What would you want to be the same at the start of both tries?',
 'perform-goal':'Follow the teacher one step at a time. Create a temporary practice sandbox with two separate sprites, changed artwork, a backdrop and a score script. This is tool practice before our Part milestone.',
 'mastery-q1':prompt,
 'q1-help':'Answer the new-student scenario, even if your own sandbox is unfinished. Name the places/tools, then describe what you would do and observe twice. Sentence starts: “I would add … using … .” “For a repeatable test, I would … and expect … .”',
 'labs-intro':'Use the remaining time for a small extension with today’s tools. Try, combine or adapt an idea; record what you changed or discovered in one shared response.',
 'lab-one-title':'New look, same object', 'lab-one-instructions':'On one sprite, try a different costume color or outline. Compare how clearly you can see it against the same backdrop.',
 'lab-two-title':'A different score change', 'lab-two-instructions':'Change the amount in change score by, predict the result, then restart twice. Describe what stayed consistent.',
 'lab-three-title':'Another stage mood', 'lab-three-instructions':'Use the backdrop chooser to compare two backgrounds with your same sprites. Choose one that keeps both objects easy to see.',
 'perform-criteria':'Keep the editable .sb3 practice file. Teacher observation checks the two sprite objects, changed costume/backdrop, score script, repeated restart and successful reopen; the Daily question separately checks your explanation.'
}
for k,v in values.items():slot(k,v,k=='learning-target')
d.select_one('.today-mission').clear();d.select_one('.today-mission').append(P.frag('<strong>Today’s Mission:</strong> Learn the editor, save/reopen a practice .sb3, and explain how to repeat a test.'))
for id in ['groupLearn','groupPractice','masteryTwo']:d.find(id=id).decompose()
for k in ['warm-specimen','perform-exemplar','lab-one-example','lab-two-example','lab-three-example']:
 d.select_one('[data-slot="'+k+'"]').decompose()
d.select_one('[data-warm-choices]').decompose()
d.find(id='warmAnswer')['placeholder']='I would want both tries to begin with … because … .'
for n,t in enumerate(['Tank: Try one small action and notice the result.','Forge: Check the selected sprite before adding blocks.','Joey: Change a costume; keep track of its sprite.','Percival.12: Save first, then verify the saved file.'],1):slot('rtf-note-'+str(n),t)
steps=[
 ('Launch the installed TurboWarp Desktop app. Open File > New, name the practice project Desktop Practice, and find the Stage, sprite list, Code, Costumes and Sounds tabs.',
  'Use the Windows Start menu: type TurboWarp and open the installed app. Do not open a website. If no installed app appears, ask your teacher. Confirm before replacing any unsaved project. The Stage is the preview area at upper right; sprite thumbnails sit below it. Select the default sprite: Code holds scripts, Costumes edits its appearance, and Sounds holds its audio. Visit Sounds, then return to Code; no audio editing is needed. Teacher models this editor tour while you follow.'),
 ('Add a library sprite with Choose a Sprite. Then hover over Choose a Sprite, choose Paint, and draw a second sprite with the Brush or Rectangle tool. Rename the two sprites Explorer and Shape.',
  'The Choose a Sprite button is below the Stage near the sprite list. Click it to open the built-in library and select one sprite. Use its hover menu > Paint for the separate custom sprite; draw on the Costumes canvas. Change the sprite name in the sprite information field beside the sprite list. Delete the unused default sprite only after your two objects exist, using its thumbnail trash icon. Click each thumbnail and drag that sprite to a different Stage position. Check: Explorer and Shape have separate thumbnails. Two drawings inside one Costumes list are not two separately controlled objects.'),
 ('Select Shape > Costumes and change its drawing’s color. Select the Stage thumbnail > Choose a Backdrop and pick a built-in background. Return to the Shape sprite and its Code tab.',
  'For a painted shape, use the Select tool, click the shape, then pick a Fill color; for brush artwork, add a different brush color. A costume changes the selected sprite’s appearance. A backdrop changes the Stage behind all sprites. With Stage selected, the artwork tab is Backdrops, not Costumes. Choose a Backdrop is at bottom right beside the Stage controls. Check that both sprite objects remain after changing the backdrop. If you see Backdrops instead of Costumes, select a sprite thumbnail.'),
 ('On Shape > Code, open Variables > Make a Variable, type score, choose For all sprites and OK. Join Events > when green flag clicked to Variables > set score to 0, then change score by 1.',
  'Leave the checkbox beside score checked so its monitor is visible on the Stage. Drag the yellow Events hat into the Code workspace. Snap the orange set block directly under it; choose score in the dropdown and type 0. Snap change score by underneath; choose score and type 1. Use the visible three-block recipe below. The set block replaces the old number; change adds to it. Check: all three blocks form one connected stack on Shape, not on the Stage. If blocks are detached, drag them until they snap together. If the variable is missing, check its exact name and dropdown.'),
 ('Click the green flag, check that score ends at 1, click the red Stop, then click the green flag again. Repeat once more; compare the final score each time.',
  'The green flag starts green-flag event scripts; the red Stop ends running scripts. This tiny stack finishes quickly, so Stop may cause no visible change. Stop does not reset the score; the set score to 0 block resets it on the next green flag, before adding 1. If score becomes 2 or 3 across restarts, check that set score to 0 is connected above change score by 1. If nothing happens, check the selected sprite and event connection. Write a short expected/observed test note in your own workspace or on paper.'),
 ('Use File > Save to your computer and save Desktop Practice.sb3 in your teacher-approved school folder. Then File > Load from your computer, open that saved .sb3 and repeat the green-flag test.',
  'The .sb3 file preserves editable sprites, costumes, backdrop and scripts. In the save dialog choose the school folder your teacher identifies and confirm the filename. Before loading, save any newer changes; loading replaces the current editor project. Find the actual saved file, open it, inspect both named sprites and the backdrop, then run the same test. If you cannot find the file, check the save dialog’s folder; ask your teacher rather than create an account or use a website. Keep this practice file; do not submit it to the answer Form. Complete the independent Daily question below, then Temperature Check and the four checks before Studio.')
]
slot('perform-steps',''.join('<li><details class="perform-step"><summary>'+html.escape(a)+'</summary><div class="perform-step-help">'+para(b)+'</div></details></li>' for a,b in steps),True)
shelf=d.select_one('[data-slot="perform-resources"]');shelf.attrs.pop('hidden',None);shelf.clear()
shelf.append(P.frag('<h3>Resources for today’s work</h3>'+para('Use the installed TurboWarp Desktop app, its built-in sprite/backdrop library and the teacher-approved school save folder. No browser, external download or account is needed. This self-contained guide includes all directions.')+'<h3>Shape sprite · three connected blocks</h3>'+P.recipe('Events: when green flag clicked\n  Variables: set [score] to (0)\n  Variables: change [score] by (1)')+para('Expected finished sandbox: two separate named sprite thumbnails, your changed costume and Stage backdrop, the connected stack on Shape, and a visible score of 1 after each restart. This is a block recipe and expected result, not a screenshot.')))
# The guided lab teaches the prerequisites before the independently answerable question.
q=d.find(id='masteryOne');q.extract();d.find(id='perform').insert_after(q)
root=d.select_one('[data-assembler="one"]');root.clear()
root.append(P.frag(P.answer_markup('Explain where to add/draw the two sprites and create the score, then how you would start, stop and repeat the test.','I would add … using … . To check the score each time, I would … and expect … .')))
ta=root.find('textarea');ta['id']='dailyExplanation';root.find('label')['for']='dailyExplanation'
q.append(P.frag(para('Daily mastery: a strong answer distinguishes the sprite tools, score variable and event controls, and explains a repeatable reset check. Your grade and specific feedback appear in Skyward. Improve the weaker part, then use this same question and Form to resubmit.')))
for label,text in zip(d.find(id='gateway').select('label'),['I submitted my Warm-Up.','I saved/reopened my two-sprite practice .sb3 and repeated its score test.','I submitted the Daily explanation through its school Form.','I submitted my TEKS Temperature Check.']):
 c=label.find('input');c.extract();label.clear();label.append(c);label.append(' '+text)
for t in d.find_all('template'):t.decompose()
for mirror in d.select('[data-mirror]'):mirror.clear();mirror.append(d.select_one('[data-slot="'+mirror['data-mirror']+'"]').get_text(' ',strip=True))
d.select_one('.footer').string='RTF Wayfinder · Tech · Game Design Studio'
config={'mode':'PERFORM','imagePools':{'target':[{'src':'../assets/learning-target/pixel-archery-target.webp','alt':'Pixel holding a paper bullseye target'}],'temperature':[],'labs':[],'comics':[{'src':'../assets/rtf-comics/comic-pet-supervision.webp','alt':'Approved four-panel office comic: Pixel disrupts Onion.exe while Percival records pet supervision'}],'skits':P.SKITS},'destinations':{k:P.FORM+'3050105'+suffix for k,suffix in [('warm','09998'),('q1','30070'),('temp','29999'),('labs','20000')]}}
out=str(d);out=re.sub(r'const WAYFINDER_CONFIG=.*?;',lambda m:'const WAYFINDER_CONFIG='+json.dumps(config,ensure_ascii=False)+';',out,count=1)
meta={'authorization':'Captain GO T1–T6/F1–F3; one-guide batch3050105 only; no release','source_document':'14bLkAQAmRgmHdFButMa7DpDfvFII4owI7k_1o8rRejg','source_revision':src['revision'],'master_sha256':hashlib.sha256(P.MASTER.encode()).hexdigest(),'pinned_record':{'key':key,'prompt':prompt,'rubric':rubric},'archive':'archive/tech-u5-part1-original/3050105-{github,jisd}.html','runtime_forms_visual':'UNTESTED / Captain inspection','next':'3050106 ASSESSMENT in separate batch; preserve Show'}
out=out.replace('<body','<!-- WF-HANDOFF '+json.dumps(meta,ensure_ascii=False)+' -->\n<body',1)
(ROOT/'Tech/3050105.html').write_text(out)
print('Built desktop-only3050105 from approved repair source and unchanged master.')
