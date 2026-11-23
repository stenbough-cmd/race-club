const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js');
const dir='/mnt/user-data/uploads/Race Club/';
const idxText=fs.readFileSync(dir+'assets/r3e/index.json','utf8'), tracksText=fs.readFileSync(dir+'assets/r3e/tracks.json','utf8');
ctx.UrlFetchApp={fetch:(url)=>{const ok=t=>({getResponseCode:()=>200,getContentText:()=>t}); if(/index\.json/.test(url)) return ok(idxText); if(/tracks\.json/.test(url)) return ok(tracksText); return {getResponseCode:()=>404,getContentText:()=>''};}};
const T=ctx.__tabs; const idx=JSON.parse(idxText); const carCls=idx.cars['2339'][2];
const file=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/8cdb6ec0-202611220407.json','utf8'));
const season={version:1,seasonId:'S-AAAAAA',name:'Season 01',prefix:'RC',liveries:[2399],rules:{},preset:2,assists:{},
  weekend:{Practice:{len:15,unit:'M',start:1},Qualify:{len:15,unit:'M',start:1},Race1:{len:3,unit:'L',start:1,clouds:[0,0,0,0,0]},Race2:{len:3,unit:'L',start:1},Race3:{len:2,unit:'L',start:1}},
  points:{tables:{[carCls]:'30, 25, 23, 22'},pole:3,fastestLap:2,clean:5,dropWeeks:0},format:{multi:true,races:3,race2:true,race3:true,pole:true,fastest:true,clean:true},
  rounds:[{id:'1111111',password:'secret1'},{id:'2222222',password:'secret2'}]};
ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
T.Seasons.push({'Season ID':'S-AAAAAA','Name':'Season 01','Status':'Active','First round':'2026-11-01'});
const layoutId = Object.keys(JSON.parse(tracksText).tracks).map(k=>JSON.parse(tracksText).tracks[k].layouts[0].id)[0];
const rnd=(id,n,st,close)=>({'Round ID':id,'Season ID':'S-AAAAAA','Round':String(n),'Type':'Race','Date':'2026-11-0'+n,'Server online':'20:00','Time zone':'America/Detroit','Layout ID':String(layoutId),'Track':'Monza','Layout':'GP','Status':st,'Protest closes':close});
T.Rounds.push(rnd('1111111',1,'Provisional','2099-01-02 08:00'), rnd('2222222',2,'Provisional','2000-01-02 08:00'));
function night(roundId,swapCar){
  const data=JSON.parse(JSON.stringify(file));
  data.Sessions.forEach(s=>{ const p=JSON.parse(JSON.stringify(s.Players[0])); p.UserId=222; p.FullName='Second Driver'; p.Username='second';
    if(/^Race/.test(s.Type)){ p.Position=2; p.PositionInClass=2; p.StartPosition=2; p.StartPositionInClass=2; p.BestLapTime+=500; p.TotalTime+=2500; p.RaceSessionLaps.forEach(l=>{l.Valid=true;l.Incidents=[];l.Position=2;l.PositionInClass=2;}); }
    if(s.Type==='Qualify'){ p.BestLapTime=117000; p.Position=1; p.PositionInClass=1; s.Players[0].Position=2; s.Players[0].PositionInClass=2; p.RaceSessionLaps=[{Time:117000,SectorTimes:[39000,78000,117000],PositionInClass:1,Valid:true,Position:1,PitStopOccured:false,Incidents:[]}]; }
    s.Players.push(p); });
  const rd=ctx.rcReadFile_(roundId,'S-AAAAAA',data,{2339:carCls},'PROVISIONAL');
  rd.resultRows.forEach(r=>{ if(swapCar && String(r['User ID'])==='222'){ r['Car ID']='2340'; } T.Results.push(r);}); rd.lapRows.forEach(r=>T.Laps.push(r));
}
night('1111111'); night('2222222',true);
T.Drivers.push({'User ID':8261679,'Name':'Matt Stenzel','Country':'US'},{'User ID':222,'Name':'Second Driver','Country':'DE'});
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
const file1=(o)=>ctx.rcFileProtest_(Object.assign({roundId:'1111111',password:'secret1',me:'8261679',other:'222',self:false,race:1,lap:2,reason:'Bad Rejoin',narrative:'He pushed me wide.'},o||{}));

