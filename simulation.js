(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./core.js'):root.GameCore;
  const {clamp,circleRect,segmentCircle,segmentRect,blastDamage}=C;
  const D=typeof module!=='undefined'&&module.exports?require('./content.js'):root.GameContent;
  const {WORLD,OBSTACLES,WEAPONS,GOODS,STATS,AMMO,GRENADES,BOSSES,MODES,BUILD_ITEMS,TURRETS,BARRICADE_TIERS}=D;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const solidEnemy=e=>e.hp>0&&!(e.flight>0)&&!(e.jump>0);
  const CONTACT_GAP=.25;
  function moveBody(body,dx,dy,valid,blockers=[]){
    // Sweep each axis against expanded circles, so a fast charge cannot cross a player.
    for(const [mx,my]of[[dx,0],[0,dy]]){
      if(!mx&&!my)continue;let limit=1;
      for(const other of blockers){
        if(other.hp<=0)continue;
        const fx=body.x-other.x,fy=body.y-other.y,r=body.r+other.r+CONTACT_GAP;
        if(fx*fx+fy*fy<=r*r+1e-6){if(fx*mx+fy*my<0)limit=0;continue;}
        const t=segmentCircle(body.x,body.y,body.x+mx,body.y+my,other.x,other.y,r);
        if(t!==null)limit=Math.min(limit,t);
      }
      const x=body.x+mx*limit,y=body.y+my*limit;
      if(valid(x,y)){body.x=x;body.y=y;}
    }
  }
  function movePlayer(p,input,dt,barriers=[],enemies=[]){
    const valid=(x,y)=>x>p.r+20&&y>p.r+20&&x<WORLD.w-p.r-20&&y<WORLD.h-p.r-20&&!OBSTACLES.some(o=>circleRect(x,y,p.r,o))&&!barriers.some(b=>b.type!=='door'&&circleRect(x,y,p.r,b));
    const n=Math.hypot(input.dx,input.dy),speed=(input.sprint?268:190)*WEAPONS[p.weapon].speed*(p.slow>0?.48:1);
    if(!n||p.hp<=0||p.controlLock>0)return;const dx=input.dx/n*speed*dt,dy=input.dy/n*speed*dt;p.step=(p.step||0)+dt*speed*.055;
    moveBody(p,dx,dy,valid,enemies.filter(solidEnemy));
  }
  function shotSpread(id,pellet,spread){let n=((id||0)*73856093^(pellet+1)*19349663)>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(((n^(n>>>16))>>>0)/4294967296*2-1)*spread;}
  class Simulation{
    constructor(random=Math.random,options={}){if(typeof random==='object'){options=random;random=Math.random;}this.random=random;this.difficulty=Object.hasOwn(MODES,options.difficulty)?options.difficulty:'normal';this.maxPlayers=[2,3,4].includes(Number(options.maxPlayers))?Number(options.maxPlayers):4;this.night=false;this.nightRemaining=0;this.nextNight=120+random()*360;this.nightSpawn=3;this.totems=[];this.timeoutRemaining=0;this.timeoutsUsed=0;this.vote=null;this.shockwaves=[];this.graves=[];this.waveIntro=null;this.nextId=1;this.eventId=0;this.players=[];this.enemies=[];this.bullets=[];this.grenades=[];this.pickups=[];this.barriers=[];this.fires=[];this.mines=[];this.cocoons=[];this.webs=[];this.corpses=[];this.bossPool=BOSSES.filter(b=>MODES[this.difficulty].bosses.includes(b.ability));this.bossSerial=0;this.events=[];this.wave=0;this.pending=0;this.elapsed=0;this.intermission=0;this.spawnTimer=0;this.state='waiting';this.flow=[];this.flowTimer=0;this.supply(14);this.scatterMoney(8);}
    rand(a,b){return a+this.random()*(b-a);} id(){return this.nextId++;}
    event(type,data={}){const {type:enemyType,...fields}=data;this.events.push({...fields,...(enemyType?{enemyType}:{}),id:++this.eventId,type});if(this.events.length>80)this.events.shift();}
    message(p,text){this.event('message',{player:p.id,text});}
    staticValid(x,y,r=20){return x>r+20&&y>r+20&&x<WORLD.w-r-20&&y<WORLD.h-r-20&&!OBSTACLES.some(o=>circleRect(x,y,r,o));}
    valid(x,y,r,kind='player'){return this.staticValid(x,y,r)&&(kind!=='enemy'||!this.graves.some(g=>circleRect(x,y,r,{x:g.x-20,y:g.y-34,w:40,h:68})))&&!this.barriers.some(b=>(kind==='enemy'||b.type!=='door')&&circleRect(x,y,r,b));}
    move(body,dx,dy,kind='prop'){const blockers=kind==='enemy'?this.players:kind==='player'?this.enemies.filter(solidEnemy):[];moveBody(body,dx,dy,(x,y)=>this.valid(x,y,body.r,kind),blockers);}
    sight(a,b,padding=0){for(const o of OBSTACLES)if(segmentRect(a.x,a.y,b.x,b.y,o,padding)!==null)return false;return true;}
    spot(x,y,min,max,r=18){for(let i=0;i<180;i++){const a=this.rand(0,6.28),d=this.rand(min,max),p={x:clamp(x+Math.cos(a)*d,50,WORLD.w-50),y:clamp(y+Math.sin(a)*d,50,WORLD.h-50)};if(this.valid(p.x,p.y,r)&&this.players.every(q=>dist(p,q)>55))return p;}return{x:1200,y:850};}
    pickup(type,x,y,amount=1){const money=type==='gold'||type==='bill';this.pickups.push({id:this.id(),type,x,y,amount,phase:this.rand(0,6.28),...(money?{life:type==='bill'?150:90}:{})});const supplies=this.pickups.filter(p=>!['gold','bill'].includes(p.type));if(supplies.length>40)this.pickups.splice(this.pickups.indexOf(supplies[0]),1);if(this.pickups.length>180)this.pickups.shift();}
    scatterMoney(n){for(let i=0;i<n;i++){const pos=this.spot(1500,1080,200,1450);this.pickup('gold',pos.x,pos.y,8+Math.floor(this.rand(0,9)));}}
    chooseBoss(exclude){const available=this.bossPool.filter(b=>b.ability!==exclude);this.bossSerial++;
      if(available.length){const profile=available[Math.min(available.length-1,Math.floor(this.random()*available.length))];this.bossPool.splice(this.bossPool.indexOf(profile),1);return{...profile,variant:this.bossSerial};}
      // Once all named bosses are defeated, new hybrids get distinct identities and alternating abilities.
      const types=BOSSES.filter(b=>MODES[this.difficulty].bosses.includes(b.ability)&&b.ability!==exclude),a=types[Math.floor(this.random()*types.length)],b=types.filter(b=>b!==a)[Math.floor(this.random()*(types.length-1))];
      return{name:'Слияние '+this.bossSerial+' — '+a.name.split(' — ')[0]+' / '+b.name.split(' — ')[0],ability:a.ability,secondary:b.ability,color:a.color,variant:this.bossSerial};
    }
    deathLoot(e,owner){const player=this.players.find(p=>p.id===owner);if(player)player.kills++;
      const boss=e.type==='boss',bill=boss||this.random()<.08,amount=boss?360+this.wave*8:bill?65+Math.floor(this.rand(0,46)):e.type==='giant'?48:e.type==='tank'?32:18+Math.floor(this.rand(0,13));this.pickup(bill?'bill':'gold',e.x,e.y,amount);
      if(!boss&&this.random()<.18){const types=Object.values(AMMO);this.pickup(types[Math.floor(this.random()*types.length)].pickup,e.x+20,e.y+7);}
      if(!boss&&this.random()<.12){const total=Object.values(GRENADES).reduce((n,g)=>n+g.weight,0);let roll=this.random()*total;for(const [type,g]of Object.entries(GRENADES)){roll-=g.weight;if(roll<=0){this.pickup(type,e.x-19,e.y+10);break;}}}
      this.corpses.push({id:this.id(),x:e.x,y:e.y,r:boss?45:22,life:5+this.rand(0,3),maxLife:8});if(this.corpses.length>140)this.corpses.shift();this.event('kill',{x:e.x,y:e.y,type:e.type});
    }
    plantMine(e){if(this.mines.length>=32)return;const pos=this.spot(e.x,e.y,65,190,12),revealedTo=this.players.filter(p=>p.hp>0&&dist(p,pos)<260&&this.sight(p,pos)).map(p=>p.id);this.mines.push({id:this.id(),kind:'mine',...pos,r:17,hp:35,life:300,armed:.9,revealedTo});this.event('dig',{x:e.x,y:e.y});}
    makeCocoon(e){if(this.cocoons.length>=12)return;const pos=this.spot(e.x,e.y,80,210,22);this.cocoons.push({id:this.id(),kind:'cocoon',...pos,r:25,hp:135,maxHp:135,life:14,age:0});this.event('cocoon',{...pos});}
    hurtProp(prop,damage,owner){if(prop.hp<=0||prop.kind==='mine'&&!prop.revealedTo.includes(owner))return;prop.hp-=damage;if(prop.hp<=0){if(prop.kind==='cocoon')this.openCocoon(prop,true);else this.event(prop.kind==='totem'?'totemBreak':'mineBreak',{x:prop.x,y:prop.y});}}
    openCocoon(c,broken){if(c.opened)return;c.opened=true;c.hp=0;const count=broken?3:15+Math.floor(this.rand(0,6));for(let i=0;i<count;i++){const child=this.spawn('spider');if(child){const pos=this.spot(c.x,c.y,30,90,child.r);child.x=pos.x;child.y=pos.y;}}this.event('hatch',{x:c.x,y:c.y,count});}
    throwMutant(e,target){const child=this.spawn('runner');if(!child)return;const end=this.valid(target.x,target.y,child.r,'enemy')?{x:target.x,y:target.y}:this.spot(target.x,target.y,35,95,child.r);Object.assign(child,{x:e.x,y:e.y,flight:1.4,flightDuration:1.4,flightFrom:{x:e.x,y:e.y},flightTo:end});this.event('toss',{x:e.x,y:e.y,tx:end.x,ty:end.y});}
    newBossAbility(e,target,dt){
      if(e.ability==='burrower'){e.mineTimer=(e.mineTimer??6)-dt;if(e.mineTimer<=0){this.plantMine(e);e.mineTimer=this.rand(11,17);}}
      if(!['necromancer','burrower','arachnid'].includes(e.ability))return false;
      if(e.special>0)return true;e.special=e.ability==='necromancer'?9:e.ability==='burrower'?10:12;e.swing=.5;
      if(e.ability==='necromancer'){for(let i=0;i<4;i++){const child=this.spawn(i%2?'runner':'walker');if(child){const pos=this.spot(e.x,e.y,70,140,child.r);child.x=pos.x;child.y=pos.y;}}
        if((e.summonedBosses||0)<2&&this.enemies.filter(b=>b.type==='boss'&&b.summoned&&b.hp>0).length<2&&this.random()<.06){const boss=this.spawn('boss',{summoned:true,exclude:'necromancer'});if(boss){e.summonedBosses=(e.summonedBosses||0)+1;boss.maxHp=Math.round(boss.maxHp*.6);boss.hp=boss.maxHp;}}this.event('necromancy',{x:e.x,y:e.y});
      }else if(e.ability==='burrower')this.throwMutant(e,target);
      else{this.makeCocoon(e);const pos=this.spot(target.x,target.y,45,140,20);if(this.webs.length>=24)this.webs.shift();this.webs.push({id:this.id(),...pos,r:105,life:300});this.event('web',{...pos});}
      if(e.secondary){const ability=e.ability;e.ability=e.secondary;e.secondary=ability;}return true;
    }
    enemyPool(){const order=MODES[this.difficulty].enemies;return order.slice(0,Math.min(order.length,Math.max(1,this.wave)+Math.max(0,this.players.length-1)));}
    timeoutVote(p,type){
      const purpose=type==='resumeTimeout'?'resume':type==='timeout'?'pause':this.vote?.purpose;
      if(!purpose||purpose==='pause'&&this.timeoutRemaining>0||purpose==='resume'&&this.timeoutRemaining<=0)return false;
      if(['timeout','resumeTimeout'].includes(type)&&!this.vote){this.vote={purpose,yes:[p.id],no:[],life:25,initiator:p.name};this.event('voteStart',{name:p.name,purpose});}
      else if(this.vote){if(this.vote.purpose!==purpose||this.vote.yes.includes(p.id)||this.vote.no.includes(p.id))return false;this.vote[type==='voteNo'?'no':'yes'].push(p.id);}else return false;
      const required=Math.floor(this.players.length/2)+1;
      if(this.vote.yes.length>=required){if(purpose==='resume'){this.timeoutRemaining=0;this.event('timeoutEnd');}else{this.timeoutRemaining=120;this.timeoutsUsed++;this.event('timeoutStart');}this.vote=null;}
      else if(this.vote.no.length>this.players.length-required){this.vote=null;this.event('voteEnd',{passed:false,purpose});}return true;
    }
    placeTurret(p,type,stock){return this.placeStructure(p,type,stock);}
    tickTurrets(dt){for(const b of this.barriers){const spec=TURRETS[b.type];if(!spec||b.hp<=0)continue;b.fireTimer=Math.max(0,b.fireTimer-dt);b.recoil=Math.max(0,b.recoil-dt*7);b.heat=Math.max(0,(b.heat||0)-dt*.7);
      const origin={x:b.x+b.w/2,y:b.y+b.h/2},level=b.level||0,range=spec.range+level*40;
      let target=null,best=Infinity;for(const e of this.enemies){if(e.hp<=0||dist(origin,e)>=range||!this.sight(origin,e))continue;const score=dist(origin,e)-(b.type==='turretHeavy'&&e.armor>0?180:0);if(score<best){best=score;target=e;}}
      if(!target)continue;b.angle=Math.atan2(target.y-origin.y,target.x-origin.x);if(b.fireTimer>0)continue;
      b.fireTimer=spec.interval;b.recoil=1;b.heat=Math.min(1,(b.heat||0)+.15);b.barrel=1-(b.barrel||0);const damage=spec.damage*(1+level*.3);
      if(b.type==='turretFlame'){for(const e of this.enemies)if(e.hp>0&&dist(origin,e)<range&&this.sight(origin,e)&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-origin.y,e.x-origin.x)-b.angle),Math.cos(Math.atan2(e.y-origin.y,e.x-origin.x)-b.angle)))<.38){this.hurtEnemy(e,damage,b.owner,b.angle,'turretFlame');e.burn=1.2;e.burnOwner=b.owner;}this.event('turretFlame',{...origin,angle:b.angle});}
      else for(let i=0;i<spec.barrels;i++){const side=(i-(spec.barrels-1)/2)*14,from={x:origin.x-Math.sin(b.angle)*side,y:origin.y+Math.cos(b.angle)*side,id:b.owner,weapon:b.type};this.projectile(from,b.angle,damage,1250,range,'bullet');this.event('turretShot',{...from,angle:b.angle,heavy:spec.barrels===2});}
    }}
    tickShockwaves(dt){for(const w of this.shockwaves){const previous=w.r;w.r+=w.speed*dt;for(const p of this.players){const d=dist(w,p);if(p.hp>0&&!w.hit.includes(p.id)&&d-p.r<=w.r&&d+p.r>=previous&&this.sight(w,p)){w.hit.push(p.id);this.hurtPlayer(p,w.damage);}}}this.shockwaves=this.shockwaves.filter(w=>w.r<w.maxR);}
    tickHazards(dt){
      for(const p of this.players)p.slow=p.hp>0&&this.webs.some(w=>dist(w,p)<w.r+p.r)?.2:Math.max(0,(p.slow||0)-dt);
      for(const mine of this.mines){mine.life-=dt;mine.armed=Math.max(0,mine.armed-dt);if(mine.hp<=0||mine.life<=0||mine.armed>0)continue;const player=this.players.find(p=>p.hp>0&&dist(p,mine)<mine.r+p.r);if(player){this.hurtPlayer(player,50);mine.hp=0;this.event('explosion',{x:mine.x,y:mine.y,kind:'mine'});}}
      for(const c of this.cocoons){c.age+=dt;c.life-=dt;if(c.hp>0&&c.life<=0)this.openCocoon(c,false);}
      for(const w of this.webs)w.life-=dt;for(const p of this.pickups)if(Number.isFinite(p.life))p.life-=dt;for(const c of this.corpses)c.life-=dt;
      this.mines=this.mines.filter(m=>m.hp>0&&m.life>0);this.cocoons=this.cocoons.filter(c=>c.hp>0&&!c.opened);this.webs=this.webs.filter(w=>w.life>0);this.pickups=this.pickups.filter(p=>p.life===undefined||p.life>0);this.corpses=this.corpses.filter(c=>c.life>0);
    }
    supply(n,near){
      const weighted=[['ammoLight',15],['ammoBelt',3],['ammoRifle',17],['ammoHeavy',7],['ammoShell',11],['fuel',10],['med',12],...Object.entries(GRENADES).map(([id,g])=>[id,g.weight])];
      const total=weighted.reduce((n,[,w])=>n+w,0);
      for(let i=0;i<n;i++){let roll=this.random()*total,type=weighted[0][0];for(const [id,w]of weighted){roll-=w;if(roll<=0){type=id;break;}}if(!near&&i<2)type=i?'flash':'med';const origin=near||(i<2?{x:1200,y:900}:{x:1500,y:1080}),p=this.spot(origin.x,origin.y,near?130:180,near?500:1450);this.pickup(type,p.x,p.y);}
    }
    addPlayer(id,name='Боец'){
      if(this.players.length>=this.maxPlayers)throw Error('Комната заполнена ('+this.maxPlayers+' игрока).');
      const p={id,name:String(name).trim().slice(0,18)||'Боец',x:1200+this.players.length*46,y:900,r:17,hp:100,armor:0,hadVest:false,angle:0,weapon:'pistol',owned:['pistol'],clips:{pistol:14},ammo:{light:0,belt:0,rifle:0,heavy:0,shell:0},fuel:0,nades:{frag:1,molotov:0,flash:1,shock:0},nadeType:'frag',shurikens:0,boards:0,doors:0,turrets:0,heavyTurrets:0,flameTurrets:0,spikes:0,wire:0,flashlight:false,lightOn:false,nvgTime:0,nvgOn:false,burn:0,buildPreview:null,buildRotation:0,buildItem:null,slow:0,hammerDurability:0,gold:0,kills:0,reload:0,fireTimer:0,grenadeTimer:0,shurikenTimer:0,hurt:0,recoil:0,swing:0,controlLock:0,input:{dx:0,dy:0,angle:0,shoot:false,repair:false,sprint:false}};
      Object.defineProperty(p,'reserve',{enumerable:true,get(){return this.weapon==='pistol'?-1:this.ammo[WEAPONS[this.weapon].ammo]||0;},set(value){const key=WEAPONS[this.weapon].ammo;if(key in this.ammo)this.ammo[key]=value;}});
      if(!this.valid(p.x,p.y,p.r)){const safe=this.spot(1200,900,60,180,p.r);p.x=safe.x;p.y=safe.y;}this.players.push(p);this.event('joined',{name:p.name});return p;
    }
    removePlayer(id){this.players=this.players.filter(p=>p.id!==id);if(this.vote){this.vote.yes=this.vote.yes.filter(p=>p!==id);this.vote.no=this.vote.no.filter(p=>p!==id);}this.event('left',{player:id});}
    setDifficulty(value){if(this.state!=='waiting'||!Object.hasOwn(MODES,value))return false;this.difficulty=value;this.bossPool=BOSSES.filter(b=>MODES[value].bosses.includes(b.ability));return true;}
    start(){if(this.state==='waiting'&&this.players.length){this.state='playing';this.nextWave();}}
    input(id,input){const p=this.players.find(p=>p.id===id);if(!p)return;p.input={dx:Number.isFinite(input.dx)?clamp(input.dx,-1,1):0,dy:Number.isFinite(input.dy)?clamp(input.dy,-1,1):0,angle:Number.isFinite(input.angle)?input.angle:0,shoot:input.shoot===true,repair:input.repair===true,sprint:input.sprint===true};}
    networkPlayer(id){const p=this.players.find(p=>p.id===id);if(p){p.commands=[];p.ack=0;p.queued=0;p.budget=0;}}
    queueInput(id,frames){const p=this.players.find(p=>p.id===id);if(!p?.commands||!Array.isArray(frames))return;for(const f of frames.slice(0,30)){if(!f||typeof f!=="object"||!Number.isSafeInteger(f.seq)||f.seq<=p.queued||f.seq>p.queued+120||p.commands.length>=120)continue;this.input(id,f);p.commands.push({...p.input,seq:f.seq,shotId:Number.isSafeInteger(f.shotId)?f.shotId:undefined});p.queued=f.seq;}if(p.commands.length>60){const skipped=p.commands.splice(0,p.commands.length-12);p.ack=skipped.at(-1).seq;}}
    stepPlayer(p,dt){const w=WEAPONS[p.weapon];p.angle=p.input.angle;p.fireTimer=Math.max(0,p.fireTimer-dt);p.grenadeTimer=Math.max(0,p.grenadeTimer-dt);p.shurikenTimer=Math.max(0,p.shurikenTimer-dt);p.hurt=Math.max(0,p.hurt-dt);p.recoil=Math.max(0,p.recoil-dt*12);p.swing=Math.max(0,p.swing-dt);p.flashTime=Math.max(0,(p.flashTime||0)-dt);p.controlLock=Math.max(0,p.controlLock-dt);if(p.controlLock>0)return;if(p.reload>0){p.reload-=dt;if(p.reload<=0){const take=p.weapon==='pistol'?w.mag-p.clips[p.weapon]:Math.min(w.mag-p.clips[p.weapon],p.reserve);p.clips[p.weapon]+=take;if(p.weapon!=='pistol')p.reserve-=take;}}movePlayer(p,p.input,dt,this.barriers,this.enemies);if(p.input.repair)this.tool(p,'repair');if(p.input.shoot)this.shoot(p,p.input.shotId);}
    action(id,type,item,angle){const p=this.players.find(p=>p.id===id);if(!p||this.state!=='playing')return false;if(Number.isFinite(angle)){p.angle=clamp(angle,-Math.PI,Math.PI);p.input.angle=p.angle;}
      if(['timeout','resumeTimeout','voteYes','voteNo'].includes(type))return this.timeoutVote(p,type);if(p.hp<=0)return false;if(p.controlLock>0&&!['buy','equip','nextWeapon','flashlight','nvg'].includes(type))return false;
      if(this.timeoutRemaining>0&&!['buy','equip','nextWeapon','buildSelect','nadeSelect','flashlight','nvg','turretUpgrade','turretArmor'].includes(type))return false;
      if(type==='nadeSelect'){if(!Object.hasOwn(GRENADES,item))return false;p.nadeType=item;return true;}
      if(type==='flashlight'){if(!p.flashlight){this.message(p,'Купи фонарик в магазине');return false;}p.lightOn=!p.lightOn;return true;}
      if(type==='nvg'){if(p.nvgTime<=0){this.message(p,'Купи ПНВ в магазине');return false;}p.nvgOn=!p.nvgOn;return true;}
      if(type==='rotateBuild'){p.buildRotation=1-p.buildRotation;if(p.buildPreview)p.buildPreview=this.placementBox(p,p.buildItem);return true;}
      if(type==='turretUpgrade'||type==='turretArmor')return this.turretAction(p,type,item);
      if(type==='shoot'){this.shoot(p);return true;}
      if(type==='nextWeapon'){const list=Object.keys(WEAPONS).filter(w=>p.owned.includes(w));return this.action(id,'equip',list[(list.indexOf(p.weapon)+1)%list.length]);}
      if(type==='buildSelect'){if(p.weapon!=='hammer'||p.hammerDurability<=0){this.message(p,'Возьми молоток: строительство доступно только с ним');return false;}if(item===null||item==='cancel'){p.buildItem=null;p.buildPreview=null;return true;}const entry=BUILD_ITEMS.find(b=>b.id===item);if(!entry)return false;if(!p[entry.stock]){this.message(p,'Нет '+entry.name+' — купи в магазине');return false;}p.buildItem=item;p.buildPreview=null;this.message(p,'Выбрано: '+entry.name+' · первый клик: проект, второй: установка');return true;}
      if(type==='buy')return this.buy(p,item);
      if(type==='equip'){if(p.owned.includes(item)){p.weapon=item;p.buildItem=null;p.buildPreview=null;p.reload=0;this.message(p,WEAPONS[item].name);return true;}return false;}
      if(type==='reload')return this.reload(p);
      if(type==='cycle'){const types=Object.keys(GRENADES);p.nadeType=types[(types.indexOf(p.nadeType)+1)%types.length];return true;}
      if(type==='grenade')return this.throwGrenade(p);
      if(type==='shuriken'){if(p.shurikenTimer>0)return false;if(!p.shurikens){this.message(p,'Купи сюрикены в магазине · B');return false;}p.shurikens--;p.shurikenTimer=.35;this.projectile(p,p.angle,125,1150,1400,'shuriken',3);this.bullets.at(-1).bounces=2;this.bullets.at(-1).weapon='shuriken';return true;}
      if(BUILD_ITEMS.some(b=>b.id===type))return this.action(id,'buildSelect',type);if(type==='repair'||type==='upgrade')return this.tool(p,type);return false;
    }
    buy(p,item){
      if(!Object.hasOwn(WEAPONS,item)&&!Object.hasOwn(GOODS,item))return false;const w=WEAPONS[item],good=w||GOODS[item];
      if(w&&p.owned.includes(item)&&item!=='hammer')return this.action(p.id,'equip',item);
      if(p.gold<good.price){this.message(p,'Недостаточно золота');return false;}
      const ammo=Object.entries(AMMO).find(([,a])=>a.pickup===item);
      if((ammo&&p.ammo[ammo[0]]>=ammo[1].cap)||(item==='vest'&&p.armor>=100)||(item==='hammer'&&p.hammerDurability>0)||(item==='fuel'&&p.fuel>=300)||(item==='med'&&p.hp>=100)||(item==='boards'&&p.boards>=8)||(item==='door'&&p.doors>=6)||BUILD_ITEMS.some(b=>b.id===item&&p[b.stock]>=b.max)||(item==='flashlight'&&p.flashlight)||(item==='nvg'&&p.nvgTime>=180)||(GRENADES[item]&&p.nades[item]>=6)){this.message(p,'Запас уже полный');return false;}
      p.gold-=good.price;
      if(w){if(!p.owned.includes(item))p.owned.push(item);p.weapon=item;p.buildItem=null;p.reload=0;p.clips[item]=w.mag;if(w.ammo in p.ammo)p.ammo[w.ammo]=Math.min(AMMO[w.ammo].cap,p.ammo[w.ammo]+w.mag*2);if(item==='hammer')p.hammerDurability=35;}
      else if(ammo)p.ammo[ammo[0]]=Math.min(ammo[1].cap,p.ammo[ammo[0]]+ammo[1].amount);
      else if(GRENADES[item])p.nades[item]++;
      else if(item==='vest'){p.armor=100;p.hadVest=true;}
      else if(item==='flashlight')p.flashlight=true;else if(item==='nvg'){p.nvgTime=180;p.nvgOn=false;}else if(BUILD_ITEMS.some(b=>b.id===item))p[BUILD_ITEMS.find(b=>b.id===item).stock]++;else if(item==='shuriken')p.shurikens+=5;else if(item==='fuel')p.fuel=Math.min(300,p.fuel+60);else if(item==='med')p.hp=Math.min(100,p.hp+30);
      this.message(p,'Куплено: '+good.name);return true;
    }
    reload(p){const w=WEAPONS[p.weapon];if(w.mag===0||p.reload>0||p.clips[p.weapon]>=w.mag)return false;if(p.weapon!=='pistol'&&p.reserve<=0){this.message(p,'Нет патронов '+AMMO[w.ammo].name+' · найди или купи нужную пачку');return false;}p.reload=w.reload;return true;}
    wearHammer(p){p.hammerDurability--;if(p.hammerDurability<=0){p.hammerDurability=0;p.owned=p.owned.filter(w=>w!=='hammer');p.weapon='pistol';p.buildItem=null;this.message(p,'Молоток сломался · купи новый');this.event('hammerBreak',{x:p.x,y:p.y});}}
    nearestBarrier(p){return this.barriers.filter(b=>{const q={x:clamp(p.x,b.x,b.x+b.w),y:clamp(p.y,b.y,b.y+b.h)};return dist(p,q)<115&&Math.abs(Math.atan2(Math.sin(Math.atan2(q.y-p.y,q.x-p.x)-p.angle),Math.cos(Math.atan2(q.y-p.y,q.x-p.x)-p.angle)))<.95;}).sort((a,b)=>dist(p,{x:a.x+a.w/2,y:a.y+a.h/2})-dist(p,{x:b.x+b.w/2,y:b.y+b.h/2}))[0];}
    tool(p,type){
      if(p.weapon!=='hammer'||p.hammerDurability<=0||p.fireTimer>0)return false;const b=this.nearestBarrier(p);if(!b)return false;
      if(type==='upgrade'&&TURRETS[b.type]){this.message(p,'Нажми на турель, чтобы открыть улучшения и броню');return false;}
      const tier=b.tier||0,cost=type==='upgrade'?BARRICADE_TIERS[tier+1]?.cost:12;if(type==='upgrade'&&tier>=BARRICADE_TIERS.length-1){this.message(p,'Максимальный уровень: композит');return false;}
      if(type==='repair'&&b.hp>=b.maxHp)return false;if(p.gold<cost){p.fireTimer=.45;this.message(p,'Нужно '+cost+' золота');return false;}p.gold-=cost;
      if(type==='upgrade'){b.tier=tier+1;b.maxHp=Math.round((b.baseHp||(b.type==='door'?1100:b.type==='spikes'?1200:b.type==='wire'?950:800))*BARRICADE_TIERS[b.tier].hp);b.hp=b.maxHp;}else b.hp=Math.min(b.maxHp,b.hp+260);
      p.fireTimer=.45;p.swing=.35;this.event(type,{x:b.x+b.w/2,y:b.y+b.h/2,owner:p.id,tier:b.tier});this.wearHammer(p);return true;
    }
    place(p,type){return this.placeStructure(p,type,BUILD_ITEMS.find(b=>b.id===type)?.stock);}
    nextWave(){this.wave++;this.waveIntro=this.enemyPool().at(-1);this.pending=6+this.wave*3+Math.max(0,this.players.length-1)*3;this.spawnTimer=.5;this.intermission=0;
      for(const p of this.players){p.gold+=100;this.message(p,'+100 ЗОЛОТА · начало волны');if(p.hp<=0){const grave=this.graves.find(g=>g.player===p.id);p.hp=70;if(grave){p.x=grave.x;p.y=grave.y;}p.burn=0;p.controlLock=0;p.commands=[];p.budget=0;this.graves=this.graves.filter(g=>g.player!==p.id);this.message(p,'Возрождение у гроба · 70 HP');}}
      if(this.wave>1){this.supply(7+this.players.length*2,this.players.find(p=>p.hp>0));this.scatterMoney(4);}this.event('wave',{wave:this.wave,boss:this.wave%5===0,newEnemy:STATS[this.enemyPool().at(-1)].name,difficulty:this.difficulty});this.spawn();this.spawn();if(this.wave%5===0)this.spawn('boss');
    }
    spawn(forced,options={}){
      if(forced&&this.enemies.filter(e=>e.hp>0).length>=160)return;if(!forced&&(this.pending<=0||this.enemies.filter(e=>e.hp>0).length>=100))return;
      let type=forced;if(!type){const pool=this.enemyPool();type=this.waveIntro||pool[Math.min(pool.length-1,Math.floor(this.random()*pool.length))];this.waveIntro=null;this.pending--;}
      const stats=STATS[type];if(!stats)return;const target=this.players.find(p=>p.hp>0)||{x:1200,y:900},pos=this.edgeSpot(stats.r),hp=Math.round(stats.hp*(type==='boss'?1+this.wave*.1:1+Math.max(0,this.wave-1)*.11)*MODES[this.difficulty].hp*(1+.48*Math.max(0,this.players.length-1)));
      const e={...pos,...stats,id:this.id(),type,hp,maxHp:hp,armor:type==='robot'?Math.round(190*(1+this.wave*.07)*(1+.3*Math.max(0,this.players.length-1))*MODES[this.difficulty].hp):0,maxArmor:type==='robot'?Math.round(190*(1+this.wave*.07)):0,speed:(stats.speed+Math.min(this.wave*1.2,25))*MODES[this.difficulty].speed*(1+.045*Math.max(0,this.players.length-1)),damage:stats.damage*MODES[this.difficulty].damage*(1+.12*Math.max(0,this.players.length-1)),angle:0,attack:.5,hit:0,step:0,swing:0,knockX:0,knockY:0,frozen:0,burn:0,burnOwner:null,burnTick:0,rage:0,special:3,windup:0,dash:0,jump:0,hookTime:0};
      if(type==='boss'){const profile=options.profile||this.chooseBoss(options.exclude);Object.assign(e,profile,{summoned:!!options.summoned,special:3});}
      this.enemies.push(e);return e;
    }
    projectile(p,angle,damage,speed,range,type='bullet',pierce=1,shotId,pellet){this.bullets.push({id:this.id(),x:p.x+Math.cos(angle)*31,y:p.y+Math.sin(angle)*31,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:range/speed,damage,owner:p.id,type,pierce,hit:[],shotId,pellet,weapon:p.weapon,...(!['acid','lava'].includes(type)?{originX:p.x,originY:p.y}:{})});}
    shoot(p,shotId){const w=WEAPONS[p.weapon];if(p.fireTimer>0||p.reload>0)return;if(p.weapon==='hammer'){if(p.buildItem){if(!p.buildPreview){p.buildPreview=this.placementBox(p,p.buildItem);p.fireTimer=.18;this.message(p,'Проект готов: второй клик поставить, ПКМ отменить');}else this.place(p,p.buildItem);return;}if(this.nearestBarrier(p)){this.tool(p,'upgrade');return;}if(p.hammerDurability<=0)return;p.swing=.35;p.fireTimer=w.interval;this.event('hammer',{x:p.x,y:p.y,angle:p.angle,owner:p.id});for(const e of this.enemies)if(e.hp>0&&dist(p,e)<w.range+e.r&&this.sight(p,e)&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-p.angle)))<.9)this.hurtEnemy(e,w.damage,p.id,p.angle,'hammer');this.wearHammer(p);return;}if(p.weapon==='flame'){if(p.fuel<=0){p.fireTimer=.5;this.message(p,'Нет топлива · ищи оранжевые канистры');return;}p.fuel--;p.fireTimer=w.interval;p.recoil=1;this.event('flame',{x:p.x,y:p.y,angle:p.angle,owner:p.id,shotId});for(const e of this.enemies){const a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));if(e.hp>0&&dist(p,e)<w.range&&Math.abs(diff)<w.spread&&this.sight(p,e)){this.hurtEnemy(e,w.damage,p.id,p.angle);e.burn=2;e.burnOwner=p.id;}}for(const prop of [...this.totems,...this.cocoons,...this.mines])if(dist(p,prop)<w.range&&Math.abs(Math.atan2(Math.sin(Math.atan2(prop.y-p.y,prop.x-p.x)-p.angle),Math.cos(Math.atan2(prop.y-p.y,prop.x-p.x)-p.angle)))<w.spread&&this.sight(p,prop))this.hurtProp(prop,w.damage,p.id);return;}if(p.clips[p.weapon]<=0){if(!this.reload(p)){p.fireTimer=.5;this.message(p,'Магазин пуст · нужны патроны');}return;}p.clips[p.weapon]--;p.fireTimer=w.interval;p.recoil=1;for(let i=0;i<w.pellets;i++)this.projectile(p,p.angle+(shotId===undefined?this.rand(-w.spread,w.spread):shotSpread(shotId,i,w.spread))*(p.input.sprint?1.5:1),w.damage,1250,w.range,'bullet',1,shotId,i);this.event('shot',{x:p.x,y:p.y,angle:p.angle,weapon:p.weapon,owner:p.id,shotId});if(p.clips[p.weapon]===0)this.reload(p);}
    throwGrenade(p){if(p.grenadeTimer>0)return false;const type=p.nadeType;if(p.nades[type]<=0){this.message(p,'Нет выбранных гранат · Q сменить тип');return false;}p.nades[type]--;p.grenadeTimer=.45;this.grenades.push({id:this.id(),type,owner:p.id,x:p.x+Math.cos(p.angle)*25,y:p.y+Math.sin(p.angle)*25,vx:Math.cos(p.angle)*1180,vy:Math.sin(p.angle)*1180,r:6,age:0,life:type==='molotov'?.75:1.25});return true;}
    hurtEnemy(e,damage,owner,angle=0,weapon){
      if(e.hp<=0)return;
      if(e.type==='armored')damage*=weapon==='rifle'?1.15:.23;if(e.type==='robot'&&weapon==='shock')damage*=3.5;if(e.type==='robot'&&weapon==='hmg')damage*=2.4;if(e.type==='boss'&&String(weapon).startsWith('turret'))damage*=.2;
      if(e.armor>0){const amount=Math.min(e.armor,damage*(weapon==='rifle'?1.4:1));e.armor-=amount;e.hit=.15;this.event('armorHit',{x:e.x,y:e.y,angle});if(e.armor<=0)this.event('armorBreak',{x:e.x,y:e.y,angle,type:e.type});return;}
      e.hp-=damage;e.hit=.12;e.knockX+=Math.cos(angle)*(e.type==='boss'?10:55);e.knockY+=Math.sin(angle)*(e.type==='boss'?10:55);
      if(e.hp<=0){this.deathLoot(e,owner);
        if(e.type==='exploder')this.explode({x:e.x,y:e.y,type:'enemy',owner:null});
        if(e.type==='toxic')this.fires.push({id:this.id(),x:e.x,y:e.y,r:90,life:4,tick:0,owner:null,type:'poison'});
        if(e.type==='splitter'){const child=this.spawn('larva'),target=this.players.filter(p=>p.hp>0).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(child){child.x=e.x;child.y=e.y;child.angle=target?Math.atan2(target.y-e.y,target.x-e.x):angle;child.dash=.45;child.dashAngle=child.angle;this.event('split',{x:e.x,y:e.y,angle:child.angle});}}
      }
    }
    hurtPlayer(p,n){if(p.hp<=0||p.connectionGrace>0)return;if(p.armor>0){const damage=n*.65,absorbed=Math.min(p.armor,damage);p.armor-=absorbed;n=(damage-absorbed)/.65;}p.hp=Math.max(0,p.hp-n);p.hurt=.25;if(p.hp===0&&!this.graves.some(g=>g.player===p.id)){this.graves.push({id:this.id(),player:p.id,name:p.name,x:p.x,y:p.y,angle:p.angle});this.event('death',{x:p.x,y:p.y,player:p.id});}this.event('hurt',{player:p.id});}
    explode(g){this.event('explosion',{x:g.x,y:g.y,kind:g.type});if(g.type==='flash'){for(const e of this.enemies)if(dist(g,e)<235&&this.sight(g,e))e.frozen=e.type==='boss'?1:2;for(const p of this.players)if(p.hp>0&&dist(g,p)<235&&this.sight(g,p)){p.controlLock=Math.max(p.controlLock,1.7);p.flashTime=1.7;}return;}if(g.type==='shock'){
        for(const p of this.players)if(p.hp>0&&dist(g,p)<240&&this.sight(g,p)){this.hurtPlayer(p,blastDamage(dist(g,p),240,55));p.controlLock=Math.max(p.controlLock,.55);}let from=g,damage=180;const visited=new Set();for(let i=0;i<8;i++){const e=this.enemies.filter(e=>e.hp>0&&!visited.has(e.id)&&dist(from,e)<(i?215:240)&&this.sight(from,e)).sort((a,b)=>dist(from,a)-dist(from,b))[0];if(!e)break;visited.add(e.id);this.event('arc',{x:from.x,y:from.y,tx:e.x,ty:e.y,kind:'shock'});this.hurtEnemy(e,damage,g.owner,0,'shock');e.frozen=Math.max(e.frozen,.55);from=e;damage*=.9;}return;
      }if(g.type==='molotov'){this.fires.push({id:this.id(),x:g.x,y:g.y,r:105,life:6,tick:0,owner:g.owner,type:'molotov'});return;}if(g.type!=='enemy')for(const prop of [...this.totems,...this.cocoons,...this.mines])if(dist(g,prop)<230&&this.sight(g,prop))this.hurtProp(prop,blastDamage(dist(g,prop),230,320),g.owner);if(g.type!=='enemy')for(const e of this.enemies)if(e.hp>0&&dist(g,e)<230&&this.sight(g,e))this.hurtEnemy(e,blastDamage(dist(g,e),230,320),g.owner,Math.atan2(e.y-g.y,e.x-g.x));for(const p of this.players)if(p.hp>0&&dist(g,p)<145&&this.sight(g,p))this.hurtPlayer(p,blastDamage(dist(g,p),145,g.type==='enemy'?38:90));for(const b of this.barriers)if(circleRect(g.x,g.y,150,b))b.hp-=g.type==='enemy'?55:80;}
    buildFlow(target){const cols=Math.ceil(WORLD.w/60),rows=Math.ceil(WORLD.h/60),blocked=this.flowBlocked||(this.flowBlocked=Array.from({length:cols*rows},(_,i)=>!this.staticValid((i%cols+.5)*60,(Math.floor(i/cols)+.5)*60,48)));this.flow=new Int16Array(cols*rows);this.flow.fill(32767);let start=clamp(Math.floor(target.y/60),0,rows-1)*cols+clamp(Math.floor(target.x/60),0,cols-1);if(blocked[start]){let best=Infinity,nearest=start;for(let i=0;i<cols*rows;i++)if(!blocked[i]){const d=Math.hypot(i%cols-start%cols,Math.floor(i/cols)-Math.floor(start/cols));if(d<best){best=d;nearest=i;}}start=nearest;}const queue=[start];this.flow[start]=0;for(let h=0;h<queue.length;h++){const i=queue[h],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*cols+nx;if(nx>=0&&ny>=0&&nx<cols&&ny<rows&&!blocked[j]&&this.flow[j]===32767){this.flow[j]=this.flow[i]+1;queue.push(j);}}}this.blocked=blocked;this.flowCols=cols;this.flowRows=rows;}
    enemyTarget(e,p){
      if(this.sight(e,p,e.r))return p;
      const x=Math.floor(e.x/60),y=Math.floor(e.y/60);
      let target=null,best=Infinity;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.flowCols||ny>=this.flowRows)continue;
        const i=ny*this.flowCols+nx;if(this.blocked[i]||this.flow[i]>=30000)continue;
        const t={x:(nx+.5)*60,y:(ny+.5)*60},score=this.flow[i]*60+dist(e,t)*.2;
        if(score<best&&this.sight(e,t,0)){best=score;target=t;}
      }
      if(!target)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        if(Math.abs(dx)<=1&&Math.abs(dy)<=1)continue;
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.flowCols||ny>=this.flowRows)continue;
        const i=ny*this.flowCols+nx;if(this.blocked[i]||this.flow[i]>=30000)continue;
        const t={x:(nx+.5)*60,y:(ny+.5)*60},score=this.flow[i]*60+dist(e,t)*.2;
        if(score<best&&this.sight(e,t,0)){best=score;target=t;}
      }
      if(!target)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.flowCols||ny>=this.flowRows)continue;
        const i=ny*this.flowCols+nx;if(this.blocked[i]||this.flow[i]>=30000)continue;
        const t={x:(nx+.5)*60,y:(ny+.5)*60},score=this.flow[i]*60+dist(e,t)*2;
        if(score<best){best=score;target=t;}
      }
      return target||p;
    }
    tickEnemy(e,alive,dt){
      if(e.hp<=0)return;
      if(!this.valid(e.x,e.y,e.r,'enemy')){
        for(let ring=1;ring<=8;ring++){
          let found=false;
          for(let a=0;a<8;a++){
            const angle=a*Math.PI/4,nx=e.x+Math.cos(angle)*ring*5,ny=e.y+Math.sin(angle)*ring*5;
            if(this.valid(nx,ny,e.r,'enemy')){e.x=nx;e.y=ny;found=true;break;}
          }
          if(found)break;
        }
      }
      e.hit=Math.max(0,e.hit-dt);e.swing=Math.max(0,e.swing-dt);e.frozen=Math.max(0,e.frozen-dt);e.rage=Math.max(0,e.rage-dt);e.burn=Math.max(0,e.burn-dt);e.burnTick-=dt;
      if(e.burn>0&&e.burnTick<=0){this.hurtEnemy(e,5,e.burnOwner,0,'flame');e.burnTick=.25;}if(e.hp<=0||e.frozen>0)return;
      e.attack-=dt;e.special-=dt;e.step+=dt*e.speed*.06;
      let target=alive.reduce((a,b)=>dist(e,a)<dist(e,b)?a:b);const lure=this.barriers.filter(b=>TURRETS[b.type]&&b.hp>0&&dist(e,{x:b.x+b.w/2,y:b.y+b.h/2})<620).sort((a,b)=>dist(e,{x:a.x+a.w/2,y:a.y+a.h/2})-dist(e,{x:b.x+b.w/2,y:b.y+b.h/2}))[0];if(lure&&e.type!=='boss')target={x:lure.x+lure.w/2,y:lure.y+lure.h/2,r:26,structure:lure};const d=dist(e,target);e.angle=Math.atan2(target.y-e.y,target.x-e.x);
      if(e.flight>0){e.flight=Math.max(0,e.flight-dt);const progress=1-e.flight/e.flightDuration;e.x=e.flightFrom.x+(e.flightTo.x-e.flightFrom.x)*progress;e.y=e.flightFrom.y+(e.flightTo.y-e.flightFrom.y)*progress;if(e.flight===0){this.areaSlam(e,alive,70,14);e.attack=.8;this.separatePlayersEnemies();}return;}
      if(e.type==='totemist'&&(e.totemsPlaced||0)<4){this.tickTotemist(e,dt);return;}if(e.type==='lavatrail'){e.lavaTimer=(e.lavaTimer||0)-dt;if(e.lavaTimer<=0){e.lavaTimer=1.3;this.fires.push({id:this.id(),x:e.x,y:e.y,r:55,life:7,tick:0,type:'lava',owner:null});}}
      if(e.type==='nightnecro'&&this.night&&e.special<=0){e.special=9;for(let i=0;i<3;i++)if(this.enemies.length<125)this.spawn('nightstalker');this.event('necromancy',{x:e.x,y:e.y});}
      if(e.type==='boss')this.bossAbility(e,target,dt);
      else if(e.type==='screamer'&&e.special<=0){e.special=7;e.swing=.5;for(const friend of this.enemies)if(friend.hp>0&&dist(e,friend)<330)friend.rage=4;this.event('scream',{x:e.x,y:e.y});}
      else if(['healer','medic'].includes(e.type)&&e.special<=0){e.special=e.type==='medic'?3:3.5;for(const friend of this.enemies)if(friend!==e&&friend.hp>0&&dist(e,friend)<(e.type==='medic'?190:270))friend.hp=Math.min(friend.maxHp,friend.hp+(e.type==='medic'?9:18));this.event('heal',{x:e.x,y:e.y});}
      else if(e.type==='leaper'&&e.special<=0&&d>90&&d<320&&this.sight(e,target,e.r)){e.special=5;e.dash=.38;e.dashAngle=e.angle;this.event('lunge',{x:e.x,y:e.y,angle:e.angle});}
      let goal=this.enemyTarget(e,target),a=Math.atan2(goal.y-e.y,goal.x-e.x),stops=['spitter','lavspitter'].includes(e.type)&&d<380&&this.sight(e,target),speed=e.speed*(e.rage>0?1.35:1)*(this.barriers.some(b=>b.type==='wire'&&circleRect(e.x,e.y,e.r+75,b))?.45:1);
      if(e.type==='stalker'&&d>140&&d<420)a+=Math.sin(e.id)*.55;
      if(e.type==='robot'){
        let vx=Math.cos(a),vy=Math.sin(a);
        for(const g of this.grenades){const gx=g.x+g.vx*.22,gy=g.y+g.vy*.22,range=Math.hypot(e.x-gx,e.y-gy);if(range<290){const strength=(290-range)/80;vx+=(e.x-gx)/(range||1)*strength;vy+=(e.y-gy)/(range||1)*strength;}}
        for(const f of this.fires){const range=dist(e,f);if(range<f.r+130){vx+=(e.x-f.x)/(range||1)*2;vy+=(e.y-f.y)/(range||1)*2;}}
        a=Math.atan2(vy,vx);
      }
      if(e.dash>0){e.dash-=dt;a=e.dashAngle;speed=e.type==='boss'?385:330;stops=false;}
      if(e.jump>0){e.jump=Math.max(0,e.jump-dt);const progress=1-e.jump/.8;e.x=e.jumpFrom.x+(e.jumpTo.x-e.jumpFrom.x)*progress;e.y=e.jumpFrom.y+(e.jumpTo.y-e.jumpFrom.y)*progress;if(e.jump===0){this.areaSlam(e,alive,145,32);e.attack=.8;this.separatePlayersEnemies();}}
      else if(!stops&&e.windup<=0)this.move(e,(Math.cos(a)*speed+e.knockX)*dt,(Math.sin(a)*speed+e.knockY)*dt,'enemy');
      e.knockX*=Math.exp(-dt*10);e.knockY*=Math.exp(-dt*10);
      const barrier=this.barriers.find(b=>circleRect(e.x,e.y,e.r+12,b));
      if(barrier&&e.attack<=0){this.hurtBarrier(barrier,e.type==='boss'?140:TURRETS[barrier.type]?e.damage*(e.type==='robot'?1.7:.22):e.damage*2);if(['spikes','wire'].includes(barrier.type))this.hurtEnemy(e,(barrier.type==='spikes'?28:12)*(1+(barrier.tier||0)*.5),barrier.owner,e.angle,'spikes');e.attack=.65;e.swing=.32;this.event('barrierHit',{x:e.x,y:e.y});}
      else if(!barrier&&['spitter','lavspitter'].includes(e.type)&&stops&&e.attack<=0){e.attack=1.85;e.swing=.4;this.projectile({...e,id:null},e.angle,e.type==='lavspitter'?22:13,345,750,e.type==='lavspitter'?'lava':'acid');this.event('spit',{x:e.x,y:e.y,angle:e.angle});}
      else if(!barrier&&d<e.r+target.r+7&&e.attack<=0&&e.jump<=0){e.attack=.8;e.swing=.34;if(e.type==='exploder'){e.hp=0;this.deathLoot(e,null);this.explode({x:e.x,y:e.y,type:'enemy'});}else{if(target.structure)this.hurtBarrier(target.structure,e.damage*.22);else{this.hurtPlayer(target,e.damage);if(e.type==='hellwalker')target.burn=3;}this.event('melee',{x:e.x,y:e.y,angle:e.angle,type:e.type});}}
    }
    areaSlam(e,alive,r,damage){this.event('slam',{x:e.x,y:e.y,r});for(const p of alive)if(dist(e,p)<r&&this.sight(e,p))this.hurtPlayer(p,damage*(.5+.5*(1-dist(e,p)/r)));for(const b of this.barriers)if(circleRect(e.x,e.y,r,b))b.hp-=160;}
    bossAbility(e,target,dt){
      if(e.hookTime>0){e.hookTime=Math.max(0,e.hookTime-dt);const p=this.players.find(p=>p.id===e.hookTarget);if(p?.hp>0&&dist(e,p)>75&&this.sight(e,p)){const a=Math.atan2(e.y-p.y,e.x-p.x);p.controlLock=.12;this.move(p,Math.cos(a)*540*dt,Math.sin(a)*540*dt,'player');}}
      if(e.ability==='hook'){e.slamTimer=(e.slamTimer??8)-dt;if(e.slamTimer<=0){e.slamWindup=1.1;e.slamTimer=13;this.event('slamWarning',{x:e.x,y:e.y,r:600});}if(e.slamWindup>0){e.slamWindup=Math.max(0,e.slamWindup-dt);if(e.slamWindup===0){this.shockwaves.push({id:this.id(),x:e.x,y:e.y,r:0,maxR:600,speed:360,damage:30,hit:[]});this.event('groundStrike',{x:e.x,y:e.y,r:600});}}}
      if(this.newBossAbility(e,target,dt))return;
      if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup>.3&&['leap','charge'].includes(e.ability)){const aim=this.predictTarget(target,e.windup+(e.ability==='leap'?.75:.35),e.r);e.aimX=aim.x;e.aimY=aim.y;e.aimAngle=Math.atan2(aim.y-e.y,aim.x-e.x);}if(e.windup<=0){
        if(e.ability==='hook'){const p=this.players.find(p=>p.id===e.aimTarget);if(p?.hp>0&&dist(e,p)<780&&this.sight(e,p)){e.hookTarget=p.id;e.hookTime=1.25;this.hurtPlayer(p,12);this.event('hook',{x:e.x,y:e.y,tx:p.x,ty:p.y,enemy:e.id,target:p.id});}}
        else if(e.ability==='charge'){e.dash=1.2;e.dashAngle=e.aimAngle;this.event('charge',{x:e.x,y:e.y,angle:e.dashAngle});}
        else if(e.ability==='leap'){if(this.valid(e.aimX,e.aimY,e.r,'enemy')){e.jump=.8;e.jumpFrom={x:e.x,y:e.y};e.jumpTo={x:e.aimX,y:e.aimY};this.event('leap',{x:e.x,y:e.y,tx:e.aimX,ty:e.aimY});}else this.areaSlam(e,this.players.filter(p=>p.hp>0),150,24);}
        else if(e.ability==='storm'){for(let i=0;i<10;i++)this.projectile({...e,id:null},i*Math.PI/5,15,310,900,'acid');this.event('storm',{x:e.x,y:e.y});}
        else if(e.ability==='brood'){for(let i=0;i<3;i++){const child=this.spawn(i===2?'splitter':'larva');if(child){const pos=this.spot(e.x,e.y,65,130,child.r);child.x=pos.x;child.y=pos.y;}}this.event('brood',{x:e.x,y:e.y});}
        e.special=7+this.rand(0,2);if(e.secondary){const ability=e.ability;e.ability=e.secondary;e.secondary=ability;}
      }return;}
      if(e.special<=0&&dist(e,target)<(e.ability==='hook'?850:750)){e.windup=e.ability==='leap'?1:.75;e.aimTarget=target.id;const aim=this.predictTarget(target,e.ability==='leap'?1.1:.65,e.r);e.aimAngle=Math.atan2(aim.y-e.y,aim.x-e.x);e.aimX=aim.x;e.aimY=aim.y;this.event('warning',{x:e.x,y:e.y,tx:target.x,ty:target.y,ability:e.ability});}
    }
    separatePlayersEnemies(){
      const players=this.players.filter(p=>p.hp>0);
      for(const e of this.enemies){
        if(!solidEnemy(e))continue;
        for(const p of players){
          const radius=p.r+e.r+CONTACT_GAP,d=dist(e,p);if(d>=radius-1e-6)continue;
          const angle=d>.001?Math.atan2(e.y-p.y,e.x-p.x):e.id*2.399963;
          // Prefer the nearest edge. At a wall or between co-op players, find a free side.
          let best=null,bestDistance=Infinity;
          for(let ring=0;ring<4;ring++)for(let i=0;i<16;i++){
            const a=angle+i*Math.PI/8,range=radius*(1+ring*.5),pos={x:p.x+Math.cos(a)*range,y:p.y+Math.sin(a)*range};
            if(!this.valid(pos.x,pos.y,e.r,'enemy')||players.some(q=>dist(pos,q)<q.r+e.r+CONTACT_GAP-1e-6))continue;
            const travel=dist(e,pos);if(travel>=bestDistance)continue;
            // Check the escape path as well as its endpoint, including built walls and graves.
            const steps=Math.ceil(travel/4);let clear=true;
            for(let k=1;k<steps;k++)if(!this.valid(e.x+(pos.x-e.x)*k/steps,e.y+(pos.y-e.y)*k/steps,e.r,'enemy')){clear=false;break;}
            if(clear){best=pos;bestDistance=travel;}
          }
          if(best){e.x=best.x;e.y=best.y;}
        }
      }
    }
    separateEnemies(dt){const cells=new Map(),size=128;
      for(const e of this.enemies){if(e.hp<=0||e.flight>0||e.jump>0)continue;const key=Math.floor(e.x/size)+','+Math.floor(e.y/size);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(e);}
      for(const a of this.enemies){if(a.hp<=0||a.flight>0||a.jump>0)continue;const x=Math.floor(a.x/size),y=Math.floor(a.y/size);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of cells.get((x+dx)+','+(y+dy))||[]){if(b.id<=a.id)continue;const d=dist(a,b),min=a.r+b.r-3;if(d>=min||d<.01)continue;const push=Math.min(45,(min-d)*3)*dt,nx=(a.x-b.x)/d,ny=(a.y-b.y)/d;this.move(a,nx*push,ny*push,'enemy');this.move(b,-nx*push,-ny*push,'enemy');}}
    }
    tick(dt){if(this.state!=='playing')return;dt=clamp(dt,0,.05);
      if(this.vote){this.vote.life-=dt;if(this.vote.life<=0){this.event('voteEnd',{passed:false});this.vote=null;}}
      if(this.timeoutRemaining>0){this.timeoutRemaining=Math.max(0,this.timeoutRemaining-dt);for(const p of this.players){if(p.commands?.length){p.ack=p.commands.at(-1).seq;p.commands=[];}p.budget=0;}if(this.timeoutRemaining===0)this.event('timeoutEnd');return;}
      this.elapsed+=dt;this.tickNight(dt);this.tickTotems(dt);for(const p of this.players){if(p.hp>0&&p.nvgOn){p.nvgTime=Math.max(0,p.nvgTime-dt);if(!p.nvgTime)p.nvgOn=false;}if(p.burn>0){p.burn=Math.max(0,p.burn-dt);p.burnTick=(p.burnTick||0)-dt;if(p.burnTick<=0){p.burnTick=.5;this.hurtPlayer(p,3);}}}this.tickTurrets(dt);this.tickShockwaves(dt);this.tickHazards(dt);const alive=this.players.filter(p=>p.hp>0);this.separatePlayersEnemies();if(!alive.length){this.state='over';this.event('over');return;}this.flowTimer-=dt;if(this.flowTimer<=0){this.buildFlow(alive[0]);this.flowTimer=.4;}
      for(const p of this.players){
        const oldX=p.x,oldY=p.y;if(p.commands){p.budget=Math.min(.25,p.budget+dt);while(p.commands.length&&p.budget>=1/60-1e-9){const f=p.commands.shift();p.input=f;if(p.hp>0)this.stepPlayer(p,1/60);p.ack=f.seq;p.budget-=1/60;}if(p.hp<=0)continue;}
        else{if(p.hp<=0)continue;this.stepPlayer(p,dt);}
        p.vx=(p.x-oldX)/dt;p.vy=(p.y-oldY)/dt;for(let i=this.pickups.length-1;i>=0;i--){const pick=this.pickups[i];if(dist(p,pick)>39)continue;let text='';if(pick.type==='gold'||pick.type==='bill'){p.gold+=pick.amount;text=`+${pick.amount} ЗОЛОТА`;}else if(Object.entries(AMMO).some(([key,a])=>{if(a.pickup!==pick.type||p.ammo[key]>=a.cap)return false;p.ammo[key]=Math.min(a.cap,p.ammo[key]+a.amount);text='+'+a.amount+' · '+a.name;return true;})){} else if(pick.type==='fuel'&&p.fuel<300){p.fuel=Math.min(300,p.fuel+60);text='+60 ТОПЛИВА';}else if(pick.type==='med'&&p.hp<100){p.hp=Math.min(100,p.hp+30);text='+30 ЗДОРОВЬЯ';}else if(Object.hasOwn(p.nades,pick.type)&&p.nades[pick.type]<6){p.nades[pick.type]++;text='+1 '+GRENADES[pick.type].name;}if(text){this.pickups.splice(i,1);this.message(p,text);}}
      }
      for(const e of this.enemies.slice())this.tickEnemy(e,alive,dt);
      this.separateEnemies(dt);
      for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i],nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;if(b.originX!==undefined){b.x=b.originX;b.y=b.originY;delete b.originX;delete b.originY;}let wallT=1.01,wall=null;for(const o of OBSTACLES){const t=segmentRect(b.x,b.y,nx,ny,o);if(t!==null&&t<wallT){wallT=t;wall=o;}}if(['acid','lava'].includes(b.type))for(const o of this.barriers){const t=segmentRect(b.x,b.y,nx,ny,o);if(t!==null&&t<wallT){wallT=t;this.hurtBarrier(o,b.type==='lava'?TURRETS[o.type]?180:65:8);if(b.type==='lava')this.fires.push({id:this.id(),x:nx,y:ny,r:62,life:5,tick:0,type:'lava',owner:null});}}const targets=['acid','lava'].includes(b.type)?alive:[...this.enemies,...this.totems,...this.cocoons,...this.mines.filter(m=>m.revealedTo.includes(b.owner))],hits=[];for(const e of targets){if(e.hp<=0||b.hit.includes(e.id))continue;const t=segmentCircle(b.x,b.y,nx,ny,e.x,e.y,e.r);if(t!==null&&t<wallT)hits.push({e,t});}hits.sort((a,c)=>a.t-c.t);for(const {e}of hits){b.hit.push(e.id);if(['acid','lava'].includes(b.type)){this.hurtPlayer(e,b.damage);if(b.type==='lava')e.burn=2;}else if(e.kind)this.hurtProp(e,b.damage,b.owner);else this.hurtEnemy(e,b.damage,b.owner,Math.atan2(b.vy,b.vx),b.weapon);b.pierce--;if(b.pierce<=0)break;}b.life-=dt;
        if(b.type==='shuriken'&&b.bounces>0&&b.pierce>0&&(wallT<=1||nx<0||ny<0||nx>WORLD.w||ny>WORLD.h)){
          const hitX=b.x+(nx-b.x)*Math.min(1,wallT),hitY=b.y+(ny-b.y)*Math.min(1,wallT);
          const reflectX=wall?Math.min(Math.abs(hitX-wall.x),Math.abs(hitX-wall.x-wall.w))<Math.min(Math.abs(hitY-wall.y),Math.abs(hitY-wall.y-wall.h)):nx<0||nx>WORLD.w;
          if(reflectX)b.vx=-b.vx;else b.vy=-b.vy;b.x=clamp(hitX+b.vx*.003,1,WORLD.w-1);b.y=clamp(hitY+b.vy*.003,1,WORLD.h-1);b.bounces--;this.event('ricochet',{x:b.x,y:b.y});continue;
        }
        b.x=nx;b.y=ny;if(wallT<=1||b.pierce<=0||b.life<=0||nx<0||ny<0||nx>WORLD.w||ny>WORLD.h)this.bullets.splice(i,1);}
      for(let i=this.grenades.length-1;i>=0;i--){const g=this.grenades[i];g.life-=dt;g.age+=dt;const x=g.x,y=g.y;this.move(g,g.vx*dt,0);if(g.x===x)g.vx*=-.4;this.move(g,0,g.vy*dt);if(g.y===y)g.vy*=-.4;g.vx*=Math.exp(-dt*3.6);g.vy*=Math.exp(-dt*3.6);if(g.life<=0){this.explode(g);this.grenades.splice(i,1);}}
      for(const f of this.fires){f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.25;for(const e of this.enemies)if(!['poison','lava'].includes(f.type)&&e.hp>0&&dist(f,e)<f.r+e.r&&this.sight(f,e)){this.hurtEnemy(e,f.type==='molotov'&&e.type!=='boss'&&e.type!=='robot'?30:18,f.owner,0,'molotov');e.burn=1.5;e.burnOwner=f.owner;}for(const prop of [...this.totems,...this.cocoons,...this.mines])if(dist(f,prop)<f.r&&this.sight(f,prop))this.hurtProp(prop,12,f.owner);for(const p of alive)if(dist(f,p)<f.r&&this.sight(f,p))this.hurtPlayer(p,f.type==='lava'?7:4);if(f.type==='lava')for(const b of this.barriers)if(circleRect(f.x,f.y,f.r,b))this.hurtBarrier(b,TURRETS[b.type]?30:12);}}
      this.fires=this.fires.filter(f=>f.life>0);this.barriers=this.barriers.filter(b=>b.hp>0);this.enemies=this.enemies.filter(e=>e.hp>0);this.separatePlayersEnemies();if(!this.players.some(p=>p.hp>0)){this.state='over';this.event('over');return;}
      if(this.pending>0){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawn();this.spawnTimer=Math.max(.38,1.15-this.wave*.03);}}else if(!this.enemies.length){if(!this.intermission){this.intermission=5;this.event('clear',{wave:this.wave});}this.intermission-=dt;if(this.intermission<=0)this.nextWave();}
    }

    edgeSpot(r=20){for(let i=0;i<200;i++){const edge=Math.floor(this.rand(0,4)),depth=this.rand(r+30,145),pos=edge===0?{x:this.rand(65,WORLD.w-65),y:depth}:edge===1?{x:WORLD.w-depth,y:this.rand(65,WORLD.h-65)}:edge===2?{x:this.rand(65,WORLD.w-65),y:WORLD.h-depth}:{x:depth,y:this.rand(65,WORLD.h-65)};if(this.valid(pos.x,pos.y,r,'enemy')&&this.players.every(p=>p.hp<=0||dist(p,pos)>160))return pos;}return{x:90,y:90};}
    placementBox(p,type){if(TURRETS[type])return{x:p.x+Math.cos(p.angle)*100-26,y:p.y+Math.sin(p.angle)*100-26,w:52,h:52,type};const vertical=(Math.abs(Math.cos(p.angle))>Math.abs(Math.sin(p.angle)))!==!!p.buildRotation,length=type==='door'?78:type==='wire'?130:106,w=vertical?20:length,h=vertical?length:20;return{x:p.x+Math.cos(p.angle)*85-w/2,y:p.y+Math.sin(p.angle)*85-h/2,w,h,type};}
    canPlace(p,box){const overlap=o=>box.x<o.x+o.w&&box.x+box.w>o.x&&box.y<o.y+o.h&&box.y+box.h>o.y;return box.x>25&&box.y>25&&box.x+box.w<WORLD.w-25&&box.y+box.h<WORLD.h-25&&!OBSTACLES.some(overlap)&&!this.barriers.some(overlap)&&!this.graves.some(g=>overlap({x:g.x-20,y:g.y-34,w:40,h:68}))&&![...this.players,...this.enemies].some(e=>e.hp>0&&circleRect(e.x,e.y,e.r+5,box))&&dist(p,{x:box.x+box.w/2,y:box.y+box.h/2})<180;}
    placeStructure(p,type,stock){if(p.weapon!=='hammer'||p.hammerDurability<=0||!stock||!p[stock]){this.message(p,'Нужны молоток и купленный предмет');return false;}const spec=TURRETS[type];if(spec&&this.barriers.filter(b=>b.type===type&&b.hp>0).length>=spec.limit){this.message(p,'Лимит '+spec.limit+' турелей '+spec.name+' на отряд');return false;}if(!spec&&this.barriers.filter(b=>!TURRETS[b.type]).length>=45){this.message(p,'Лимит 45 баррикад');return false;}const box=p.buildPreview||this.placementBox(p,type);if(box.type!==type||!this.canPlace(p,box)){this.message(p,'Нет места: ПКМ отменить проект и выбрать другое место');return false;}const hp=spec?.hp||(type==='door'?1100:type==='spikes'?1200:type==='wire'?950:800);this.barriers.push({...box,id:this.id(),hp,maxHp:hp,baseHp:hp,tier:0,level:0,armor:0,maxArmor:0,angle:p.angle,owner:p.id,fireTimer:.25,recoil:0});p[stock]--;p.buildPreview=null;p.swing=.35;p.fireTimer=.35;this.event('build',{x:box.x+box.w/2,y:box.y+box.h/2,owner:p.id});this.wearHammer(p);if(!p[stock])p.buildItem=null;return true;}
    hurtBarrier(b,n){if(b.hp<=0)return;if(b.armor>0){const absorbed=Math.min(b.armor,n*.6);b.armor-=absorbed;n-=absorbed;}b.hp-=n;}
    turretAction(p,type,id){const b=this.barriers.find(b=>b.id===id&&TURRETS[b.type]&&b.hp>0);if(!b||dist(p,{x:b.x+b.w/2,y:b.y+b.h/2})>220){this.message(p,'Подойди к турели');return false;}const heavy=b.type==='turretHeavy',cost=type==='turretArmor'?(heavy?2100:1200):(heavy?3000:1600)*(1+(b.level||0));if(type==='turretUpgrade'&&(b.level||0)>=3){this.message(p,'Турель максимального уровня');return false;}if(type==='turretArmor'&&b.armor>=b.maxHp*.4){this.message(p,'Броня турели полная');return false;}if(p.gold<cost){this.message(p,'Нужно '+cost+' золота');return false;}p.gold-=cost;if(type==='turretArmor'){b.maxArmor=Math.round(b.maxHp*.4);b.armor=b.maxArmor;}else{b.level=(b.level||0)+1;b.maxHp=Math.round((b.baseHp||TURRETS[b.type].hp)*(1+b.level*.45));b.hp=b.maxHp;}this.event('upgrade',{x:b.x+b.w/2,y:b.y+b.h/2,owner:p.id});return true;}
    predictTarget(p,seconds,r=35){let vx=clamp(p.vx||0,-330,330),vy=clamp(p.vy||0,-330,330);const n=Math.hypot(vx,vy);if(n>330){vx*=330/n;vy*=330/n;}for(let t=seconds;t>=0;t-=.15){const aim={x:clamp(p.x+vx*t,r+30,WORLD.w-r-30),y:clamp(p.y+vy*t,r+30,WORLD.h-r-30)};if(this.valid(aim.x,aim.y,r,'enemy'))return aim;}return{x:p.x,y:p.y};}
    tickNight(dt){if(!this.pending&&!this.enemies.some(e=>e.hp>0))return;if(this.night){this.nightRemaining=Math.max(0,this.nightRemaining-dt);this.nightSpawn-=dt;if(this.nightSpawn<=0&&this.enemies.length<120){this.spawn(this.random()<.18&&this.difficulty!=='easy'?'nightnecro':this.random()<.3?'nightbrute':'nightstalker');this.nightSpawn=this.difficulty==='hard'?3:4.5;}if(this.nightRemaining===0){this.night=false;this.nextNight=this.rand(120,480);this.event('day');}}else{this.nextNight-=dt;if(this.nextNight<=0){this.night=true;this.nightRemaining=180;this.nightSpawn=.2;this.event('night');}}}
    tickTotemist(e,dt){const points=[{x:60,y:60},{x:WORLD.w-60,y:60},{x:WORLD.w-60,y:WORLD.h-60},{x:60,y:WORLD.h-60}];if(e.totemCorner===undefined){e.totemCorner=points.reduce((best,p,i)=>dist(e,p)<dist(e,points[best])?i:best,0);e.totemsPlaced=0;const distances=[e.x,WORLD.w-e.x,e.y,WORLD.h-e.y],side=distances.indexOf(Math.min(...distances));e.edgeApproach=side===0?{x:60,y:e.y}:side===1?{x:WORLD.w-60,y:e.y}:side===2?{x:e.x,y:60}:{x:e.x,y:WORLD.h-60};}if(e.edgeApproach){const p=e.edgeApproach,d=dist(e,p);if(d>7){e.angle=Math.atan2(p.y-e.y,p.x-e.x);const travel=Math.min(d,e.speed*dt);this.move(e,Math.cos(e.angle)*travel,Math.sin(e.angle)*travel,'enemy');return;}e.edgeApproach=null;}const goal=points[(e.totemCorner+e.totemsPlaced)%4],d=dist(e,goal);e.angle=Math.atan2(goal.y-e.y,goal.x-e.x);if(d>30){this.move(e,Math.cos(e.angle)*e.speed*dt,Math.sin(e.angle)*e.speed*dt,'enemy');return;}e.plant=(e.plant||0)+dt;if(e.plant<.8)return;e.plant=0;if(this.totems.length<16){this.totems.push({id:this.id(),kind:'totem',x:goal.x,y:goal.y,r:24,hp:800+this.wave*30,maxHp:800+this.wave*30,spawnTimer:5,owner:e.id});this.event('totem',{x:goal.x,y:goal.y});}e.totemsPlaced++;}
    tickTotems(dt){for(const t of this.totems){if(t.hp<=0)continue;t.spawnTimer-=dt;if(t.spawnTimer<=0){t.spawnTimer=9;if(this.enemies.length<120)this.spawn(this.night?'nightstalker':this.wave>8?'hellwalker':'runner');}}this.totems=this.totems.filter(t=>t.hp>0);}

    snapshot(viewerId){return{state:this.state,wave:this.wave,pending:this.pending,elapsed:this.elapsed,intermission:this.intermission,difficulty:this.difficulty,maxPlayers:this.maxPlayers,night:this.night,nightRemaining:this.nightRemaining,nextNight:this.nextNight,totems:this.totems,unlocked:this.enemyPool(),timeoutRemaining:this.timeoutRemaining,timeoutsUsed:this.timeoutsUsed,vote:this.vote,shockwaves:this.shockwaves.map(({hit,...w})=>w),graves:this.graves,players:this.players.map(({input,commands,queued,budget,...p})=>({...p,controlLock:Math.max(p.controlLock||0,this.timeoutRemaining>0?.1:0)})),enemies:this.enemies,bullets:this.bullets,grenades:this.grenades,pickups:this.pickups,barriers:this.barriers,fires:this.fires,mines:this.mines.filter(m=>m.revealedTo.includes(viewerId)).map(({revealedTo,...mine})=>mine),cocoons:this.cocoons,webs:this.webs,corpses:this.corpses,events:this.events};}
  }
  const api={TURRETS,BARRICADE_TIERS,Simulation,WORLD,OBSTACLES,WEAPONS,GOODS,STATS,AMMO,GRENADES,BOSSES,MODES,BUILD_ITEMS,movePlayer,shotSpread};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameSimulation=api;
})(typeof window!=='undefined'?window:globalThis);
