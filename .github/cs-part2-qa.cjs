/* Authorized RTS-20261110-CS-PART2-COMPLETE-REBUILD verification; no school receipts fabricated. */
const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('./qa-run/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-artifacts/cs-part2');
fs.mkdirSync(out,{recursive:true});
const modes=['STARTER','LEARN','LEARN','PERFORM','PERFORM','PERFORM','PERFORM','PERFORM','ASSESSMENT','RECOVERY'];
const suffixes=[['20125'],['20126','20127'],['20128','20129'],['20130'],['20131'],['20132'],['20133'],['20134'],['29991','29992','29993','29994'],[]];
const issues=[],results=[];const check=(ok,where,msg)=>{if(!ok)issues.push(where+': '+msg)};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
 try{
 for(let i=1;i<=10;i++){
  const id=String(2090200+i),file=path.join(root,'CS',id+'.html'),source=fs.readFileSync(file,'utf8');
  for(const viewport of [{name:'desktop',width:1366,height:768},{name:'chromebook',width:960,height:600},{name:'phone',width:390,height:844}]){
   const tag=id+'/'+viewport.name,context=await browser.newContext({viewport,offline:true}),page=await context.newPage(),errors=[],remote=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
   await page.goto(pathToFileURL(file).href);await page.waitForTimeout(250);
   check(await page.evaluate(()=>WAYFINDER_CONFIG.mode)===modes[i-1],tag,'correct mode');
   check(await page.locator('.sidelink,nav,a').count()===0,tag,'no library/menu/cross-guide links');
   check(await page.locator('script[src],link[rel=stylesheet]').count()===0,tag,'no remote scripts/styles');
   check(await page.locator('#targetArt img').evaluateAll(a=>a.length===1&&a.every(x=>x.complete&&x.naturalWidth>0&&x.src.startsWith('data:image/png'))),tag,'embedded PNG renders offline');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tag,'no page horizontal overflow');
   check(await page.evaluate(()=>[...document.querySelectorAll('textarea,select,button')].filter(x=>x.getClientRects().length).every(x=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})),tag,'visible controls fit viewport');
   const keys=await page.evaluate(()=>Object.values(WAYFINDER_CONFIG.destinations).map(x=>new URL(x).searchParams.get('entry.1954781253')));
   const wanted=[...suffixes[i-1].map(s=>id+s),id+'29999',id+'20000',...(i===9?[]:[id+'09998'])];
   check(JSON.stringify(keys.slice().sort())===JSON.stringify(wanted.sort()),tag,'exact 12-digit Form key set');
   check(!source.includes('Teacher key:'),tag,'no teacher answer keys');
   if(i<=3)check(await page.locator('#perform').count()===0,tag,'concept modes have no project construction');
   if(i===1)check(await page.locator('#partRoadmap').isVisible(),tag,'Starter roadmap visible');
   if(i>=4&&i<=8){check(await page.locator('#perform').isVisible(),tag,'Perform actions visible');check(await page.locator('#perform .perform-step').count()===5,tag,'five scaffolded actions');check(await page.locator('#perform .perform-resources').isVisible(),tag,'current-page resources visible')}
   if(i===9){check(await page.locator('.assessment-section').count()===4,tag,'four independently keyed sections');check(await page.locator('#warmup,#perform,#gateway').count()===0,tag,'assessment omits regular work');check(await page.locator('#creativeLabs').isVisible(),tag,'assessment Studio unlocked')}
   if(i===10)check(await page.locator('[data-question],.assessment-section,#gateway').count()===0,tag,'recovery no new mastery/gateway');
   if(i<=8){
    check(await page.locator('#creativeLabs').isHidden(),tag,'Studio begins locked');
    for(const box of await page.locator('.gate-check').all())await box.check();
    check(await page.locator('#creativeLabs').isVisible(),tag,'four checks unlock Studio');
   }
   // All scaffolds have native accessible names and editing invalidates readiness.
   const roots=page.locator('[data-assembler]');
   for(let j=0;j<await roots.count();j++){
    const ar=roots.nth(j),section=ar.locator('xpath=ancestor::section[1]');
    const create=section.locator('button.create-response,button.section-build'),final=section.locator('button.finalize-response,button.section-submit');
    await create.click();check(await final.isDisabled(),tag,'incomplete answer does not enable final');
    const radios=await ar.locator('input[type=radio]').evaluateAll(a=>[...new Set(a.map(x=>x.name))]);
    for(const name of radios)await ar.locator('input[type=radio][name="'+name+'"]').first().check();
    for(const select of await ar.locator('select').all())await select.selectOption({index:1});
    for(const box of await ar.locator('input[type=checkbox]').all())await box.check();
    for(const field of await ar.locator('textarea').all())await field.fill('QA reasoning and observable test.');
    await create.click();await page.waitForTimeout(720);check(await final.isEnabled(),tag,'complete answer enables final');
    await page.evaluate(()=>{window.qaOpened=0;window.open=()=>window.qaOpened++;document.execCommand=()=>false});
    await final.click();check(await page.evaluate(()=>window.qaOpened===0),tag,'copy failure never opens Form');
    const field=ar.locator('textarea').first();await field.fill('Edited QA explanation.');check(await final.isDisabled(),tag,'edit resets final');
   }
   // Open resource/step content for visual inspection; leave source behavior unchanged.
   await page.locator('details').evaluateAll(a=>a.forEach(x=>x.open=true));
   await page.screenshot({path:path.join(out,tag.replace('/','-')+'.png'),fullPage:true});
   check(errors.length===0,tag,'no JavaScript errors '+errors.join('; '));check(remote.length===0,tag,'zero remote lesson dependency requests');
   results.push({id,viewport:viewport.name,mode:modes[i-1],errors,remoteRequests:remote.length});
   await context.close();
  }
 }
 }finally{await browser.close()}
 const report={status:issues.length?'FAIL':'PASS',results,issues,limitations:['CI offline browser and clipboard tests do not establish a live school Form receipt, authenticated student download, or grade export.']};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
