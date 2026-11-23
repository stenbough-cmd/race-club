const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,query,pre){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page+(query||''),pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.reject(1),text:()=>Promise.resolve('')});
  const errs=[]; for(const s of srcs){ if(/league\.js$/.test(s)){ w.eval(fs.readFileSync('/tmp/gs/e2e.js','utf8')); continue;} try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} if(/raceroom-data\.js$/.test(s)&&pre) pre(w); }
  await new Promise(r=>setTimeout(r,400)); return {w,d:w.document,errs};
}
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const S="Ann Alpha took the lead on lap two and never looked back, holding a steady gap through the middle of the race. ";
  const mk=(i,body,photos)=>({id:'ST-'+i,kind:'story',eyebrow:'Race story',title:'Story number '+i,date:'0'+(i%9+1)+'.11.2026',desc:'d',body:body,photos:photos||[],byline:'Race Club',sort:i===1?'2026-12-01100':'2026-11-0'+(i%9+1)+'10'+i});
  const ph=[{src:'photos/a.jpg',caption:'A',at:0,side:'right'},{src:'photos/b.jpg',caption:'B',at:0,side:'left'},{src:'photos/c.jpg',caption:'C',at:0,side:'right'}];
  const news=[mk(1,[S.repeat(16)],ph)]; for(let i=2;i<=12;i++) news.push(mk(i,['One.'],[]));
  const set=w=>{ w.RR_LIVE=w.RR_LIVE||{}; };
  const pre=w=>{ try{ w.RR_DATA_NEWS=news; }catch(e){} };
  const pre2=w=>{ w.RR_DATA.news.length=0; news.forEach(n=>w.RR_DATA.news.push(n)); };
  let p=await load('story.html','?id=ST-1',pre2); const d=p.d;
  ok(!p.errs.length,'story page loads '+p.errs.join('|'));
  const rows=[...d.querySelectorAll('.rr-sidelist-row')];
  ok(rows.length===10,'left list shows 10 stories ('+rows.length+')');
  ok(rows.filter(r=>r.getAttribute('aria-pressed')==='true').length===1,'exactly one row is highlighted');
  const hero=d.querySelector('.rr-story-hero'); ok(hero&&/photos\/a\.jpg/.test(hero.style.backgroundImage)&&hero.querySelector('.rr-story-title').textContent==='Story number 1','banner uses the first photo with the title over it');
  const art=d.querySelector('.rr-article'); const kids=[...art.children].map(c=>c.nodeName);
  const paras=kids.filter(k=>k==='P').length; ok(paras>=4,'giant paragraph is split ('+paras+' paragraphs)');
  const figs=[...art.querySelectorAll('figure img')].map(i=>i.getAttribute('src')); ok(figs.length===2&&!figs.includes('photos/a.jpg'),'the other two photos sit in the story, not the banner picture ('+figs.join(',')+')');
  const idx=f=>kids.indexOf('FIGURE')<0?-1:[...art.children].findIndex(c=>c.nodeName==='FIGURE'&&c.querySelector('img').getAttribute('src')===f);
  ok(idx('photos/b.jpg')>0&&idx('photos/c.jpg')>idx('photos/b.jpg'),'photos are spread down the story, not all at the top');
  const q=await load('story.html','?id='+(news.slice().sort((a,b)=>String(a.sort).localeCompare(String(b.sort)))[0].id),pre2); ok([...q.d.querySelectorAll('.rr-sidelist-row')].length===11&&[...q.d.querySelectorAll('.rr-sidelist-row')].some(r=>r.getAttribute('aria-pressed')==='true'),'an older story is added below the latest 10 and highlighted'); 
  const nw=await load('news.html','',pre2); console.log('PROMOS',[...nw.d.querySelectorAll('.rr-promo')].map(x=>x.className+'|'+x.style.backgroundImage+'|'+x.textContent.slice(0,30)).join(' ## '), nw.errs.join('|')); const tile=nw.d.querySelector('.rr-promo.rr-has-photo'); ok(tile&&/photos\/a\.jpg/.test(tile.style.backgroundImage),'News tile uses the story first photo');
  console.log(fails?'FAILED '+fails:'ALL PASS (t32)');
})();
