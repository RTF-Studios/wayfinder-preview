(function(){
'use strict';
const base='https://api.github.com/repos/RTF-Studios/wayfinder-preview/contents/assets/';
const dirs={target:'learning-target',temperature:'teks-check',comics:'rtf-comics',characters:'rtf-characters'};
const fallback={
 target:[{src:'../assets/learning-target/pixel-learning-target.png',alt:'Pixel learning target illustration'},{src:'../assets/learning-target/percival-searching-for-learning-target.png',alt:'Percival searching for a learning target'}],
 temperature:[{src:'../assets/teks-check/rtf-temperature-check-01.png',alt:'RTF temperature check illustration'}],
 characters:[],
 comics:[]
};
const cache={};
function list(kind){
 if(!dirs[kind])return Promise.resolve([]);
 if(!cache[kind])cache[kind]=fetch(base+dirs[kind],{mode:'cors',cache:'no-cache'})
 .then(r=>{if(!r.ok)throw Error('Artwork listing unavailable');return r.json();})
 .then(a=>Array.isArray(a)?a.filter(f=>f.type==='file'&&/\.png$/i.test(f.name)).map(f=>({
 src:'../assets/'+dirs[kind]+'/'+encodeURIComponent(f.name),
 alt:f.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')
 })):[])
 .catch(()=>[]);
 return cache[kind];
}
function draw(slot,items){
 if(!slot)return;
 const arr=items.filter(x=>x&&x.src);
 if(!arr.length){slot.hidden=true;return;}
 let pos=0,start=Math.floor(Math.random()*arr.length);
 function next(){
 if(pos>=arr.length){slot.hidden=true;return;}
 const item=arr[(start+pos++)%arr.length],img=document.createElement('img');
 img.alt=item.alt||'Approved artwork';img.loading='eager';
 img.onload=()=>{slot.replaceChildren(img);slot.hidden=false;};img.onerror=next;img.src=item.src;
 }
 next();
}
async function rotate(slot,kind,provided){
 if(!slot)return;
 const fresh=await list(kind),manual=Array.isArray(provided)?provided:[];
 draw(slot,fresh.length?fresh:manual.length?manual:fallback[kind]||[]);
}
window.WF_ART={rotate,dirs};
})();