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
   const parts=page.locator('[data-assembler="one"] textarea[data-open-response]');
   const count=await parts.count();
   if(count<3)problems.push(file+' mastery has fewer than three answer fields');
   for(let i=0;i<count;i++)await parts.nth(i).fill('My answer '+(i+1)+' explains a concrete design decision and a test.');
   await page.locator('button.create-response[data-question="one"]').click();
   await page.waitForTimeout(850);
   const preview=page.locator('#q1assembled');
   if(!(await preview.isVisible())||(await preview.innerText()).length<40)problems.push(file+' mastery preview did not assemble');
   else stats.mastery++;
   await parts.nth(0).fill('I revised the first explanation after preview.');
   if(await preview.isVisible())problems.push(file+' editing did not invalidate preview');
   await page.locator('button.create-response[data-question="one"]').click();await page.waitForTimeout(850);
   await page.locator('button.finalize-response[data-question="one"]').click();await page.waitForTimeout(100);
   const copied=await page.evaluate(()=>window.__copied.length);
   if(copied<2)problems.push(file+' mastery clipboard was not invoked');
   const confidence=page.locator('input[name="tempConfidence"]');if(await confidence.count())await confidence.first().check();
   const tempBtn=page.locator('button.copy[data-submission="temp"]');if(await tempBtn.count()){await tempBtn.click();await page.waitForTimeout(60);if(!(await page.locator('a.submit[data-submission="temp"]').isVisible()))problems.push(file+' temperature form not revealed');else stats.temperature++;}
   const checks=page.locator('.gate-check');for(let i=0;i<await checks.count();i++)await checks.nth(i).check();
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
