const {ctx,tabs}=require('./harness'); const fs=require('fs');
const f=JSON.parse(fs.readFileSync('/mnt/user-data/outputs/fake/round-01-4266558-test-field.json','utf8'));
tabs.Rounds.push({'Round ID':'4266558','Season ID':'S-AAAAAA','Round':'1','Type':'Race','Date':'2026-11-23','Server online':'20:15','Time zone':'America/New_York','Layout ID':'10394','Track':'Donington Park','Layout':'Grand Prix','Status':'Scheduled'});
tabs.Seasons.push({'Season ID':'S-AAAAAA','Name':'Test','Status':'Active'});
const r=ctx.rcRecord_(JSON.stringify(f),'text/plain','x.json','');
console.log(r.answer, r.alert&&r.alert.subject);
console.log('round',tabs.Rounds[0].Status,'| results rows',tabs.Results.length,'| laps rows',tabs.Laps.length,'| drivers',tabs.Drivers.length,'| inbox',tabs.Inbox.map(x=>x.Status+':'+(x.Note||'')).join(','));
console.log([...new Set(tabs.Results.map(x=>x.Status))]);
