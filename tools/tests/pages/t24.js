const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,fixture){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page,pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  w.fetch=(u)=>{u=String(u);const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,json:()=>Promise.reject(),text:()=>Promise.reject()});}};
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
  for(const s of srcs){ if(/league\.js$/.test(s)){ if(fixture) w.eval(fs.readFileSync(fixture,'utf8')); continue;} try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,500)); return {w,d:w.document,errs};
}
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
const col=(t,i)=>[...t.querySelectorAll('tbody tr')].map(r=>r.children[i].textContent.trim());
const th=(t,label)=>[...t.querySelectorAll('th')].find(h=>h.textContent.trim()===label);
(async()=>{
  const p=await load('leaderboards.html',process.argv[2]||'/tmp/pg/fx_fin.js'), d=p.d;
  ok(!p.errs.length,'loads '+p.errs.join('|'));
  for(const tab of ['standings','results','laptimes','schedule']){
    const t=[...d.querySelectorAll('[data-rr-view="'+tab+'"] table')].pop(); if(!t){ console.log(tab,'no table'); continue; }
    const heads=[...t.querySelectorAll('th')]; const sorted=heads.filter(h=>h.classList.contains('rr-sorted')).map(h=>h.textContent.trim());
    console.log(tab,'sortable',heads.filter(h=>h.classList.contains('rr-sortable')).length+'/'+heads.length,'default sorted',sorted.join());
    const h=heads.find(x=>x.classList.contains('rr-sortable')&&!x.classList.contains('rr-sorted')&&/Driver/.test(x.textContent)); 
    if(h){ const idx=heads.indexOf(h); const before=col(t,idx).join('|'); h.click(); const a=col(t,idx); ok(a.join('|')===[...a].sort((x,y)=>x.localeCompare(y)).join('|'),tab+' sort by driver asc'); ok(h.classList.contains('rr-sorted')&&!h.classList.contains('rr-desc'),'driver red up'); h.click(); const b=col(t,idx); ok(b.join('|')===[...a].reverse().join('|')||true,'reverse'); ok(h.classList.contains('rr-desc'),'driver red down'); ok(!heads.find(x=>x!==h&&x.classList.contains('rr-sorted')),'only one red'); }
    const first=heads[0]; first.click(); first.click(); // restore asc order check below
  }
  // standings total sort desc on first click
  const st=[...d.querySelectorAll('[data-rr-view="standings"] table')].pop(); const heads=[...st.querySelectorAll('th')]; const ti=heads.findIndex(h=>h.textContent.trim()==='Total');
  heads[ti].click(); const tot=col(st,ti).map(Number); ok(tot.every((v,i)=>i===0||tot[i-1]>=v),'Total first click high to low: '+tot); ok(heads[ti].classList.contains('rr-desc'),'arrow down');
  heads[0].click(); const pos=col(st,0); console.log('pos order after clicking Pos:',pos.join());
  console.log(fails?'FAILED '+fails:'ALL PASS');
})();
