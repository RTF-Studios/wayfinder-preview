// Real TurboWarp VM and renderer; projects compile from the displayed block recipes.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('./qa-run/node_modules/playwright');
const root=path.resolve(__dirname,'..'),data=require('./tech-prototype-code-fixtures.json');
const output=path.join(root,'qa-artifacts/tech-prototype-code');fs.mkdirSync(output,{recursive:true});
const results=[];
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const fixture of data.fixtures){
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.setContent('<div id="project" style="width:480px;height:360px"></div>');
  await page.addScriptTag({path:require.resolve('./qa-run/node_modules/@turbowarp/packager/dist/scaffolding/scaffolding-min.js')});
  await page.evaluate(async ({fixture,assets})=>{
   window.runner=new Scaffolding.Scaffolding();runner.usePackagedRuntime=false;runner.setup();runner.appendTo(document.getElementById('project'));
   const storage=runner.storage;storage.addWebStore([storage.AssetType.ImageVector],asset=>assets[asset.assetId]);
   await runner.loadProject(JSON.stringify(fixture.project));window.vm=runner.vm;
   window.player=vm.runtime.targets.find(t=>t.getName()==='Player');window.falling=vm.runtime.targets.find(t=>t.getName()==='FallingObject');
   window.state=()=>({x:player.x,y:player.y,fallX:falling.x,fallY:falling.y,lives:vm.runtime.getTargetForStage().variables.lives.value,score:vm.runtime.getTargetForStage().variables.score.value,hit:falling.variables.hitThisFall.value,threads:vm.runtime.threads.length});
   Math.random=()=>0.95;vm.greenFlag();
  },{fixture,assets:data.assets});
  const observed=[];await page.waitForTimeout(150);let s=await page.evaluate(()=>state());assert.equal(s.x,0);assert.equal(s.y,-125);observed.push({test:'green flag reset',state:s});
  await page.evaluate(()=>vm.postIOData('keyboard',{key:'ArrowRight',isDown:true}));await page.waitForTimeout(1100);
  s=await page.evaluate(()=>state());assert.equal(s.x,215);observed.push({test:'right control and edge',state:s});
  await page.evaluate(()=>{vm.postIOData('keyboard',{key:'ArrowRight',isDown:false});vm.postIOData('keyboard',{key:'ArrowLeft',isDown:true})});await page.waitForTimeout(2100);
  s=await page.evaluate(()=>state());assert.equal(s.x,-215);observed.push({test:'left control and edge',state:s});
  await page.evaluate(()=>{vm.postIOData('keyboard',{key:'ArrowLeft',isDown:false});vm.greenFlag()});await page.waitForTimeout(120);s=await page.evaluate(()=>state());assert.equal(s.x,0);assert.equal(s.y,-125);
  if(fixture.day>=3){
   await page.evaluate(()=>player.setXY(-215,-125));
   const before=await page.evaluate(()=>state());await page.waitForTimeout(300);const down=await page.evaluate(()=>state());assert(down.fallY<before.fallY);observed.push({test:'fall moves down',before,state:down});
   await page.waitForFunction(()=>falling.y>130,null,{timeout:5000});observed.push({test:'fall resets near top',state:await page.evaluate(()=>state())});
  }
  if(fixture.day>=4){
   await page.evaluate(()=>vm.greenFlag());await page.waitForTimeout(150);s=await page.evaluate(()=>state());assert.equal(s.lives,3);assert.equal(s.hit,0);assert.equal(s.score,0);
   await page.evaluate(()=>falling.setXY(player.x,player.y+5));await page.waitForTimeout(100);s=await page.evaluate(()=>state());assert.equal(s.lives,2);assert.equal(s.hit,1);observed.push({test:'deliberate contact costs one life',state:s});
   await page.evaluate(()=>falling.setXY(player.x,player.y+5));await page.waitForTimeout(100);s=await page.evaluate(()=>state());assert.equal(s.lives,2);observed.push({test:'same-fall overlap cannot deduct again',state:s});
   await page.evaluate(()=>falling.setXY(200,-180));await page.waitForTimeout(180);s=await page.evaluate(()=>state());assert.equal(s.score,0);observed.push({test:'hit fall receives no dodge point',state:s});
   await page.evaluate(()=>player.setXY(-215,-125));await page.waitForFunction(()=>falling.y< -100,null,{timeout:5000});await page.waitForTimeout(650);s=await page.evaluate(()=>state());assert.equal(s.lives,2);if(fixture.day===5)assert(s.score>=1);observed.push({test:'safe dodge preserves lives and rewards when taught',state:s});
   await page.evaluate(()=>{vm.greenFlag()});await page.waitForTimeout(120);
   for(let i=0;i<3;i++){
    await page.evaluate(()=>falling.setXY(player.x,player.y+5));await page.waitForTimeout(100);s=await page.evaluate(()=>state());assert.equal(s.lives,2-i);
    if(i<2){await page.evaluate(()=>falling.setXY(200,-180));await page.waitForTimeout(180);}
   }
   await page.waitForTimeout(2300);s=await page.evaluate(()=>state());assert.equal(s.lives,0);assert.equal(s.threads,0);observed.push({test:'game over stops all gameplay',state:s});
   await page.evaluate(()=>vm.greenFlag());await page.waitForTimeout(150);s=await page.evaluate(()=>state());assert.equal(s.lives,3);assert.equal(s.score,0);assert.equal(s.x,0);observed.push({test:'restart restores full initial state',state:s});
  }
  await page.screenshot({path:path.join(output,'305020'+fixture.day+'-running.png')});
  // Bind executed fixture back to the exact current visible HTML text.
  await page.goto(require('url').pathToFileURL(path.join(root,fixture.path)).href);
  assert.deepEqual(await page.locator('pre[aria-label="Block recipe"]').allTextContents(),fixture.recipes);
  results.push({day:fixture.day,status:'PASS',observed});await page.close();
 }}finally{await browser.close()}
}
run().then(()=>{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'PASS',runtime:'@turbowarp/packager 3.14.0 actual VM + renderer',results},null,2));console.log('TurboWarp displayed-recipe runtime PASS',results.length)}).catch(e=>{fs.writeFileSync(path.join(output,'error.txt'),String(e.stack||e));fs.writeFileSync(path.join(output,'partial-results.json'),JSON.stringify(results,null,2));console.error(e);process.exitCode=1});
