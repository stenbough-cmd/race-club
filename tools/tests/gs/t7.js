const {ctx,tabs}=require('./harness.js'); const vm=require('vm');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok',m); };
vm.runInContext(`rcNewsEnsure_=function(){}; rcStoryUpdate_=function(id,f){var r=__tabs.Stories.filter(function(x){return x['Story ID']===id})[0];Object.assign(r,f);};`,ctx);
const run=(code)=>vm.runInContext(code,ctx);
// seed a story
tabs.Stories.push({'Story ID':'S1','Season ID':'SE1','Kind':'race','Round ID':'R1','Status':'published','Title':'Old title','Standfirst':'Old stand','Body':'Para one.\n\nPara two.','Published':'2026-11-20 10:00','Hidden':'','Photos':'[]'});
tabs.Rounds.push({'Round ID':'R1','Round':1}); tabs.Seasons.push({'Season ID':'SE1','Name':'Season 1'});
// savePost
let r=run(`rcSavePost_({title:'  Hello  world ',body:'Line\\r\\n\\r\\n\\r\\n\\r\\nNext **b**'},'matt')`);
ok(r.ok && /^post:NP-/.test(r.key),'post saved'); ok(tabs.Posts[0].Body==='Line\n\nNext **b**','body cleaned'); ok(tabs.Posts[0].Title==='Hello world','title one-lined');
ok(!run(`rcSavePost_({title:'',body:'x'},'m')`).ok,'no title refused'); ok(!run(`rcSavePost_({title:'t',body:'  '},'m')`).ok,'no body refused');
ok(run(`rcSavePost_({title:'t',body:'a'.repeat(20000)},'m')`).ok && tabs.Posts[1].Body.length===10000,'body capped 10000');
// list
let l=run(`rcListNews_()`); ok(l.items.length===3,'list has 3'); ok(l.items.some(i=>i.key==='story:S1'&&i.season==='Season 1'),'story listed');
// edit requires reason
ok(run(`rcEditNewsItem_({key:'story:S1',title:'New',body:'B',reason:'Nope'},'matt')`).error==='no-reason','bad reason');
r=run(`rcEditNewsItem_({key:'story:S1',title:'New title',standfirst:'New stand',body:'B1\\n\\nB2',reason:'Corrected a fact or figure'},'matt')`);
ok(r.ok,'edit ok'); const s=tabs.Stories[0]; ok(s.Title==='New title'&&s['Edited by']==='Matt Stenzel'&&s['Edit reason']==='Corrected a fact or figure','story edited');
ok(JSON.parse(s.History)[0].body==='Para one.\n\nPara two.','history keeps old');
// public news
let n=run(`rcStoryNews_()`); const st=n.find(x=>x.id==='S1'); ok(st.byline==='Race Club Press, edited by Matt Stenzel','edited byline'); ok(st.editNote.reason==='Corrected a fact or figure','edit note');
const po=n.find(x=>x.kind==='news'); ok(po&&po.byline==='Matt Stenzel'&&po.eyebrow==='League news','post public');
// withdraw / delete / undo
run(`rcSetNewsState_({key:'story:S1',state:'withdrawn'},'m')`); ok(!run(`rcStoryNews_()`).some(x=>x.id==='S1'),'withdrawn hidden');
run(`rcSetNewsState_({key:'story:S1',state:'published'},'m')`); ok(run(`rcStoryNews_()`).some(x=>x.id==='S1'),'republished');
run(`rcSetNewsState_({key:'story:S1',state:'deleted'},'m')`); ok(run(`rcListNews_()`).items.find(i=>i.key==='story:S1').state==='deleted','deleted listed');
ok(run(`rcSetNewsState_({key:'story:S1',state:'published'},'m')`).error==='undo-first','must undo first');
run(`rcSetNewsState_({key:'story:S1',state:'withdrawn'},'m')`); ok(run(`rcListNews_()`).items.find(i=>i.key==='story:S1').state==='withdrawn','undo gives withdrawn');
// post edit + withdraw
const pk=l.items.find(i=>i.kind==='post').key;
ok(run(`rcEditNewsItem_({key:'${pk}',title:'T2',body:'Body2',reason:'Other'},'m')`).ok,'post edit');
run(`rcSetNewsState_({key:'${pk}',state:'withdrawn'},'m')`); ok(!run(`rcStoryNews_()`).some(x=>x.kind==='news'&&x.title==='T2'),'post withdrawn hidden');
ok(run(`rcEditNewsItem_({key:'story:nope',title:'a',body:'b',reason:'Other'},'m')`).error==='no-item','no item');
console.log(fails?fails+' FAILED':'ALL PASS');
