const fs=require('fs'),vm=require('vm'); const {ctx,tabs}=require('./harness.js');
const dir='/mnt/user-data/uploads/Race Club/';
for(const f of ['Scoring.gs','Publish.gs']) vm.runInContext(fs.readFileSync(dir+'_raceroom-apps-script/'+f,'utf8'),ctx,{filename:f});
const idx=JSON.parse(fs.readFileSync(dir+'assets/r3e/index.json','utf8'));
// pick a class with at least 2 cars and liveries
const byClass={}; Object.entries(idx.cars).forEach(([id,c])=>{(byClass[c[2]]=byClass[c[2]]||[]).push(id)});
const cid=Object.keys(byClass).find(k=>byClass[k].length>=2); const [carA,carB]=byClass[cid];
const livA=Object.entries(idx.liveries).filter(([l,v])=>String(v[0])===carA).slice(0,2).map(x=>+x[0]);
const livB=Object.entries(idx.liveries).filter(([l,v])=>String(v[0])===carB).slice(0,1).map(x=>+x[0]);
console.log('class',cid,idx.classes[cid],'cars',idx.cars[carA][0],'/',idx.cars[carB][0]);
const season={version:1,seasonId:'S-AAAAAA',name:'Season 01',prefix:'RC',liveries:[...livA,...livB],rules:{FuelUsage:1,Damage:2,MaxNumOfPlayers:12,CutRules:1,MinRating:0},preset:2,assists:{DriveAssistEsp:1,DriveAssistTransmission:-1},
 weekend:{Practice:{len:15,unit:'M',start:1},Qualify:{len:15,unit:'M',start:1},Race1:{len:20,unit:'M',start:1},Race2:{len:0,unit:'M',start:1},Race3:{len:0,unit:'M',start:1}},
 points:{tables:{[cid]:'30, 25, 23, 22'},pole:1,fastestLap:1,clean:1,dropWeeks:1},rounds:[{id:'1111111',password:'SECRETPASS',layoutId:1671}]};
ctx.__season=season; vm.runInContext('rcLoadSeason_=function(){return {ok:true,season:__season}};',ctx);
tabs.Seasons=[{'Season ID':'S-AAAAAA','Name':'Season 01','Status':'Active','First round':'2026-11-01'}];
const R=(id,n,st,close)=>({'Round ID':id,'Season ID':'S-AAAAAA','Round':String(n),'Type':'Race','Date':'2026-11-0'+n,'Server online':'20:00','Time zone':'America/Detroit','Layout ID':'1671','Track':'Hungaroring','Layout':'GP','Status':st,'Protest closes':close});
tabs.Rounds=[R('1111111',1,'Provisional','2000-01-02 08:00'),R('2222222',2,'Provisional','2999-01-02 08:00'),R('3333333',3,'Scheduled',''),R('4444444',4,'Cancelled','')];
const row=(rid,sess,uid,car,liv,pos,laps,tot,best,inc,fin)=>({'Round ID':rid,'Season ID':'S-AAAAAA','Session':sess,'User ID':uid,'Name':'Driver '+uid,'Car ID':car,'Livery ID':liv,'Class ID':cid,'Position':pos,'Position in class':pos,'Start position':pos,'Start position in class':pos,'Laps':laps,'Total time (ms)':tot,'Best lap (ms)':best,'Incident points':inc,'Finish status':fin,'Status':'PROVISIONAL'});
for(const rid of ['1111111','2222222']){
 tabs.Results.push(row(rid,'Qualify',101,carA,livA[0],1,2,0,100000,0,'Finished'),row(rid,'Qualify',102,carB,livB[0],2,2,0,101000,0,'Finished'),row(rid,'Qualify',103,carA,livA[1],3,2,0,102000,0,'Finished'));
 tabs.Results.push(row(rid,'Race',102,carB,livB[0],1,5,500000,99000,0,'Finished'),row(rid,'Race',101,carA,livA[0],2,5,501000,99500,2,'Finished'),row(rid,'Race',103,carA,livA[1],3,2,0,103000,0,'DNF'));
 tabs.Laps.push({'Round ID':rid,'Session':'Race','User ID':102,'Lap':1,'Position':1,'Valid':'Yes'},{'Round ID':rid,'Session':'Race','User ID':101,'Lap':1,'Position':2,'Valid':'No'});
}
tabs.Results.push(row('3333333','Race',101,carA,livA[0],1,5,1,1,0,'Finished'));  // a WAITING row must never show: status differs
tabs.Results[tabs.Results.length-1].Status='WAITING';
tabs.Drivers=[{'User ID':101,'Name':'Driver 101','Country':'US'},{'User ID':102,'Name':'Driver 102','Country':'DE'},{'User ID':103,'Name':'Driver 103','Country':''}];
// network mocks
const writes=[]; let stored='';
ctx.UrlFetchApp={fetch:(u,o)=>{ o=o||{};
  if(u.indexOf('assets/r3e/index.json')>=0) return {getResponseCode:()=>200,getContentText:()=>fs.readFileSync(dir+'assets/r3e/index.json','utf8')};
  if(u.indexOf('api.github.com')>=0){ if(o.method==='get') return stored?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({sha:'s1',content:Buffer.from(stored).toString('base64')})}:{getResponseCode:()=>404,getContentText:()=>'{}'};
    const b=JSON.parse(o.payload); stored=Buffer.from(b.content,'base64').toString(); writes.push({url:u,branch:b.branch,sha:b.sha,msg:b.message}); return {getResponseCode:()=>200,getContentText:()=>'{}'}; }
  return {getResponseCode:()=>404}; }};
