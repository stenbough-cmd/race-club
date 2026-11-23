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
  let p=await load('admin.html',true), d=p.d;
  ok(!p.errs.length,'admin loads '+p.errs.join('|'));
  const tools=[...d.querySelectorAll('.rr-tool')]; ok(tools.length===6,'6 tool buttons');
  ok(tools.every(t=>t.querySelector('svg')&&t.href),'each has icon and link'); ok(!d.querySelector('.rr-promo'),'no photo promos');
  console.log(tools.map(t=>t.querySelector('h3').textContent).join(' | '));
  const nav=[...d.querySelectorAll('.rr-nav-item')].map(a=>a.textContent); ok(nav.join()==='News,League,Drivers','nav '+nav);
  ok(d.querySelector('.rr-icon-btn[aria-label="Back"]')&&!d.querySelector('.rr-hide-portrait'),'back/forward present, no portrait hiding');
  ok(!/rr-hide-portrait/.test(fs.readFileSync(root+'css/race-club.css','utf8')),'css rule gone');
  p=await load('website-options.html',true); ok(!p.errs.length,'docs ok '+p.errs.join('|'));
  p=await load('index.html',false); console.log([...p.d.querySelectorAll('.rr-nav-item')].map(a=>a.textContent).join());
  console.log(fails?'FAILED':'ALL PASS');
})();
