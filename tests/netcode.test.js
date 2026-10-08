const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,movePlayer,shotSpread}=require('../simulation.js');
const {Predictor,Timeline,STEP}=require('../netcode.js');
function arena(){const s=new Simulation(()=>.5);s.addPlayer('a','Alpha');s.networkPlayer('a');s.start();s.pending=0;s.enemies=[];s.intermission=100;return s;}
test('Prediction stays aligned with the server under 200ms round trip and variable packet delays',()=>{
  const s=arena(),predictor=new Predictor();predictor.reconcile(s.snapshot().players[0],[]);const packets=[],snapshots=[];let maxError=0;
  for(let tick=0;tick<360;tick++){
    const before=predictor.player.x,dx=tick<150?1:tick<280?-1:0;
    const f=predictor.step({dx,dy:0,angle:0,shoot:false,sprint:false},[]);
    if(tick===0)assert.ok(predictor.player.x>before,'movement responds before a packet reaches the server');
    // TCP preserves command order, but batches arrive with variable delay.
    packets.push({arrival:tick+6+(Math.floor(tick/12)%3),frame:f});
    const due=[];while(packets[0]?.arrival<=tick)due.push(packets.shift().frame);if(due.length)s.queueInput('a',due);
    s.tick(STEP);
    if(tick%2===0)snapshots.push({arrival:tick+6,player:s.snapshot().players[0]});
    while(snapshots[0]?.arrival<=tick){const snap=snapshots.shift();const x=predictor.player.x;predictor.reconcile(snap.player,[]);maxError=Math.max(maxError,Math.abs(predictor.player.x-x));}
    if(tick>280)assert.ok(Math.abs(predictor.player.x-before)<1e-6,'releasing movement stops locally without waiting for the server');
  }
  assert.ok(maxError<1e-6,'acknowledged commands are removed, unacknowledged commands replay exactly');
  assert.ok(Math.abs(s.players[0].x-predictor.player.x)<1e-6);
});
test('Shared prediction collision respects boards, doors, diagonal speed and weapon speed',()=>{
  const s=arena(),p=s.players[0],a={...p},b={...p};
  movePlayer(a,{dx:1,dy:1,sprint:false},STEP,[]);movePlayer(b,{dx:1,dy:0,sprint:false},STEP,[]);
  assert.ok(Math.abs(Math.hypot(a.x-p.x,a.y-p.y)-(b.x-p.x))<1e-8);
  const boards=[{x:1220,y:870,w:20,h:80,type:'boards'}];movePlayer(p,{dx:1,dy:0},STEP,boards);assert.equal(p.x,1200);
  boards[0].type='door';movePlayer(p,{dx:1,dy:0},STEP,boards);assert.ok(p.x>1200);
});
test('Queued input cannot move faster than server time, duplicate commands cannot repeat a shot',()=>{
  const s=arena(),p=s.players[0],x=p.x;
  const frames=Array.from({length:30},(_,i)=>({seq:i+1,dx:1,dy:0,angle:0,shoot:i===0,shotId:i===0?1:undefined}));
  s.queueInput('a',[null,{},'invalid',{seq:Infinity}]);
  s.queueInput('a',frames);s.queueInput('a',frames);s.tick(STEP);
  assert.equal(p.ack,1);assert.equal(p.clips.pistol,13);assert.ok(Math.abs(p.x-x-228*STEP)<1e-8);
  const bullet=s.bullets[0];assert.equal(bullet.shotId,1);assert.ok(Math.abs(Math.atan2(bullet.vy,bullet.vx)-shotSpread(1,0,.022))<1e-8);
  for(let i=1;i<30;i++)s.tick(STEP);assert.equal(p.ack,30);assert.equal(p.clips.pistol,13);
  const snapshot=s.snapshot().players[0];assert.ok(!('commands'in snapshot));assert.ok(!('budget'in snapshot));
});
test('Remote motion and bullets interpolate between snapshots without going backwards after a late packet',()=>{
  const timeline=new Timeline(.09);
  const state=(time,x)=>({serverTime:time,round:1,players:[{id:'a',x,y:900,angle:0}],enemies:[],grenades:[],bullets:[{id:5,x:x*2,y:900,vx:1250,vy:0,life:1}]});
  timeline.push(state(1,100),1.1);timeline.push(state(1.04,108),1.14);
  const a=timeline.render(1.21);assert.ok(a.players[0].x>100&&a.players[0].x<108);assert.ok(a.bullets[0].x>200&&a.bullets[0].x<216);
  timeline.push(state(1.08,116),1.3);const b=timeline.render(1.3);assert.ok(b.bullets[0].x>=a.bullets[0].x);
  timeline.push(state(1.02,104),1.32);assert.ok(timeline.render(1.32).bullets[0].x>=b.bullets[0].x);
  timeline.push({...state(0,1200),round:2},1.4);assert.equal(timeline.samples.length,1);assert.equal(timeline.render(1.4).players[0].x,1200);
});
