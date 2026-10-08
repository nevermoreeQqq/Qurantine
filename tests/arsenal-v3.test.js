const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation,WEAPONS,AMMO,GRENADES,STATS,WORLD,BOSSES}=require('../simulation.js');
const {Bindings}=require('../controls.js');
const {Predictor}=require('../netcode.js');
function arena(){let seed=512;const game=new Simulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});const p=game.addPlayer('a');game.start();game.enemies=[];game.pending=0;game.pickups=[];game.intermission=1000;return{game,p};}
function step(g,time){for(let i=0;i<Math.ceil(time/.02);i++)g.tick(.02);}
function enemy(g,type,x=1340,y=900){const e=g.spawn(type);e.x=x;e.y=y;return e;}
test('Cycling grenades reaches all four types and a bought Tesla can be thrown in combat',()=>{
  const {game,p}=arena(),seen=new Set([p.nadeType]);p.gold=100;
  assert.equal(game.action(p.id,'buy','shock'),true);
  for(let i=0;i<Object.keys(GRENADES).length;i++){assert.equal(game.action(p.id,'cycle'),true);seen.add(p.nadeType);if(p.nadeType==='shock'){assert.equal(game.action(p.id,'grenade'),true);assert.equal(game.grenades.at(-1).type,'shock');}}
  assert.deepEqual([...seen].sort(),Object.keys(GRENADES).sort());assert.equal(p.nadeType,'frag');assert.equal(p.nades.shock,0);
});
test('Starting pistol reloads from infinite reserve; other ammunition types remain independent',()=>{
  const {game,p}=arena();assert.equal(p.weapon,'pistol');assert.deepEqual(p.owned,['pistol']);assert.equal(p.clips.pistol,14);
  p.clips.pistol=4;const rifleAmmo=p.ammo.rifle,pistolAmmo=p.ammo.pistol;game.reload(p);step(game,1.2);assert.equal(p.clips.pistol,14);assert.equal(p.ammo.pistol,pistolAmmo);assert.equal(p.ammo.rifle,rifleAmmo);
  for(const [key,a]of Object.entries(AMMO)){const before=p.ammo[key];game.pickup(a.pickup,p.x,p.y);step(game,.02);assert.equal(p.ammo[key],before+a.amount);}
});
test('Armored mutants strongly resist ordinary weapons but heavy rifles penetrate their protection',()=>{
  const {game}=arena(),a=enemy(game,'armored'),b=enemy(game,'armored',1370);game.hurtEnemy(a,100,'a',0,'pistol');game.hurtEnemy(b,100,'a',0,'rifle');assert.ok(a.maxHp-a.hp<30);assert.ok(b.maxHp-b.hp>100);
});
test('Robot armor takes damage before health and emits detachable armor exactly once',()=>{
  const {game}=arena(),robot=enemy(game,'robot');const hp=robot.hp;
  game.hurtEnemy(robot,80,'a',0,'rifle');assert.equal(robot.hp,hp);assert.ok(robot.armor<robot.maxArmor);
  game.hurtEnemy(robot,80,'a',0,'rifle');assert.equal(robot.hp,hp);assert.equal(robot.armor,0);assert.equal(game.events.filter(e=>e.type==='armorBreak').length,1);
  game.hurtEnemy(robot,30,'a',0,'pistol');assert.equal(robot.hp,hp-30);
});
test('Robots move away from impending grenade explosions, and giants are large and fast',()=>{
  const {game}=arena(),robot=enemy(game,'robot',1400);game.grenades.push({id:999,type:'frag',owner:'a',x:1370,y:900,vx:0,vy:0,r:6,life:1,age:0});step(game,.12);assert.ok(robot.x>1400);
  assert.ok(STATS.giant.r>STATS.tank.r);assert.ok(STATS.giant.speed>STATS.walker.speed*1.6);
});
test('Dead carriers launch a smaller fast parasite toward a surviving player exactly once',()=>{
  const {game}=arena(),carrier=enemy(game,'splitter');game.hurtEnemy(carrier,1000,'a');game.hurtEnemy(carrier,1000,'a');const children=game.enemies.filter(e=>e.type==='larva');assert.equal(children.length,1);assert.ok(children[0].r<carrier.r);assert.ok(children[0].speed>carrier.speed);assert.ok(children[0].dash>0);const x=children[0].x;step(game,.1);assert.ok(children[0].x<x);
});
test('Every fifth wave has a distinct boss name and five different abilities execute in simulation',()=>{
  const names=new Set(),abilities=new Set();
  for(const wave of [5,10,15,20,25]){const {game,p}=arena();p.hp=100000;game.wave=wave;const boss=game.spawn('boss',{profile:BOSSES[wave/5-1]});boss.x=1380;boss.y=900;names.add(boss.name);abilities.add(boss.ability);boss.special=0;step(game,2);
    const type={hook:'hook',charge:'charge',leap:'leap',storm:'storm',brood:'brood'}[boss.ability];assert.ok(game.events.some(e=>e.type===type),boss.name+' must use '+type);if(boss.ability==='brood')assert.ok(game.enemies.some(e=>e.type==='larva'));
  }
  assert.equal(names.size,5);assert.equal(abilities.size,5);
});
test('Extra mutants have working support and death abilities',()=>{
  const {game}=arena(),healer=enemy(game,'healer',1350),walker=enemy(game,'walker',1330);walker.hp-=40;const hp=walker.hp;healer.special=0;step(game,.05);assert.ok(walker.hp>hp);
  const screamer=enemy(game,'screamer',1340);screamer.special=0;step(game,.05);assert.ok(walker.rage>0);
  const toxic=enemy(game,'toxic');game.hurtEnemy(toxic,1000,'a');assert.ok(game.fires.some(f=>f.type==='poison'));
  const leaper=enemy(game,'leaper',1400);leaper.special=0;step(game,.05);assert.ok(game.events.some(e=>e.type==='lunge'));assert.ok(STATS.stalker.speed>STATS.walker.speed);
});
test('Tesla grenade chains damage across nearby mutants without passing through walls',()=>{
  const {game}=arena();const a=enemy(game,'tank',1320,890),b=enemy(game,'tank',1330,1020),c=enemy(game,'tank',1340,1150);const behind=enemy(game,'tank',1500,850);
  game.explode({x:1310,y:890,type:'shock',owner:'a'});assert.ok(a.hp<a.maxHp);assert.ok(b.hp<b.maxHp);assert.ok(c.hp<c.maxHp);assert.equal(behind.hp,behind.maxHp);assert.ok(game.events.filter(e=>e.type==='arc').length>=3);
});
test('Flash grenades spawn more often than powerful grenades; shop purchases have separate stock',()=>{
  const {game,p}=arena(),counts={};game.pickup=type=>counts[type]=(counts[type]||0)+1;for(let i=0;i<500;i++)game.supply(20);
  assert.ok(counts.flash>counts.frag);assert.ok(counts.frag>counts.molotov);assert.ok(counts.molotov>counts.shock);
  p.gold=1000;for(const type of Object.keys(GRENADES)){const n=p.nades[type];assert.equal(game.buy(p,type),true);assert.equal(p.nades[type],n+1);}
});
test('Vest has a separate 100 HP pool, reduces damage and lets overflow reach health',()=>{
  const {game,p}=arena();p.gold=110;assert.equal(game.buy(p,'vest'),true);assert.equal(p.armor,100);game.hurtPlayer(p,20);assert.equal(p.hp,100);assert.equal(p.armor,87);p.armor=5;game.hurtPlayer(p,20);assert.equal(p.armor,0);assert.ok(p.hp<100&&p.hp>80);assert.equal(p.hadVest,true);
});
for(const type of ['boards','door'])test('Hammer upgrades and repairs '+type+' for gold, respects durability and breaks',()=>{
  const {game,p}=arena();p.gold=2000;game.buy(p,'hammer');p[type==='door'?'doors':'boards']=1;assert.equal(game.place(p,type),true);const b=game.barriers[0];assert.ok(b.hp>=800);
  step(game,.5);assert.equal(game.tool(p,'upgrade'),true);assert.equal(b.tier,1);assert.ok(b.maxHp>=2000);step(game,.5);assert.equal(game.tool(p,'upgrade'),true);assert.equal(b.tier,2);assert.ok(b.maxHp>=4000);step(game,.5);
  b.hp-=300;const before=p.gold;assert.equal(game.tool(p,'repair'),true);assert.equal(p.gold,before-12);assert.equal(b.hp,b.maxHp-40);assert.equal(p.hammerDurability,31);
  step(game,.5);p.hammerDurability=1;assert.equal(game.tool(p,'repair'),true);assert.equal(p.weapon,'pistol');assert.equal(p.hammerDurability,0);assert.ok(!p.owned.includes('hammer'));assert.equal(game.buy(p,'hammer'),true);assert.equal(p.hammerDurability,35);
});
test('Hammer strikes zombies with low damage and cannot upgrade for free',()=>{
  const {game,p}=arena();p.gold=85;game.buy(p,'hammer');const e=enemy(game,'walker',1280);game.shoot(p);assert.equal(e.hp,e.maxHp-12);assert.equal(p.hammerDurability,34);assert.ok(p.swing>0);
});
test('Wave size keeps increasing by three beyond the old cap; mutant HP scales after wave twenty',()=>{
  const {game}=arena();let previous=0;for(let i=0;i<32;i++){game.enemies=[];game.nextWave();const count=game.pending+game.enemies.filter(e=>e.type!=='boss').length;if(previous)assert.equal(count-previous,3);previous=count;}assert.ok(previous>65);const a=game.spawn('walker');game.wave++;const b=game.spawn('walker');assert.ok(b.maxHp>a.maxHp);assert.ok(WORLD.w>2400&&WORLD.h>1800);
});
test('Flamethrower reaches targets beyond its former range and still requires fuel',()=>{
  const {game,p}=arena();p.gold=1000;game.buy(p,'flame');p.fuel=3;const e=enemy(game,'tank',1320,1170);p.angle=Math.atan2(e.y-p.y,e.x-p.x);game.shoot(p);assert.ok(e.hp<e.maxHp);assert.equal(p.fuel,2);assert.ok(WEAPONS.flame.range>=360);
});
test('Binding any keyboard key swaps conflicts, persists values, and includes construction and hammer actions',()=>{
  const a=new Bindings();a.bind('grenade','KeyH');assert.equal(a.action('KeyH'),'grenade');a.bind('boards','KeyH');assert.equal(a.map.grenade,'KeyE');assert.equal(a.map.boards,'KeyH');const b=new Bindings(JSON.parse(JSON.stringify(a.map)));assert.equal(b.map.boards,'KeyH');b.bind('repair','Numpad7');assert.equal(b.action('Numpad7'),'repair');b.reset();assert.equal(b.map.repair,'Mouse2');
});
test('Old server snapshots do not rewind local aim, including crossing the negative pi boundary',()=>{
  const {game}=arena(),predictor=new Predictor(),p=game.snapshot().players[0];predictor.reconcile(p,[]);predictor.step({dx:0,dy:0,angle:3.1},[]);predictor.reconcile({...p,angle:0,ack:0},[]);assert.equal(predictor.player.angle,3.1);
  predictor.step({dx:0,dy:0,angle:-3.1},[]);predictor.reconcile({...p,angle:3.1,ack:1},[]);assert.equal(predictor.player.angle,-3.1);predictor.reconcile({...p,angle:-3.1,ack:2},[]);assert.equal(predictor.player.angle,-3.1);
});
