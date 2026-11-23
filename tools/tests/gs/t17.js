const {ctx}=require('./harness.js'); const vm=require('vm'), fs=require('fs');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
function read(f){ const d=JSON.parse(fs.readFileSync('fx/'+f,'utf8').replace(/^﻿/,'')); if(process.env.NOID!=='1'){ const ids={}; let n=100; d.Sessions.forEach(se=>(se.Players||[]).forEach(p=>{ if(p.UserId===undefined){ const k=p.FullName||p.Username; ids[k]=ids[k]||(n++); p.UserId=ids[k]; } })); }
  ctx.__d=d; return vm.runInContext(`(function(){var n=[];var b=rcReadFile_('1234567','S1',__d,{},'WAITING',n);b.notes=n;return b;})()`,ctx); }
const F='driver.ken.j.dnf.but.with.all.laps.registered.with.incidents.json';
let b=read(F);
let ken=b.resultRows.filter(r=>r.Name==='Ken J'&&r.Session==='Race')[0];
ok(ken.Laps===12,'Ken J (retired, phantom 13th lap) counts 12 laps, got '+ken.Laps);
ok(ken['Finish status']==='DidNotFinish','status word kept');
ok(b.notes.some(n=>/not driven/.test(n)),'note about phantom lap');
const win=b.resultRows.filter(r=>r.Name==='Manuel A'&&r.Session==='Race')[0]; ok(win.Laps===13,'winner 13 laps');
ok(ken['Incident points']>=3,'phantom lap incident points still counted: '+ken['Incident points']);
// the variant with no incident on the last lap keeps the lap (cannot tell it from a real one)
b=read('driver.ken.j.dnf.but.with.all.laps.registered.without.incidents.json');
ok(b.resultRows.filter(r=>r.Name==='Ken J'&&r.Session==='Race')[0].Laps===13,'no-incident variant: lap kept');
// qualify best lap from BestLapTime; DSQ best lap -1000 -> blank
b=read('qualify.and.race.json');
const dq=b.resultRows.filter(r=>r.Session==='Race'&&r['Finish status']==='Disqualified')[0];
ok(dq['Best lap (ms)']===''&&dq['Total time (ms)']==='','DSQ has no best/total');
ok(b.resultRows.filter(r=>r.Session==='Qualify'&&r.Name==='nois oh')[0]['Best lap (ms)']===99325,'qualify best from BestLapTime');
// finish none (2017): note about missing status
b=read('finish.status.none.json'); ok(b.notes.some(n=>/no finish status/.test(n)),'None status noted: '+b.notes.join(' | '));
// race2 session names and lapped drivers' equal total time ties resolved by server position
b=read('log.with.race2.json');
ok(['Qualify','Race','Race2'].every(s=>b.resultRows.some(r=>r.Session===s)),'Race2 session read');
for(const sess of ['Race','Race2']){
  ctx.__rows=b.resultRows.filter(r=>r.Session===sess); ctx.__laps=b.lapRows.filter(r=>r.Session===sess);
  const sc=vm.runInContext(`rcScoreSession_(__rows,[],__laps,{classKey:function(){return 'A'},tables:{A:[25,18,15,12,10,8]},fastestLap:1,clean:1})`,ctx);
  const byServer=ctx.__rows.slice().sort((x,y)=>x.Position-y.Position).map(r=>String(r['User ID']));
  ok(JSON.stringify(sc.map(x=>x.userId))===JSON.stringify(byServer),sess+' our order equals the server order');
  const lapped=sc.filter(x=>x.laps<sc[0].laps)[0]; if(lapped) ok(lapped.avg>0&&lapped.avg<lapped.time/lapped.laps,sess+' lapped average from the laps, '+lapped.avg+' < '+Math.round(lapped.time/lapped.laps));
}
// files from before 2020 carry no user id: nothing is read, and the note says why
process.env.NOID='1'; { const r=read('finish.status.none.json'); ok(r.resultRows.length===0 && r.notes.some(n=>/no RaceRoom user ID/.test(n)),'old file without user ids: skipped with a note'); } process.env.NOID='0';
// every fixture reads without error and yields rows
for(const f of fs.readdirSync('fx').filter(x=>x.endsWith('.json'))){ try{ const r=read(f); ok(r.resultRows.length>0,'reads '+f+' ('+r.resultRows.length+' results, '+r.lapRows.length+' laps)'); }catch(e){ ok(false,'reads '+f+' '+e.message);} }
// old-era incident numbering: 7 = disconnect
const base={Sessions:[{Type:'Race',Players:[{UserId:1,FullName:'A',FinishStatus:'DidNotFinish',Position:1,TotalTime:-1,BestLapTime:90000,RaceSessionLaps:[{Time:90000,Position:1},{Time:91000,Position:1,Incidents:[{Type:7,Points:2}]}]}]}]};
ctx.__d=Object.assign({Time:'/Date(1485070076319)/'},base); let o=vm.runInContext(`rcReadFile_('1','S',__d,{},'W',[])`,ctx); ok(o.resultRows[0].Laps===1,'old numbering: type 7 stops, laps 1 got '+o.resultRows[0].Laps);
ctx.__d=Object.assign({StartTime:1785000000},base); o=vm.runInContext(`rcReadFile_('1','S',__d,{},'W',[])`,ctx); ok(o.resultRows[0].Laps===1,'any last-lap incident without contact on a retiree is phantom, laps 1 got '+o.resultRows[0].Laps);
ctx.__d=Object.assign({StartTime:1785000000},JSON.parse(JSON.stringify(base))); ctx.__d.Sessions[0].Players[0].RaceSessionLaps[1].Incidents=[{Type:4,Points:1,OtherUserId:77}]; o=vm.runInContext(`rcReadFile_('1','S',__d,{},'W',[])`,ctx); ok(o.resultRows[0].Laps===2,'stopped but with contact: lap kept');
ok(vm.runInContext(`rcFileTime_('/Date(1589028832901+0000)/')`,ctx)===1589028832901 && vm.runInContext(`rcFileTime_(1607101107)`,ctx)===1607101107000,'file time formats');
console.log(fails?('FAILED '+fails):'ALL PASS');
