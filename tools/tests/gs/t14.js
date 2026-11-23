const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js');
const dir='/mnt/user-data/uploads/Race Club/';
vm.runInContext(fs.readFileSync('/mnt/user-data/uploads/Race Club/_raceroom-apps-script/Stories.gs','utf8'),ctx,{filename:'Stories.gs'});
const idxText=fs.readFileSync(dir+'assets/r3e/index.json','utf8'), tracksText=fs.readFileSync(dir+'assets/r3e/tracks.json','utf8');
const calls=[]; let geminiMode='ok';
const body = (n)=>{ // build a body of about n chars with headings
  const para='Matt Stenzel took the opening race of the night by a comfortable margin while Second Driver chased hard through the middle laps and kept the gap under two seconds until the final tour of the circuit. ';
  let out=[]; let len=0; let i=0;
  while(len<n){ if(i%3===0) out.push('## Part '+(i/3+1)+' of the night'); out.push(para.repeat(1)+para.slice(0,60)); len+=para.length+60; i++; }
  return out.join('\n\n');
};
ctx.UrlFetchApp={fetch:(url,opt)=>{ calls.push(url);
  const ok=(t)=>({getResponseCode:()=>200,getContentText:()=>t});
  if(/index\.json/.test(url)) return ok(idxText);
  if(/tracks\.json/.test(url)) return ok(tracksText);
  if(/generativelanguage/.test(url)){
    ctx.__lastGemini=JSON.parse(opt.payload);
    if(geminiMode==='503') return {getResponseCode:()=>503,getContentText:()=>'overloaded'};
    const story={title:'Matt and Second Driver trade blows in a three-race night — what a night',standfirst:'A long night of three races.',body:body(2000),sidecar:'{"nights":[{"n":1}]}',placements:[{photo:2,paragraph:4},{photo:3,paragraph:2}]};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(story)}]},finishReason:'STOP'}]})};
  }
  return {getResponseCode:()=>404,getContentText:()=>''}; }};
ctx.PropertiesService={getScriptProperties:()=>({getProperty:(k)=>k==='GEMINI_API_KEY'?'KEY':(k==='GEMINI_FALLBACK_MODELS'?'gemini-b':null),setProperty(){}})};
const hook=`
rcStoryEnsureTabs_=function(){ if(!__tabs.Stories) __tabs.Stories=[]; };
rcEnsureColumns_=function(){};
rcStoryUpdate_=function(id,f){var r=__tabs.Stories.filter(function(x){return x['Story ID']===id})[0];if(!r)return false;Object.assign(r,f);return true;};
var __r=0; rcRandom_=function(){ __r++; return (String(__r)+'abcdef0123456789').slice(0,16)+'0000000000000000'; };
`;
vm.runInContext(hook,ctx);
tabs.SeasonFiles=tabs.SeasonFiles||[]; let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok',m); };
const run=c=>vm.runInContext(c,ctx);
ctx.__league={drivers:[{id:'1',name:'Matt'},{id:'2',name:'Sam'}],seasons:[{id:'SE1',name:'Season 1',status:'Finished',
 order:{'10':['2','1']},totalsWith:{'1':{total:40,places:[1,0]},'2':{total:55.5,places:[2,1]}},
 rounds:[{n:1,done:true,cancelled:false,track:'Monza'}],results:[{round:1,race:1,pos:1,status:'Finished',cls:'10',driver:'2'}]}]};
run(`rcBuildLeague_=function(){return __league;}; rcR3eIndex_=function(){return {classes:{'10':'GT3'},liveries:{},ok:true,cars:{}};};`);
tabs.Seasons.push({'Season ID':'SE1','Name':'Season 1','Status':'Finished','Champions':JSON.stringify({'10':{uid:'2',name:'Sam',points:55.5}}),'Ended':'2026-11-23'});
tabs.Rounds.push({'Round ID':'1000001','Season ID':'SE1','Type':'Race','Round':1,'Status':'Provisional','Date':'2026-11-20','Track':'Monza','Layout':'GP','Layout ID':'1'});
tabs.Drivers.push({'User ID':'1','Name':'Matt'},{'User ID':'2','Name':'Sam'});
tabs.Results.push({'Round ID':'1000001','User ID':'2','Car ID':'5','Livery ID':'9'});

ctx.__c=run(`rcStoryContext_('SE1')`);
// publish a finale, then a failing rewrite
run(`rcStoryWrite_('SE1','finale','',false)`);
const sid=tabs.Stories.filter(r=>r.Kind==='finale')[0]['Story ID'];
const geminiFail = ()=>{ ctx.UrlFetchApp={fetch:(url)=>{ if(/generativelanguage/.test(url)) return {getResponseCode:()=>503,getContentText:()=>'x'}; return {getResponseCode:()=>404,getContentText:()=>''}; }}; };
const before=run(`rcStoryNews_()`).length;
geminiFail();
const r=run(`rcStoryWrite_('SE1','finale','',true)`);
console.log('rewrite fail ->', r.ok, 'story status', tabs.Stories[0].Status, 'public items after failed rewrite:', run(`rcStoryNews_()`).length, 'before:', before);
// rewrite in progress
tabs.Stories[0].Status='writing';
console.log('public items while a rewrite is running:', run(`rcStoryNews_()`).length);
tabs.Stories[0].Status='published';
// reopen then end again keeps hidden stale recap?
tabs.Stories[0].Hidden='withdrawn';
run(`rcStoryWrite_('SE1','finale','',false)`);
console.log('second end: finale still hidden (stale)?', tabs.Stories[0].Hidden==='withdrawn');
// league after a clear
['Inbox','Results','Laps','Protests','Penalties','Stories','Posts','Rounds','Seasons','SeasonFiles'].forEach(t=>tabs[t].length=0);
delete ctx.__league;

try{ ctx.rcBuildLeagueReal=1; }catch(e){}
