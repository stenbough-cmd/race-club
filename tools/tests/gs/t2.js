const {ctx,tabs}=require('./harness'); const fs=require('fs');
const file=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/64d0c752-202611220201.json','utf8')); file.Server='Race Club: T 1234567';
tabs.Rounds.push({'Round ID':'1234567','Season ID':'S-A','Round':'1','Type':'Race','Date':'2026-11-22','Server online':'20:00','Time zone':'America/Detroit','Track':'H','Layout':'GP','Status':'Scheduled','Results received':'','Protest closes':''});
const post=f=>ctx.rcRecord_(JSON.stringify(f),'t','x.json','');
post(file); let fp=ctx.rcListRounds_().rounds[0].waiting.fingerprint; ctx.rcConfirmRound_({roundId:'1234567',fingerprint:fp},'M');
const f4=JSON.parse(JSON.stringify(file)); f4.Sessions[2].Players[0].BestLapTime=139000;
console.log('held:',post(f4).answer);
const h=ctx.rcListRounds_().rounds[0].held.fingerprint;
console.log('confirm held ->',JSON.stringify(ctx.rcConfirmRound_({roundId:'1234567',fingerprint:h},'M')));
console.log('inbox:',tabs.Inbox.map(x=>x.Status).join(','),'| live best now',tabs.Results.filter(x=>x.Session==='Race')[0]['Best lap (ms)'],'| round',tabs.Rounds[0].Status, tabs.Rounds[0]['Protest closes']);
// cancelled round + new file
tabs.Rounds.push({'Round ID':'7654321','Season ID':'S-A','Round':'2','Type':'Race','Date':'2026-11-29','Server online':'20:00','Time zone':'America/Detroit','Track':'X','Layout':'Y','Status':'Scheduled','Results received':'','Protest closes':''});
ctx.rcCancelRound_({roundId:'7654321',cancelled:true},'M');
const g=JSON.parse(JSON.stringify(file)); g.Server='Race Club: T 7654321'; g.Sessions[2].Players[0].BestLapTime=1;
const r=post(g); console.log('cancelled round post ->',r.answer,'|',tabs.Inbox[tabs.Inbox.length-1].Status,'|',tabs.Inbox[tabs.Inbox.length-1].Note, '| rounds status', tabs.Rounds[1].Status);
// read again on a cancelled round
console.log(JSON.stringify(ctx.rcReadRoundAgain_('7654321','live','M')));
// practice with lobby driver, no laps
const p=JSON.parse(JSON.stringify(file)); p.Sessions[0].Players.push({UserId:111,FullName:'Lobby Guy',Username:'l',CarId:1,LiveryId:2,Position:2,FinishStatus:'Finished',BestLapTime:-1,TotalTime:-1,RaceSessionLaps:[]});
const b=ctx.rcReadFile_('1','S',p,{}, 'X'); console.log('lobby driver kept as result row?',b.resultRows.some(r=>r['User ID']===111),'| in drivers?',!!b.drivers['111']);