ctx.Utilities.newBlob=t=>({getBytes:()=>Array.from(Buffer.from(Array.isArray(t)?Buffer.from(t):t)),getDataAsString:()=>Array.isArray(t)?Buffer.from(t).toString():String(t)});
ctx.Utilities.base64Encode=b=>Buffer.from(b).toString('base64'); ctx.Utilities.base64Decode=s=>Array.from(Buffer.from(s,'base64')); ctx.Utilities.sleep=()=>{};
const props={}; ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v}})};
const L=ctx.rcBuildLeague_(); const s=L.seasons[0];
console.log('seasons',L.seasons.length,'classes',JSON.stringify(L.classes),'namesFound',L.namesFound);
console.log('drivers',L.drivers.map(d=>d.id+':'+d.name+':'+d.cls.slice(0,4)+':'+d.car).join(' | '));
console.log('rounds',s.rounds.map(r=>r.n+':'+r.status+(r.done?' done':'')+(r.cancelled?' cancelled':'')+' close='+r.protestCloses+' end='+(r.windowEnd>0)).join(' | '));
console.log('results',s.results.length,'(R1+R2 only):',s.results.filter(r=>r.round===1).map(r=>r.driver+' pos'+r.pos+' '+r.status+' '+r.points+'+'+r.bonus+(r.pole?' pole':'')+(r.fastest?' FL':'')+(r.clean?' clean':'')+' car='+r.car).join(' ; '));
console.log('totals WITHOUT (R2 inside window):',JSON.stringify(Object.fromEntries(Object.entries(s.totals).map(([k,v])=>[k,[v.per.join(','),v.total]]))));
console.log('totals WITH:',JSON.stringify(Object.fromEntries(Object.entries(s.totalsWith).map(([k,v])=>[k,[v.per.join(','),v.drop.join('/'),v.total]]))));
console.log('setup classes',JSON.stringify(s.setup.classes.map(c=>[c.name,c.cars.map(k=>k.name+'x'+k.liveries.length)])));
console.log('rules',JSON.stringify(s.setup.rules.map(g=>[g.group,g.items.slice(0,3)])));
console.log('weekend',JSON.stringify(s.setup.weekend),'points',JSON.stringify(s.setup.points));
const r=ctx.rcPublishLeague_('test'); console.log('publish before setup:',JSON.stringify(r));
props.GITHUB_TOKEN='tok'; props.GITHUB_REPO='stenbough-cmd/raceclub';
const r2=ctx.rcPublishLeague_('a round confirmed'); console.log('publish:',JSON.stringify(r2),'writes',writes.length,writes[0]&&writes[0].url,writes[0]&&writes[0].branch);
const r3=ctx.rcPublishLeague_('again'); console.log('again (same content except built time):',JSON.stringify(r3));
console.log('file leaks password?',/SECRETPASS|password/i.test(stored),'| token?',/tok\b/.test(stored),'| size',stored.length);
const sandbox={window:{}}; vm.runInNewContext(stored,sandbox); console.log('file evaluates; seasons',sandbox.window.RR_LIVE.seasons.length);
const withThrow=ctx.rcThenPublish_({ok:true},'x'); console.log('thenPublish',JSON.stringify(withThrow));
fs.writeFileSync('/tmp/gs/league.js',stored);
