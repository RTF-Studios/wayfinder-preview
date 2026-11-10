#!/usr/bin/env node
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {pathToFileURL}=require('url');
const {chromium}=require('./qa-run/node_modules/playwright');
const root=path.resolve(__dirname,'..'),issues=[],args=process.argv.slice(2);
const fail=(p,msg)=>issues.push(p+': '+msg);
const check=(ok,p,msg)=>{if(!ok)fail(p,msg)};
function changed(){
 try{
 const b=process.env.GITHUB_EVENT_BEFORE,h=process.env.GITHUB_SHA||'HEAD';
 return cp.execFileSync('git',b&&!/^0+$/.test(b)?['diff','--name-only',b,h]:['diff','--name-only','HEAD^','HEAD'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>/^(Tech|CS|AAVTC)\/\d{7}\.html$/.test(x));
 }catch{return []}
}
const master='templates/wayfinder-master.html',gold='CS/2090106.html';
const files=[...new Set(args.includes('--master-only')?[master]:[master,gold,...(args.includes('--changed')?changed():[]),...args.filter(x=>/^(Tech|CS|AAVTC)\/\d{7}\.html$/.test(x))])];
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
 try{for(const f of files){
 const p=path.join(root,f);
 if(!fs.existsSync(p)){fail(f,'missing HTML');continue}
 const html=fs.readFileSync(p,'utf8'),js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 check(/execCommand\(\s*['"]copy['"]\s*\)/.test(js),f,'must use synchronous copy');
 check(!/navigator\.(?:clipboard|permissions)\b/.test(js),f,'permission API forbidden');
 check(!/window\.open\(\s*['"]about:blank|tab\.location\.replace/.test(js),f,'copy must precede Form opening');
 check(!/manual-copy-fallback|showManualCopy|showManualSection|manual-form-link/.test(html),f,'extra fallback UI forbidden');
 try{new(require('vm').Script)(js)}catch(e){fail(f,'JS syntax '+e.message)}
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(p).href,{waitUntil:'domcontentloaded'});
 const pairs=await page.evaluate(()=>({
  section:[...document.querySelectorAll('button.section-build[data-n]')].map(x=>x.dataset.n),
  evidence:[...document.querySelectorAll('button.evidence-create[data-submission]')].map(x=>x.dataset.submission),
  question:[...document.querySelectorAll('button.create-response[data-question]')].map(x=>x.dataset.question),
  xtra:['tempCopy','studioCopy'].filter(x=>document.getElementById(x)),
  legacy:document.querySelectorAll('button.section-copy,button.copy,a.submit[data-submission],textarea.manual-response,.manual-copy-fallback').length,
  previews:document.querySelectorAll('.assembled-preview').length
 }));
 check(pairs.legacy===0,f,'legacy or third copy control');
 check(pairs.previews>0,f,'one preview required');
 check(pairs.section.length+pairs.evidence.length+pairs.question.length+pairs.xtra.length>0,f,'no response controls');
 for(const n of pairs.section)check(await page.locator('#section'+n+' button.section-submit').count()===1,f,'section '+n+' final control');
 for(const n of pairs.evidence)check(await page.locator('button.evidence-final[data-submission="'+n+'"]').count()===1,f,n+' final control');
 for(const n of pairs.question)check(await page.locator('button.finalize-response[data-question="'+n+'"]').count()===1,f,n+' final control');
 for(const n of pairs.xtra)check(await page.locator('#'+(n==='tempCopy'?'tempSubmit':'studioSubmit')).count()===1,f,n+' final control');
 if(f===gold){
  await page.evaluate(()=>{
    window.qaOrder=[];window.qaForm='';
    const native=document.execCommand.bind(document);
    document.execCommand=(c)=>{if(c==='copy')window.qaOrder.push('copy');return native(c)};
    window.open=(url)=>{window.qaOrder.push('open');window.qaForm=url;return null};
  });
  async function verify(create,submit,preview,name){
   check(await page.locator(submit).isDisabled(),f,name+' initially disabled');
   await page.locator(create).click();
   check(await page.locator(preview).isVisible(),f,name+' preview visible');
   const expected=await page.locator(preview).innerText();
   check(expected.length>0,f,name+' assembled answer');
   check(await page.locator(submit).isEnabled(),f,name+' enabled after create');
   await page.evaluate(()=>{window.qaOrder=[];window.qaForm=''});
   await page.locator(submit).click();
   const result=await page.evaluate(()=>({order:window.qaOrder.join(','),url:window.qaForm}));
   check(result.order==='copy,open',f,name+' copies BEFORE opening Form');
   check(/docs\.google\.com\/forms\//.test(result.url),f,name+' school Form destination');
   await page.evaluate(()=>{const a=document.createElement('textarea');a.id='qaPaste';document.body.append(a);a.focus()});
   await page.keyboard.press('ControlOrMeta+V');
   check((await page.locator('#qaPaste').inputValue())===expected,f,name+' actual clipboard PASTE matches preview');
   await page.locator('#qaPaste').evaluate(x=>x.remove());
  }
  for(let n=1;n<=4;n++){
   const items=page.locator('#section'+n+' fieldset.assessment-item');
   for(let i=0;i<await items.count();i++){
    const item=items.nth(i),radio=item.locator('input[type=radio]');
    if(await radio.count())await radio.first().check();
    const fields=item.locator('textarea,input[type=text]');
    for(let j=0;j<await fields.count();j++)await fields.nth(j).fill('QA response '+n+' '+i+' '+j);
   }
   await verify('#section'+n+' button.section-build','#submit'+n,'#preview'+n,'Section '+n);
  }
  await page.locator('input[name=tempConfidence]').first().check();
  await page.locator('#temperatureFeedback').fill('QA confidence');
  await verify('#tempCopy','#tempSubmit','#tempPreview','TEKS Temperature');
  await page.locator('#studioEvidence').fill('QA creative evidence');
  await verify('#studioCopy','#studioSubmit','#studioPreview','Creative Studio');
  await page.locator('#studioEvidence').fill('QA edited evidence');
  check(await page.locator('#studioSubmit').isDisabled(),f,'edit disables final');
 }

 // All newly changed course guides must actually copy their own assembled answers.
 // The CS reference above tests every assessment slot; these probes prevent a future
 // Learn/Perform/Recovery variant from silently reverting to popup-first behavior.
 if(f!==master&&f!==gold){
   await page.evaluate(()=>{
     window.qaOrder=[];window.qaForm='';
     const original=document.execCommand.bind(document);
     document.execCommand=(name)=>{if(name==='copy')window.qaOrder.push('copy');return original(name)};
     window.open=(url)=>{window.qaOrder.push('open');window.qaForm=url;return null};
   });
   async function validate(create,final,preview,label){
     if(!await page.locator(create).isVisible())return;
     check(await page.locator(final).isDisabled(),f,label+' starts disabled');
     await page.locator(create).click();
     await page.waitForTimeout(720);
     check(await page.locator(preview).isVisible(),f,label+' read-only preview appears');
     const expected=await page.locator(preview).innerText();
     check(expected.length>0,f,label+' response assembled');
     check(await page.locator(final).isEnabled(),f,label+' enables after Create');
     await page.evaluate(()=>{window.qaOrder=[];window.qaForm=''});
     await page.locator(final).click();
     const actual=await page.evaluate(()=>({order:window.qaOrder.join(','),url:window.qaForm}));
     check(actual.order==='copy,open',f,label+' copies BEFORE opening Form');
     check(/docs\.google\.com\/forms\//.test(actual.url),f,label+' verified Form destination');
     await page.evaluate(()=>{const ta=document.createElement('textarea');ta.id='qaPaste';document.body.append(ta);ta.focus()});
     await page.keyboard.press('ControlOrMeta+V');
     check((await page.locator('#qaPaste').inputValue())===expected,f,label+' real clipboard differs from preview');
     await page.locator('#qaPaste').evaluate(x=>x.remove());
   }
   async function fillRoot(root){
     const radios=await root.locator('input[type=radio]').evaluateAll(a=>[...new Set(a.map(x=>x.name))]);
     for(const name of radios){const a=root.locator('input[type=radio][name="'+name.replace(/"/g,'\\"')+'"]');if(await a.count())await a.first().check()}
     const boxes=root.locator('input[type=checkbox]');if(await boxes.count())await boxes.first().check();
     const selects=root.locator('select');for(let i=0;i<await selects.count();i++){const a=selects.nth(i);const choices=await a.locator('option').count();if(choices>1)await a.selectOption({index:1})}
     const fields=root.locator('textarea,input[type=text]');for(let i=0;i<await fields.count();i++)await fields.nth(i).fill('QA tested this concept carefully');
   }
   for(const n of pairs.section){
     await fillRoot(page.locator('#section'+n));
     await validate('#section'+n+' button.section-build','#section'+n+' button.section-submit','#preview'+n,'section '+n);
   }
   for(const key of pairs.evidence){
     if(key==='warm'){await page.locator('#warmAnswer').fill('QA response for this scenario');const choices=page.locator('[data-warm-choices]');if(await choices.isVisible())await choices.locator('input[type=radio]').first().check();}
     if(key==='temp'){await page.locator('input[name=tempConfidence]').first().check();await page.locator('#temperatureFeedback').fill('QA reflection on what I know');}
     if(key==='labs'){const checks=page.locator('.gate-check');for(let i=0;i<await checks.count();i++)await checks.nth(i).check();await page.locator('#studioEvidence').fill('QA creative design extension');}
     await validate('button.evidence-create[data-submission="'+key+'"]','button.evidence-final[data-submission="'+key+'"]','#'+key+'Preview',key);
   }
   for(const key of pairs.question){
     const root=page.locator('[data-assembler="'+key+'"]');
     await fillRoot(root);
     await validate('button.create-response[data-question="'+key+'"]','button.finalize-response[data-question="'+key+'"]',key==='one'?'#q1assembled':'#q2assembled','mastery '+key);
   }
   for(const k of pairs.xtra){
     if(k==='tempCopy'){await page.locator('input[name=tempConfidence]').first().check();await page.locator('#temperatureFeedback').fill('QA confidence test');}
     else await page.locator('#studioEvidence').fill('QA creative studio');
     await validate('#'+k,'#'+(k==='tempCopy'?'tempSubmit':'studioSubmit'),'#'+(k==='tempCopy'?'tempPreview':'studioPreview'),k);
   }
 }
 check(errors.length===0,f,'browser JS errors '+errors.join(';'));
 await page.close();
 }}finally{await browser.close()}
}
run().then(()=>{console.log(JSON.stringify({status:issues.length?'FAIL':'PASS',files,issues},null,2));if(issues.length)process.exitCode=1}).catch(e=>{console.error(e);process.exitCode=1});
