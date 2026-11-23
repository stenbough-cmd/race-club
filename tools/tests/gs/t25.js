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
const L=ctx.rcBuildLeague_(); const S=L.seasons[0];
ok(!!S,'season published');

/* ---- the independent oracle ---- */
function oracle(includeWaiting){
  const dsqRace={}, dsqNight={}, pen={}, eff=PEN.filter(p=>!PEN.some(q=>q.Type==='reverse'&&q.Reverses===p['Penalty ID'])&&p.Type!=='reverse');
  const rounds=ROUNDS.map(r=>{
    const waiting=r.n===4;                                // inside its window (a protest is open)
    return Object.assign({},r,{waiting});
  });
  const night={}, wins={}, penTot={};
  const per={}; // per[u][n]
  rounds.forEach(r=>{
    if(r.waiting&&!includeWaiting) return;
    const dq=(u,race)=>eff.some(p=>p['Round ID']===r.id&&p['User ID']===String(u)&&p.Type==='dsq'&&(p.Session===''||p.Session==='Race'&&race===1||p.Session==='Race2'&&race===2));
    const whole=u=>eff.some(p=>p['Round ID']===r.id&&p['User ID']===String(u)&&p.Type==='dsq'&&p.Session==='')||(r.races.every((_,i)=>dq(u,i+1)));
    const tot={};
    r.races.forEach((rc,i)=>{
      ['A','B'].forEach(c=>{
        const order=rc[c], d=rc.d;
        const st=u=>{ if(dq(u,i+1)) return 'DSQ'; const x=d[u]; if(x.s==='DSQ') return 'DSQ'; if(x.laps===0||x.s==='NS') return 'NS'; return x.s==='F'?'F':'DNF'; };
        const run=order.filter(u=>st(u)==='F'||st(u)==='DNF');
        const wl=run.length?d[run[0]].laps:0;
        const sc=run.filter(u=>d[u].laps*2>=wl);
        let fast=null; sc.forEach(u=>{ if(d[u].best>0&&(fast===null||d[u].best<d[fast].best)) fast=u; });
        order.forEach(u=>{ tot[u]=tot[u]||0; });
        sc.forEach((u,k)=>{ tot[u]+= (TABLE[c][k]||0); });
        order.forEach(u=>{ const s=st(u); if(s==='DSQ'||s==='NS') return; const x=d[u]; if(u===fast) tot[u]+=FAST; if(s==='F'&&x.inc===0) tot[u]+=CLEAN; });
        // places for the tie-break: finished drivers by their position in the class AFTER steward removal
        let p=0; run.concat([]).forEach(u=>{ if(st(u)==='F'){ /* position among all ranked (running first) */ } });
        const ranked=run.concat(order.filter(u=>st(u)==='DSQ'),order.filter(u=>st(u)==='NS'));
        ranked.forEach((u,k)=>{ if(st(u)==='F'){ wins[u]=wins[u]||[]; wins[u][k]=(wins[u][k]||0)+1; } });
      });
    });
    ['A','B'].forEach(c=>{
      let best=null; Object.keys(r.q).filter(u=>DRV[u]===c&&r.q[u]>0).forEach(u=>{ if(best===null||r.q[u]<r.q[best]) best=u; });
      if(best!==null&&!whole(best)&&tot[best]!==undefined) tot[best]+=POLE;
    });
    Object.keys(tot).forEach(u=>{ (per[u]=per[u]||{})[r.n]=tot[u]; });
    eff.filter(p=>p['Round ID']===r.id&&p.Type==='points').forEach(p=>{ penTot[p['User ID']]=(penTot[p['User ID']]||0)+Number(p.Amount); });
  });
  const run=rounds.filter(r=>includeWaiting||!r.waiting).map(r=>r.n);
  const cancelled=1, roundsN=6; // rounds 1..4 raced, 5 cancelled, 6 not run yet
  const keep=roundsN-cancelled-DROPS;
  const out={};
  Object.keys(per).forEach(u=>{
    const sc=run.map(n=>[per[u][n]||0,n]); let dropped=[];
    if(run.length>keep){ dropped=sc.slice().sort((a,b)=>a[0]-b[0]||b[1]-a[1]).slice(0,run.length-keep).map(x=>x[1]); }
    let total=0; sc.forEach(([v,n])=>{ if(dropped.indexOf(n)<0) total+=v; }); total-=penTot[u]||0;
    out[u]={total,dropped};
  });
  return out;
}
const idMap=u=>String(u);
for(const [label,snap,inc] of [['settled rounds only (R4 still waiting)',S.totals,false],['with R4',S.totalsWith,true]]){
  const exp=oracle(inc); let bad=0;
  Object.keys(exp).forEach(u=>{ const got=snap[u]; if(!got||got.total!==exp[u].total){ bad++; console.log('   MISMATCH',label,NAME[u],'expected',exp[u].total,'got',got&&got.total); } });
  ok(bad===0,label+': every driver total matches the hand calculation '+JSON.stringify(Object.fromEntries(Object.keys(exp).map(u=>[NAME[u].split(' ')[0],exp[u].total]))));
}
/* class order */
const expWith=oracle(true);
['A','B'].forEach(c=>{
  const got=(S.order[CLS[c]]||[]).map(String);
  const ids=Object.keys(DRV).filter(u=>DRV[u]===c&&expWith[u]);
  console.log('   class',c,'order',got.map(u=>NAME[u].split(' ')[0]+':'+S.totalsWith[u].total).join(', '));
  ok(got.length===ids.length,'class '+c+' lists everyone ('+got.length+')');
  ok(got.every((u,i)=>i===0||S.totalsWith[got[i-1]].total>=S.totalsWith[u].total),'class '+c+' is in points order');
});
/* waiting round must not count in the without snapshot but be present in with */
ok(S.rounds.find(r=>r.n===4).waiting===true,'R4 waiting (protest open)'); ok(S.rounds.find(r=>r.n===1).waiting===false,'R1 settled');
ok(S.rounds.find(r=>r.n===5).cancelled===true&&S.rounds.find(r=>r.n===6).status==='Scheduled','R5 cancelled, R6 scheduled');
/* privacy */
const pub=JSON.stringify(L); ok(!/SECRET NARRATIVE/.test(pub),'protest narrative not public'); ok(!/"password"/.test(pub),'no password key in the public data');
/* specific rule spot checks */
const res=(n,race,u)=>S.results.find(x=>x.round===n&&x.race===race&&x.driver===String(u));
ok(res(1,1,105).status==='DNF'&&res(1,1,105).points===TABLE.A[4]||res(1,1,105).points===0,'R1 race1 105 DNF with 6/10 laps scores place 5 ('+res(1,1,105).points+')');
ok(res(1,2,104).points===0&&res(1,2,104).status==='DNF','R1 race2 104 DNF at 4/10 laps scores 0');
ok(res(2,1,105).status==='Finished'&&res(2,1,105).points===0,'R2 race1 105 Finished with 3/10 laps scores 0 ('+res(2,1,105).points+')');
ok(res(2,1,203).status==='DNS','R2 race1 203 did not start');
ok(res(2,1,101).status==='DSQ'&&res(2,1,101).points===0&&res(2,1,101).bonus===0,'steward DSQ: 0 points 0 bonus');
ok(res(2,1,102).pos===1,'after the steward DSQ the next driver is P1 ('+res(2,1,102).pos+')');
ok(res(2,2,102).status==='DSQ','server DSQ shows DSQ');
ok(S.poleBonus.filter(p=>p.round===3&&p.driver==='101').length===0,'whole-night policy DSQ voids pole');
ok(S.poleBonus.filter(p=>p.round===3&&p.cls==='1703').length===0,'nobody else gets that pole');
ok(res(1,1,103).penaltyPoints===0,'a reversed penalty does not show');
console.log(fails?'\nFAILED '+fails:'\nALL PASS');
L.protests=L.protests||[]; fs.writeFileSync('/tmp/gs/e2e.js','window.RR_LIVE='+JSON.stringify(L)+';');
console.log('fixture written, seasons',L.seasons.length,'drivers',L.drivers.length,'protests',L.protests.length);
/* ---- end of season on this data ---- */
vm.runInContext(`rcStoryWrite_=function(){return {ok:true,already:false};}; rcStewardUpdate_=function(tab,kc,kv,f){var r=__tabs[tab].filter(function(x){return String(x[kc])===String(kv)})[0];if(!r)return false;Object.assign(r,f);return true;};`,ctx);
let st=vm.runInContext(`(function(){var s=rcEndState_('S-E2E');return {blockers:s.blockers,notRun:s.notRun,open:s.open};})()`,ctx);
console.log('end state with a protest open:',JSON.stringify(st)); ok(st.blockers.length>0,'cannot end while a protest is open');
T.Protests[0].Status='Ruled'; T.Protests[0].Outcome='Dismissed';
st=vm.runInContext(`(function(){var s=rcEndState_('S-E2E');return {blockers:s.blockers,notRun:s.notRun};})()`,ctx); console.log('after ruling:',JSON.stringify(st)); ok(st.blockers.length===0,'can end once every protest is ruled');
ctx.__req={seasonId:'S-E2E'}; let r1=vm.runInContext(`rcEndSeason_(__req,'Matt')`,ctx); console.log('end without allowUnfinished:',JSON.stringify({ok:r1.ok,error:r1.error,notRun:r1.notRun})); ok(!r1.ok&&r1.error==='rounds-left','asks first about the round not raced');
ctx.__req={seasonId:'S-E2E',allowUnfinished:true}; r1=vm.runInContext(`rcEndSeason_(__req,'Matt')`,ctx);
console.log('champions:',JSON.stringify((r1.champions||[]).map(c=>[c.className,c.name,c.points,c.margin])));
ok(r1.ok,'season ended'); const byCls=Object.fromEntries((r1.champions||[]).map(c=>[c.cls,c])); ok(byCls['1703']&&byCls['1703'].name==='Bob Beta'&&byCls['1703'].points===203,'class A champion Bob 203'); ok(byCls['1687']&&byCls['1687'].name==='Flo Zeta'&&byCls['1687'].points===192,'class B champion Flo 192');
ok(T.Rounds.find(r=>r['Round ID']==='1000006').Status==='Cancelled','unraced round cancelled'); 
ctx.__ids=['a','b']; ctx.__tot={a:{total:10},b:{total:10}}; ctx.__pl={a:[1,0],b:[0,2]};
ok(vm.runInContext(`rcRankDrivers_(__ids,__tot,__pl,function(x){return x}).join()`,ctx)==='a,b','tie on points: more wins is ahead');
ctx.__pl={a:[1,1],b:[1,2]}; ok(vm.runInContext(`rcRankDrivers_(__ids,__tot,__pl,function(x){return x}).join()`,ctx)==='b,a','tie on wins: more seconds is ahead');
console.log(fails?'\nFAILED '+fails:'\nALL PASS (incl. end season)');
