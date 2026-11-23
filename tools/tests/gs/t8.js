const {ctx,tabs}=require('./harness.js'); const vm=require('vm'); const fs=require('fs');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok',m); };
const run=c=>vm.runInContext(c,ctx);
// league stub
ctx.__league={drivers:[{id:'1',name:'Matt'},{id:'2',name:'Sam'},{id:'3',name:'Lee'}],seasons:[{id:'SE1',name:'Season 1',status:'Active',
 order:{'10':['2','1'],'20':['3']},totalsWith:{'1':{total:40,places:[1,0]},'2':{total:55.5,places:[2,1]},'3':{total:20,places:[1]}},
 rounds:[{n:1,done:true,cancelled:false,track:'Monza'},{n:2,done:true,cancelled:false,track:'Spa'}],
 results:[{round:1,race:1,pos:1,status:'Finished',cls:'10',driver:'2'},{round:2,race:1,pos:1,status:'Finished',cls:'10',driver:'1'},{round:2,race:1,pos:1,status:'Finished',cls:'20',driver:'3'}]}]};
run(`rcBuildLeague_=function(){return __league;}; rcR3eIndex_=function(){return {classes:{'10':'GT3','20':'Cup'},liveries:{},ok:true};}; rcEnsureColumns_=function(){};
 rcStoryWrite_=function(sid,kind,rid,force){ __storyCalls.push([sid,kind,rid,force]); return {ok:true,storyId:'ST-X'}; };`);
ctx.__storyCalls=[];
tabs.Seasons.push({'Season ID':'SE1','Name':'Season 1','Status':'Active','Champions':'','Ended':''});
const R=(id,n,st)=>tabs.Rounds.push({'Round ID':id,'Season ID':'SE1','Type':'Race','Round':n,'Status':st});
R('1000001',1,'Provisional'); R('1000002',2,'Provisional'); R('1000003',3,'Scheduled');
// state
let g=run(`rcGetSeasonEnd_({})`); ok(g.ok&&g.seasonId==='SE1','default season active'); ok(g.season.live===2&&g.season.notRun===1&&!g.season.blockers.length,'counts');
ok(g.champions.length===2&&g.champions.find(c=>c.className==='GT3').name==='Sam'&&g.champions.find(c=>c.className==='GT3').margin===15.5,'champions preview: '+JSON.stringify(g.champions[0]));
// refusals
ok(run(`rcEndSeason_({seasonId:'SE1'},'matt')`).error==='rounds-left','refuses with rounds left');
tabs.Inbox.push({'Round ID':'1000002','Status':'AWAITING'}); ok(run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'m')`).error==='results-waiting','refuses with a round waiting'); tabs.Inbox.length=0;
tabs.Protests.push({'Round ID':'1000001','Status':'Filed'}); ok(run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'m')`).error==='protests-open','refuses with open protest'); tabs.Protests[0].Status='Ruled';
ok(run(`rcEndSeason_({seasonId:'nope'},'m')`).error==='no-season','no season');
// end
let e=run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'matt')`); ok(e.ok&&e.champions.length===2,'ended'); ok(tabs.Seasons[0].Status==='Finished'&&tabs.Seasons[0].Ended,'status finished');
const kept=JSON.parse(tabs.Seasons[0].Champions); ok(kept['10'].uid==='2'&&kept['20'].name==='Lee','champions saved');
ok(ctx.__storyCalls.length===1&&ctx.__storyCalls[0][1]==='finale','finale story requested');
ok(run(`rcEndSeason_({seasonId:'SE1',allowUnfinished:true},'m')`).error==='already-ended','cannot end twice');
// reopen
tabs.Stories.push({'Story ID':'ST-X','Season ID':'SE1','Kind':'finale','Status':'published','Hidden':'','Body':'x'});
run(`rcStoryUpdate_=function(id,f){var r=__tabs.Stories.filter(function(x){return x['Story ID']===id})[0];Object.assign(r,f);}`);
ok(run(`rcReopenSeason_({seasonId:'SE1'},'m')`).ok,'reopen'); ok(tabs.Seasons[0].Status==='Active'&&tabs.Seasons[0].Champions===''&&tabs.Stories[0].Hidden==='withdrawn','active again, story withdrawn');
ok(run(`rcReopenSeason_({seasonId:'SE1'},'m')`).error==='not-ended','not ended');
// clear
ok(run(`rcClearTestData_({word:'clear'},'m')`).error==='word','wrong word');
tabs.Results.push({a:1}); tabs.Laps.push({a:1}); tabs.Posts.push({'Post ID':'x'}); tabs.Drivers.push({'User ID':'1'});
const c=run(`rcClearTestData_({word:'CLEAR'},'m')`); ok(c.ok&&tabs.Results.length===0&&tabs.Laps.length===0&&tabs.Rounds.length===0&&tabs.Seasons.length===0&&tabs.Posts.length===0&&tabs.Stories.length===0,'test data cleared'); ok(tabs.Drivers.length===1,'drivers kept');
console.log(fails?fails+' FAILED':'ALL PASS');
