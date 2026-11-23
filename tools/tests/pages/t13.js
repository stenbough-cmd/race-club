const src=require('fs').readFileSync('t11.js','utf8'); const loadSrc=src.slice(0,src.indexOf('(async()=>{'));
eval(loadSrc.replace("const {JSDOM}","var {JSDOM}").replace("const root","var root"));
var wait=ms=>new Promise(r=>setTimeout(r,ms)); var fails=0; var ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const s=await load('leaderboards.html','/tmp/pg/fx_fin.js','',()=>({ok:true}),false);
  ok(!s.errs.length,'standings loads '+s.errs.join('|'));
  const txt=s.d.querySelector('main').textContent; ok(/Champions/.test(txt)&&/Matt Stenzel/.test(txt)&&/Procar/.test(txt),'champions table on standings');
  const calls=[]; let ended=false;
  const base={ok:true,clearWord:'CLEAR',seasons:[{seasonId:'SE1',name:'Season 1',status:'Active'}],seasonId:'SE1'};
  const H=r=>{calls.push(r);
    if(r.action==='getSeasonEnd') return Object.assign({},base,{seasons:[{seasonId:'SE1',name:'Season 1',status:ended?'Finished':'Active'}],season:{seasonId:'SE1',name:'Season 1',status:ended?'Finished':'Active',ended:ended?'2026-11-23 10:00':'',total:3,live:2,cancelled:0,notRun:1,waiting:0,openProtests:0,blockers:[]},
      champions:[{cls:'10',className:'GT3',uid:'2',name:'Sam',points:55.5,wins:2,runnerUp:'Matt',margin:15.5}],story:ended?{status:'published'}:null});
    if(r.action==='endSeason'){ended=true;return {ok:true,champions:[],story:{ok:true},published:true};}
    if(r.action==='listRounds') return {ok:true,seasons:[],rounds:[]};
    if(r.action==='listPosted') return {ok:true,posts:[],more:false};
    return {ok:true,cleared:{},published:true};};
  const a=await load('league-management.html',null,'',H,true); const d=a.d;
  ok(!a.errs.length,'page loads '+a.errs.join('|'));
  const v=d.querySelector('[data-rr-view=season]'); const btn=t=>[...v.querySelectorAll('button')].find(b=>b.textContent===t);
  ok(/GT3/.test(v.textContent)&&/Sam/.test(v.textContent)&&/Champions if the season ended now/.test(v.textContent),'champion preview shown');
  ok(/1 round has not been raced/.test(v.textContent),'unraced warning');
  const e=btn('End season'); e.click(); await wait(20); ok(e.classList.contains('rr-confirming'),'end season arms'); e.click(); await wait(150);
  const ec=calls.filter(c=>c.action==='endSeason')[0]; ok(ec&&ec.seasonId==='SE1','endSeason sent'); ok(/The season is ended/.test(v.textContent),'done message');
  ok(btn('Reopen season')&&!btn('End season'),'reopen offered after ending'); ok(/Champions/.test(v.textContent)&&!/if the season ended now/.test(v.textContent),'champions heading final');
  // clear needs the word
  const c=btn('Clear test data'); c.click(); await wait(20); ok(!c.classList.contains('rr-confirming'),'clear does not arm without word'); ok(/Type the word CLEAR/.test(v.textContent),'word message');
  const inp=[...v.querySelectorAll('.rr-input input')].pop(); inp.value='CLEAR'; inp.dispatchEvent(new a.w.Event('input'));
  const c2=btn('Clear test data'); c2.click(); await wait(20); ok(c2.classList.contains('rr-confirming'),'arms with the word'); c2.click(); await wait(150);
  ok(calls.some(x=>x.action==='clearTestData'&&x.word==='CLEAR'),'clearTestData sent');
  console.log(fails?'FAILURES '+fails:'ALL PASSED'); process.exit(0);
})();
