const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation,BOSSES,WEAPONS,movePlayer}=require('../simulation.js');
function arena(seed=451,difficulty='normal'){const game=new Simulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},{difficulty});const p=game.addPlayer('a');game.start();game.enemies=[];game.pending=0;game.intermission=1000;game.pickups=[];return{game,p};}
function step(g,time){for(let i=0;i<Math.ceil(time/.02);i++)g.tick(.02);}
function boss(g,ability,x=1380,y=900){const e=g.spawn('boss',{profile:BOSSES.find(b=>b.ability===ability)});e.x=x;e.y=y;e.speed=0;return e;}

test('Eight bosses appear in random order without repeats and late-wave hybrids have distinct identities',()=>{
  const sequence=seed=>{const {game}=arena(seed,'hard'),names=[];for(let i=0;i<18;i++){game.wave=(i+1)*5;const e=game.spawn('boss');names.push(e.name);}return names;};
  const first=sequence(15),second=sequence(16);assert.equal(new Set(first).size,18);assert.equal(new Set(first.slice(0,8)).size,8);assert.notDeepEqual(first.slice(0,8),second.slice(0,8));
  assert.deepEqual(first.slice(0,8).sort(),BOSSES.map(b=>b.name).sort());assert.match(first[8],/Слияние/);
});
test('Necromancer summons normal mutants and cannot summon more than two additional bosses even after they die',()=>{
  const {game,p}=arena();p.hp=100000;const necro=boss(game,'necromancer');game.random=()=>0;
  for(let i=0;i<6;i++){necro.special=0;game.newBossAbility(necro,p,.02);for(const e of game.enemies)if(e.summoned)e.hp=0;}
  assert.equal(necro.summonedBosses,2);assert.equal(game.enemies.filter(e=>e.summoned).length,2);assert.ok(game.enemies.filter(e=>e.type==='walker'||e.type==='runner').length>=24);assert.ok(game.enemies.filter(e=>e.summoned).every(e=>e.ability!=='necromancer'));
});
test('Burrower launches a mutant across the arena which lands at the target and damages nearby players',()=>{
  const {game,p}=arena();p.hp=1000;const e=boss(game,'burrower',2500,1300);e.special=0;game.newBossAbility(e,p,.02);const child=game.enemies.find(e=>e.flight>0);assert.ok(child);assert.equal(child.flightTo.x,p.x);assert.equal(child.flightTo.y,p.y);const x=child.x;step(game,.7);assert.ok(child.x<x&&child.x>p.x);step(game,.75);assert.equal(child.flight,0);assert.ok(p.hp<1000);assert.ok(game.events.some(e=>e.type==='toss'));assert.ok(game.events.some(e=>e.type==='slam'));
});
test('Mines are revealed only to witnesses at planting, remain hidden on approach, and stepping causes 50 damage',()=>{
  const {game,p}=arena(),q=game.addPlayer('b');q.x=2400;q.y=1600;const e=boss(game,'burrower',1280,900);game.plantMine(e);const mine=game.mines[0];assert.ok(mine.revealedTo.includes(p.id));assert.ok(!mine.revealedTo.includes(q.id));assert.equal(game.snapshot(p.id).mines.length,1);assert.equal(game.snapshot(q.id).mines.length,0);assert.ok(!('revealedTo'in game.snapshot(p.id).mines[0]));
  q.x=mine.x+60;q.y=mine.y;game.tickHazards(1);assert.equal(game.snapshot(q.id).mines.length,0);p.x=300;p.y=900;q.x=mine.x;q.y=mine.y;game.tickHazards(.02);assert.equal(q.hp,50);assert.equal(game.mines.length,0);
});
test('A witness can shoot a revealed mine; an unwitnessed player cannot destroy it with gunfire',()=>{
  const {game,p}=arena(),q=game.addPlayer('b');q.x=2400;q.y=1600;const e=boss(game,'burrower',1280,900);game.plantMine(e);const m=game.mines[0];game.hurtProp(m,100,q.id);assert.equal(m.hp,35);game.hurtProp(m,100,p.id);game.tickHazards(.02);assert.equal(game.mines.length,0);assert.ok(game.events.some(e=>e.type==='mineBreak'));
});
test('Mines and webs expire after five minutes; webs slow movement and release players after leaving',()=>{
  const {game,p}=arena();const e=boss(game,'burrower',2200,1400);game.plantMine(e);game.webs.push({id:999,x:p.x,y:p.y,r:100,life:300});game.tickHazards(.02);const slow={...p},normal={...p,slow:0};movePlayer(slow,{dx:1,dy:0},.1);movePlayer(normal,{dx:1,dy:0},.1);assert.ok(slow.x-p.x<(normal.x-p.x)*.6);game.tickHazards(300);assert.equal(game.mines.length,0);assert.equal(game.webs.length,0);game.tickHazards(.3);assert.equal(p.slow,0);
});
test('A shot destroys a cocoon and releases three spiders; intact cocoons hatch fifteen to twenty exactly once',()=>{
  for(const broken of [true,false]){const {game,p}=arena(),e=boss(game,'arachnid');game.makeCocoon(e);const c=game.cocoons[0];if(broken){c.x=1340;c.y=900;p.weapon='rifle';p.clips.rifle=6;game.shoot(p);step(game,.12);}else{game.tickHazards(14.1);}const count=game.enemies.filter(e=>e.type==='spider').length;assert.ok(broken?count===3:count>=15&&count<=20);game.openCocoon(c,false);assert.equal(game.enemies.filter(e=>e.type==='spider').length,count);}
});
test('Spider boss creates attackable cocoons and a lasting web near its target',()=>{
  const {game,p}=arena(),e=boss(game,'arachnid');e.special=0;game.newBossAbility(e,p,.02);assert.equal(game.cocoons.length,1);assert.equal(game.webs.length,1);assert.equal(game.webs[0].life,300);assert.ok(Math.hypot(game.webs[0].x-p.x,game.webs[0].y-p.y)<150);
});
test('Medic heals other mutants by a small amount without exceeding maximum health or healing itself',()=>{
  const {game}=arena(),medic=game.spawn('medic'),walker=game.spawn('walker');medic.x=1320;medic.y=900;walker.x=1340;walker.y=900;walker.hp-=5;medic.hp-=20;medic.special=0;step(game,.02);assert.equal(walker.hp,walker.maxHp);assert.equal(medic.hp,medic.maxHp-20);
});
test('Currency expires, bosses drop banknotes, wave supplies increase and death stains disappear within eight seconds',()=>{
  const {game,p}=arena();game.pickup('gold',1350,900,20);game.pickup('bill',1350,930,100);game.tickHazards(91);assert.equal(game.pickups.filter(p=>p.type==='gold').length,0);assert.equal(game.pickups.filter(p=>p.type==='bill').length,1);game.tickHazards(60);assert.equal(game.pickups.length,0);
  const e=boss(game,'hook');game.hurtEnemy(e,10000,p.id);assert.ok(game.pickups.some(p=>p.type==='bill'&&p.amount>=360));assert.ok(game.corpses[0].life>=5&&game.corpses[0].life<=8);game.tickHazards(8);assert.equal(game.corpses.length,0);game.pickups=[];game.nextWave();assert.ok(game.pickups.filter(p=>p.type!=='gold').length>=9);
});
test('Ordinary mutants can drop more valuable bills, ammunition and grenades without duplicating death rewards',()=>{
  const {game,p}=arena();game.random=()=>0;const e=game.spawn('walker');e.x=1350;e.y=900;game.hurtEnemy(e,1000,p.id);game.hurtEnemy(e,1000,p.id);assert.equal(p.kills,1);assert.ok(game.pickups.some(p=>p.type==='bill'&&p.amount>=65));assert.ok(game.pickups.some(p=>p.type.startsWith('ammo')));assert.ok(game.pickups.some(p=>p.type==='flash'));
});
test('Shotgun has improved close damage, Tesla breaks robot armor, and Molotov burns ordinary zombies harder',()=>{
  assert.equal(WEAPONS.shotgun.damage*WEAPONS.shotgun.pellets,320);const {game,p}=arena(),robot=game.spawn('robot');robot.x=1330;robot.y=900;game.explode({x:1330,y:900,type:'shock',owner:p.id});assert.equal(robot.armor,0);game.explode({x:1330,y:900,type:'shock',owner:p.id});assert.ok(robot.hp<robot.maxHp);
  game.enemies=[];const tank=game.spawn('tank');tank.x=1330;tank.y=900;tank.speed=0;game.explode({x:1330,y:900,type:'molotov',owner:p.id});step(game,.02);assert.equal(tank.maxHp-tank.hp,30);
});
