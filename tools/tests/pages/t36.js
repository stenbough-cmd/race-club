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
  /* the fixture is published data (DD.MM.YYYY from before this change, or MM/DD/YYYY from the new backend); the pages must show MM/DD/YYYY either way */
  for (const pg of ['index.html','leaderboards.html','drivers.html','news.html']) {
    const p=await load(pg,'/tmp/gs/e2e.js'); const txt=p.d.body.textContent;
    ok(!/\b\d{2}\.\d{2}\.\d{4}\b/.test(txt),pg+' has no DD.MM.YYYY date: '+(txt.match(/\b\d{2}\.\d{2}\.\d{4}\b/)||[''])[0]);
    if(pg==='leaderboards.html') ok(/\d{2}\/\d{2}\/\d{4}/.test(p.d.querySelector('[data-rr-view="schedule"]').textContent),'the Schedule shows MM/DD/YYYY');
  }
  console.log(fails?'FAILED '+fails:'ALL PASS (t36)');
})();
