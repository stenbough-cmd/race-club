const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
async function load(page,fixture,query,handler,session){
  const raw=fs.readFileSync(root+page,'utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const html=raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost/'+page+(query||''),pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  if(session) w.sessionStorage.setItem('rr-admin',JSON.stringify({name:'Matt',token:'t'.repeat(40),until:Date.now()+3600000}));
  const calls=[]; w.__calls=calls;
  w.fetch=(u,o)=>{ u=String(u);
    if(/script\.google\.com/.test(u)){ const req=JSON.parse(o.body); calls.push(req); return Promise.resolve({ok:true,json:()=>Promise.resolve(handler(req))}); }
    if(/game\.raceroom\.com/.test(u)) return Promise.resolve({ok:false,json:()=>Promise.reject()});
    const p=root+u.replace(/^https?:\/\/[^/]+\//,'').split('?')[0];
    try{const t=fs.readFileSync(p,'utf8');return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)});}catch(e){return Promise.resolve({ok:false,json:()=>Promise.reject(),text:()=>Promise.reject()});} };
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
  for(const s of srcs){ if(/league\.js$/.test(s)){ if(fixture){ try{w.eval(fs.readFileSync(fixture,'utf8'));}catch(e){errs.push('fixture '+e.message);} } continue; } try{w.eval(fs.readFileSync(root+s.replace(/^\//,''),'utf8'));}catch(e){errs.push(s+': '+e.message);} }
  await new Promise(r=>setTimeout(r,700)); return {w,d:w.document,errs};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const calls=[]; let choice={};
  const photos=[{src:'https://x/1.jpg',caption:'Podium'},null,null];
  const H=(req)=>{ calls.push(req); if(req.action==='getSeasonEnd') return {ok:true,seasons:[],seasonId:''}; if(req.action==='listRounds') return {ok:true,seasons:[{seasonId:'S-1',name:'Season 01',status:'Active',preview:null}],rounds:[{id:'1111111',season:'S-1',n:'1',track:'Monza',layout:'GP',date:'2026-11-01',time:'20:00',zone:'America/Detroit',status:'Provisional',protestCloses:'2026-11-02 08:00',waiting:null,held:null,story:null,note:'',rivalries:[],photos:photos,photoChoice:choice,drivers:[]}]}; if(req.action==='listPosted') return {ok:true,posts:[],more:false}; return {ok:true,published:true}; };
  const a=await load('league-management.html',null,'',H,true);
  ok(!a.errs.length,'page loads: '+(a.errs.join('|')||'none'));
  const v=a.d.querySelector('[data-rr-view=rounds]');
  [...v.querySelectorAll('button')].find(b=>b.textContent==='Story').click(); await wait(100);
  const checks=()=>[...v.querySelectorAll('.rr-check')].map(c=>c.textContent+':'+(c.querySelector('input').checked?'on':'off')+(c.querySelector('input').disabled?'(disabled)':''));
  console.log(checks().join(' | '));
  ok(checks().some(x=>/^Use a track photo:off/.test(x)),'1 upload, untouched: track photo is off');
  ok(checks().filter(x=>/^Hero/.test(x)).length===1,'a Hero tick next to the uploaded photo');
  // tick the track photo
  [...v.querySelectorAll('.rr-check')].find(c=>/Use a track photo/.test(c.textContent)).querySelector('input').click(); await wait(50);
  ok(checks().filter(x=>/^Hero/.test(x)).length===2 && /Use a track photo:on/.test(checks().join('|')),'track ticked: second Hero tick appears');
  ok(checks().filter(x=>/^Hero.*:on/.test(x)).length===1,'exactly one hero ticked by default (the track picture)');
  // make photo 1 the hero
  [...v.querySelectorAll('.rr-check')].filter(c=>/^Hero/.test(c.textContent))[0].querySelector('input').click(); await wait(50);
  const heroes=checks().filter(x=>/^Hero/.test(x)); ok(heroes[0].endsWith(':on')&&heroes[1].endsWith(':off'),'hero moved to photo 1: '+heroes.join(','));
  [...v.querySelectorAll('button')].find(b=>b.textContent==='Save picture choices').click(); await wait(100);
  const sent=calls.filter(c=>c.action==='savePhotoChoice')[0]; ok(sent && sent.hero==='1' && sent.track===true && sent.roundId==='1111111','saved: '+JSON.stringify(sent&&{hero:sent.hero,track:sent.track}));
  console.log(fails?'FAILURES '+fails:'ALL PASSED'); process.exit(0);
})();
