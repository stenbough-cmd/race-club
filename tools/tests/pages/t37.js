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
  ok(!ban.querySelector(':scope > .rr-label'),'the banner has no Driver header');
  const mark=ban.querySelector('.rr-banner-mark'); ok(mark&&/Race Club R Black\.webp$/.test(mark.getAttribute('src')),'the banner uses the standard R mark (with the red bar)');
  const hero=d.querySelector('.rr-hero'); const lab=hero&&hero.querySelector('.rr-label').textContent;
  ok(lab==='Current Car'||lab==='Last Car','the car box is labeled Current Car or Last Car ('+lab+')');
  ok(!/% of races/.test(hero.textContent),'no % of races stat ('+hero.textContent.replace(/\s+/g,' ')+')');
  ok(/Season|round/.test(hero.textContent),'the line under the car is about the league');
  console.log(fails?'FAILED '+fails:'ALL PASS (t37)');
})();
