const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,fixture,query,handler,session){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page+(query||''),pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  if(session) w.sessionStorage.setItem('rr-admin',JSON.stringify({name:'Matt',token:'t'.repeat(40),until:Date.now()+3600000}));
  const calls=[]; w.__calls=calls;
  w.fetch=(u,o)=>{ u=String(u);
    if(/script\.google\.com/.test(u)){ const req=JSON.parse(o.body); calls.push(req); return Promise.resolve({ok:true,json:()=>Promise.resolve(handler(req))}); }
    if(/game\.raceroom\.com/.test(u)) return Promise.resolve({ok:false,json:()=>Promise.reject()});
    const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];
    try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,json:()=>Promise.reject(),text:()=>Promise.reject()});} };
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
  for(const s of srcs){ if(/league\.js$/.test(s)){ if(fixture){ try{w.eval(fs.readFileSync(fixture,'utf8'));}catch(e){errs.push('fixture '+e.message);} } continue; } try{w.eval(fs.readFileSync(root+s.replace(/^\//,''),'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,700)); return {w,d:w.document,errs};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  // ---------- public protest page, open round
  let filed=null;
  const handler=(req)=>{ if(req.action==='fileProtest'){ filed=req; return req.password==='secret1'?{ok:true,protestId:'PR-X'}:{ok:false,error:'wrong-password'}; } return {ok:false,error:'unknown'}; };
  let p=await load('protest.html','/tmp/gs/stew_open.js','',handler,false);
  let t=p.d.body.textContent.replace(/\s+/g,' ');
  ok(!p.errs.length,'protest page loads: '+(p.errs.join('|')||'none'));
  [...p.d.querySelectorAll('button')].find(b=>/^Round 1/.test(b.textContent)).click(); await wait(100); t=p.d.body.textContent.replace(/\s+/g,' ');
  ok(/Protests open/.test(t) && /Pending/.test(t),'open round shows form and the pending protests');
  ok(!/pushed me wide|braked too late/.test(t),'no narrative on the page');
  // fill the form
  const sel=(label)=>[...p.d.querySelectorAll('.rr-select')].find(x=>x.textContent.startsWith(label));
  const pick=(label,opt)=>{ const s=sel(label); const li=[...s.querySelectorAll('li')].find(x=>x.textContent===opt); if(!li){console.log('no option',label,opt);return false;} li.click(); return true; };
  pick('Who are you','Second Driver'); pick('Driver you are reporting','Matt Stenzel'); pick('Reason','Reckless Driving');
  const raceSel=sel('Race'); if(raceSel) pick('Race','Race 3'); pick('Lap','Lap 3');
  const inputs=[...p.d.querySelectorAll('input[type=password]')]; inputs[0].value='bad'; inputs[0].dispatchEvent(new p.w.Event('input'));
  const ta=p.d.querySelector('textarea'); ta.value='Late move.'; ta.dispatchEvent(new p.w.Event('input'));
  const btn=[...p.d.querySelectorAll('button')].find(b=>b.textContent==='Submit protest');
  btn.click(); btn.click(); await wait(300);
  t=p.d.body.textContent.replace(/\s+/g,' ');
  ok(filed && filed.roundId==='1111111' && filed.race===3 && filed.lap===3 && filed.me==='222' && filed.other==='8261679' && filed.reason==='Reckless Driving','request sent with ids: '+JSON.stringify(filed&&{r:filed.roundId,me:filed.me,o:filed.other,race:filed.race,lap:filed.lap}));
  ok(/not the round password/.test(t),'wrong password message shown');
  inputs[0].value='secret1'; inputs[0].dispatchEvent(new p.w.Event('input'));
  const btn2=[...p.d.querySelectorAll('button')].find(b=>b.textContent==='Submit protest'); btn2.click(); btn2.click(); await wait(300);
  t=p.d.body.textContent.replace(/\s+/g,' ');
  ok(/Your protest was filed/.test(t),'success message');
  // ---------- settled: rulings table shows comment, results page shows the penalty, story addendum
  p=await load('protest.html','/tmp/gs/stew_settled.js','',handler,false);
  t=p.d.body.textContent.replace(/\s+/g,' ');
  ok(/Protests closed/.test(t),'settled round: protests closed (round 2 is newest)');
  const s=await load('story.html','/tmp/gs/stew_settled.js','?id=ST-1',handler,false);
  const st=s.d.body.textContent.replace(/\s+/g,' ');
  ok(/Steward decisions/.test(st) && /Second Driver/.test(st) && /1 point/.test(st),'story shows Steward decisions: '+st.slice(st.indexOf('Steward decisions'),st.indexOf('Steward decisions')+160));
  // ---------- admin stewarding page
  const proto={id:'PR-1',round:1,roundId:'1111111',race:1,by:'222',byName:'Second Driver',against:'8261679',againstName:'Matt Stenzel',self:false,target:'8261679',targetName:'Matt Stenzel',lap:2,reason:'Bad Rejoin',narrative:'He pushed me wide.',filed:'22.11.2026 10:00',status:'Filed',outcome:'',penalty:'',penaltyWords:'',comment:'',ruled:'',ruledBy:'',history:'',active:false};
  const flag={roundId:'2222222',n:2,userId:'222',name:'Second Driver',lockedCar:'BMW M1',lockedClass:'Class A',usedCar:'Audi',usedClass:'Class A',state:'open',penaltyId:'',comment:''};
  const log=[];
  const H=(req)=>{ log.push(req.action); if(req.action==='listStewarding') return {ok:true,seasonId:'S-1',seasons:[{seasonId:'S-1',name:'Season 01',status:'Active'}],rounds:[],protests:[proto],flags:[flag],reasons:[],waiting:2};
    if(req.action==='ruleProtest'){ log.push(JSON.stringify([req.outcome,req.penalty,req.comment])); return {ok:true,published:true}; } if(req.action==='ruleFlag'){ log.push(JSON.stringify([req.decision,req.comment])); return req.decision==='dsq'&&req.comment.length<10?{ok:false,error:'comment-needed'}:{ok:true}; } return {ok:true}; };
  const a=await load('stewarding.html',null,'',H,true);
  ok(!a.errs.length,'stewarding page loads: '+(a.errs.join('|')||'none'));
  const vp=a.d.querySelector('[data-rr-view=protests]'); let at=vp.textContent.replace(/\s+/g,' ');
  ok(/Second Driver/.test(at)&&/Bad Rejoin/.test(at)&&/1 protest is waiting/.test(at),'protest listed: '+at.slice(at.indexOf('Protests')+8,at.indexOf('Protests')+120));
  ok(a.d.querySelectorAll('.rr-subtab-alert').length===2,'both tabs flagged');
  [...vp.querySelectorAll('button')].find(b=>b.textContent==='Rule').click(); await wait(100);
  at=vp.textContent.replace(/\s+/g,' ');
  ok(/He pushed me wide/.test(at)&&/Only you see this/.test(at),'panel shows the narrative to the admin');
  // try to save without a choice
  let save=[...vp.querySelectorAll('button')].find(b=>b.textContent==='Save ruling'); save.click(); await wait(50);
  ok(/Choose what to do first/.test(vp.textContent)&&!log.includes('ruleProtest'),'no ruling without a choice');
  // choose DSQ without comment
  const rs=[...vp.querySelectorAll('.rr-select')].find(x=>x.textContent.startsWith('Ruling')); [...rs.querySelectorAll('li')].find(x=>/DSQ/.test(x.textContent)).click();
  save=[...vp.querySelectorAll('button')].find(b=>b.textContent==='Save ruling'); save.click(); await wait(50);
  ok(/needs a comment/.test(vp.textContent)&&!log.includes('ruleProtest'),'DSQ without comment blocked in the page');
  const ta2=vp.querySelector('textarea'); ta2.value='Intentional contact in the braking zone.'; ta2.dispatchEvent(new a.w.Event('input'));
  save=[...vp.querySelectorAll('button')].find(b=>b.textContent==='Save ruling'); save.click(); save.click(); await wait(300);
  ok(log.includes('ruleProtest')&&log.some(x=>/\["penalty","dsq","Intentional contact/.test(x)),'ruling sent: '+log.filter(x=>/penalty/.test(x)).join());
  // policy tab
  const vf=a.d.querySelector('[data-rr-view=policy]'); const ft=vf.textContent.replace(/\s+/g,' ');
  ok(/Audi/.test(ft)&&/BMW M1/.test(ft)&&/Waiting/.test(ft),'policy flag listed');
  [...vf.querySelectorAll('button')].find(b=>b.textContent==='Decide').click(); await wait(100);
  ok(/Leave it/.test(vf.textContent)&&/DSQ for the night/.test(vf.textContent),'flag panel has both decisions');
  console.log(fails?'FAILURES '+fails:'ALL PASSED'); process.exit(0);
})();
