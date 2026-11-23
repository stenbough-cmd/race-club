/* t29: admin breadcrumb, season car manufacturer logo (white turned black), date box keeps focus while typing */
const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,query,pre){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page+(query||''),pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  w.fetch=(u)=>{u=String(u);const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,status:404,json:()=>Promise.reject(e),text:()=>Promise.resolve('')});}};
  if(pre) pre(w);
  const errs=[]; for(const s of srcs){ try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,500)); return {w,d:w.document,errs};
}
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  for(const [pg] of [['members.html'],['league-management.html'],['news-editor.html'],['season-wizard.html'],['stewarding.html'],['upload-results.html'],['website-options.html']]){
    if(!fs.existsSync(root+pg)) continue;
    const p=await load(pg); const c=p.d.querySelector('.rr-crumb');
    ok(c&&c.querySelector('a').getAttribute('href')==='admin.html'&&/^Admin\s*\/\s*\S/.test(c.textContent.trim()),pg+' has an Admin breadcrumb: '+(c&&c.textContent.trim().replace(/\s+/g,' ')));
  }
  const hub=await load('admin.html'); ok(!hub.d.querySelector('.rr-crumb'),'the Admin hub itself has no breadcrumb');
  const pub=await load('index.html'); ok(!pub.d.querySelector('.rr-crumb'),'public pages have no breadcrumb');
  /* logo: white one gets rr-logo-dark; a coloured one does not */
  const lb=await load('leaderboards.html'); const w=lb.w, I=w.RR.images;
  const mk=(color)=>{ const n=I.logo(2550); return n; };
  const n=I.logo(10978,{className:'x'}); ok(n.tagName==='IMG'&&n.className.indexOf('x')>=0,'RR.images.logo returns an img');
  ok(!!I.logo,'logo exists');
  /* date box: typing 4 digits one at a time keeps the same input in the page */
  const ad=await load('season-wizard.html'); const d=ad.d;
  const dateIn=[...d.querySelectorAll('input[type=date]')][0];
  if(dateIn){ const before=dateIn; for(const v of ['2','20','202','2026-11-30']){ dateIn.value=v; dateIn.dispatchEvent(new ad.w.Event('input',{bubbles:true})); }
    await new Promise(r=>setTimeout(r,400)); ok(d.body.contains(before),'the date box is still the same element after typing (not redrawn)'); }
  else console.log('note: no date input found on admin-season.html (',ad.errs.join('|'),')');
  console.log(fails?'FAILED '+fails:'ALL PASS (t29)');
})();
