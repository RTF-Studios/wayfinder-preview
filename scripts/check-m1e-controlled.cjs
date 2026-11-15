'use strict';
// Captain GO M1e: simulation ONLY. No production endpoint is ever contacted.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.github/qa-run/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir=process.env.M1C_PILOT_DIR;
const art=path.join(root,'qa-artifacts/m1e');fs.mkdirSync(art,{recursive:true});
const key='305020130059',endpoint='https://m1e.invalid/collector';
const destination='https://docs.google.com/forms/d/e/1FAIpQLSd0OVYW0cuObc1FCSQy55eSm6UNFcPTX_R9QROBtXrEF84fXw/viewform?usp=pp_url&entry.1954781253='+key;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[],observations=[];
function pass(name,details){checks.push({name,status:'PASS',details});}
function mockForm(){return `<!doctype html><title>M1e MOCK ONLY</title><h1>M1e mock Form; no school connection</h1><label>Response<textarea id="answer"></textarea></label><button id="submit">Submit mock response</button><output id="status"></output><script>
let busy=false;document.getElementById('submit').onclick=async()=>{if(busy)return;busy=true;const b=document.getElementById('submit');b.disabled=true;const c=new AbortController(),timer=setTimeout(()=>c.abort(),120);const status=document.getElementById('status');status.textContent='Pending mock acknowledgment';try{const r=await fetch('${endpoint}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({testOnly:true,testId:'M1E-NONSTUDENT',questionKey:'${key}',destination:${JSON.stringify(destination)},response:document.getElementById('answer').value}),signal:c.signal});if(!r.ok)throw Error('mock HTTP '+r.status);const j=await r.json();status.textContent=j.duplicate?'Mock duplicate acknowledged: '+j.receipt:'Mock accepted: '+j.receipt;}catch(e){status.textContent=e.name==='AbortError'?'Mock timeout; response retained; retry available':'Mock network failure; response retained; retry available';}finally{clearTimeout(timer);busy=false;b.disabled=false;}};
</script>`;}
(async()=>{
 assert.ok(dir,'isolated directory required');
 const file=path.join(dir,'3050201.html'),html=fs.readFileSync(file,'utf8');
 assert.equal(sha(html),'9f43ef8f317e56241ffe40ef77d3d92848f779f1dd5cb0e58d57a8a6e28ff0bc');
 const protectedPaths=['Tech/3050201.html','templates/wayfinder-master.html','scripts/wayfinder-identity.cjs','scripts/wayfinder_identity.py'];
 const before=Object.fromEntries(protectedPaths.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
 const context=await browser.newContext({offline:true,serviceWorkers:'block'});
 let mode='success',requests=[],blocked=[],records=[],lastPayload;
 try{
  // Fail closed: context is offline; ALL browser requests are routed. Only file
  // reads and reserved .invalid mock responses are served. No HTTP continue/fallback.
  await context.route('**/*',async route=>{
   const req=route.request(),url=req.url();
   if(url.startsWith('file:'))return route.continue();
   requests.push({url,method:req.method()});
   if(url==='https://m1e.invalid/form')return route.fulfill({status:200,contentType:'text/html',body:mockForm()});
   if(url===endpoint){
    assert.equal(req.method(),'POST');const p=req.postDataJSON();lastPayload=p;
    assert.equal(p.testOnly,true);assert.equal(p.testId,'M1E-NONSTUDENT');assert.equal(p.questionKey,key);assert.equal(p.destination,destination);
    if(mode==='network')return route.abort('failed');
    if(mode==='timeout'){await new Promise(r=>setTimeout(r,250));try{await route.abort('timedout')}catch{}return;}
    const previous=records.find(x=>JSON.stringify(x.payload)===JSON.stringify(p));
    const receipt=previous?.receipt||'MOCK-M1E-'+(records.length+1);
    if(!previous)records.push({receipt,payload:p});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({accepted:true,duplicate:Boolean(previous),receipt})});
   }
   blocked.push(url);return route.abort('blockedbyclient');
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__m1e={permission:'granted',legacy:true,clipboard:'',opened:[],events:[],apiCalls:0};
   Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:async()=>({state:window.__m1e.permission})}});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__m1e.apiCalls++;if(window.__m1e.permission==='denied')throw new DOMException('denied','NotAllowedError');window.__m1e.clipboard=text;}}});
   document.execCommand=command=>{if(command!=='copy')throw Error('unexpected command');window.__m1e.events.push('copy');if(window.__m1e.legacy==='throw')throw new DOMException('denied','NotAllowedError');if(!window.__m1e.legacy)return false;window.__m1e.clipboard=document.activeElement.value;return true;};
   window.open=url=>{window.__m1e.events.push('open');window.__m1e.opened.push(url);return {};};
  });
  await page.goto(pathToFileURL(file).href,{waitUntil:'load'});
  const field=page.locator('#masteryOne textarea[data-open-response]'),preview=page.locator('#q1assembled'),create=page.locator('#masteryOne .create-response'),submit=page.locator('#masteryOne .finalize-response'),status=page.locator('#q1Status');
  async function build(value){await field.fill(value);await create.click();await preview.waitFor({state:'visible'});return preview.innerText();}
  const raw='M1E TEST ONLY — Two sprites keep their code separate.\nMove Player; FallingObject stays still. Symbols: < > & "quoted" café.';
  const answer=await build(raw);await submit.click();
  let state=await page.evaluate(()=>window.__m1e);assert.equal(state.clipboard,answer);assert.equal(state.opened[0],destination);assert.deepEqual(state.events,['copy','open']);assert.equal(state.apiCalls,0);
  assert.ok(answer.includes('Two sprites keep their code separate.'));assert.ok(answer.includes('Move Player; FallingObject stays still.'));assert.ok(answer.includes('< > & "quoted" café.'));assert.ok(!answer.includes(key));
  pass('simulated granted copy and exact route',{preview:answer,questionKey:key,keyLocation:'hidden Form URL; intentionally absent from copied answer',events:state.events});
  await page.evaluate(()=>{window.__m1e.permission='denied';window.__m1e.clipboard='';window.__m1e.events=[];});await submit.click();state=await page.evaluate(()=>window.__m1e);assert.equal(state.clipboard,answer);assert.equal(state.apiCalls,0);assert.deepEqual(state.events,['copy','open']);
  pass('denied modern Clipboard API with legacy copy available','unchanged engine avoids permission API and succeeds through synchronous execCommand; simulated only');
  for(const failure of [false,'throw']){
   await page.evaluate(f=>{window.__m1e.legacy=f;window.__m1e.clipboard='sentinel';window.__m1e.events=[];},failure);const opens=await page.evaluate(()=>window.__m1e.opened.length);await submit.click();state=await page.evaluate(()=>window.__m1e);
   assert.equal(state.opened.length,opens);assert.equal(state.clipboard,'sentinel');assert.deepEqual(state.events,['copy']);assert.match(await status.innerText(),/Copy did not succeed.*Try/);assert.equal(await preview.innerText(),answer);assert.equal(await field.inputValue(),raw);assert.equal(await submit.isEnabled(),true);
   pass('legacy copy '+(failure===false?'returns false':'throws permission error'),'no Form opened; draft/preview retained and retry enabled');
  }
  await page.evaluate(()=>window.__m1e.legacy=true);await submit.click();assert.equal(await page.evaluate(()=>window.__m1e.clipboard),answer);pass('copy retry after simulated permission recovery','fresh copy succeeds without rebuilding or losing draft');
  const edited=await build('M1E TEST ONLY — Edited answer.');await submit.click();assert.equal(await page.evaluate(()=>window.__m1e.clipboard),edited);assert.notEqual(edited,answer);pass('edited response','current preview copied, earlier answer not reused');
  await field.fill('M1E unreviewed change');assert.equal(await submit.isEnabled(),false);pass('edit invalidates final action','student must regenerate preview');
  const empty=await build('');assert.match(empty,/Not answered/);await submit.click();assert.equal(await page.evaluate(()=>window.__m1e.clipboard),empty);pass('blank response capture','marked missing answer can be copied without academic rejection');
  // Restore reviewed test answer for mocked student paste-and-submit transaction.
  await build(raw);await submit.click();state=await page.evaluate(()=>window.__m1e);assert.equal(state.clipboard,answer);
  assert.equal(requests.length,0,'offline lesson must make zero HTTP requests');assert.equal(errors.length,0);pass('isolated offline execution','zero HTTP requests and script errors through create/copy/edit/failure/retry');
  await page.screenshot({path:path.join(art,'isolated-review.png'),fullPage:true});
  const form=await context.newPage();await form.goto('https://m1e.invalid/form');await form.locator('#answer').fill(state.clipboard);
  async function send(next,pattern){mode=next;await form.locator('#submit').click();await form.waitForFunction(()=>!document.getElementById('submit').disabled);assert.match(await form.locator('#status').innerText(),pattern);assert.equal(await form.locator('#answer').inputValue(),answer);}
  await send('success',/Mock accepted: MOCK-M1E-1/);assert.equal(records.length,1);assert.equal(lastPayload.response,answer);pass('mock payload and acknowledgment',{destination,endpoint,key,response:answer,receipt:'MOCK-M1E-1',scope:'TEST HARNESS mock envelope, not actual Google Form POST schema'});
  await send('success',/Mock duplicate acknowledged: MOCK-M1E-1/);assert.equal(records.length,1);pass('mock duplicate handling','mock endpoint recognizes exact same test payload and returns the original receipt; does not verify production deduplication');
  await send('network',/Mock network failure.*retry available/);assert.equal(records.length,1);pass('mock network failure','no extra mock record; form draft retained; retry enabled');
  await send('timeout',/Mock timeout.*retry available/);assert.equal(records.length,1);pass('mock timeout','controlled AbortController timeout; draft retained; retry enabled');
  await send('success',/Mock duplicate acknowledged/);assert.equal(records.length,1);pass('mock retry after timeout','same payload acknowledged without an extra mock record');
  const f=await context.newPage();await f.goto('https://m1e.invalid/form');await f.locator('#answer').fill(answer);await f.close();assert.equal(records.length,1);pass('interrupted mock form before submit','closing without Submit creates no receipt; original guide still retains draft');
  assert.equal(blocked.length,0);assert.ok(requests.every(r=>new URL(r.url).hostname==='m1e.invalid'));assert.ok(state.opened.every(u=>u===destination));pass('production write isolation','offline browser context; service workers blocked; window.open intercepted; catch-all route serves only .invalid mocks and aborts every other HTTP destination; zero production HTTP requests');
  observations.push('Guide has no direct Collector POST, acknowledgment polling, network timeout, or duplicate-suppression implementation. It copies and opens the keyed school Form; paste/submit and receipt belong to Forms/Collector. Mock form/endpoint behavior is test-only and does not certify those production services.');
  observations.push('Total copy denial provides retry with retained draft/preview and no navigation. No alternate manual-copy instruction or extra fallback button is implemented. Modern Clipboard permission denial alone does not affect its legacy synchronous copy path.');
  observations.push('Full key is preserved in the destination/payload identity, deliberately excluded from copied answer under WF-04.');
  for(const p of protectedPaths)assert.equal(sha(fs.readFileSync(path.join(root,p))),before[p]);assert.equal(sha(fs.readFileSync(file)),sha(html));pass('protected file preservation',before);
 }finally{await context.close();await browser.close();}
 const result={status:'PASS — controlled simulations only',checks,observations,actualSchoolBrowserPermissions:'UNTESTED',actualCollectorReceipt:'UNTESTED',productionFormPostSchema:'UNTESTED',productionAcknowledgmentTimeoutDeduplication:'UNTESTED — mocked service behavior only',isolatedSha256:sha(html),productionWrites:0};
 fs.writeFileSync(path.join(art,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{fs.writeFileSync(path.join(art,'failure.txt'),e.stack);console.error(e);process.exitCode=1;});
