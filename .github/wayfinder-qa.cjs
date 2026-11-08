const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('./qa-run/node_modules/playwright');
const files=[
 ...Array.from({length:10},(_,i)=>'Tech/30401'+String(i+1).padStart(2,'0')+'.html'),
 ...Array.from({length:10},(_,i)=>'AAVTC/10401'+String(i+1).padStart(2,'0')+'.html'),
 ...Array.from({length:7},(_,i)=>'CS/20902'+String(i+1).padStart(2,'0')+'.html'),
 'CS/2090105.html', 'CS/2090106.html'
];
const out=path.join(process.cwd(),'.github','qa-screenshots');fs.mkdirSync(out,{recursive:true});
const problems=[],stats={pages:0,desktop:0,mobile:0,mastery:0,studio:0,closeout:0,warm:0,temperature:0};
const browserMain=(async()=>{
 const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files','--no-sandbox']});
 for(const file of files){
  const context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:false});
  await context.addInitScript(()=>{
    window.__copied=[];
    document.execCommand=(command)=>{if(command==='copy'){window.__copied.push(document.activeElement?.value||window.getSelection()?.toString()||'direct-copy');return true;}return false;};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied.push(t);}}});
    window.open=(url)=>({opener:null,closed:false,close(){this.closed=true;},location:{replace(u){window.__lastFormURL=u;}}});
  });
  const page=await context.newPage();page.setDefaultTimeout(4500);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=pathToFileURL(path.resolve(file)).href;
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(300);
   stats.pages++;
   if(errors.length)problems.push(file+' JS: '+errors.join(' | ').slice(0,300));
   const desktop=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,nav:document.getElementById('sideNav')?.classList.contains('open'),art:[...document.querySelectorAll('img')].filter(img=>img.offsetParent!==null&&!img.complete).length}));
   if(desktop.overflow>3)problems.push(file+' desktop overflow '+desktop.overflow);
   if(!desktop.nav&&!file.endsWith('2090106.html'))problems.push(file+' desktop quick menu not open');
   stats.desktop++;
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);
   const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,nav:document.getElementById('sideNav')?.classList.contains('open')}));
   if(mobile.overflow>3)problems.push(file+' mobile overflow '+mobile.overflow);
   stats.mobile++;
   if(/(3040101|1040107|2090205|2090207)\.html$/.test(file)){
     await page.screenshot({path:path.join(out,file.replace('/','_')+'.png'),fullPage:true,timeout:30000});
   }
   if(file.endsWith('2090106.html')){
    const quizCount=await page.locator('section[id^="q"]').count();
    if(quizCount<12)problems.push(file+' expected 12 quiz items, found '+quizCount);
    const formCount=await page.locator('a[href*="docs.google.com/forms"]').count();
    if(formCount<12)problems.push(file+' expected 12 quiz form links, found '+formCount);
   }else{
   const warm=page.locator('#warmAnswer');await warm.fill('I noticed one clear detail in the paragraph.');
   await page.locator('button.copy[data-submission="warm"]').click();await page.waitForTimeout(80);
   if(!(await page.locator('a.submit[data-submission="warm"]').isVisible()))problems.push(file+' warm copy did not reveal Form link');
   else stats.warm++;
   const root=page.locator('[data-assembler="one"]');
   const count=await root.locator('[data-answer-part]').count();
   if(count<2)problems.push(file+' mastery has too few configured answer components');
   const groups=await root.locator('input[type="radio"]').evaluateAll(els=>[...new Set(els.map(el=>el.name))]);
   for(const name of groups)await root.locator('input[type="radio"]').filter({visible:true}).first().count()&&await root.locator('input[type="radio"][name="'+name+'"]').first().check();
   const checks=await root.locator('input[type="checkbox"]').count();
   for(let i=0;i<checks;i++){const cb=root.locator('input[type="checkbox"]').nth(i);if(i===0||i===checks-1)await cb.check();}
   const selects=root.locator('select[data-answer-select]');
   for(let i=0;i<await selects.count();i++){const opts=await selects.nth(i).locator('option').count();if(opts>1)await selects.nth(i).selectOption({index:1});}
   const blanks=root.locator('input[data-blank]');
   for(let i=0;i<await blanks.count();i++)await blanks.nth(i).fill('a carefully observed change');
   const answerFields=root.locator('textarea[data-open-response],input[data-open-response],textarea[data-fragment]');
   for(let i=0;i<await answerFields.count();i++)await answerFields.nth(i).fill('I selected this because it directly supports the intended outcome; I would test it using the stated scenario.');
   await page.locator('button.create-response[data-question="one"]').click();
   await page.waitForTimeout(300);
   const preview=page.locator('#q1assembled');
   if(!(await preview.isVisible())||(await preview.innerText()).length<40)problems.push(file+' mastery preview did not assemble');
   else stats.mastery++;
   const editable=answerFields.first();
   if(await answerFields.count()){await editable.fill('I revised my reasoning after the first preview and would retest.');if(await preview.isVisible())problems.push(file+' editing did not invalidate preview');}
   await page.locator('button.create-response[data-question="one"]').click();await page.waitForTimeout(250);
   await page.locator('button.finalize-response[data-question="one"]').click();await page.waitForTimeout(100);
   const copied=await page.evaluate(()=>window.__copied.length);
   if(copied<2)problems.push(file+' mastery clipboard was not invoked');
   const confidence=page.locator('input[name="tempConfidence"]');if(await confidence.count())await confidence.first().check();const feedback=page.locator('#temperatureFeedback');if(await feedback.count())await feedback.fill('The labeled example helped me identify and test the relevant rule.');
   const tempBtn=page.locator('button.copy[data-submission="temp"]');if(await tempBtn.count()){await tempBtn.click();await page.waitForTimeout(60);if(!(await page.locator('a.submit[data-submission="temp"]').isVisible()))problems.push(file+' temperature form not revealed');else stats.temperature++;}
   const gateChecks=page.locator('.gate-check');for(let i=0;i<await gateChecks.count();i++)await gateChecks.nth(i).check();
   const isCloseout=await page.locator('body').getAttribute('data-closeout');
   const lab=page.locator('#creativeLabs');
   if(isCloseout==='true'){
    if(await lab.isVisible())problems.push(file+' closeout incorrectly exposes Creative Studio');
    else stats.closeout++;
   }else{
    if(!(await lab.isVisible()))problems.push(file+' Creative Studio did not unlock');
    else {
      await page.locator('#studioEvidence').fill('I tested a meaningful extension and compared the results.');
      await page.locator('#labCopy').click();await page.waitForTimeout(70);
      if(!(await page.locator('a.submit[data-submission="labs"]').isVisible()))problems.push(file+' Studio copy did not reveal submit');
      else stats.studio++;
    }
   }
   }
   if(errors.length)problems.push(file+' JS late: '+errors.join(' | ').slice(-250));
  }catch(e){problems.push(file+' FAILED: '+String(e).slice(0,350));}
  await context.close();
 }
 await browser.close();
})();
browserMain.then(()=>{
 console.log(JSON.stringify({stats,problems},null,2));
 fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify({stats,problems},null,2));
 if(problems.length)process.exitCode=1;
}).catch(e=>{console.error(e);process.exitCode=1;});
