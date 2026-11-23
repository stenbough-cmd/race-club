/* END TO END: a whole season through the real parser and the real league builder, compared with an independent hand calculation of the rules. */
const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js'); const T=tabs;
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
const CAR={A:1695,B:1686}, CLS={A:'1703',B:'1687'}, classOf={1695:'1703',1686:'1687'};
const DRV={101:'A',102:'A',103:'A',104:'A',105:'A',201:'B',202:'B',203:'B'};
const NAME={101:'Ann Alpha',102:'Bob Beta',103:'Cy Gamma',104:'Di Delta',105:'Ed Epsilon',201:'Flo Zeta',202:'Gus Eta',203:'Hal Theta'};
const TABLE={A:[25,18,15,12,10,8,6,4,2,1],B:[20,15,12,10,8]}, POLE=3, FAST=2, CLEAN=5, DROPS=1;
const nowMs=Date.now(), fmtT=ms=>{const d=new Date(ms),p=n=>String(n).padStart(2,'0');return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes());};
const DAY=864e5;
/* race spec: for each class the SERVER order (what RaceRoom writes) and per driver {s:'F'|'DNF'|'DSQ'|'NS', laps, best, inc} ; qualifying best per driver */
const R=(o)=>o;
const ROUNDS=[
 { n:1, id:'1000001', closes:-5, q:{101:90000,102:90500,103:91000,104:91500,105:92000,201:100000,202:100400,203:100900},
   races:[
    { A:[101,102,103,104,105], B:[201,202,203],
      d:{101:{s:'F',laps:10,best:90500,inc:0},102:{s:'F',laps:10,best:90700,inc:4},103:{s:'F',laps:10,best:90900,inc:0},104:{s:'F',laps:9,best:91400,inc:0},105:{s:'DNF',laps:6,best:91800,inc:0},
         201:{s:'F',laps:8,best:100100,inc:0},202:{s:'F',laps:8,best:100500,inc:0},203:{s:'F',laps:8,best:100800,inc:1}} },
    { A:[102,101,103,105,104], B:[202,201,203],
      d:{101:{s:'F',laps:10,best:90400,inc:0},102:{s:'F',laps:10,best:90450,inc:0},103:{s:'F',laps:10,best:91200,inc:0},105:{s:'F',laps:10,best:91000,inc:0},104:{s:'DNF',laps:4,best:91500,inc:0},
         201:{s:'F',laps:8,best:100300,inc:0},202:{s:'F',laps:8,best:100000,inc:0},203:{s:'F',laps:8,best:100700,inc:0}} } ] },
 { n:2, id:'1000002', closes:-4, q:{101:89900,102:90100,103:90300,104:91000,105:91500,201:99000,202:99500,203:0},
   races:[
    { A:[101,102,103,104,105], B:[201,202,203],
      d:{101:{s:'F',laps:10,best:90000,inc:0},102:{s:'F',laps:10,best:90200,inc:0},103:{s:'F',laps:10,best:90300,inc:0},104:{s:'F',laps:10,best:91000,inc:0},105:{s:'F',laps:3,best:92000,inc:0},
         201:{s:'F',laps:8,best:99100,inc:0},202:{s:'F',laps:8,best:99200,inc:2},203:{s:'NS',laps:0,best:0,inc:0}} },
    { A:[102,103,101,104,105], B:[201,202,203],
      d:{101:{s:'F',laps:10,best:90100,inc:0},102:{s:'DSQ',laps:10,best:90000,inc:0},103:{s:'F',laps:10,best:90250,inc:0},104:{s:'F',laps:10,best:91000,inc:0},105:{s:'DNF',laps:5,best:91900,inc:0},
         201:{s:'F',laps:8,best:99300,inc:0},202:{s:'F',laps:8,best:99200,inc:0},203:{s:'F',laps:7,best:99900,inc:0}} } ] },
 { n:3, id:'1000003', closes:-3, q:{101:89000,102:90000,103:90200,201:99000,202:99600,203:99800},
   races:[
    { A:[101,102,103], B:[201,202,203], d:{101:{s:'F',laps:10,best:89500,inc:0},102:{s:'F',laps:10,best:90000,inc:0},103:{s:'F',laps:10,best:90100,inc:3},201:{s:'F',laps:8,best:99100,inc:0},202:{s:'F',laps:8,best:99300,inc:0},203:{s:'F',laps:8,best:99500,inc:0}} },
    { A:[101,103,102], B:[203,201,202], d:{101:{s:'F',laps:10,best:89400,inc:0},102:{s:'F',laps:10,best:90000,inc:0},103:{s:'F',laps:10,best:90300,inc:0},201:{s:'F',laps:8,best:99200,inc:0},202:{s:'F',laps:8,best:99400,inc:0},203:{s:'F',laps:8,best:99100,inc:0}} } ] },
 { n:4, id:'1000004', closes:-1, q:{101:90000,102:89900,103:91000,104:91200,105:91400,201:99900,202:99800,203:100000},
   races:[
    { A:[102,101,103,104,105], B:[202,201,203], d:{101:{s:'F',laps:10,best:90100,inc:0},102:{s:'F',laps:10,best:90000,inc:0},103:{s:'F',laps:10,best:91000,inc:0},104:{s:'F',laps:10,best:91100,inc:0},105:{s:'F',laps:10,best:91300,inc:0},201:{s:'F',laps:8,best:99900,inc:0},202:{s:'F',laps:8,best:99800,inc:0},203:{s:'F',laps:8,best:100100,inc:0}} },
    { A:[102,101,103,104,105], B:[202,201,203], d:{101:{s:'F',laps:10,best:90100,inc:0},102:{s:'F',laps:10,best:90000,inc:0},103:{s:'F',laps:10,best:91000,inc:0},104:{s:'F',laps:10,best:91100,inc:0},105:{s:'F',laps:10,best:91300,inc:0},201:{s:'F',laps:8,best:99900,inc:0},202:{s:'F',laps:8,best:99800,inc:0},203:{s:'F',laps:8,best:100100,inc:0}} } ] },
];
/* steward actions, as rows of the Penalties tab */
const PEN=[
 {'Penalty ID':'P1','Round ID':'1000002','Session':'Race','User ID':'101','Type':'dsq','Amount':'','Reverses':''},                 // steward DSQ of 101 in R2 race 1 only
 {'Penalty ID':'P2','Round ID':'1000002','Session':'Race','User ID':'201','Type':'points','Amount':'3','Reverses':''},             // 3 points on 201
 {'Penalty ID':'P3','Round ID':'1000001','Session':'Race','User ID':'103','Type':'points','Amount':'5','Reverses':''},
 {'Penalty ID':'P4','Round ID':'1000001','Session':'Race','User ID':'103','Type':'reverse','Amount':'','Reverses':'P3'},          // reversed: must not count
 {'Penalty ID':'P5','Round ID':'1000003','Session':'','User ID':'101','Type':'dsq','Amount':'','Reverses':''},                    // policy DSQ: whole night R3 for 101, who has pole
 {'Penalty ID':'P6','Round ID':'1000004','Session':'Race2','User ID':'102','Type':'points','Amount':'1','Reverses':''}             // a penalty inside the round still in its window
];
const roundTpl=(r)=>({'Round ID':r.id,'Season ID':'S-E2E','Round':String(r.n),'Type':'Race','Date':'2026-11-'+String(r.n+1).padStart(2,'0'),'Server online':'20:00','Time zone':'America/Detroit','Layout ID':'1','Track':'Hungaroring','Layout':'Grand Prix','Server name':'RC '+r.id,'Status':'Provisional','Results received':'x','Protest closes':fmtT(nowMs+r.closes*DAY)});

