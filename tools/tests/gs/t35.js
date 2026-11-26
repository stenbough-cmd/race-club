/* t35: Change password in the middle of a season: new season password, No password, old round passwords dropped, empty refused, not logged. */
const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js'); const T=tabs;
vm.runInContext(fs.readFileSync('/mnt/user-data/uploads/Race Club/_raceroom-apps-script/Stories.gs','utf8'),ctx,{filename:'Stories.gs'});
T.SeasonFiles=[]; T.Seasons=[]; vm.runInContext('rcEnsureColumns_=function(){}',ctx);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
ctx.__previews=[]; vm.runInContext(`rcSessionAdmin_=function(){return 'Matt'}; rcStoryWrite_=function(id,kind){__previews.push(kind+':'+id);return {ok:true};}; rcThenPublish_=function(r){return r;}; rcStoryEnsureTabs_=function(){}; rcStoryList_=function(){return {byRound:{},preview:{},finale:{}};}; rcGithubConfig_=function(){return null;};`,ctx);
const mk=()=>({version:1,seasonId:'',name:'Season One',zone:'America/Detroit',prefix:'RC',password:'first',noPassword:false,calendar:{date:'2026-12-01'},points:{dropWeeks:0},rounds:[{id:'1234567',layoutId:1,date:'2026-12-01',time:'20:00',password:'old-round'}]});
ctx.__req={action:'saveSeason',token:'x'.repeat(40),season:mk(),layouts:{1:{track:'Monza',layout:'GP'}},classes:['GT3']};
const sid=vm.runInContext('rcApi_(__req)',ctx).seasonId;
const chg=(o)=>{ ctx.__c=Object.assign({action:'changePassword',token:'x'.repeat(40),seasonId:sid},o); return vm.runInContext('rcApi_(__c)',ctx); };
const load=()=>vm.runInContext('rcLoadSeason_("'+sid+'")',ctx).season;
ok(chg({password:'  second  '}).ok&&load().password==='second'&&load().noPassword===false,'a new password is saved (trimmed)');
ok(load().rounds[0].password===undefined,'an older per-round password is removed so the season password governs');
ok(!chg({password:''}).ok&&chg({password:''}).error==='empty-password'&&load().password==='second','an empty password is refused and nothing changes');
ok(chg({noPassword:true,password:'ignored'}).ok&&load().noPassword===true&&load().password==='','No password clears the password');
ok(chg({seasonId:'S-NOPE',password:'x'}).error==='not-found','an unknown season is refused');
ok(JSON.stringify(T.Log||T.AdminLog||[]).indexOf('second')<0,'the new password is not written to the log');
ok(vm.runInContext('rcListSeasons_()',ctx).seasons.length===1,'the season list is unchanged');
console.log(fails?'\nFAILED '+fails:'\nALL PASS (t35)');
