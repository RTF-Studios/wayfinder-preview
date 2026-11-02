/* Shared library visibility reader. JISD Control Station: Public Feed tab only.
   Source sheet: 1B6Qk618U56ee-vCi2kCCCFNhySxuCJku17xgG_xm8R8
   To activate: JISD must permit public read of non-student visibility-only data.
   No write access, credentials, student answers, or grades are transmitted. */
(function(){
  "use strict";
  var FEED_ID="1B6Qk618U56ee-vCi2kCCCFNhySxuCJku17xgG_xm8R8";
  var course=document.body.getAttribute("data-wf-course");
  var target=document.querySelector("[data-wf-list]");
  if(!course||!target)return;
  var loaded=false;
  function cell(c,i){return c&&c[i]&&c[i].v!=null?c[i].v:"";}
  function string(v){return String(v==null?"":v).trim();}
  function safeHref(v){return /^\.\/(?:Tech\/|CS\/|AAVTC\/)?[0-9]{5,7}\.html$/.test(v)?v:null;}
  function render(rows){
    var visible=rows.filter(function(item){
      return item.course===course&&item.show&&item.id&&item.href;
    });
    visible.sort(function(a,b){return b.id.localeCompare(a.id,undefined,{numeric:true});});
    var fragment=document.createDocumentFragment();
    var groups={}; var order=[];
    visible.forEach(function(item){
      var group=item.group||"Current Work";
      if(!groups[group]){groups[group]=[];order.push(group);}
      groups[group].push(item);
    });
    order.forEach(function(group){
      var section=document.createElement("section");
      var heading=document.createElement("h2");heading.textContent=group;
      section.appendChild(heading);
      groups[group].forEach(function(item){
        var card=document.createElement("article");
        var label=document.createElement("h3");label.textContent=item.title;
        var link=document.createElement("a");link.className="open";link.href=/\/(?:Tech|CS|AAVTC)\/[^/]+\.html$/.test(location.pathname)?"../"+item.href.slice(2):item.href;link.textContent="Open Learning Guide";
        card.append(label,link);section.append(card);
      });
      fragment.appendChild(section);
    });
    if(!visible.length){
      var empty=document.createElement("p");empty.textContent="No learning guides are currently shown. Check back when your teacher assigns one.";
      fragment.appendChild(empty);
    }
    target.replaceChildren(fragment);loaded=true;
  }
  window.__wayfinderSheetReady=function(response){
    if(!response||response.status==="error"||!response.table||!response.table.rows)return;
    var rows=response.table.rows.map(function(r){
      var c=r.c||[];var href=safeHref(string(cell(c,4)));
      return {course:string(cell(c,0)),show:/^(true|1|yes)$/i.test(string(cell(c,1))),
        id:string(cell(c,2)),title:string(cell(c,3)),href:href,group:string(cell(c,5))};
    });
    render(rows);
  };
  // Google Visualization response handler avoids browser CORS CSV issues.
  var script=document.createElement("script");
  script.async=true;script.src="https://docs.google.com/spreadsheets/d/"+FEED_ID+
    "/gviz/tq?sheet="+encodeURIComponent("Public Feed")+
    "&tqx="+encodeURIComponent("responseHandler:__wayfinderSheetReady")+
    "&cache="+Date.now();
  script.onerror=function(){document.documentElement.setAttribute("data-wf-feed","unavailable");};
  document.head.appendChild(script);
  setTimeout(function(){document.documentElement.setAttribute("data-wf-feed",loaded?"connected":"unavailable");},7000);
})();
