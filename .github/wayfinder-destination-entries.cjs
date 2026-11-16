'use strict';
// Only an explicitly empty q2 with no second response shell is inactive.
// Malformed URLs, blank active destinations and all other empty slots stay in QA.
function active(entries,present){return entries.filter(x=>!(x.slot==='q2'&&x.url===''&&!present.includes('q2')))}
function selfTest(){const assert=require('assert/strict'),row=(slot,url)=>({slot,url});assert.deepEqual(active([row('q2','')],[]),[]);assert.equal(active([row('q2','')],['q2']).length,1);assert.equal(active([row('q2','bad')],[]).length,1);assert.equal(active([row('q1','')],[]).length,1);assert.equal(active([row('temp','')],[]).length,1);assert.equal(active([row('q2','https://example.org')],[]).length,1);return 6}
module.exports={active,selfTest};if(require.main===module)console.log('Destination compatibility self-tests PASS',selfTest());
