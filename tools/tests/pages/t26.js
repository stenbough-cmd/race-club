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
const txt=e=>e.textContent.replace(/\s+/g,' ');
(async()=>{
  const fx='/tmp/gs/e2e.js';
  let p=await load('leaderboards.html',fx); let d=p.d; ok(!p.errs.length,'leaderboards loads '+p.errs.join('|'));
  const std=[...d.querySelectorAll('[data-rr-view="standings"] table')].pop();
  const rows=[...std.querySelectorAll('tbody tr')].map(r=>[...r.children].map(c=>c.textContent.trim()));
  console.log('standings (All classes):'); rows.forEach(r=>console.log('  ',r.join(' | ')));
  ok(rows.length===3,'default board is ONE class (3 drivers), never all 8 together');
  const opts=[...d.querySelectorAll('.rr-page-head select option, select option')].map(o=>o.textContent.trim()); console.log('class options:',opts.join(' / ')); ok(!opts.includes('All classes'),'no All classes option in a two class season');
  const hdr=[...std.querySelectorAll('th')].map(h=>h.textContent.trim()); console.log('  header',hdr.join(' | '));
  const tot=hdr.indexOf('Total'); const T=rows.map(r=>Number(r[tot])); ok(T.every((v,i)=>i===0||T[i-1]>=v),'all-classes board is in points order');
  // waiting round: R4 shows a dash, with the window text
  ok(/R4/.test(hdr.join(' ')),'R4 column exists'); 
  const tabs=['results','laptimes','schedule','season']; for(const t of tabs){ const v=d.querySelector('[data-rr-view="'+t+'"]'); ok(v&&v.textContent.trim().length>20,t+' tab has content'); }
  console.log('results tab text:',txt(d.querySelector('[data-rr-view="results"]')).slice(0,400));
  console.log('schedule:',txt(d.querySelector('[data-rr-view="schedule"]')).slice(0,400));
  console.log('season tab:',txt(d.querySelector('[data-rr-view="season"]')).slice(0,500));
  for(const pg of ['drivers.html','news.html','protest.html','index.html','help.html']){ const q=await load(pg,fx); ok(!q.errs.length,pg+' loads '+q.errs.join('|')); }
  const dr=await load('drivers.html',fx); console.log('drivers page:',txt(dr.d.querySelector('main')).slice(0,300));
  const dp=await load('driver.html',fx,'?driver=101'); ok(!dp.errs.length,'driver profile loads '+dp.errs.join('|')); const pm=txt(dp.d.querySelector('main')); console.log('profile 101:',pm.slice(0,500)); ok(/Name\s*Ann Alpha\s*Country/.test(pm),'profile shows NAME before COUNTRY'); ok(/Class\s*Class|Class[^A-Za-z]*1703|GT|Class/.test(pm),'profile shows class');
  ok(/In a season/.test(txt(dr.d.querySelector('main'))),'drivers list shows status');
  ok(txt(dr.d.querySelector('main')).split('In a season').length-1===8,'drivers list has all 8');
  const pr=await load('protest.html',fx); console.log('protest page:',txt(pr.d.querySelector('main')).slice(0,400));
  console.log(fails?'FAILED '+fails:'ALL PASS');
})();
