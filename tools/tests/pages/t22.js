const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,session){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page,pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  if(session) w.sessionStorage.setItem('rr-admin',JSON.stringify({name:'Matt',token:'t'.repeat(40),until:Date.now()+3600000}));
  w.fetch=()=>Promise.resolve({ok:false,json:()=>Promise.reject(),text:()=>Promise.reject()});
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
  for(const s of srcs){ try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,300)); return {w,d:w.document,errs};
}
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  let p=await load('help.html',false); let d=p.d;
  ok(!p.errs.length,'help loads '+p.errs.join('|'));
  ok(d.querySelector('.rr-page-title').textContent==='Help','title Help');
  const tabs=[...d.querySelectorAll('.rr-subtab')].map(a=>a.textContent); ok(tabs.join()==='The league,Points,Penalties','tabs '+tabs);
  ok(d.querySelectorAll('[data-rr-view] .rr-panel').length===10,'10 panels: '+d.querySelectorAll('[data-rr-view] .rr-panel').length);
  ok(!d.querySelector('.rr-topbar-end'),'nothing sits at the top right of the bar (no help or protest icon)');
  const words=d.querySelector('main').textContent.split(/\s+/).length; console.log('help words',words);
  p=await load('website-options.html',true); d=p.d;
  ok(!p.errs.length,'docs loads '+p.errs.join('|'));
  ok(d.querySelector('.rr-page-title').textContent==='Website Documentation','title');
  const t2=[...d.querySelectorAll('.rr-subtab')].map(a=>a.textContent); console.log(t2.join(' | '));
  ok(t2.length===7,'7 tabs');
  [...d.querySelectorAll('[data-rr-view]')].forEach(v=>console.log(v.getAttribute('data-rr-view'),'panels',v.querySelectorAll('.rr-panel').length,'tables',v.querySelectorAll('table').length,'rows',v.querySelectorAll('tbody tr').length));
  ok(!/—/.test(d.body.textContent),'no em dash');
  const t3=d.querySelector('[data-rr-view="database"]'); ok(t3&&t3.textContent.length>100,'old tabs still render');
  console.log(fails?'FAILED '+fails:'ALL PASS');
})();
