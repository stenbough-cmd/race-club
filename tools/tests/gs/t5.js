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
const T=ctx.__tabs; T.Stories=[]; T.Penalties=[];
const idx=JSON.parse(idxText); const carCls=idx.cars['2339'][2];
const file=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/8cdb6ec0-202611220407.json','utf8'));
const season={version:1,seasonId:'S-AAAAAA',name:'Season 01',prefix:'RC',liveries:[2399],rules:{},preset:2,assists:{},
  weekend:{Practice:{len:15,unit:'M',start:1},Qualify:{len:15,unit:'M',start:1},Race1:{len:3,unit:'L',start:1,clouds:[0,0,0,0,0]},Race2:{len:3,unit:'L',start:1},Race3:{len:2,unit:'L',start:1}},
  points:{tables:{[carCls]:'30, 25, 23, 22'},pole:3,fastestLap:2,clean:5,dropWeeks:0},format:{multi:true,races:3,race2:true,race3:true,pole:true,fastest:true,clean:true},rounds:[]};
ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
T.Seasons.push({'Season ID':'S-AAAAAA','Name':'Season 01','Status':'Active','First round':'2026-11-01'});
const layoutId = Object.keys(JSON.parse(tracksText).tracks).map(k=>JSON.parse(tracksText).tracks[k].layouts[0].id)[0];
T.Rounds.push({'Round ID':'1111111','Season ID':'S-AAAAAA','Round':'1','Type':'Race','Date':'2026-11-01','Server online':'20:00','Time zone':'America/Detroit','Layout ID':String(layoutId),'Track':'Autodromo di Monza','Layout':'Grand Prix','Status':'Provisional','Protest closes':'2000-01-02 08:00',
  'Photos':JSON.stringify([{src:'https://x/photos/a.jpg',caption:'Podium'},{src:'https://x/photos/b.jpg',caption:'Start'},null]),'Rivalries':JSON.stringify([['8261679','222']]),'Note':'Second Driver is new to the league.','Track photo':''});
T.Rounds.push({'Round ID':'2222222','Season ID':'S-AAAAAA','Round':'2','Type':'Race','Date':'2026-11-08','Server online':'20:00','Time zone':'America/Detroit','Layout ID':String(layoutId),'Track':'Autodromo di Monza','Layout':'Junior','Status':'Scheduled'});
const data=JSON.parse(JSON.stringify(file));
data.Sessions.forEach(s=>{ const p=JSON.parse(JSON.stringify(s.Players[0])); p.UserId=222; p.FullName='Second Driver'; p.Username='second';
  if(/^Race/.test(s.Type)){ p.Position=2; p.PositionInClass=2; p.StartPosition=2; p.StartPositionInClass=2; p.BestLapTime=p.BestLapTime+500; p.TotalTime+=2500;
    p.RaceSessionLaps.forEach(l=>{l.Valid=true;l.Incidents=[];l.Position=2;l.PositionInClass=2;}); }
  if(s.Type==='Race2'){ s.Players[0].RaceSessionLaps[0].Incidents=[{Type:1,Points:2,OtherUserId:222}]; p.RaceSessionLaps[0].Incidents=[{Type:1,Points:2,OtherUserId:8261679}]; }
  if(s.Type==='Qualify'){ p.BestLapTime=117000; p.Position=1; p.PositionInClass=1; s.Players[0].Position=2; s.Players[0].PositionInClass=2; p.RaceSessionLaps=[{Time:117000,SectorTimes:[39000,78000,117000],PositionInClass:1,Valid:true,Position:1,PitStopOccured:false,Incidents:[]}]; }
  s.Players.push(p); });
