const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,fixture,query){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page+(query||''),pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  w.fetch=(u)=>{u=String(u);const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,json:()=>Promise.reject(),text:()=>Promise.reject()});}};
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
  for(const s of srcs){ if(/league\.js$/.test(s)){ w.eval(fs.readFileSync(fixture,'utf8')); continue;} try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,500)); return {w,d:w.document,errs};
}
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const p=await load('leaderboards.html','/tmp/gs/e2e.js'); const d=p.d;
  const v=d.querySelector('[data-rr-view="season"]'); const heads=[...v.querySelectorAll('h2,h3,.rr-heading')].map(h=>h.textContent.trim().toUpperCase());
  console.log(heads.join(' / '));
  const i=heads.indexOf('TRACKS'), r=heads.indexOf('RACE RULES'); ok(i>=0,'Season tab has a Tracks container'); ok(i<r,'Tracks sits above Race rules');
  const a=[...v.querySelectorAll('a')].filter(x=>/store\/tracks$/.test(x.href))[0]; ok(!!a&&/Visit the RaceRoom store to purchase content/.test(a.textContent)&&a.target==='_blank','the Tracks container has the store link');
  const panel=a&&a.closest('.rr-panel'); const rows=panel?panel.querySelectorAll('tbody tr').length:0; console.log('track rows',rows,'|',panel&&panel.textContent.replace(/\s+/g,' ').slice(0,200)); ok(rows>=1,'each track is listed');
  console.log(fails?'FAILED '+fails:'ALL PASS (t35)');
})();
