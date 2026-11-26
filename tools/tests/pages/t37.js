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
  const p=await load('driver.html','/tmp/gs/e2e.js','?driver=101'); const d=p.d; ok(!p.errs.length,'driver page loads '+p.errs.join('|'));
  const ban=d.querySelector('.rr-banner'); ok(!!ban,'the driver banner is there');
  
  ok(![...ban.querySelectorAll('.rr-label')].some(l=>l.textContent.trim()==='Points'),'the banner has no Points stat');
  ok(ban.querySelectorAll('.rr-kv').length===4,'the banner shows Races, Wins, Podiums, Hours on track ('+ban.querySelectorAll('.rr-kv').length+')');
  ok(ban.querySelector('.rr-label').textContent==='Name'&&ban.querySelector('.rr-hero-title .rr-flag')&&ban.querySelector('.rr-label.rr-red'),'NAME header, flag and name, red country');
  ok(d.querySelector('.rr-page-title').textContent==='Driver profile','page title says Driver profile');
  const kvs=[...ban.querySelectorAll('.rr-banner-text .rr-kv-list > .rr-kv')]; ok(kvs.length===4,'four stats');
  const mark=ban.querySelector('.rr-banner-mark'); ok(mark&&/race_club_helmet\.png$/.test(mark.getAttribute('src')),'the banner uses the helmet');
  const hero=d.querySelector('.rr-hero'); const lab=hero&&hero.querySelector('.rr-label').textContent;
  ok(lab==='Current Car'||lab==='Last Car','the car box is labeled Current Car or Last Car ('+lab+')');
  ok(!/% of races/.test(hero.textContent),'no % of races stat ('+hero.textContent.replace(/\s+/g,' ')+')');
  ok(/Season/.test(hero.textContent)&&!/raced \d+ of/.test(hero.textContent),'the line under the car is about the league');
  console.log(fails?'FAILED '+fails:'ALL PASS (t37)');
})();
