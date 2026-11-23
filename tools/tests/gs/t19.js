const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js');
const dir='/mnt/user-data/uploads/Race Club/';
const idx=JSON.parse(fs.readFileSync(dir+'assets/r3e/index.json','utf8'));
const file=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/8cdb6ec0-202611220407.json','utf8'));
const carCls=idx.cars['2339']?idx.cars['2339'][2]:'';
console.log('car 2339 =',idx.cars['2339']&&idx.cars['2339'][0],'class',carCls,idx.classes[carCls]);
function run(label,fmt,extraDriver,pen){
  const T=ctx.__tabs; for(const k of Object.keys(T)) T[k].length=0;
  const season={version:1,seasonId:'S-AAAAAA',name:'Season 01',prefix:'RC',liveries:[2399],rules:{},preset:2,assists:{},
    weekend:{Practice:{len:15,unit:'M',start:1},Qualify:{len:15,unit:'M',start:1},Race1:{len:3,unit:'L',start:1},Race2:{len:3,unit:'L',start:1},Race3:{len:2,unit:'L',start:1}},
    points:{tables:{[carCls]:'30, 25, 23, 22'},pole:3,fastestLap:2,clean:5,dropWeeks:0},format:fmt,rounds:[{id:'1111111',password:'x',layoutId:1}]};
  ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
  T.Seasons.push({'Season ID':'S-AAAAAA','Name':'Season 01','Status':'Active','First round':'2026-11-01'});
  T.Rounds.push({'Round ID':'1111111','Season ID':'S-AAAAAA','Round':'1','Type':'Race','Date':'2026-11-01','Server online':'20:00','Time zone':'America/Detroit','Layout ID':'1','Track':'Hungaroring','Layout':'Grand Prix','Status':'Provisional','Protest closes':'2000-01-02 08:00'});
  const data=JSON.parse(JSON.stringify(file));
  if(extraDriver){ // a second driver, in every session, finishing behind Matt except Race 3 where he wins and is clean
    data.Sessions.forEach(s=>{ const p=JSON.parse(JSON.stringify(s.Players[0])); p.UserId=222; p.FullName='Second Driver'; p.Username='second';
      if(/^Race/.test(s.Type)){ p.Position=2; p.PositionInClass=2; p.StartPosition=2; p.StartPositionInClass=2; p.BestLapTime=p.BestLapTime-(s.Type==='Race3'?2000:-500); p.TotalTime+= (s.Type==='Race3'?-3000:2500);
        if(s.Type==='Race3'){ p.Position=1; p.PositionInClass=1; s.Players[0].Position=2; s.Players[0].PositionInClass=2; }
        p.RaceSessionLaps.forEach(l=>{l.Valid=true;l.Incidents=[];l.Position=p.Position;l.PositionInClass=p.Position;}); }
      if(s.Type==='Qualify'){ p.BestLapTime=117000; p.Position=1; p.PositionInClass=1; s.Players[0].Position=2; s.Players[0].PositionInClass=2; p.RaceSessionLaps=[{Time:117000,SectorTimes:[39000,78000,117000],PositionInClass:1,Valid:true,Position:1,PitStopOccured:false,Incidents:[]}]; }
      s.Players.push(p); });
  }
  const rd=ctx.rcReadFile_('1111111','S-AAAAAA',data,{2339:carCls},'PROVISIONAL');
  rd.resultRows.forEach(r=>T.Results.push(r)); rd.lapRows.forEach(r=>T.Laps.push(r));
  T.Drivers.push({'User ID':8261679,'Name':'Matt Stenzel','Country':'US'},{'User ID':222,'Name':'Second Driver','Country':'DE'});
  T.Penalties=pen||[];
  const L=ctx.rcBuildLeague_(); const s=L.seasons[0];
  if(label.indexOf('Two drivers, 3-race')===0){ L.protests=[]; fs.writeFileSync('/tmp/gs/multi.js','window.RR_LIVE='+JSON.stringify(L)+';'); }
  console.log('\n=====',label);
  console.log('round races:',s.rounds[0].races,'| format',JSON.stringify(s.format),'| poleBonus',JSON.stringify(s.poleBonus));
  s.results.forEach(r=>console.log(' race',r.race,'driver',r.driver,'pos',r.pos,r.status,'points',r.points,'bonus',r.bonus,r.pole?'POLE':'',r.fastest?'FASTEST':'','inc',r.incidents,'best',r.best,'pen',r.penaltyPoints));
  console.log(' totals:',JSON.stringify(Object.fromEntries(Object.entries(s.totalsWith).map(([k,v])=>[k,[v.per.join(','),v.total,(v.places||[]).join('/')]]))));
  console.log(' setup weekend:',JSON.stringify(s.setup.weekend.map(w=>w.session)),'| notes',JSON.stringify(s.setup.points.notes),'| bonuses',JSON.stringify(s.setup.points.bonuses));
}
const all={multi:true,races:3,race2:true,race3:true,pole:true,fastest:true,clean:true};
const dsq=(sess)=>[{'Round ID':'1111111','Session':sess,'User ID':'222','Type':'DSQ'}];
run('POLE none',all,true,[]);
run('POLE policy DSQ whole night',all,true,dsq(''));
run('POLE DSQ race 2 only',all,true,dsq('Race2'));
run('POLE DSQ every race',all,true,[...dsq('Race'),...dsq('Race2'),...dsq('Race3')]);