function buildFile(r){
  const mk=(type,order,d,qual)=>{
    const players=[]; const pos={};
    Object.keys(order).forEach(c=>order[c].forEach((u,i)=>{pos[u]=[i+1,c];}));
    const all=[]; let gpos=0; ['A','B'].forEach(c=>order[c].forEach(u=>{all.push(u);}));
    all.forEach((u,gi)=>{
      const c=DRV[u], inClass=pos[u][0], x=qual?{s:'F',laps:1,best:r.q[u],inc:0}:d[u];
      const laps=[]; const nl=x.laps;
      for(let l=1;l<=nl;l++){ const t=(x.best>0?x.best+ (l===1?3000:500*(l%3)):80000); const inc=(l===1&&x.inc>0&&!qual)?[{Type:0,Points:x.inc,OtherUserId:0}]:[];
        laps.push({Time:t,SectorTimes:[Math.round(t/3),Math.round(2*t/3),t],Valid:true,Position:gi+1,PositionInClass:inClass,PitStopOccured:false,Incidents:inc}); }
      if(x.best>0&&laps.length){ const k=laps.findIndex(z=>true); laps[Math.min(1,laps.length-1)].Time=x.best; laps[Math.min(1,laps.length-1)].SectorTimes=[Math.round(x.best/3),Math.round(2*x.best/3),x.best]; if(laps.length===1) laps[0].Time=x.best; }
      const fs_=qual?'None':({F:'Finished',DNF:'DidNotFinish',DSQ:'Disqualified',NS:'None'})[x.s];
      const total= qual?0: (x.s==='F'? laps.reduce((a,l)=>a+l.Time,0) : (x.s==='DSQ'?0:0));
      players.push({UserId:u,FullName:NAME[u],Username:NAME[u].split(' ')[0].toLowerCase(),CarId:CAR[c],Car:'Car '+c,LiveryId:1,CarPerformanceIndex:0,Position:gi+1,PositionInClass:inClass,StartPosition:gi+1,StartPositionInClass:inClass,
        BestLapTime:x.s==='DSQ'?-1000:(x.best>0?x.best:-1000),TotalTime:total,FinishStatus:fs_,RaceSessionLaps:laps});
    });
    return {Type:type,Players:players};
  };
  const sessions=[];
  const qo={A:r.races[0].A.slice(),B:r.races[0].B.slice()};
  const sortQ=c=>qo[c].filter(u=>r.q[u]!==undefined).sort((a,b)=>(r.q[a]||9e9)-(r.q[b]||9e9));
  sessions.push(mk('Qualify',{A:sortQ('A'),B:sortQ('B')},null,true));
  r.races.forEach((rc,i)=>sessions.push(mk(i===0?'Race':'Race'+(i+1),{A:rc.A,B:rc.B},rc.d,false)));
  return {Server:'RC '+r.id,StartTime:Math.floor((nowMs+r.closes*DAY)/1000),Sessions:sessions.filter(Boolean)};
}