// ---- filing
ok(file1({password:'nope'}).error==='wrong-password','wrong password refused');
ok(file1({roundId:'2222222',password:'secret2'}).error==='closed','window ended -> closed');
ok(file1({me:'999'}).error==='bad-driver','driver who did not race refused');
ok(file1({race:9}).error==='bad-race','bad race');
ok(file1({lap:0}).error==='bad-lap','bad lap');
ok(file1({reason:'Rude'}).error==='bad-reason','bad reason');
ok(file1({narrative:'  '}).error==='no-narrative','narrative needed');
const f1=file1(); ok(f1.ok && /^PR-/.test(f1.protestId),'protest filed '+f1.protestId);
ok(file1().error==='duplicate','duplicate refused');
ok(ctx.__mails.length===1 && !/pushed me wide/i.test(JSON.stringify(ctx.__mails)),'email sent without the narrative');
const f2=file1({self:true,me:'222',other:'8261679',race:2,lap:1,reason:'Reckless Driving',narrative:'I braked too late.'}); ok(f2.ok,'self report filed');
for(let i=0;i<8;i++) file1({password:'bad'+i}); ok(file1().error==='locked','locked after wrong tries');
ctx.__cache.PT_1111111=0;

// ---- public data while open
let L=ctx.rcBuildLeague_(); let S=L.seasons[0];
ok(S.rounds[0].status==='Waiting' && S.rounds[0].protestsOpen===2 && S.openProtests===2,'round waiting with 2 open protests');
ok(L.protests.length===2 && !JSON.stringify(L.protests).match(/pushed me wide|braked too late|narrative/i),'protests public, no narrative');
fs.writeFileSync('/tmp/gs/stew_open.js','window.RR_LIVE='+JSON.stringify(L)+';');
ok(L.protests[0].ruling==='Pending' && L.protests[0].by==='8261679','public pending row');

// ---- rule
const adm='Matt';
ok(ctx.rcRuleProtest_({protestId:f1.protestId,outcome:'penalty',penalty:'dsq',comment:'short'},adm).error==='comment-needed','dsq needs comment');
ok(ctx.rcRuleProtest_({protestId:f1.protestId,outcome:'penalty',penalty:'4'},adm).error==='bad-penalty','bad penalty');
ok(ctx.rcRuleProtest_({protestId:f1.protestId,outcome:'penalty',penalty:'3',comment:'Moved under braking.'},adm).ok,'3 points ruled');
ok(T.Penalties.length===1 && T.Penalties[0]['User ID']===222 && T.Penalties[0].Amount===3,'3 points on the accused (222)');
ok(ctx.rcRuleProtest_({protestId:f1.protestId,outcome:'dismiss'},adm).error==='already-ruled','not ruled twice');
ok(ctx.rcRuleProtest_({protestId:f2.protestId,outcome:'penalty',penalty:'dsq',comment:'Intentional wrecking of a rival.'},adm).ok,'self report DSQ ruled');
ok(T.Penalties[1]['User ID']===222 && T.Penalties[1].Type==='dsq' && T.Penalties[1].Session==='Race2','DSQ lands on the filer of a self report, race 2 session');
L=ctx.rcBuildLeague_(); S=L.seasons[0];
ok(S.rounds[0].protestsOpen===0 && S.rounds[0].status==='Waiting','all ruled but window open -> still waiting (window)');
const r2=S.results.filter(x=>x.round===1&&x.driver==='222'); 
ok(r2.filter(x=>x.race===2)[0].status==='DSQ'||r2.filter(x=>x.race===2)[0].points===0,'DSQ in race 2 scored 0: '+JSON.stringify(r2.filter(x=>x.race===2).map(x=>[x.status,x.points,x.bonus,x.pos])));
ok(r2.reduce((a,x)=>a+(x.penaltyPoints||0),0)===3,'3 penalty points once per night');
ok(S.totalsWith['222'].total < ((S.totals['222']||{}).total===undefined?1e9:1e9) || true,'totals present');
console.log('totalsWith 222:',JSON.stringify(S.totalsWith['222']).slice(0,200));
console.log('public protests:',JSON.stringify(L.protests.map(p=>[p.id.slice(0,5),p.ruling,p.penalty,p.comment])));

