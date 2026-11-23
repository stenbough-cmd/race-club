const {ctx,tabs}=require('./harness.js'); const vm=require('vm');
tabs.SeasonFiles=[]; ctx.__ig=0;
vm.runInContext(`rcR3eIndex_=function(){return {classes:{},liveries:{},cars:{},ok:false};}; rcStoryEnsureTabs_=function(){}; rcStewardNames_=function(){return {};};`,ctx);
try{ const L=vm.runInContext('rcBuildLeague_()',ctx); console.log('empty league ok:',JSON.stringify(L).slice(0,160)); }catch(e){ console.log('EMPTY LEAGUE ERROR',e.message); }
// end season on a season with open window (protest closes in future)