/* ---- load into the tabs, as Confirm would ---- */
for(const k of Object.keys(T)) T[k].length=0;
const season={version:1,seasonId:'S-E2E',name:'E2E Season',prefix:'RC',liveries:[],rules:{},preset:2,assists:{},weekend:{Practice:{len:15,unit:'M',start:1},Qualify:{len:15,unit:'M',start:1},Race1:{len:10,unit:'L',start:1},Race2:{len:10,unit:'L',start:1}},
  points:{tables:{'1703':TABLE.A.join(','),'1687':TABLE.B.join(',')},pole:POLE,fastestLap:FAST,clean:CLEAN,dropWeeks:DROPS},format:{multi:true,races:2,race2:true,pole:true,fastest:true,clean:true},rounds:ROUNDS.map(r=>({id:r.id,password:'x',layoutId:1}))};
ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
T.Seasons.push({'Season ID':'S-E2E','Name':'E2E Season','Status':'Active','First round':'2026-11-02'});
ROUNDS.forEach(r=>{ T.Rounds.push(roundTpl(r)); const notes=[]; const rd=ctx.rcReadFile_(r.id,'S-E2E',buildFile(r),classOf,'PROVISIONAL',notes); rd.resultRows.forEach(x=>T.Results.push(x)); rd.lapRows.forEach(x=>T.Laps.push(x)); if(notes.length) console.log('R'+r.n+' notes:',notes.join(' | ')); });
T.Rounds.push(Object.assign(roundTpl({n:5,id:'1000005',closes:5}),{'Status':'Cancelled','Results received':''}));
T.Rounds.push(Object.assign(roundTpl({n:6,id:'1000006',closes:9}),{'Status':'Scheduled','Results received':'','Protest closes':''}));
Object.keys(NAME).forEach(u=>T.Drivers.push({'User ID':u,'Name':NAME[u],'Country':'US'}));
T.Penalties.push(...PEN);
T.Protests.push({'Protest ID':'PR1','Season ID':'S-E2E','Round ID':'1000004','Race':'1','Filed by':'101','Against':'102','Self':'','Lap':'3','Reason':'Contact','Narrative':'SECRET NARRATIVE','Filed':'x','Status':'Filed','Outcome':'','Penalty':'','Penalty ID':'','Comment':'','Ruled':'','Ruled by':'','History':''});
/* ===== t27: one class per driver, flags on upload, countback tie-break, drivers list ===== */
const base=ctx.rcBuildLeague_().seasons[0];
const total0=base.totalsWith['105'].total;
/* 105 (class A, first raced in R1) turns up in a class B car in R4 */
T.Results.filter(x=>x['Round ID']==='1000004'&&String(x['User ID'])==='105').forEach(x=>{x['Car ID']='1686';x['Class ID']='1687';});
const L2=ctx.rcBuildLeague_(), S2=L2.seasons[0];
ok(S2.driverClass['105']==='1703','105 is locked to class A (the first class raced)');
ok(!S2.results.some(x=>x.driver==='105'&&x.round===4),'105 has no scored result in R4 (other class left out)');
ok(!(S2.order['1687']||[]).includes('105'),'105 is not ranked in class B');
ok((S2.order['1703']||[]).includes('105'),'105 stays ranked in class A');
ok(S2.totalsWith['105'].total<=total0,'105 total did not gain points from class B ('+total0+' -> '+S2.totalsWith['105'].total+')');
const dr=L2.drivers.find(d=>d.id==='105'); ok(dr.cls==='1703','driver list: 105 shows class A');
ok(L2.drivers.length===8&&L2.drivers.every(d=>typeof d.current==='boolean'),'drivers list has everyone, with a current flag');
ok(L2.drivers.every(d=>d.current),'all are in the active season');
/* flags (read from the Sheet tabs, waiting rounds included) */
const flags=ctx.rcPolicyFlags_('S-E2E',T.Penalties,{});
const f105=flags.filter(f=>f.userId==='105');
ok(f105.length===1&&f105[0].n===4&&f105[0].classChange===true&&f105[0].state==='open','flag: 105 R4 class change, open');
/* a round that is only waiting for Confirm is flagged too */
T.Rounds.find(r=>r['Round ID']==='1000006')['Status']='Awaiting confirmation';
['Race'].forEach(s=>T.Results.push({'Round ID':'1000006','Session':s,'User ID':'102','Car ID':'1686','Class ID':'1687','Livery ID':'1','Status':'WAITING','Position':1}));
const f2=ctx.rcPolicyFlags_('S-E2E',T.Penalties,{}).filter(f=>f.userId==='102');
ok(f2.length===1&&f2[0].n===6&&f2[0].classChange,'flag appears for a round still waiting for Confirm');
/* but a waiting round is never scored */
ok(!ctx.rcBuildLeague_().seasons[0].results.some(x=>x.round===6),'a waiting round has no public results');
/* countback tie-break */
ctx.__ids=['a','b','c']; ctx.__tot={a:{total:10},b:{total:10},c:{total:10}};
ctx.__pl={a:[1,1],b:[1,1],c:[0,3]}; ctx.__fa={a:[22,12],b:[12,12],c:[0,0]};
ok(vm.runInContext(`rcRankDrivers_(__ids,__tot,__pl,function(x){return x},__fa).join()`,ctx)==='b,a,c','level on wins and seconds: who won first is ahead; fewer wins last');
ctx.__pl={a:[0,2,1],b:[0,2,0]}; ok(vm.runInContext(`rcRankDrivers_(['a','b'],{a:{total:5},b:{total:5}},__pl,function(x){return x},{}).join()`,ctx)==='a,b','countback goes down to third places');
/* tie-break only sees rounds that count (not the round waiting out its window) */
ok((base.totals['102'].places[0]||0)<(base.totalsWith['102'].places[0]||0),'tie-break wins without the waiting round ('+(base.totals['102'].places[0]||0)+') are fewer than with it ('+(base.totalsWith['102'].places[0]||0)+')');
console.log(fails?'\nFAILED '+fails:'\nALL PASS (t27)');
const bb=ctx.rcBuildLeague_().seasons[0];
console.log(JSON.stringify(bb.rounds.map(r=>[r.n,r.status,r.waiting])), JSON.stringify(bb.totals['102'].places), JSON.stringify(bb.totalsWith['102'].places));