const rd=ctx.rcReadFile_('1111111','S-AAAAAA',data,{2339:carCls},'PROVISIONAL');
rd.resultRows.forEach(r=>T.Results.push(r)); rd.lapRows.forEach(r=>T.Laps.push(r));
console.log('contact cells:',T.Laps.filter(l=>l['Contact with']).map(l=>l.Session+' '+l['User ID']+' '+l.Lap+' '+l['Contact with']).join(' | '));
T.Drivers.push({'User ID':8261679,'Name':'Matt Stenzel','Country':'US'},{'User ID':222,'Name':'Second Driver','Country':'DE','Hide details':'Yes'});

// ---- race story
let r=ctx.rcStoryWrite_('S-AAAAAA','race','1111111',false);
console.log('write ->',JSON.stringify(r));
const row=T.Stories[0]; console.log('row:',row.Status,row.Model,row.Title,'|',row.Standfirst,'| body chars',String(row.Body).length,'| error',row.Error);
console.log('photos:',row.Photos);
console.log('body head:\n'+String(row.Body).slice(0,420));
const sent=ctx.__lastGemini; const packet=JSON.parse(sent.contents[0].parts[0].text.replace(/^[^\n]*\n/,''));
console.log('\nPACKET keys:',Object.keys(packet).join(','));
console.log('event:',JSON.stringify(packet.event).slice(0,500));
console.log('contacts:',JSON.stringify(packet.contacts_between_drivers,null,1).slice(0,1400));
console.log('notes:',JSON.stringify(packet.organizer_notes),'| photos asked:',JSON.stringify(packet.photos));
console.log('qualifying:',JSON.stringify(packet.qualifying));
console.log('race1 class:',JSON.stringify(packet.races[0].classes[0]).slice(0,1100));
console.log('after:',JSON.stringify(packet.championship_after_this_night));
console.log('packet size',JSON.stringify(packet).length,'| prompt size',sent.systemInstruction.parts[0].text.length);
console.log('news:',JSON.stringify(ctx.rcStoryNews_()).slice(0,500));
// rerun without force: already
console.log('again ->',JSON.stringify(ctx.rcStoryWrite_('S-AAAAAA','race','1111111',false)));
// rewrite
console.log('rewrite ->',JSON.stringify(ctx.rcStoryWrite_('S-AAAAAA','race','1111111',true)),'attempts',T.Stories[0].Attempts,'rows',T.Stories.length);
// failure
geminiMode='503'; T.Stories.length=0;
console.log('503 ->',JSON.stringify(ctx.rcStoryWrite_('S-AAAAAA','race','1111111',false)),'row',T.Stories[0].Status,'|',T.Stories[0].Error);
geminiMode='ok';
console.log('retry ->',JSON.stringify(ctx.rcStoryWrite_('S-AAAAAA','race','1111111',false)),'row',T.Stories[0].Status,'attempts',T.Stories[0].Attempts);
// preview + calendar change
T.Rounds[1].Status='Cancelled';
console.log('preview ->',JSON.stringify(ctx.rcStoryWrite_('S-AAAAAA','preview','',false)));
const pv=T.Stories.filter(s=>s.Kind==='preview')[0]; console.log('preview row',pv.Status,pv.Published,pv.Photos);
const pp=JSON.parse(ctx.__lastGemini.contents[0].parts[0].text.replace(/^[^\n]*\n/,'')); console.log('preview packet:',JSON.stringify(pp).slice(0,900));
console.log('news order:',ctx.rcStoryNews_().map(n=>n.eyebrow+' '+n.date).join(' | '));
// calendar change shows in next race story
T.Rounds.push({'Round ID':'3333333','Season ID':'S-AAAAAA','Round':'3','Type':'Race','Date':'2026-11-15','Layout ID':String(layoutId),'Track':'Imola','Layout':'GP','Status':'Scheduled'});
const ctxS=ctx.rcStoryContext_('S-AAAAAA'); console.log('calendar changes:',JSON.stringify(ctx.rcStoryCalendarChanges_(ctxS)));
console.log('--- photo rules');
let pf=0; const eq=(a,b,m)=>{ if(a!==b){pf++;console.log('FAIL',m,'got',a,'want',b);} else console.log('ok  ',m); };
function setup(n,choice){ const u=[{src:'https://x/1.jpg',caption:'First'},{src:'https://x/2.jpg',caption:'Second'},{src:'https://x/3.jpg',caption:'Third'}].slice(0,n);
  T.Rounds[0].Photos=n?JSON.stringify(u):''; T.Rounds[0]['Photo choice']=choice===undefined?'':JSON.stringify(choice); T.Rounds[0]['Track photo']='';
  const c=ctx.rcStoryContext_('S-AAAAAA'); return ctx.rcStoryPhotoSetup_(c,'race','1111111',null); }
