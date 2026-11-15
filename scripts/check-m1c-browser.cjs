'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.github/qa-run/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=process.env.M1C_PILOT_DIR,art=path.join(root,'qa-artifacts/m1c');
const norm=s=>s.replace(/\s+/g,' ').trim();
(async()=>{assert.ok(dir);fs.mkdirSync(art,{recursive:true});const browser=await chromium.launch({headless:true,args:['--no-sandbox','--allow-file-access-from-files']}),rows=[];
try{for(const width of [1280,768,390]){
 const pair=[];
 for(const name of ['original','3050201']){
  const page=await browser.newPage({viewport:{width,height:900}}),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
  await page.addInitScript(()=>{Math.random=()=>0;window.__opened=[];window.__copyOK=true;window.open=u=>{window.__opened.push(u);return {}};document.execCommand=()=>window.__copyOK});
  await page.goto(pathToFileURL(path.join(dir,name+'.html')).href,{waitUntil:'load'});
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
  const field=page.locator('#masteryOne textarea[data-open-response]'),create=page.locator('#masteryOne .create-response'),submit=page.locator('#masteryOne .finalize-response');
  const preview=page.locator('#q1assembled');
  async function built(){await create.click();await preview.waitFor({state:'visible'})}
  await field.fill('');await built();assert.match(await preview.innerText(),/Not answered/);assert.equal(await submit.isDisabled(),false);
  await field.fill('Two sprites keep their code separate. Move Player and confirm FallingObject stays still.');assert.equal(await submit.isDisabled(),true);await built();
  await page.evaluate(()=>window.__copyOK=false);await submit.click();assert.equal(await page.evaluate(()=>window.__opened.length),0);assert.match(await page.locator('#q1Status').innerText(),/Copy did not succeed/);
  await page.evaluate(()=>window.__copyOK=true);await submit.click();assert.ok((await page.evaluate(()=>window.__opened)).some(u=>u.includes('entry.1954781253=305020130059')));
  await field.fill('Edited draft.');assert.equal(await submit.isDisabled(),true);assert.equal(await field.inputValue(),'Edited draft.');
  for(const [key,input,value] of [['warm','#warmAnswer','The square might slide.'],['temp','#temperatureFeedback','The sprite example helped.']]){
   await page.locator(input).fill(value);if(key==='temp')await page.locator('input[name=tempConfidence]').first().check();
   await page.locator('button.evidence-create[data-submission='+key+']').click();assert.equal(await page.locator('button.evidence-final[data-submission='+key+']').isDisabled(),false);
   await page.locator('button.evidence-final[data-submission='+key+']').click();const suffix=key==='warm'?'09998':'29999';assert.ok((await page.evaluate(()=>window.__opened)).some(u=>u.includes('entry.1954781253=3050201'+suffix)));
   await page.locator(input).fill(value+' Edited.');assert.equal(await page.locator('button.evidence-final[data-submission='+key+']').isDisabled(),true);
  }
  assert.equal(await page.locator('#creativeLabs').isVisible(),false);
  for(const c of await page.locator('.gate-check').all())await c.check();assert.equal(await page.locator('#creativeLabs').isVisible(),true);
  await page.locator('#studioEvidence').fill('I changed the player size and compared the result.');await page.locator('button.evidence-create[data-submission=labs]').click();await page.locator('button.evidence-final[data-submission=labs]').click();assert.ok((await page.evaluate(()=>window.__opened)).some(u=>u.includes('entry.1954781253=305020120000')));
  await page.locator('.gate-check').first().uncheck();assert.equal(await page.locator('#creativeLabs').isVisible(),false);await page.locator('.gate-check').first().check();assert.equal(await page.locator('#studioEvidence').inputValue(),'I changed the player size and compared the result.');
  // Inspect full taught content and all novice scaffolds, not just collapsed summaries.
  for(const d of await page.locator('#perform details,#masteryOne details').all()){await d.locator('summary').click();assert.equal(await d.evaluate(e=>e.open),true)}
  await page.screenshot({path:path.join(art,name+'-'+width+'.png'),fullPage:true});
  const data=await page.evaluate(()=>{
   const boxes=selector=>[...document.querySelectorAll(selector)].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,width:r.width,height:r.height,x:r.x,y:r.y}});
   return {text:document.body.innerText,sectionIds:[...document.querySelectorAll('section[id]')].map(e=>e.id),sectionBoxes:boxes('section[id]'),diagramBoxes:boxes('figure svg'),diagramViewBoxes:[...document.querySelectorAll('figure svg')].map(e=>e.viewBox.baseVal.width),brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,overflow:document.documentElement.scrollWidth>innerWidth+2,diagramOverflow:[...document.querySelectorAll('figure svg')].some(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.width>b.width+1}),answerParts:document.querySelectorAll('#masteryOne [data-answer-part]').length,typedResponses:document.querySelectorAll('#masteryOne textarea[data-open-response]').length,disclosures:document.querySelectorAll('#perform details.perform-step').length,skit:document.querySelector('#skitSlot').textContent,forms:window.__opened};
  });
  fs.writeFileSync(path.join(art,name+'-'+width+'-text.txt'),data.text);const text=data.text;delete data.text;
  assert.equal(errors.length,0);assert.equal(requests.length,0);assert.equal(data.brokenImages,0);assert.equal(data.overflow,false);assert.equal(data.diagramOverflow,false);assert.equal(data.answerParts,1);assert.equal(data.typedResponses,1);assert.equal(data.disclosures,4);assert.match(data.skit,/Official Dress Code/);assert.ok(data.diagramViewBoxes.every(x=>x===480));
  const row={name,width,...data,networkRequests:requests.length,requestUrls:requests,errors,previewEmpty:'PASS',editReset:'PASS',copyFailure:'PASS simulated',formKey:'PASS intercepted without sending',xtraAndChecklist:'PASS',clipboard:'UNTESTED — stubbed',collectorReceipt:'UNTESTED'};pair.push({row,text});rows.push(row);await page.close();
 }
 assert.equal(norm(pair[1].text),norm(pair[0].text),'full visible content including disclosures/skit differs at '+width);
 assert.deepEqual(pair[1].row.sectionIds,pair[0].row.sectionIds);
 // Current master typography is authoritative. Record, rather than hide, any
 // geometry difference from the historical approved guide's older embedded CSS.
 for(let i=0;i<pair[0].row.sectionBoxes.length;i++){
  const a=pair[0].row.sectionBoxes[i],b=pair[1].row.sectionBoxes[i];assert.equal(a.width,b.width);assert.ok(Math.abs(a.height-b.height)<=3,'section height '+a.id+' '+a.height+' vs '+b.height);
 }
}
}finally{await browser.close()}
const result={status:'PASS',rows,content:'normalized complete visible text exact at all viewports',layout:'same section order/width; heights within 3px',offline:'zero HTTP requests with all HTTP blocked, including Studio unlock',clipboard:'UNTESTED',collectorReceipt:'UNTESTED'};fs.writeFileSync(path.join(art,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{fs.mkdirSync(art,{recursive:true});fs.writeFileSync(path.join(art,'failure.txt'),e.stack);console.error(e);process.exitCode=1});
