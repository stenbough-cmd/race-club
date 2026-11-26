/* t34: Season Wizard: no drafts and nothing kept in the browser, Create season / Delete season / Reset wizard, the seasons list loads by itself,
   Create is blocked while a season runs, Delete season names the season, one season password with a No password box. */
const {JSDOM}=require('jsdom'),fs=require('fs');const root=require('path').resolve(__dirname,'../../../')+'/';
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function load(seasons){
  const raw=fs.readFileSync(root+'season-wizard.html','utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/season-wizard.html',pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  const calls=[];
  w.fetch=(u,o)=>{u=String(u);
    if(/script\.google\.com/.test(u)){ const req=JSON.parse(o.body); calls.push(req);
      const res=req.action==='listSeasons'?{ok:true,seasons:seasons}:req.action==='deleteSeason'||req.action==='changePassword'?{ok:true}:req.action==='loadSeason'?{ok:true,season:{password:'abc123',noPassword:false}}:{ok:true,members:[]};
      return Promise.resolve({ok:true,json:()=>Promise.resolve(res)}); }
    const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,status:404,json:()=>Promise.reject(e),text:()=>Promise.resolve('')});}};
  w.sessionStorage.setItem('rr-admin',JSON.stringify({name:'Matt',token:'t'.repeat(40),until:Date.now()+3600000}));
  const errs=[]; for(const s of srcs){ try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,600)); return {w,d:w.document,errs,calls};
}
const btn=(d,t)=>[...d.querySelectorAll('button')].filter(b=>b.textContent.trim()===t)[0];
const txt=d=>d.body.textContent.replace(/\s+/g,' ');
(async()=>{
  const running=[{seasonId:'S-AAAAAA',name:'Season 01',status:'Active',firstRound:'2026-12-03',rounds:'4',saved:'2026-11-25 10:00',savedBy:'Matt'}];
  let p=await load(running), d=p.d;
  ok(!p.errs.length,'the wizard loads without errors '+p.errs.join('|'));
  ok(p.calls.some(c=>c.action==='listSeasons'),'the seasons in the Sheet are listed as soon as the page opens');
  ok(p.w.localStorage.length===0,'nothing is kept in the browser ('+p.w.localStorage.length+' keys)');
  ['Create season','Reset wizard'].forEach(t=>ok(!!btn(d,t),'button: '+t));
  ok(!btn(d,'Delete season'),'no top Delete season button (the list rows have Delete)');
  ['Save a draft','Start over','Show saved seasons','Create a season'].forEach(t=>ok(!btn(d,t),'no button: '+t));
  ok(!btn(d,'Load'),'no Load button on the seasons in the list');
  const create=btn(d,'Create season');
  ok(create.disabled,'Create season is disabled while a season is running');
  ok(/Season 01/.test(create.getAttribute('data-rr-tip')||''),'... and its tooltip names the running season');
  ok(/Season 01/.test(txt(d))&&/running season/.test(txt(d)),'the page says which season is running');
  const rowDel=[...d.querySelectorAll('tbody button')].filter(b=>b.textContent.trim()==='Delete')[0]; rowDel.click();
  ok(/Confirm delete "Season 01"/.test(rowDel.getAttribute('data-rr-tip')||''),'the Delete on a row of the list names its season too');
  ok(!!btn(d,'Export season (.zip)'),'each season in the list has Export season (.zip)');
  rowDel.click(); await new Promise(r=>setTimeout(r,400));
  ok(p.calls.some(c=>c.action==='deleteSeason'&&c.seasonId==='S-AAAAAA'),'the second click deletes that season');
  ok(/Deleted "Season 01"/.test(txt(p.d)),'the page says which season was deleted');
  /* step 1: the password */
  p=await load([]); d=p.d;
  ok(!btn(d,'Create season').disabled,'Create season is available when no season is running');
  ok(/Server password/.test(txt(d)),'step 1 has a Server password box');
  const noPw=[...d.querySelectorAll('label')].filter(l=>/No password \(public racing server\)/.test(l.textContent))[0];
  ok(!!noPw,'step 1 has the No password (public racing server) box');
  ok(!/Round \d+ ·.*Password/.test(txt(d)),'no password box per round');
  const pwInput=[...d.querySelectorAll('input')].filter(i=>/Server password/.test((i.closest('label')||i.parentNode).textContent))[0];
  const issues=()=>[...d.querySelectorAll('[data-rr-view="export"] .rr-notice')].map(n=>n.textContent).join(' | ');
  ok(/server password is empty/.test(issues()),'Checks asks for the password ('+issues().slice(0,160)+')');
  const cb=noPw.querySelector('input'); cb.checked=true; cb.dispatchEvent(new p.w.Event('change',{bubbles:true})); cb.dispatchEvent(new p.w.Event('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,200));
  ok(!/server password is empty/.test(issues()),'ticking No password clears that check');
  const pw2=[...d.querySelectorAll('input')].filter(i=>/Server password/.test((i.closest('label')||i.parentNode).textContent))[0];
  ok(pw2&&pw2.readOnly,'the password box is locked while No password is ticked');
  const S=p.w.RR_ADMIN.season(); ok(S.noPassword===true&&S.password==='','the season records noPassword');
  const file=p.w.RR_ADMIN.buildRoundFile(Object.assign({id:'1234567',layoutId:1,date:'2026-12-03',time:'20:00',weekend:null}),[]);
  ok(file.GameSettings[0].Password==='','a no-password season writes an empty server password');
  S.noPassword=false; S.password='abc123';
  const f2=p.w.RR_ADMIN.buildRoundFile({id:'1234567',layoutId:1,date:'2026-12-03',time:'20:00',weekend:null},[]);
  ok(f2.GameSettings[0].Password==='abc123','the season password is in every round file');
  /* Change password in the season row */
  p=await load(running); d=p.d;
  const chgB=[...d.querySelectorAll('tbody button')].filter(b=>b.textContent.trim()==='Change password')[0];
  ok(!!chgB,'each season row has a Change password button');
  chgB.click(); await new Promise(r=>setTimeout(r,300));
  const win=d.querySelector('.rr-modal'); ok(!!win&&/Change password: Season 01/.test(win.textContent),'it opens a window that names the season');
  const wi=win&&win.querySelector('input[type=text],input:not([type])'); ok(wi&&wi.value==='abc123','the window shows the current password');
  ok([...win.querySelectorAll('button')].some(b=>b.textContent.trim()==='Export new file (.zip)'),'the window has an Export new file (.zip) button');
  const sv=[...win.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Save password')[0]; ok(!!sv,'Save password button');
  sv.click(); ok(/Confirm new password for "Season 01"/.test(sv.getAttribute('data-rr-tip')||''),'first click asks to confirm and names the season');
  sv.click(); await new Promise(r=>setTimeout(r,400));
  ok(p.calls.some(c=>c.action==='changePassword'&&c.seasonId==='S-AAAAAA'&&c.password==='abc123'&&c.noPassword===false),'second click sends the new password for that season');
  ok(!d.querySelector('.rr-modal')&&/Password changed for "Season 01"/.test(txt(d)),'the window closes and the page says the password changed');
  console.log(fails?'\nFAILED '+fails:'\nALL PASS (t34)');
})();
