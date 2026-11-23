const {ctx}=require('./harness.js'); const vm=require('vm'), fs=require('fs');
let n=0, mism=0, arrDiff=0, fin50=0, fin0=0;
for(const f of fs.readdirSync('fx').filter(x=>x.endsWith('.json'))){
  const d=JSON.parse(fs.readFileSync('fx/'+f,'utf8').replace(/^﻿/,'')); const ids={}; let k=100;
  d.Sessions.forEach(se=>(se.Players||[]).forEach(p=>{ if(p.UserId===undefined){const q=p.FullName||p.Username; ids[q]=ids[q]||k++; p.UserId=ids[q];} }));
  ctx.__d=d; const b=vm.runInContext(`rcReadFile_('1','S',__d,{},'W',[])`,ctx);
  for(const sess of [...new Set(b.resultRows.map(r=>r.Session))].filter(s=>/^Race/.test(s))){
    const rows=b.resultRows.filter(r=>r.Session===sess); ctx.__rows=rows; ctx.__laps=b.lapRows.filter(r=>r.Session===sess);
    const sc=vm.runInContext(`rcScoreSession_(__rows,[],__laps,{classKey:function(){return 'A'},tables:{A:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},fastestLap:0,clean:0})`,ctx);
    const our=sc.map(x=>x.userId).join(','), srv=rows.slice().sort((a,b)=>a.Position-b.Position).map(r=>String(r['User ID'])).join(',');
    // the file's own Players order
    const arr=d.Sessions.find(s=>s.Type===sess).Players.map(p=>String(p.UserId)).join(',');
    n++; if(our!==srv){mism++; console.log('ORDER DIFFERS',f,sess,'\n our',our,'\n srv',srv, '\n', sc.map(x=>x.userId+':'+x.status+':'+x.laps).join(' '));}
    if(arr!==srv){arrDiff++; console.log('Players array order != Position order',f,sess);}
    const maxL=Math.max(...rows.map(r=>r.Laps));
    rows.forEach(r=>{ if(r['Finish status']==='Finished'&&r.Laps*2<maxL) fin50++; if(r['Finish status']==='Finished'&&r.Laps===0) fin0++; });
  }
}
console.log({raceSessions:n,orderDiffers:mism,playersArrayDiffers:arrDiff,finishedUnderHalf:fin50,finishedZeroLaps:fin0});
