const {ctx,tabs}=require('./harness'); const fs=require('fs');
const run=(c)=>require('vm').runInContext(c,ctx);
function show(t){console.log(t)}
const file=JSON.parse(fs.readFileSync('/mnt/user-data/uploads/64d0c752-202611220201.json','utf8'));
file.Server='Race Club: Test Season 1234567';
tabs.Rounds.push({'Round ID':'1234567','Season ID':'S-AAAAAA','Round':'1','Type':'Race','Date':'2026-11-22','Server online':'20:00','Time zone':'America/Detroit','Layout ID':'1','Track':'Hungaroring','Layout':'Grand Prix','Server name':'x','Status':'Scheduled','Results received':'','Protest closes':''});
tabs.Rounds.push({'Round ID':'7654321','Season ID':'S-AAAAAA','Round':'2','Type':'Race','Date':'2026-11-29','Server online':'20:00','Time zone':'America/Detroit','Layout ID':'1','Track':'X','Layout':'Y','Server name':'x','Status':'Scheduled','Results received':'','Protest closes':''});
tabs.Seasons.push({'Season ID':'S-AAAAAA','Name':'Test','Status':'Active'});
const post=(f)=>ctx.rcRecord_(JSON.stringify(f),'text/plain','x.json','');
let r=post(file); show('1 post -> '+r.answer+' | '+r.alert.subject);
show('  round: '+tabs.Rounds[0].Status+' | drivers tab rows: '+tabs.Drivers.length+' | inbox: '+tabs.Inbox.map(x=>x.Status).join(','));
show('  results rows: '+tabs.Results.length+' laps rows: '+tabs.Laps.length+' | result statuses: '+[...new Set(tabs.Results.map(x=>x.Status))]);
show('  sessions in results: '+tabs.Results.map(x=>x.Session+':'+x.Laps).join(', '));
show('  quali laps rows kept: '+tabs.Laps.filter(x=>x.Session==='Qualify').map(x=>x.Lap+'/'+x['Time (ms)']).join(' '));
let list=ctx.rcListRounds_(); show('2 listRounds waiting: '+(list.rounds[0].waiting?'yes':'no'));
let fp=list.rounds[0].waiting.fingerprint;
// duplicate post
r=post(file); show('3 same file again -> '+r.answer);
// a different file for the waiting round replaces it
const f2=JSON.parse(JSON.stringify(file)); f2.Sessions[2].Players[0].BestLapTime=141000;
r=post(f2); show('4 changed file -> '+r.answer+' | inbox: '+tabs.Inbox.map(x=>x.Status).join(','));
list=ctx.rcListRounds_(); const fp2=list.rounds[0].waiting.fingerprint; show('   fingerprint changed: '+(fp!==fp2));
// stale fingerprint is refused
show('5 confirm with the old fingerprint -> '+JSON.stringify(ctx.rcConfirmRound_({roundId:'1234567',fingerprint:fp},'Matt')));
// preview
const pv=ctx.rcRoundPreview_({roundId:'1234567',fingerprint:fp2}); show('6 preview ok='+pv.ok+' kind='+pv.kind+' rows='+pv.rows.length+' protestEnds='+pv.protestEnds+' fromSchedule='+pv.fromSchedule);
pv.rows.forEach(x=>show('   '+x.session+' '+x.name+' P'+x.pos+' laps='+x.laps+' best='+x.best+' total='+x.total+' '+x.finish+' inc='+x.inc+' invalid='+x.invalid));
// cancel is blocked while waiting
show('7 cancel waiting round -> '+JSON.stringify(ctx.rcCancelRound_({roundId:'1234567',cancelled:true},'Matt')));
// confirm
const c=ctx.rcConfirmRound_({roundId:'1234567',fingerprint:fp2},'Matt'); show('8 confirm -> '+JSON.stringify(c));
show('   round: '+tabs.Rounds[0].Status+' protest closes '+tabs.Rounds[0]['Protest closes']+' | drivers: '+tabs.Drivers.map(d=>d.Name).join(',')+' | inbox: '+tabs.Inbox.map(x=>x.Status).join(',')+' | result statuses: '+[...new Set(tabs.Results.map(x=>x.Status))]);
// a newer file for the confirmed round is held
const f3=JSON.parse(JSON.stringify(file)); f3.Sessions[2].Players[0].BestLapTime=140000;
r=post(f3); show('9 new file after confirm -> '+r.answer+' | inbox: '+tabs.Inbox.map(x=>x.Status).join(','));
list=ctx.rcListRounds_(); const hfp=list.rounds[0].held.fingerprint; show('   held listed: '+!!list.rounds[0].held+' | live results still best='+tabs.Results.filter(x=>x.Session==='Race')[0]['Best lap (ms)']);
show('10 deny held -> '+JSON.stringify(ctx.rcDenyRound_({roundId:'1234567',fingerprint:hfp},'Matt'))+' inbox: '+tabs.Inbox.map(x=>x.Status).join(','));
show('    live results unchanged: best='+tabs.Results.filter(x=>x.Session==='Race')[0]['Best lap (ms)']+' round '+tabs.Rounds[0].Status);
// second round: deny a waiting one
const g=JSON.parse(JSON.stringify(file)); g.Server='Race Club: Test Season 7654321'; r=post(g);
show('11 round 2 post -> '+r.answer+' status '+tabs.Rounds[1].Status);
const l2=ctx.rcListRounds_().rounds[1].waiting.fingerprint;
show('    deny -> '+JSON.stringify(ctx.rcDenyRound_({roundId:'7654321',fingerprint:l2},'Matt'))+' | round '+tabs.Rounds[1].Status+' | results rows for it: '+tabs.Results.filter(x=>x['Round ID']==='7654321').length+' | inbox: '+tabs.Inbox.map(x=>x.Status).join(','));
show('12 cancel a scheduled round -> '+JSON.stringify(ctx.rcCancelRound_({roundId:'7654321',cancelled:true},'Matt'))+' status '+tabs.Rounds[1].Status);
r=post(g); show('13 post for a cancelled round -> '+r.answer+' | '+tabs.Inbox[tabs.Inbox.length-1].Note);
show('    restore -> '+JSON.stringify(ctx.rcCancelRound_({roundId:'7654321',cancelled:false},'Matt'))+' status '+tabs.Rounds[1].Status);
