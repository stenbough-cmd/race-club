const {ctx}=require('./harness.js'); const vm=require('vm');
ctx.__rows=[
 {'User ID':'1','Finish status':'Finished','Laps':10,'Total time (ms)':1000000,'Best lap (ms)':100500,'Incident points':0,'Position':1,'Car ID':'1'},
 {'User ID':'2','Finish status':'DidNotFinish','Laps':2,'Total time (ms)':200000,'Best lap (ms)':99000,'Incident points':0,'Position':2,'Car ID':'1'}];
const r=vm.runInContext(`rcScoreSession_(__rows,[],[],{classKey:function(){return 'A'},tables:{A:[25,18]},fastestLap:2,clean:5,scoring:true})`,ctx);
console.log(r.map(x=>({u:x.userId,status:x.status,pos:x.pos,pts:x.points,bonus:x.bonus,fast:x.fastest})));
