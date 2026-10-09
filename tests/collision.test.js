const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,movePlayer}=require('../simulation.js');
const {Predictor,STEP}=require('../netcode.js');
function arena(){const game=new Simulation(()=>.5),p=game.addPlayer('a');game.start();game.pending=0;game.enemies=[];game.pickups=[];game.intermission=1000;return{game,p};}
function enemy(game,type,x,y){const e=game.spawn(type);Object.assign(e,{x,y,special:100,attack:0});return e;}
function separated(a,b){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-1e-6,'bodies must not overlap');}

test('A zombie reaches melee range without entering the player and can be shot at contact',()=>{
  const {game,p}=arena(),e=enemy(game,'walker',p.x+90,p.y);p.hp=1000;
  for(let i=0;i<180;i++){game.tick(STEP);separated(p,e);}
  assert.ok(p.hp<1000,'contact attacks still cause damage');
  const hp=e.hp;game.shoot(p,1);game.tick(STEP);assert.ok(e.hp<hp,'a point-blank shot hits');
});
test('Player movement stops at a frozen zombie, can retreat and can slide around it',()=>{
  const {game,p}=arena(),e=enemy(game,'tank',p.x+60,p.y);e.frozen=10;
  for(let i=0;i<30;i++)movePlayer(p,{dx:1,dy:0,sprint:true},STEP,[],[e]);
  separated(p,e);assert.ok(p.x<e.x);const x=p.x;
  movePlayer(p,{dx:-1,dy:0},STEP,[],[e]);assert.ok(p.x<x);
  for(let i=0;i<30;i++)movePlayer(p,{dx:1,dy:1},STEP,[],[e]);
  separated(p,e);assert.ok(p.y>920,'diagonal movement can go around the body');
});
test('Swept movement stops fast enemies and forced player movement at every living co-op player',()=>{
  const {game,p}=arena(),q=game.addPlayer('b'),e=enemy(game,'larva',1400,900);q.hp=0;
  game.move(e,-400,0,'enemy');separated(p,e);assert.ok(e.x>p.x);
  game.move(p,400,0,'player');separated(p,e);assert.ok(p.x<e.x);
  q.hp=100;q.x=1300;e.x=1400;game.move(e,-400,0,'enemy');separated(q,e);assert.ok(e.x>q.x,'the nearest living player blocks the charge');
});
test('Old overlaps, including an exact shared centre, are removed even while enemies are frozen',()=>{
  for(const type of ['larva','walker','boss']){
    const {game,p}=arena(),e=enemy(game,type,p.x,p.y);e.frozen=10;game.tick(STEP);
    separated(p,e);assert.ok(game.valid(e.x,e.y,e.r,'enemy'));assert.equal(p.x,1200);assert.equal(p.y,900);
  }
});
test('An overlapping zombie finds a free side instead of moving through a barricade',()=>{
  const {game,p}=arena();game.barriers.push({x:1230,y:870,w:20,h:60,type:'boards',hp:1000});
  const e=enemy(game,'walker',1210,900);e.frozen=10;game.tick(STEP);
  separated(p,e);assert.ok(game.valid(e.x,e.y,e.r,'enemy'));assert.ok(e.x<1230);assert.equal(p.x,1200);assert.equal(p.y,900);
});
test('Airborne enemies pass overhead and land outside the player after dealing landing damage',()=>{
  for(const mode of ['flight','jump']){
    const {game,p}=arena(),e=enemy(game,mode==='jump'?'boss':'runner',p.x,p.y);
    const from={x:p.x,y:p.y},to={...from};
    Object.assign(e,mode==='flight'?{flight:STEP*2,flightDuration:STEP*2,flightFrom:from,flightTo:to}:{jump:STEP*2,jumpFrom:from,jumpTo:to});
    game.tick(STEP);assert.equal(e.x,p.x);assert.equal(e.y,p.y);
    game.tick(STEP);separated(p,e);assert.ok(p.hp<100,'landing attack is preserved');
  }
});
test('A crowd cannot push a zombie inside any of four players',()=>{
  const {game,p}=arena();for(let i=1;i<4;i++)game.addPlayer(String(i));
  for(const q of game.players)q.hp=10000;
  for(let i=0;i<32;i++)enemy(game,i%2?'larva':'walker',p.x+Math.cos(i)*35,p.y+Math.sin(i)*35);
  for(let i=0;i<120;i++){game.tick(STEP);for(const e of game.enemies)for(const q of game.players)separated(e,q);}
});
test('An enemy appearing inside a player surrounded by three allies finds room outside the group',()=>{
  const {game,p}=arena();
  for(let i=0;i<3;i++){const q=game.addPlayer(String(i));q.x=p.x+Math.cos(i*Math.PI*2/3)*70;q.y=p.y+Math.sin(i*Math.PI*2/3)*70;}
  const e=enemy(game,'boss',p.x,p.y);e.frozen=10;game.tick(STEP);
  for(const q of game.players)separated(e,q);assert.ok(game.valid(e.x,e.y,e.r,'enemy'));
});
test('Charges and knockback stop at contact without disabling melee attacks',()=>{
  for(const type of ['larva','leaper','boss']){
    const {game,p}=arena(),e=enemy(game,type,1400,900);p.hp=1000;Object.assign(e,{dash:1,dashAngle:Math.PI,knockX:-500});
    for(let i=0;i<30;i++){game.tick(.05);separated(e,p);assert.ok(e.x>p.x);}
    assert.ok(p.hp<1000);
  }
});
test('The first bullet sweep includes the gap before the muzzle, and shurikens still pierce',()=>{
  const {game,p}=arena(),a=enemy(game,'larva',1212,900),b=enemy(game,'tank',1270,900);a.frozen=b.frozen=10;
  game.projectile(p,0,25,1250,900,'shuriken',3);p.x=1800; // The shooter moves away; the launch path stays fixed.
  const hpA=a.hp,hpB=b.hp;game.tick(.05);assert.equal(a.hp,hpA-25);assert.equal(b.hp,hpB-25);
});
test('Point-blank sweeps still stop at walls before hitting enemies behind them',()=>{
  const {game,p}=arena();p.x=1425;p.y=850;const e=enemy(game,'walker',1570,850);e.frozen=10;
  game.projectile(p,0,100,1250,900);const hp=e.hp;for(let i=0;i<12;i++)game.tick(STEP);
  assert.equal(e.hp,hp);assert.equal(game.bullets.length,0);
});
test('Co-op prediction and unacknowledged input replay respect the same enemy contact boundary',()=>{
  const {game,p}=arena(),e=enemy(game,'walker',1260,900);e.frozen=10;game.networkPlayer(p.id);
  const predictor=new Predictor();predictor.reconcile({...p},[],[e]);
  for(let i=0;i<40;i++){
    const frame=predictor.step({dx:1,dy:0,angle:0},[],[e]);game.queueInput(p.id,[frame]);game.tick(STEP);
    separated(predictor.player,e);separated(p,e);assert.ok(Math.abs(predictor.player.x-p.x)<1e-6);
  }
  predictor.reconcile({...p,ack:10},[],[e]);separated(predictor.player,e);assert.equal(predictor.pending.length,30);
});
