const fs=require('fs'), vm=require('vm'), crypto=require('crypto');
const dir='/mnt/user-data/uploads/Race Club/_raceroom-apps-script/';
const tabs={Inbox:[],Rounds:[],Results:[],Laps:[],Drivers:[],Seasons:[],AdminLog:[],Protests:[],Penalties:[],Stories:[],Posts:[]};
const raw={};
const ctx={console, Date, JSON, Math, Object, Array, String, Number, isFinite, parseInt, RegExp, Error, Promise};
ctx.Utilities={ formatDate:(d,tz,f)=>{const p=n=>String(n).padStart(2,'0');d=new Date(d);return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes());},
  parseDate:(s,tz,f)=>{ /* treat tz America/Detroit as UTC-5 */ const m=s.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/); return new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]+5,+m[5])); },
  computeDigest:()=>[], DigestAlgorithm:{SHA_256:1}};
ctx.SpreadsheetApp={getActiveSpreadsheet:()=>({getSpreadsheetTimeZone:()=>'UTC'})};
ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
ctx.DriveApp={}; ctx.UrlFetchApp={fetch:()=>({getResponseCode:()=>404})};
ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})};
var __cache={}; ctx.CacheService={getScriptCache:()=>({get:k=>__cache[k]===undefined?null:__cache[k],put:(k,v)=>{__cache[k]=v},remove:k=>{delete __cache[k]}})}; ctx.MailApp={sendEmail(){}}; ctx.Session={getEffectiveUser:()=>({getEmail:()=>'x'})};
vm.createContext(ctx);
for(const f of ['Core.gs','Web.gs','Seasons.gs','Results.gs','Scoring.gs','Publish.gs','Stories.gs','Stewarding.gs','News.gs','EndSeason.gs']) vm.runInContext(fs.readFileSync(dir+f,'utf8'),ctx,{filename:f});
// in-memory replacements for the sheet plumbing only
const hook=`
var __tabs, __raw, __n=0;
rcRows_=function(n){return __tabs[n].map(function(r){return Object.assign({},r)});};
rcAppend_=function(n,o){o.forEach(function(r){__tabs[n].push(Object.assign({},r))});};
rcReplace_=function(n,o){__tabs[n]=o.map(function(r){return Object.assign({},r)});};
rcRemoveRoundRows_=function(n,id){var b=__tabs[n].length;__tabs[n]=__tabs[n].filter(function(r){return String(r['Round ID'])!==String(id)});return b-__tabs[n].length;};
rcUpdateRound_=function(id,f){var r=__tabs.Rounds.filter(function(x){return String(x['Round ID'])===String(id)})[0];if(!r)return false;Object.assign(r,f);return true;};
rcSetInbox_=function(fp,f){for(var i=__tabs.Inbox.length-1;i>=0;i--){var r=__tabs.Inbox[i];if(r.Fingerprint===fp&&!/^DUPLICATE/.test(r.Status)){Object.assign(r,f);return true;}}return false;};
rcRawFolder_=function(){return {createFile:function(n,b){__raw[n]=b;return {getUrl:function(){return 'https://drive.google.com/file/d/'+'A'.repeat(30)+'/'+n}}}}};
rcRawText_=function(row){var n=Object.keys(__raw).filter(function(k){return row['Raw file'].indexOf(k)>=0})[0];return __raw[n];};
rcNowText_=function(){return '2026-11-22 15:00'};
rcSha_=function(t){return __sha(t)};
rcLog_=function(){};
rcStewardEnsure_=function(){};
rcStewardUpdate_=function(tab,kc,kv,f){var r=__tabs[tab].filter(function(x){return String(x[kc])===String(kv)})[0];if(!r)return false;Object.assign(r,f);return true;};
var __ru=0; rcRandom_=function(){ __ru++; return ('u'+__ru+'abcdef0123456789abcdef0123456789').slice(0,32); };
rcEnsureColumns_=function(){};
var __mails=[]; rcNotify_=function(s,l){__mails.push([s,l]);};
rcCarClasses_=function(ids,notes){return {};};
rcLookupUser_=function(){return {country:'US',avatar:'',banner:''};};
rcDateText_=function(v){return String(v)};
`;
ctx.__sha=t=>crypto.createHash('sha256').update(t).digest('hex');
ctx.__tabs=tabs; ctx.__raw=raw; ctx.__cache=__cache;
vm.runInContext(hook,ctx);
module.exports={ctx,tabs};
