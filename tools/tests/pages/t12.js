const src=require('fs').readFileSync('t11.js','utf8'); const loadSrc=src.slice(0,src.indexOf('(async()=>{'));
eval(loadSrc.replace("const {JSDOM}","var {JSDOM}").replace("const root","var root"));
var wait=ms=>new Promise(r=>setTimeout(r,ms)); var fails=0; var ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  // public story
  const s=await load('story.html','/tmp/pg/fx_news.js','?id=NP-1',()=>({ok:true}),false);
  ok(!s.errs.length,'story loads '+s.errs.join('|'));
  const art=s.d.querySelector('.rr-article'); const q=sel=>art.querySelector(sel);
  ok(q('strong')&&q('strong').textContent==='bold','bold'); ok(q('em')&&q('em').textContent==='italic','italic'); ok(q('u')&&q('u').textContent==='under','underline');
  ok(q('a[href="mailto:matt@example.com"]'),'email link'); ok(q('h2.rr-article-sub')&&q('h2.rr-article-sub').textContent==='A heading','heading');
  ok(q('blockquote')&&/wise quote/.test(q('blockquote').textContent),'quote'); ok(q('figure.rr-figure-wide img')&&q('figure img').src.indexOf('race-club-data')>0,'picture'); ok(!q('b'),'html not injected');
  ok(/By Matt Stenzel/.test(art.textContent),'byline'); const note=art.querySelector('.rr-edit-note'); ok(note&&/Edited 24\.11\.2026\. Reason: Fixed a typo or wording\./.test(note.textContent),'edit note: '+(note&&note.textContent)); ok(art.lastElementChild===note,'note is last');
  // editor
  let items=[{key:'post:NP-1',kind:'post',label:'League news',title:'Hello',standfirst:'',body:'Body text here',date:'2026-11-23',state:'published',byline:'Matt Stenzel',edited:'',editReason:'',changes:0,chars:14},
   {key:'story:S1',kind:'race',label:'Race story · round 1',title:'AI story',standfirst:'sf',body:'Para',date:'2026-11-20',state:'published',byline:'Race Club Press',edited:'',editReason:'',changes:1,seasonId:'SE1',roundId:'R1',season:'Season 1',chars:4},
   {key:'story:S2',kind:'race',label:'Race story · round 2',title:'Gone',standfirst:'',body:'x',date:'2026-11-21',state:'deleted',byline:'Race Club Press',edited:'',editReason:'',changes:0,seasonId:'SE1',roundId:'R2',season:'Season 1',chars:1}];
  const calls=[]; const H=r=>{calls.push(r); if(r.action==='listNews') return {ok:true,items,reasons:['Fixed a typo or wording','Corrected a fact or figure','Added new details','Other'],limit:10000}; return {ok:true,published:true};};
  const a=await load('news-editor.html',null,'',H,true); const d=a.d;
  ok(!a.errs.length,'editor loads '+a.errs.join('|')); const txt=()=>d.querySelector('main').textContent;
  ok(/Hello/.test(txt())&&/AI story/.test(txt())&&!/Gone/.test(txt()),'live list shows 2, not the deleted one');
  const btn=t=>[...d.querySelectorAll('button')].find(b=>b.textContent===t);
  btn('Deleted (1)').click(); await wait(50); ok(/Gone/.test(txt()),'Deleted filter'); btn('Live (2)').click(); await wait(50);
  btn('New post').click(); await wait(100);
  const ta=d.querySelector('.rr-editor textarea'); ok(!!ta,'editor text box');
  const inputs=[...d.querySelectorAll('.rr-input input')]; const title=inputs[0]; title.value='My title'; title.dispatchEvent(new a.w.Event('input'));
  ta.value='Hello world'; ta.dispatchEvent(new a.w.Event('input')); ta.setSelectionRange(0,5); btn('Bold').click(); await wait(20);
  ok(ta.value==='**Hello** world','bold wraps selection: '+ta.value); ok(/15 \/ 10,000/.test(d.querySelector('.rr-editor-count').textContent),'counter '+d.querySelector('.rr-editor-count').textContent);
  ok(d.querySelector('.rr-article strong'),'preview shows bold'); ta.setSelectionRange(0,0); btn('Quote').click(); await wait(20); ok(/^> \*\*Hello/.test(ta.value),'quote prefix');
  btn('Email link').click(); await wait(50); const li=[...d.querySelectorAll('.rr-input input')]; li[1].value='a@b.co'; li[1].dispatchEvent(new a.w.Event('input')); btn('Add the link').click(); await wait(30); ok(/\[a@b\.co\]\(mailto:a@b\.co\)/.test(d.querySelector('.rr-editor textarea').value),'email link inserted');
  const pub=btn('Publish post'); pub.click(); await wait(20); ok(pub.classList.contains('rr-confirming'),'first click arms'); pub.click(); await wait(100);
  const sp=calls.filter(c=>c.action==='savePost')[0]; ok(sp&&sp.title==='My title'&&/Hello/.test(sp.body),'savePost sent');
  ok(calls.filter(c=>c.action==='listNews').length>=2,'list reloaded after save');
  // edit a story: needs a reason
  [...d.querySelectorAll('button')].filter(b=>b.textContent==='Open')[1].click(); await wait(100);
  ok(btn('Rewrite story')&&btn('Withdraw')&&btn('Delete'),'story has rewrite/withdraw/delete');
  const sv=btn('Save edit'); sv.click(); await wait(20); ok(!sv.classList.contains('rr-confirming'),'no reason: does not arm'); ok(/Choose the reason/.test(txt()),'reason message');
  const opt=[...d.querySelectorAll('.rr-select *')].find(n=>n.textContent==='Corrected a fact or figure'&&(n.getAttribute('role')==='option'||n.tagName==='LI'||n.tagName==='BUTTON'));
  if(opt) { opt.click(); await wait(30); }
  const sv2=btn('Save edit'); sv2.click(); await wait(20); sv2.click(); await wait(100);
  const ed=calls.filter(c=>c.action==='editNewsItem')[0]; ok(ed&&ed.key==='story:S1'&&ed.reason==='Corrected a fact or figure','editNewsItem sent: '+JSON.stringify(ed&&ed.reason));
  [...d.querySelectorAll('button')].filter(b=>b.textContent==='Open')[1].click(); await wait(100);
  const w=btn('Withdraw'); w.click(); w.click(); await wait(100); ok(calls.some(c=>c.action==='setNewsState'&&c.state==='withdrawn'&&c.key==='story:S1'),'withdraw sent');
  console.log(fails?'FAILURES '+fails:'ALL PASSED'); process.exit(0);
})();
