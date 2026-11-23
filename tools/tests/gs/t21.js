const {ctx}=require('./harness.js'); const vm=require('vm'), fs=require('fs');
const theirs=JSON.parse(fs.readFileSync('/tmp/sr/theirs.json','utf8'));
const files=['f5387ba3-202611220201.json','eb260475-202611220407.json','2f473456-202611221019.json'];
files.forEach((f,i)=>{
  const d=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/'+f,'utf8')); ctx.__d=d;
  const b=vm.runInContext(`(function(){var n=[];var r=rcReadFile_('1','S',__d,{},'WAITING',n);r.notes=n;return r;})()`,ctx);
  console.log('\n=== '+f+'  notes: '+JSON.stringify(b.notes));
  theirs[i].sessions.forEach((ts,k)=>{
    const sname=d.Sessions[k].Type;
    const rows=b.resultRows.filter(r=>r.Session===sname);
    ts.players.forEach(tp=>{
      const o=rows.find(r=>r.Name===tp.name); if(!o){ console.log(' ',sname,tp.name,'-> NOT IN OUR RESULTS (practice with no laps is skipped)'); return; }
      let sc=null;
      if(/^Race/.test(sname)){ ctx.__rows=rows; ctx.__laps=b.lapRows.filter(r=>r.Session===sname); const s=vm.runInContext(`rcScoreSession_(__rows,[],__laps,{classKey:function(){return 'A'},tables:{A:[25,18]},fastestLap:1,clean:1})`,ctx); sc=s.find(x=>String(x.userId)===String(o['User ID'])); }
      const diffs=[];
      const cmp=(k,a,b)=>{ if(String(a)!==String(b)) diffs.push(k+': theirs '+a+' | ours '+b); };
      cmp('laps',tp.laps,o.Laps);
      cmp('best ms',tp.best===null?'':Math.round(tp.best*1000),o['Best lap (ms)']);
      cmp('status',tp.status,sc?sc.status:o['Finish status']);
      if(/^Race/.test(sname)) cmp('total ms',Math.round(tp.total*1000),o['Total time (ms)']===''?0:o['Total time (ms)']);
      cmp('incident pts',tp.incPts,o['Incident points']);
      console.log(' ',sname.padEnd(8),tp.name,'theirs P'+tp.pos,'ours '+(sc?'P'+sc.pos:'P'+o.Position+' (server)'), diffs.length?('  DIFF -> '+diffs.join('; ')):'  same');
    });
  });
});