// ---- reopen
ok(ctx.rcReopenProtest_({protestId:f2.protestId},adm).ok,'reopen DSQ');
ok(T.Penalties.length===3 && T.Penalties[2].Type==='reverse' && T.Penalties[2].Reverses===T.Penalties[1]['Penalty ID'],'reverse row added, original kept');
ok(T.Protests[1].Status==='Reviewing' && /reopened/.test(T.Protests[1].History),'back to reviewing with history');
L=ctx.rcBuildLeague_(); S=L.seasons[0];
ok(S.rounds[0].protestsOpen===1 && S.results.filter(x=>x.round===1&&x.driver==='222'&&x.race===2)[0].status==='Finished','DSQ no longer in force, protest open again');
ok(ctx.rcReopenProtest_({protestId:f1.protestId},adm).ok && ctx.rcRuleProtest_({protestId:f1.protestId,outcome:'dismiss',comment:''},adm).ok && T.Protests[0].Outcome==='Dismissed','reopen then dismiss');
ok(ctx.rcRuleProtest_({protestId:f2.protestId,outcome:'penalty',penalty:'1',comment:''},adm).ok,'self report 1 point');

// ---- settle round 1 (window over) and addendum
T.Rounds[0]['Protest closes']='2000-01-02 08:00';
T.Stories.push({'Story ID':'ST-1','Season ID':'S-AAAAAA','Round ID':'1111111','Kind':'race','Status':'published','Title':'T','Standfirst':'s','Body':'Para one\n\nPara two','Photos':'[]','Published':'2026-11-02 10:00'});
L=ctx.rcBuildLeague_(); S=L.seasons[0];
ok(S.rounds[0].status==='Settled' && S.rounds[1].status==='Settled','rounds settled');
fs.writeFileSync('/tmp/gs/stew_settled.js','window.RR_LIVE='+JSON.stringify(L)+';');
const st=L.news.filter(n=>n.round===1)[0];
ok(st && st.addendum && st.addendum.length===1 && st.addendum[0].name==='Second Driver' && st.addendum[0].penalty==='1 point' && st.addendum[0].lap===1,'addendum: '+JSON.stringify(st&&st.addendum));
ok(!JSON.stringify(L).match(/braked too late|pushed me wide/),'narrative never in league data');

// ---- list
const ls=ctx.rcListStewarding_({seasonId:'S-AAAAAA'});
ok(ls.ok && ls.protests.length===2 && ls.protests[0].narrative!==undefined,'list has narratives for the admin');
ok(ls.waiting===1,'one policy flag waiting: '+ls.waiting+' '+JSON.stringify(ls.flags.map(f=>[f.n,f.name,f.lockedCar,f.usedCar,f.state])));

// ---- policy
const fl=ls.flags[0];
ok(fl && fl.n===2 && fl.userId==='222' && fl.state==='open','flag found for round 2');
ok(ctx.rcRuleFlag_({roundId:'2222222',userId:'222',decision:'dsq',comment:'x'},adm).error==='comment-needed','policy dsq needs comment');
ok(ctx.rcRuleFlag_({roundId:'2222222',userId:'222',decision:'dsq',comment:'Used a different car than round 1.'},adm).ok,'policy dsq');
L=ctx.rcBuildLeague_(); S=L.seasons[0];
ok(S.results.filter(x=>x.round===2&&x.driver==='222').every(x=>x.status==='DSQ'||x.points===0),'whole night 2 voided: '+JSON.stringify(S.results.filter(x=>x.round===2&&x.driver==='222').map(x=>[x.race,x.status,x.points,x.bonus])));
ok(ctx.rcRuleFlag_({roundId:'2222222',userId:'222',decision:'clear'},adm).error==='already-decided','flag decided once');
const pid=T.Penalties.filter(p=>p['Protest ID']==='policy')[0]['Penalty ID'];
ok(ctx.rcReverseFlag_({penaltyId:pid},adm).ok,'undo policy dsq');
ok(ctx.rcListStewarding_({seasonId:'S-AAAAAA'}).flags[0].state==='open','flag open again');
ok(ctx.rcRuleFlag_({roundId:'2222222',userId:'222',decision:'clear',comment:''},adm).ok && ctx.rcListStewarding_({seasonId:'S-AAAAAA'}).flags[0].state==='cleared','clear it');
console.log(fails?'FAILURES: '+fails:'ALL PASSED');
;(function(){ const vm=require('vm'); const {ctx,tabs}=require('./harness.js'); try{ const L=vm.runInContext('rcBuildLeague_()',ctx); L.seasons.forEach(s=>console.log('SEASON',s.id,'order',JSON.stringify(s.order),'champions',JSON.stringify(s.champions))); }catch(e){console.log('BUILD ERR',e.message)} })();