const names=s=>s.list.map(p=>(p.uploaded?'U:':'T:')+p.caption).join(', ');
eq(names(setup(0)),'T:Autodromo di Monza, Grand Prix','nothing filled out -> track picture as hero');
eq(names(setup(1)),'U:First','1 uploaded, track untouched -> only the upload');
eq(names(setup(1,{track:true})),'T:Autodromo di Monza, Grand Prix, U:First','track ticked -> track hero then upload');
eq(names(setup(1,{track:true,hero:'1'})),'U:First, T:Autodromo di Monza, Grand Prix','hero 1 ticked -> upload first');
eq(names(setup(2,{hero:'2'})),'U:Second, U:First','hero 2 of two uploads');
eq(names(setup(3,{track:true})),'U:First, U:Second, U:Third','3 uploaded: no room for the track picture');
eq(names(setup(3,{hero:'3'})),'U:Third, U:First, U:Second','3 uploaded, hero 3');
eq(names(setup(2,{track:false})),'U:First, U:Second','track unticked');
eq(names(setup(0,{track:false})),'','nothing at all when track is unticked and nothing uploaded');
eq(names(setup(1,{track:true,hero:'3'})),'T:Autodromo di Monza, Grand Prix, U:First','hero pointing at a missing photo falls back to the track picture');
eq(names(setup(1,{track:false,hero:'track'})),'U:First','hero track but track off -> first upload');
const s0=setup(2,{track:true}); eq(s0.askAbout.length,2,'writer places 2 pictures (not the hero)'); eq(s0.trackPhoto!=='',true,'track file remembered');
eq(setup(2,{track:false}).trackPhoto,'','track file not remembered when unused');
eq('askHero' in s0,false,'writer no longer picks the hero');
eq(ctx.rcStoryPrompt_('race',true).includes('"hero"'),false,'prompt no longer asks for a hero');
console.log('place:',JSON.stringify(ctx.rcStoryPlacePhotos_(setup(3,{hero:'3'}),{placements:[{photo:1,paragraph:5},{photo:2,paragraph:9}]},10)));
const sv=ctx.rcSavePhotoChoice_({roundId:'1111111',hero:'2',track:true},'Matt'); eq(sv.ok&&T.Rounds[0]['Photo choice'],'{"hero":"2","track":true}','savePhotoChoice stores it');
eq(ctx.rcSavePhotoChoice_({roundId:'1111111',hero:'9'},'Matt').photoChoice.hero,'','bad hero ignored');
eq(T.Rounds[0]['Photo choice'],'','empty choice clears the cell');
eq(ctx.rcSavePhotoChoice_({roundId:'9999999'},'Matt').error,'no-round','unknown round');
console.log(pf?'PHOTO FAILURES '+pf:'PHOTO RULES PASSED');
const pv2=T.Stories.filter(s=>s.Kind==='preview')[0]; console.log('preview row',pv2&&pv2.Status,pv2&&pv2.Published,pv2&&pv2.Photos);
console.log('news order:',ctx.rcStoryNews_().map(n=>n.eyebrow+' '+n.date).join(' | '));
console.log('body cap test:',ctx.rcStoryBody_(Array(40).fill('word '.repeat(60)).join('\n\n')).text.length);
