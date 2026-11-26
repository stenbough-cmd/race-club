/* t32: the protest key is the season password (one for every round). A season with no password (public server) is asked for none. A season made
   before the season password still works with its round's own password. */
const vm=require('vm'); const {ctx,tabs}=require('./harness.js'); const T=tabs;
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok  ',m); };
vm.runInContext('rcStewardEnsure_=function(){}; rcNotify_=function(){};',ctx);
function setup(season){
  ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
  T.Seasons.length=0; T.Rounds.length=0; T.Results.length=0; T.Protests.length=0;
  T.Seasons.push({'Season ID':'S-AAAAAA','Name':'Season 01','Status':'Active','First round':'2026-11-01'});
  T.Rounds.push({'Round ID':'1111111','Season ID':'S-AAAAAA','Round':'1','Type':'Race','Status':'Provisional','Protest closes':'2099-01-02 08:00'});
  ['111','222'].forEach(u=>T.Results.push({'Round ID':'1111111','Season ID':'S-AAAAAA','Session':'Race1','User ID':u,'Name':'D'+u,'Status':'PROVISIONAL','Position':'1'}));
  ctx.CacheService={getScriptCache:()=>{const m={};return {get:k=>m[k]||null,put:(k,v)=>{m[k]=v;}};}};
}
const file=(o)=>ctx.rcFileProtest_(Object.assign({roundId:'1111111',password:'season-pw',me:'111',other:'222',self:false,race:1,lap:2,reason:'Bad Rejoin',narrative:'He pushed me wide.'},o||{}));
setup({version:1,password:'season-pw',noPassword:false,rounds:[{id:'1111111'}]});
ok(file({password:'nope'}).error==='wrong-password','a wrong password is refused');
ok(file({password:''}).error==='wrong-password','an empty password is refused when the season has one');
const good=file(); ok(good.ok,'the season password files a protest ('+JSON.stringify(good)+')');
setup({version:1,password:'',noPassword:true,rounds:[{id:'1111111'}]});
ok(file({password:''}).ok,'a no-password season is asked for no password');
ok(file({password:'',other:'999',lap:3}).error==='bad-driver','a no-password season still checks that both drivers raced in the round');
setup({version:1,rounds:[{id:'1111111',password:'old-round-pw'}]});
ok(file({password:'old-round-pw'}).ok,'a season made before the season password still uses its round password');
ok(file({password:'season-pw',lap:3}).error==='wrong-password','... and a made-up password is refused there');
console.log(fails?'\nFAILED '+fails:'\nALL PASS (t32)');
