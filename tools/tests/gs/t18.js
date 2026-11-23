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
tabs.SeasonFiles=tabs.SeasonFiles||[]; let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); }; const run=c=>vm.runInContext(c,ctx);
ctx.__league={drivers:[{id:'1',name:'Matt'},{id:'2',name:'Sam'}],seasons:[{id:'SE1',name:'Season 1',status:'Active',
 order:{'10':['2','1']},totalsWith:{'1':{total:40,places:[1,0]},'2':{total:55.5,places:[2,1]}},
 rounds:[{n:1,done:true,cancelled:false,track:'Monza'}],results:[{round:1,race:1,pos:1,status:'Finished',cls:'10',driver:'2'}]}]};
run(`rcBuildLeague_=function(){return __league;}; rcR3eIndex_=function(){return {classes:{'10':'GT3'},liveries:{},ok:true,cars:{}};}; rcLog_=function(){}; rcNowText_=function(){return '2026-11-23 10:00'};
 rcNewsEnsure_=function(){}; rcStewardUpdate_=function(tab,kc,kv,f){var r=__tabs[tab].filter(function(x){return String(x[kc])===String(kv)})[0];if(!r)return false;Object.assign(r,f);return true;}; rcDateText_=function(v){return String(v||'')};`);
tabs.Seasons.push({'Season ID':'SE1','Name':'Season 1','Status':'Active','Champions':'','Ended':''});
tabs.Rounds.push({'Round ID':'1000001','Season ID':'SE1','Type':'Race','Round':1,'Status':'Provisional','Date':'2026-11-20','Track':'Monza','Layout':'GP','Layout ID':'1','Protest closes':'2026-11-21 10:00'},
                 {'Round ID':'1000002','Season ID':'SE1','Type':'Race','Round':2,'Status':'Scheduled','Date':'2026-12-20','Track':'Spa','Layout':'GP','Layout ID':'2'});
tabs.Drivers.push({'User ID':'1','Name':'Matt'},{'User ID':'2','Name':'Sam'});
tabs.Results.push({'Round ID':'1000001','User ID':'2','Car ID':'5','Livery ID':'9'});

// 1. a failed rewrite keeps the old story visible
ok(run(`rcStoryWrite_('SE1','finale','',false)`).ok,'finale written');
const st=tabs.Stories.filter(r=>r.Kind==='finale')[0]; const oldBody=st.Body;
const n0=run(`rcStoryNews_()`).length;
const realFetch=ctx.UrlFetchApp.fetch;
ctx.UrlFetchApp={fetch:(url)=>/generativelanguage/.test(url)?{getResponseCode:()=>503,getContentText:()=>'x'}:realFetch(url)};
const r1=run(`rcStoryWrite_('SE1','finale','',true)`);
ok(!r1.ok&&st.Status==='published'&&st.Body===oldBody&&st.Error,'failed rewrite: old text stays published, error recorded');
ok(run(`rcStoryNews_()`).length===n0,'public news unchanged after a failed rewrite');
ok(run(`rcListNews_()`).items.some(i=>i.key==='story:'+st['Story ID']),'News Editor still lists it');
st.Status='writing'; ok(run(`rcStoryNews_()`).length===n0,'story stays public while a rewrite is under way');
st.Status='published'; ctx.UrlFetchApp={fetch:realFetch};
// 4. a rewrite that finds one already running does not archive history or clear edit marks
st.Edited='2026-11-22'; st['Edited by']='Matt'; st['Edit reason']='Fixed a name'; st.Status='writing'; st.Created=new Date().toISOString(); st.History='';
const w=run(`rcWriteStoryRequest_({kind:'finale',seasonId:'SE1',rewrite:true},'matt')`);
ok(st.History===''&&st['Edited by']==='Matt','rewrite already running: history and edit marks untouched ('+JSON.stringify(w.story)+')');
st.Status='published'; st.Created='';
// a real rewrite archives, clears marks, and brings a withdrawn story back
st.Hidden='withdrawn';
const w2=run(`rcWriteStoryRequest_({kind:'finale',seasonId:'SE1',rewrite:true},'matt')`);
ok(w2.ok&&st.History&&st['Edited by']===''&&st.Hidden==='','real rewrite archives the old text, clears edit marks and the withdrawn flag');
// 2. end season: window open blocks (5), then ends, unraced round cancelled (6), recap replaced and shown again (2)
tabs.Rounds[0]['Protest closes']='2099-01-01 10:00';
ok(run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'m')`).error==='window-open','a protest window still open blocks ending');
tabs.Rounds[0]['Protest closes']='2026-11-21 10:00';
st.Hidden='withdrawn'; const bodyBefore=st.Body; ctx.__league.seasons[0].status='Finished';
const e=run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'m')`);
ok(e.ok&&tabs.Seasons[0].Status==='Finished','season ended');
ok(tabs.Rounds[1].Status==='Cancelled'&&tabs.Rounds[0].Status==='Provisional','unraced round cancelled, raced round kept');
ok(st.Hidden==='','a recap left over from an earlier ending is replaced and shown again');
ok(/^\d\d\.\d\d\.\d{4}$/.test(run(`rcGetSeasonEnd_({seasonId:'SE1'})`).season.ended),'Ended shown as dd.mm.yyyy: '+run(`rcGetSeasonEnd_({seasonId:'SE1'})`).season.ended);
// 6. no confirming into a finished season
ok(run(`rcConfirmRound_({roundId:'1000001'},'m')`).error==='season-ended','confirm refused for a finished season');
// 7. deleting a season removes its stories
tabs.Rounds[0].Status='Scheduled'; tabs.Rounds[0]['Results received']=''; tabs.Rounds[1].Status='Cancelled';
const d=run(`rcDeleteSeason_('SE1','m')`); ok(d.ok&&!tabs.Stories.some(r=>r['Season ID']==='SE1'),'delete season removes its stories: '+JSON.stringify(d));
// 8. text normalised on save
const c=run(`rcNewsClean_('Intro\\n## Head\\nBody line\\n> quote a\\n> quote b\\nTail', 5000)`);
ok(c==='Intro\n\n## Head\n\nBody line\n\n> quote a\n> quote b\n\nTail','markup lines get their own block: '+JSON.stringify(c));
ok(run(`rcNewsClean_('a\\n\\n\\n\\nb',50)`)==='a\n\nb','blank lines collapse');
// 3. scoring: fastest lap only among drivers who score
const rows=[{'User ID':'1','Finish status':'Finished','Laps':10,'Total time (ms)':1000000,'Best lap (ms)':100500,'Incident points':0,'Position':1,'Car ID':'1'},
 {'User ID':'2','Finish status':'DidNotFinish','Laps':2,'Total time (ms)':0,'Best lap (ms)':99000,'Incident points':0,'Position':2,'Car ID':'1'},
 {'User ID':'3','Finish status':'DidNotFinish','Laps':6,'Total time (ms)':0,'Best lap (ms)':99900,'Incident points':0,'Position':3,'Car ID':'1'}];
ctx.__rows=rows; const sc=run(`rcScoreSession_(__rows,[],[],{classKey:function(){return 'A'},tables:{A:[25,18,15]},fastestLap:2,clean:5,scoring:true})`);
const by=Object.fromEntries(sc.map(x=>[x.userId,x]));
ok(by['2'].bonus===0&&!by['2'].fastest&&by['3'].fastest&&by['3'].bonus===2,'fastest lap goes to the best driver who scores (a retired driver under half the laps cannot take it)');
console.log(fails?('FAILED '+fails):'ALL PASS');
