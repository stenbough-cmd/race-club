const {JSDOM}=require('jsdom'),fs=require('fs');const root='/mnt/user-data/uploads/Race Club/';
(async()=>{
  const raw=fs.readFileSync(root+'league-management.html','utf8'); const srcs=[...raw.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const dom=new JSDOM(raw.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,''),{runScripts:'outside-only',url:'http://localhost/league-management.html',pretendToBeVisual:true});
  const w=dom.window; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){}}));
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.reject(1),text:()=>Promise.resolve('')});
  const errs=[]; for(const s of srcs){ try{w.eval(fs.readFileSync(root+s,'utf8'));}catch(e){errs.push(s+': '+e.message);} if(/shell/.test(s)) w.RR.api=a=>Promise.resolve(a==='listRounds'?{ok:true,seasons:[{seasonId:'S-A',name:'Test',status:'Finished',preview:{status:'published',title:'Pre'},finale:null}],rounds:[{id:'1',season:'S-A',n:1,track:'T',layout:'L',date:'2026-12-01',time:'20:00',zone:'z',status:'Scheduled',story:null,rivalries:[],photos:[],drivers:[]}]}:{ok:false,error:'x'}); }
  await new Promise(r=>setTimeout(r,500));
  const t=w.document.body.textContent.replace(/\s+/g,' ');
  console.log(errs.join('|')); console.log(/Season preview and recap/.test(t), /Write story/.test(t), /Written/.test(t)); console.log(t.slice(t.indexOf('Season preview and recap')-60,t.indexOf('Season preview and recap')+330));
})();
