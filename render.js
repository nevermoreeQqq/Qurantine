window.QuarantineArt=function(){
  const {STATS,WEAPONS,AMMO,GRENADES,TURRETS}=GameContent,cache=new Map();
  const orb=(c,x,y,r,fill)=>{c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  function body(type,color,ability,variant=0){const key=type+color+ability+variant;if(cache.has(key))return cache.get(key);const image=document.createElement('canvas');image.width=image.height=144;const c=image.getContext('2d');c.translate(72,72);let seed=variant*7919+731;for(const char of type)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const robot=type==='robot',armored=type==='armored',boss=type==='boss';
    const flesh=c.createRadialGradient(8,-12,2,-6,0,43);flesh.addColorStop(0,color);flesh.addColorStop(1,robot?'#27363e':'#26302d');
    c.fillStyle=flesh;c.beginPath();c.ellipse(-5,0,34,37,0,0,Math.PI*2);c.fill();c.strokeStyle=robot?'#bbcdd0':'#172522';c.lineWidth=3;c.stroke();
    for(let i=0;i<34;i++){const x=random()*53-32,y=random()*53-27,r=random()*3+.7;orb(c,x,y,r,robot?'#d9e9e526':i%3?'#24352a70':'#cfadb54b');}
    if(robot||armored){c.fillStyle='#34444e';c.beginPath();c.moveTo(-32,-22);c.lineTo(5,-26);c.lineTo(17,-13);c.lineTo(17,13);c.lineTo(5,26);c.lineTo(-32,22);c.closePath();c.fill();c.strokeStyle='#9cb1b7';c.lineWidth=2;c.stroke();for(let y=-15;y<=15;y+=10){c.fillStyle='#15262e';c.fillRect(-24,y,27,5);orb(c,-27,y+2,2,'#ccd9d5');}c.fillStyle=robot?'#74e3f9':'#d6b889';c.fillRect(-12,-3,18,6);}
    if(type==='splitter'){for(const [x,y,r]of[[-15,0,18],[0,-18,10],[0,18,11]]){orb(c,x,y,r,'#6d354e');orb(c,x-2,y-3,r*.72,'#c696a4');orb(c,x+4,y,r*.33,'#f0b8a6');}}
    if(type==='exploder'||type==='toxic'){for(let i=0;i<7;i++){const a=i*1.7;orb(c,-4+Math.cos(a)*19,Math.sin(a)*23,8,type==='toxic'?'#b8d06c':'#d09861');orb(c,-6+Math.cos(a)*19,Math.sin(a)*23-2,3,'#eff6b776');}}
    if(type==='healer'||type==='medic'){c.strokeStyle='#6af3ac';c.lineWidth=3;c.beginPath();c.moveTo(-28,0);c.lineTo(2,0);c.moveTo(-13,-15);c.lineTo(-13,15);c.stroke();}
    if(boss){c.fillStyle='#4b3841';for(let i=0;i<5;i++){const a=(i-2)*.42;c.beginPath();c.moveTo(-20,Math.sin(a)*34);c.lineTo(-49,Math.sin(a)*52);c.lineTo(-31,Math.sin(a)*25);c.fill();}c.strokeStyle='#e2c1a7';c.lineWidth=3;c.beginPath();c.moveTo(-14,-27);c.lineTo(4,-16);c.moveTo(-14,27);c.lineTo(4,16);c.stroke();}
    // Body materials are baked into three bounded variants, never redrawn per frame.
    if(robot){
      for(const side of [-1,1]){c.fillStyle='#263741';c.fillRect(-28,side<0?-30:20,28,10);c.strokeStyle='#90a2aa';c.lineWidth=1;c.strokeRect(-27,side<0?-29:21,26,8);orb(c,-8,side*25,3,'#a7b4ba');}
      c.strokeStyle='#d4dde15a';c.lineWidth=1;for(let i=0;i<12;i++){const rx=random()*36-28,ry=random()*36-18;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx+5+random()*5,ry-2);c.stroke();}
      c.fillStyle='#bd985b';c.fillRect(-29,-18,8,4);c.fillStyle='#1b2b32';c.fillRect(-20,-12,17,24);c.strokeStyle='#729099';for(let ry=-9;ry<=9;ry+=4){c.beginPath();c.moveTo(-17,ry);c.lineTo(-5,ry);c.stroke();}
      c.strokeStyle='#b88562';c.lineWidth=2;c.beginPath();c.moveTo(-30,12);c.lineTo(-35,4);c.lineTo(-31,-8);c.stroke();
    }else if(['walker','runner','stalker','medic','screamer'].includes(type)){
      const cloth=['#555d52','#685b50','#4e6266'][variant];c.fillStyle=cloth;c.beginPath();c.moveTo(-30,-24);c.lineTo(-9,-32);c.lineTo(8,-24);c.lineTo(10,-5);c.lineTo(3,3);c.lineTo(10,14);c.lineTo(3,27);c.lineTo(-17,30);c.lineTo(-31,20);c.closePath();c.fill();
      c.strokeStyle='#182824';c.lineWidth=2;c.stroke();c.strokeStyle='#a7aa8e55';c.lineWidth=1;c.beginPath();c.moveTo(-8,-26);c.lineTo(-6,21);c.moveTo(-26,-16);c.lineTo(-13,-13);c.lineTo(-17,-4);c.stroke();
      c.fillStyle='#302d26';c.fillRect(-27,17,32,5);c.fillStyle='#a49a78';c.fillRect(-12,17,5,5);c.fillStyle='#755348';for(let i=0;i<4;i++)orb(c,-18+random()*24,-17+random()*32,2+random()*3,'#67453e88');
    }else if(!armored){
      c.strokeStyle=type==='toxic'?'#637438':'#5c454452';c.lineWidth=1.4;for(let side of [-1,1])for(let rib=0;rib<5;rib++){c.beginPath();c.moveTo(-21+rib*6,side*5);c.quadraticCurveTo(-15+rib*6,side*16,-24+rib*6,side*25);c.stroke();}
      for(let i=0;i<7;i++)orb(c,-28+random()*34,-23+random()*46,1.5+random()*2,'#ddd0a335');
    }
    c.fillStyle=robot?'#5c727d':color;c.beginPath();c.ellipse(24,0,18,22,0,0,Math.PI*2);c.fill();c.strokeStyle='#20312b';c.lineWidth=2;c.stroke();
    if(robot){c.fillStyle='#17232d';c.fillRect(27,-15,12,30);c.fillStyle='#70e7fb';c.fillRect(33,-12,4,24);}else{orb(c,34,-8,boss?4:3,type==='stalker'?'#bdcdff':boss?'#ff8868':'#ebefa2');orb(c,34,8,boss?4:3,boss?'#ff8868':'#ebefa2');c.strokeStyle='#372828';c.lineWidth=4;c.beginPath();c.moveTo(36,-4);c.lineTo(38,4);c.stroke();for(let i=0;i<4;i++){c.fillStyle='#d9d3b5';c.fillRect(37,-4+i*3,4,1.3);}}
    if(robot){c.strokeStyle='#bed0d065';c.lineWidth=1;c.beginPath();c.moveTo(15,-15);c.lineTo(29,-18);c.lineTo(40,-11);c.moveTo(15,15);c.lineTo(29,18);c.lineTo(40,11);c.stroke();for(const side of [-1,1])orb(c,20,side*13,1.7,'#dce3d8');c.fillStyle='#1d3641';c.fillRect(33,-3,4,6);}else{
      c.strokeStyle='#26382e88';c.lineWidth=1.2;c.beginPath();c.moveTo(15,-11);c.quadraticCurveTo(24,-15,29,-10);c.moveTo(15,11);c.quadraticCurveTo(24,15,29,10);c.moveTo(22,-3);c.lineTo(28,-1);c.lineTo(25,4);c.stroke();
      for(let i=0;i<6;i++)orb(c,15+random()*12,-12+random()*24,.6+random()*.8,'#d1c09b45');
      if(['walker','runner','stalker','medic'].includes(type)){c.strokeStyle=['#353c30','#524c3d','#313c3d'][variant];c.lineWidth=3;c.beginPath();c.arc(22,0,16,Math.PI*.55,Math.PI*1.45);c.stroke();}
    }
    if(type==='screamer'){orb(c,39,0,10,'#251d26');c.strokeStyle='#e5b7bd';c.lineWidth=2;c.beginPath();c.arc(39,0,9,0,Math.PI*2);c.stroke();}
    if(ability==='necromancer'){c.strokeStyle='#b9efd1';c.lineWidth=3;for(const y of [-17,-8,1,10,19]){c.beginPath();c.moveTo(-24,y);c.lineTo(2,y+3);c.stroke();}c.fillStyle='#243c36';c.fillRect(13,-20,22,40);orb(c,32,-8,4,'#8affa9');orb(c,32,8,4,'#8affa9');}
    if(ability==='burrower'){c.fillStyle='#806849';c.fillRect(-30,-26,37,52);c.strokeStyle='#e6ca91';c.lineWidth=3;for(const y of [-17,-3,11]){c.beginPath();c.moveTo(-26,y);c.lineTo(2,y+9);c.stroke();}orb(c,29,-8,5,'#f2bd75');orb(c,29,8,5,'#f2bd75');}
    if(type==='spider'||ability==='arachnid'){orb(c,-20,0,25,'#735a7d');c.strokeStyle='#d8bacb';c.lineWidth=2;for(let i=0;i<6;i++){const y=-15+i*6;c.beginPath();c.moveTo(-36,y);c.lineTo(-8,y+3);c.stroke();}for(const [x,y]of[[34,-11],[40,-4],[40,4],[34,11]])orb(c,x,y,3,'#ffb4cb');}
    if(['hellwalker','lavspitter','lavatrail','totemist'].includes(type)){
      c.fillStyle='#36232c';c.beginPath();c.moveTo(-34,-26);c.lineTo(2,-35);c.lineTo(11,-19);c.lineTo(6,22);c.lineTo(-32,30);c.closePath();c.fill();c.strokeStyle='#ffac57';c.lineWidth=2;for(let i=0;i<6;i++){const y=-24+i*9;c.beginPath();c.moveTo(-28,y);c.lineTo(-10,y+8);c.lineTo(5,y+1);c.stroke();}for(const side of [-1,1]){c.fillStyle='#c9b09a';c.beginPath();c.moveTo(15,side*17);c.lineTo(4,side*43);c.lineTo(26,side*21);c.fill();orb(c,34,side*8,4,'#fff0a2');}
      if(type==='lavspitter'){orb(c,42,0,11,'#ff9c3e');orb(c,45,0,6,'#ffe5a1');for(const side of [-1,1])orb(c,-14,side*28,10,'#e08b45');}
      if(type==='lavatrail'){orb(c,-29,0,14,'#843323');for(const side of [-1,1]){c.strokeStyle='#fc7a3b';c.lineWidth=5;c.beginPath();c.moveTo(-30,side*13);c.lineTo(-44,side*20);c.stroke();}}
      if(type==='totemist'){c.strokeStyle='#e0c4ac';c.lineWidth=4;c.beginPath();c.moveTo(-17,-32);c.lineTo(-17,32);c.moveTo(-30,-17);c.lineTo(3,-17);c.moveTo(-30,17);c.lineTo(3,17);c.stroke();orb(c,-17,0,10,'#784593');orb(c,-17,0,5,'#dfacff');}
    }
    if(type.startsWith('night')){c.fillStyle='#27334d';c.beginPath();c.moveTo(-35,-27);c.lineTo(3,-30);c.lineTo(12,-14);c.lineTo(12,14);c.lineTo(3,30);c.lineTo(-35,27);c.closePath();c.fill();c.strokeStyle='#a7bcff';c.lineWidth=2;c.stroke();for(const side of [-1,1]){orb(c,34,side*8,4,'#b6f6ff');c.strokeStyle='#87a3cc';c.lineWidth=3;c.beginPath();c.moveTo(-30,side*17);c.lineTo(-45,side*30);c.lineTo(-49,side*44);c.stroke();}if(type==='nightnecro'){c.strokeStyle='#94f0ce';c.lineWidth=3;for(let y=-18;y<=18;y+=9){c.beginPath();c.moveTo(-26,y);c.lineTo(4,y+4);c.stroke();}orb(c,-13,0,7,'#a5ffe2');}}
    cache.set(key,image);return image;
  }
  function enemy(c,e,t){const r=e.r,color=e.color||STATS[e.type]?.color||'#8fa279',lift=e.flight>0?Math.sin((1-e.flight/e.flightDuration)*Math.PI)*140:e.jump>0?Math.sin((1-e.jump/.8)*Math.PI)*75:0;c.save();c.translate(e.x,e.y);c.fillStyle='#03090970';c.beginPath();c.ellipse(5,8,r*1.14,r*.9,0,0,Math.PI*2);c.fill();c.translate(0,-lift);c.rotate(e.angle);
    const scale=r/38,attack=Math.sin(Math.min(1,(e.swing||0)/.35)*Math.PI),stride=Math.sin(e.step||0);c.scale(scale,scale);
    for(const side of [-1,1]){c.save();c.translate(-21,side*28);c.rotate(side*.25+stride*side*.18);c.fillStyle='#263535';c.fillRect(-13,-6,26,12);c.strokeStyle='#9ab3a442';c.strokeRect(-11,-5,22,10);c.restore();c.strokeStyle=e.frozen>0?'#9cdaf2':color;c.lineWidth=e.type==='robot'?14:13;c.lineCap='round';c.beginPath();c.moveTo(-2,side*27);c.lineTo(15+attack*12,side*(41-attack*16));c.lineTo(39+attack*19,side*(29-attack*14)+stride*3);c.stroke();orb(c,40+attack*19,side*(29-attack*14)+stride*3,7,e.type==='robot'?'#c4d2d7':color);c.strokeStyle='#e1dcc4';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(43+attack*19,side*(24+i*5-attack*14));c.lineTo(51+attack*19,side*(24+i*5-attack*14));c.stroke();}}
    if(e.type==='spider'||e.ability==='arachnid'){c.strokeStyle='#8e719c';c.lineWidth=5;c.lineCap='round';for(const side of [-1,1])for(let i=0;i<4;i++){const x=-28+i*18,wiggle=Math.sin(t*12+i*2+side)*5;c.beginPath();c.moveTo(x,side*20);c.lineTo(x-15+wiggle,side*(40+i*3));c.lineTo(x-6+wiggle,side*(56+i*3));c.stroke();}}
    if(e.ability==='necromancer'){c.strokeStyle='#b6c4ac';c.lineWidth=4;c.beginPath();c.moveTo(24,28);c.lineTo(55,51);c.stroke();orb(c,57,52,9,'#325e49');orb(c,57,52,5,'#a0ffc3');}
    const texture=body(e.type,color,e.ability,Math.abs(Number(e.id)||0)%3);c.globalAlpha=e.type==='stalker'?.72:1;c.drawImage(texture,-72,-72);c.globalAlpha=1;
    if(e.type==='robot'&&e.armor<=0){c.fillStyle='#192830';c.fillRect(-24,-18,30,36);c.strokeStyle='#edb07f';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-20,-11+i*10);c.lineTo(1,-6+i*10);c.stroke();}orb(c,-7,0,5,'#f9b471');}
    if(e.hit>0){c.globalCompositeOperation='source-atop';orb(c,5,0,40,'#e6eece30');c.globalCompositeOperation='source-over';}c.restore();
    if(e.frozen>0){c.strokeStyle='#8ddcfa90';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y-lift,r+7,0,Math.PI*2);c.stroke();}
    if(e.rage>0){c.strokeStyle='#dd9bc766';c.beginPath();c.arc(e.x,e.y,r+6,0,Math.PI*2);c.stroke();}
    if(e.hookTime>0||e.ability==='hook'&&e.windup>0){c.strokeStyle='#b8d9f399';c.lineWidth=3;c.setLineDash([12,8]);c.beginPath();c.arc(e.x,e.y,420,0,Math.PI*2);c.stroke();c.setLineDash([]);}if(e.slamWindup>0){c.strokeStyle='#fcac7788';c.lineWidth=4;c.beginPath();c.arc(e.x,e.y,600,0,Math.PI*2);c.stroke();}if(e.windup>0){c.strokeStyle='#fcbb6c';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(e.aimX||e.x,e.aimY||e.y,e.ability==='leap'?145:65,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    if(e.type!=='boss'){c.fillStyle='#0c1a1d';c.fillRect(e.x-r,e.y-r-13,r*2,4);c.fillStyle='#bddc91';c.fillRect(e.x-r,e.y-r-13,r*2*Math.max(0,e.hp/e.maxHp),4);}
    c.font='bold 10px Consolas';c.textAlign='center';c.fillStyle='#eef4d9';c.strokeStyle='#0b131b';c.lineWidth=3;const hpText=Math.ceil(e.hp)+' / '+e.maxHp;c.strokeText(hpText,e.x,e.y-lift-e.r-24);c.fillText(hpText,e.x,e.y-lift-e.r-24);
    if(e.type.startsWith('hell')||e.type.startsWith('lava')){orb(c,e.x-8,e.y+e.r,3+Math.sin(t*7), '#ffb94d');}if(e.armor>0){c.fillStyle='#1b2b35';c.fillRect(e.x-r,e.y-r-19,r*2,3);c.fillStyle='#9bd2eb';c.fillRect(e.x-r,e.y-r-19,r*2*e.armor/e.maxArmor,3);}
  }
  const weaponTextures=new Map();
  const weaponLength=key=>key==='hmg'?52:key==='rifle'||key==='dmr'?44:key==='pistol'?16:key==='smg'?23:key==='superShotgun'?43:key==='shotgun'?34:key==='flame'?31:30;
  function weapon(c,p,t){
    if(p.weapon==='hammer'){weaponBody(c,p,t);return;}
    let texture=weaponTextures.get(p.weapon);
    if(!texture){
      texture=document.createElement('canvas');texture.width=256;texture.height=160;
      const ink=texture.getContext('2d');ink.scale(2,2);ink.translate(40,40);
      weaponBody(ink,{weapon:p.weapon},0);weaponTextures.set(p.weapon,texture);
    }
    c.save();c.translate(-(p.recoil||0)*3,0);c.drawImage(texture,-40,-40,128,80);
    if((p.recoil||0)>.5&&p.weapon!=='flame'){
      const muzzle=14+weaponLength(p.weapon)+9,g=c.createRadialGradient(muzzle,0,0,muzzle,0,18);
      g.addColorStop(0,'#fff2bddd');g.addColorStop(.35,'#ffc56cac');g.addColorStop(1,'#fb9c2100');orb(c,muzzle,0,18,g);
      c.fillStyle='#fff2bc';c.beginPath();c.moveTo(muzzle-6,-4);c.lineTo(muzzle+13,0);c.lineTo(muzzle-6,4);c.fill();
    }c.restore();
  }
  function weaponBody(c,p,t){const key=p.weapon,recoil=(p.recoil||0)*3;c.save();c.translate(14-recoil,0);
    if(key==='hammer'){const swing=Math.sin(Math.min(1,(p.swing||0)/.35)*Math.PI);c.rotate(-.8+swing*1.7);c.fillStyle='#a57b50';c.fillRect(0,-2,34,5);c.fillStyle='#bccbd1';c.fillRect(28,-12,13,24);c.fillStyle='#5f727a';c.fillRect(35,-12,7,24);c.fillStyle='#e6ebe5';c.fillRect(28,-12,13,3);c.fillStyle='#34484a';c.fillRect(2,-2,10,5);c.fillStyle='#86958d';for(let x=3;x<12;x+=3)c.fillRect(x,-2,1,5);orb(c,33,0,2,'#3f5559');}
    else{const length=weaponLength(key);c.fillStyle='#0d1b20';c.fillRect(0,-6,length,11);c.fillStyle='#83989c';c.fillRect(4,-5,length-5,3);c.fillStyle='#c5c9b9';c.fillRect(length,-3,key==='rifle'?10:6,4);c.fillStyle='#384d52';c.fillRect(6,2,10,6);
      if(key==='ak'){c.fillStyle='#a6794b';c.fillRect(14,-5,11,10);c.fillStyle='#1d3034';c.save();c.translate(10,5);c.rotate(.4);c.fillRect(0,0,6,13);c.restore();c.fillStyle='#bbc1a5';for(let x=16;x<25;x+=3)c.fillRect(x,-5,1,10);}
      if(key==='hmg'){c.fillStyle='#596b73';c.fillRect(-5,-10,25,20);c.fillStyle='#ceb976';for(let x=0;x<25;x+=5)c.fillRect(x,11,3,8);c.strokeStyle='#a3bbc2';c.lineWidth=3;c.beginPath();c.moveTo(25,-6);c.lineTo(32,-15);c.moveTo(25,6);c.lineTo(32,15);c.stroke();c.fillStyle='#334b54';c.fillRect(27,-7,24,14);for(let x=30;x<50;x+=5){c.fillStyle='#b7c5c2';c.fillRect(x,-6,2,12);}}if(key==='smg'){c.fillStyle='#4b6670';c.fillRect(-6,-9,27,17);c.fillStyle='#bbc9bd';c.fillRect(4,-8,13,3);c.fillStyle='#223b45';c.fillRect(0,8,8,16);}if(key==='rifle'||key==='dmr'){c.fillStyle='#172930';c.fillRect(8,-10,21,7);c.fillStyle='#97c4c6';c.fillRect(9,-10,4,7);c.fillStyle='#3d585e';c.fillRect(length+4,-5,9,8);c.fillStyle='#101e24';for(let x=length+5;x<length+12;x+=3)c.fillRect(x,-5,1,8);}
      if(key==='shotgun'){c.fillStyle='#be9165';c.fillRect(12,-6,12,11);c.fillStyle='#819497';c.fillRect(24,-7,17,2);}
      if(key==='pistol'){c.fillStyle='#354343';c.fillRect(0,-6,16,11);c.fillStyle='#83938c';c.fillRect(1,-6,14,1);c.fillStyle='#263b31';c.fillRect(0,1,7,7);}
      if(key==='flame'){c.fillStyle='#c78e56';c.fillRect(0,-6,22,11);c.fillStyle='#dec48e';c.fillRect(23,-5,13,9);c.strokeStyle='#716753';c.lineWidth=4;c.beginPath();c.moveTo(3,5);c.quadraticCurveTo(-20,27,-34,10);c.stroke();}
      // Small, fixed details remain legible from above; the body is cached at 2x.
      c.lineWidth=1;c.strokeStyle='#26363a';c.strokeRect(1,-5,Math.min(length-2,18),9);
      c.fillStyle='#bac3b6';c.fillRect(3,-4,2,1);c.fillRect(17,-3,1,1);
      c.fillStyle='#1b292e';c.fillRect(length,-2,5,2);c.fillRect(5,0,7,2);
      if(key==='pistol'){c.fillStyle='#33454a';for(let x=5;x<=10;x+=2)c.fillRect(x,-5,1,3);c.fillStyle='#b7c2af';c.fillRect(14,-5,2,1);}
      if(key==='ak'||key==='shotgun'){c.strokeStyle='#795438';c.beginPath();c.moveTo(15,-2);c.lineTo(23,-2);c.moveTo(15,2);c.lineTo(22,2);c.stroke();}
      if(key==='ak'){c.strokeStyle='#71817d';c.beginPath();c.moveTo(12,9);c.lineTo(14,15);c.moveTo(14,8);c.lineTo(16,14);c.stroke();}
      if(key==='smg'){c.fillStyle='#3f564b';c.fillRect(0,-7,14,17);c.fillStyle='#24363c';c.fillRect(5,-6,12,3);for(let y=11;y<23;y+=4)c.fillRect(1,y,6,1);c.fillStyle='#8fa49e';c.fillRect(16,-9,3,2);}
      if(key==='rifle'){c.fillStyle='#53634d';c.fillRect(27,-6,15,11);c.fillStyle='#233828';for(let x=29;x<40;x+=4)c.fillRect(x,-4,2,7);}if(key==='rifle'||key==='dmr'){c.fillStyle='#617a77';c.fillRect(14,-9,10,1);c.fillStyle='#202e33';c.fillRect(17,-10,3,7);c.fillStyle='#a1b1a5';c.fillRect(28,-5,3,2);}
      if(key==='dmr'){c.fillStyle='#566c69';c.fillRect(29,-4,11,7);c.fillStyle='#24383b';for(let x=31;x<40;x+=3)c.fillRect(x,-3,1,5);c.fillRect(12,7,6,7);}
      if(key==='superShotgun'){c.fillStyle='#536c72';c.fillRect(22,-7,21,13);c.fillStyle='#a9b8b2';c.fillRect(24,-6,18,2);c.fillRect(24,3,18,2);c.fillStyle='#1c2d33';c.fillRect(26,-1,16,2);c.fillStyle='#93714e';c.fillRect(23,-2,8,4);}
      if(key==='hmg'){c.fillStyle='#273d44';c.fillRect(0,-8,17,4);c.fillStyle='#85968d';c.fillRect(8,-7,5,1);c.fillStyle='#746443';for(let x=0;x<25;x+=5)c.fillRect(x,15,3,2);}
      if(key==='flame'){c.fillStyle='#6b543b';c.fillRect(4,-2,14,4);c.fillStyle='#a7b7a2';c.fillRect(8,-1,4,2);c.fillStyle='#6d644c';for(let x=25;x<35;x+=3)c.fillRect(x,-4,1,7);orb(c,18,-3,1.5,'#d8c18e');}
    }c.restore();
  }
  function player(c,p,t,local,network){c.save();c.translate(p.x,p.y);orb(c,4,6,21,'#02090977');if(p.hp<=0){c.rotate(.4);c.fillStyle='#557574';c.fillRect(-15,-8,30,16);c.fillStyle='#d4947f';c.fillRect(-2,-13,4,26);c.restore();return;}c.rotate(p.angle);const stride=Math.sin(p.step||0)*4;
    for(const side of [-1,1]){c.fillStyle='#182e37';c.fillRect(-14+side*stride,side*9-5,18,10);c.fillStyle='#728687';c.fillRect(-14+side*stride,side*9-4,3,8);}
    const g=c.createLinearGradient(-16,-15,15,17);g.addColorStop(0,local?'#77a6a5':'#a3b98b');g.addColorStop(1,local?'#2a565e':'#526647');c.fillStyle=g;c.beginPath();c.ellipse(0,0,16,18,0,0,Math.PI*2);c.fill();c.strokeStyle='#b5ccc66a';c.lineWidth=1.5;c.stroke();c.fillStyle='#18343c';c.fillRect(-14,-11,13,22);
    if(p.armor>0){c.fillStyle='#7199ad';c.beginPath();c.moveTo(-16,-17);c.lineTo(5,-19);c.lineTo(12,-12);c.lineTo(12,12);c.lineTo(5,19);c.lineTo(-16,17);c.closePath();c.fill();c.strokeStyle='#b3edff';c.lineWidth=2;c.stroke();c.fillStyle='#233f50';for(const y of [-12,-4,4,12])c.fillRect(-12,y-2,15,5);c.fillStyle='#b3dcee';c.fillRect(-17,-21,15,7);c.fillRect(-17,14,15,7);c.fillStyle='#e4faff';c.fillRect(-14,-14,3,28);}
    if(p.weapon==='flame'){for(const y of [-8,8]){orb(c,-16,y,7,'#9f754b');c.fillStyle='#dbbf80';c.fillRect(-21,y-3,10,6);}}
    c.strokeStyle=local?'#608f92':'#91a877';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(3,-13);c.lineTo(19,-7);c.moveTo(3,13);c.lineTo(24,5);c.stroke();weapon(c,p,t);orb(c,4,0,9,'#abc5b8');c.fillStyle='#2a5057';c.fillRect(7,-8,8,16);c.fillStyle='#b3e0d5';c.fillRect(12,-5,3,10);c.restore();
    if(p.reload>0){c.strokeStyle='#badd86';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,27,-Math.PI/2,-Math.PI/2+(1-p.reload/WEAPONS[p.weapon].reload)*Math.PI*2);c.stroke();}
    if(network){c.font='10px Consolas';c.textAlign='center';c.fillStyle=local?'#bce0de':'#d4e4b7';c.fillText(p.name,p.x,p.y-35);}
  }
  const itemTextures=new Map();
  function itemTexture(type){
    let image=itemTextures.get(type);if(image)return image;
    image=document.createElement('canvas');image.width=image.height=160;
    const c=image.getContext('2d');c.scale(2,2);c.translate(40,40);itemBody(c,type);
    itemTextures.set(type,image);return image;
  }
  function itemBody(c,type){
    c.save();c.lineJoin='round';c.lineCap='round';
    const ink='#142320',edge='#839184',metal='#586b64',cloth='#536049',brass='#b39b66';
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    function path(points,color,stroke=ink){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
    function line(points,color=edge,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
    const bolt=(x,y)=>{orb(c,x,y,1.2,'#a6afa0');line([[x-.6,y],[x+.6,y]],'#46584c');};
    const ammo=Object.entries(AMMO).find(([,a])=>a.pickup===type),legacy=type==='ammoPistol';
    if(ammo||legacy){
      const kind=ammo?.[0]||'light',stripe=ammo?.[1].color||'#bcaa78';
      path([[-21,-12],[-18,-17],[18,-17],[22,-12],[22,15],[-21,15]],kind==='belt'?'#41543d':'#625d46');
      rect(-20,-12,41,3,stripe);rect(-18,-7,15,16,'#9b9778');rect(-16,-5,11,1,'#cbc6a1');rect(-16,-1,9,1,'#595d47');rect(-16,3,7,1,'#595d47');
      if(kind==='belt'){
        line([[-13,-17],[-13,-23],[9,-23],[9,-17]],'#7e8e71',2);
        for(let x=-1;x<=17;x+=6){rect(x,-7,4,17,brass);rect(x,2,4,3,'#65745a');path([[x,-7],[x+2,-12],[x+4,-7]],'#cab786',null);}
      }else for(let x=0;x<=15;x+=6){
        const shell=kind==='shell',h=kind==='heavy'?19:kind==='rifle'?16:12;
        rect(x,10-h,4,h,shell?'#895449':brass);rect(x,7,4,3,'#d0bd88');
        if(!shell)path([[x,10-h],[x+2,6-h],[x+4,10-h]],'#b6a677',null);else rect(x,10-h,4,2,'#af7460');
      }
      bolt(-18,12);bolt(18,12);line([[-20,14],[21,14]],'#9a9c7b');
    }else if(type==='vest'){
      path([[-19,-20],[-10,-25],[-5,-13],[5,-13],[10,-25],[19,-20],[20,17],[13,22],[-14,22],[-20,17]],cloth);
      path([[-12,-10],[12,-10],[14,14],[-14,14]],'#3b4938',edge);
      for(const y of [-6,0,6]){rect(-12,y,24,2,'#788166');for(const x of [-10,-2,6])rect(x,y,4,2,'#3a4935');}
      rect(-17,-19,6,10,'#798467');rect(11,-19,6,10,'#798467');rect(-17,12,6,7,'#283d31');rect(11,12,6,7,'#283d31');
      line([[-16,-8],[-16,8]],'#94a186');line([[16,-8],[16,8]],'#94a186');rect(-7,12,14,6,'#637253');rect(-4,13,8,2,'#a1ab88');
    }else if(type==='med'){
      path([[-20,-11],[-16,-16],[15,-16],[20,-11],[20,14],[16,18],[-16,18],[-20,14]],'#6f745b',edge);
      line([[-9,-16],[-9,-23],[8,-23],[8,-16]],'#899278',3);rect(-19,-7,38,2,'#3d5242');
      rect(-13,-6,26,18,'#969b7e');rect(-11,-5,22,1,'#c4c5a3');rect(-3,-3,6,13,'#945a50');rect(-7,1,14,5,'#945a50');
      for(const x of [-18,16])rect(x,-10,2,23,'#424f3e');line([[-13,15],[13,15]],'#a8b08b');
    }else if(type==='fuel'){
      path([[-15,-16],[-10,-21],[9,-21],[15,-15],[15,21],[-15,21]],'#697052',edge);
      path([[-7,-19],[-7,-26],[5,-26],[8,-23],[8,-19]],'#7f8966');rect(-4,-24,8,3,'#203a2c');
      path([[11,-19],[17,-21],[19,-17],[15,-14]],'#a29a70');
      line([[-11,-11],[10,15]],'#414f39',2);line([[10,-11],[-11,15]],'#414f39',2);
      line([[-11,-12],[10,14]],'#8a926d');rect(-6,-5,12,10,'#b2ac7c');rect(-4,-3,8,1,'#5b664c');rect(-4,1,6,1,'#5b664c');
      line([[-13,18],[11,18]],'#a0a780');
    }else if(type==='flashlight'){
      c.rotate(-.3);path([[-22,-6],[7,-6],[12,-10],[23,-10],[25,-6],[25,7],[22,11],[12,11],[7,7],[-22,7]],'#3c4d49',edge);
      for(let x=-17;x<5;x+=4)rect(x,-5,2,11,'#69776a');rect(-24,-5,4,10,'#7d8e7d');
      rect(11,-8,5,17,'#70867b');rect(22,-8,3,16,'#b7b797');rect(23,-5,1,9,'#d2cbaa');rect(-5,-8,8,2,'#819178');
    }else if(type==='nvg'){
      path([[-22,-10],[-13,-14],[14,-14],[22,-10],[21,12],[-21,12]],'#3c5146',edge);
      line([[-7,-14],[-7,-21],[7,-21],[7,-14]],'#8a9a83',3);rect(-6,-12,12,6,'#718469');
      for(const x of [-12,12]){orb(c,x,1,11,'#758574');orb(c,x,1,8,'#182e28');orb(c,x,1,6,'#456a4e');orb(c,x-2,-2,2.4,'#8fab7c');line([[x-6,-5],[x-2,-8]],'#b2c5a3');}
      rect(-5,0,10,8,'#5b735b');bolt(0,3);rect(-23,-4,3,9,'#243c31');rect(20,-4,3,9,'#243c31');
    }else if(type==='boards'){
      c.rotate(-.1);for(let i=0;i<3;i++){const y=-15+i*10;
        path([[-23,y],[-17,y-2],[22,y-1],[23,y+7],[-21,y+8]],i===1?'#9a784f':'#806641');
        line([[-19,y+2],[2,y+3],[18,y+2]],'#b49a69');line([[-16,y+5],[-4,y+4],[16,y+5]],'#594a33');orb(c,9-i*8,y+4,1.5,'#645436');
      }rect(-14,-18,4,38,'#626c50');rect(10,-18,4,38,'#626c50');rect(-13,-3,2,5,'#a5ac82');rect(11,-3,2,5,'#a5ac82');
    }else if(type==='door'){
      path([[-16,-24],[16,-24],[16,24],[-16,24]],'#68796c',edge);rect(-13,-21,26,42,'#3f5348');
      for(const y of [-18,4]){rect(-10,y,20,13,'#64745f');line([[-9,y+1],[9,y+1]],'#90a086');}
      for(const y of [-17,13]){rect(-17,y,5,6,'#9ca78e');bolt(-15,y+3);}rect(9,-1,3,8,'#a9a079');line([[10,1],[5,1]],'#c5b991',2);
      line([[-11,20],[10,20]],'#9ca989');
    }else if(type==='spikes'){
      path([[-25,9],[23,9],[25,16],[-24,16]],'#6b6953',edge);rect(-24,14,48,2,'#8a8d72');
      for(const x of [-18,-6,6,18]){path([[x-5,9],[x-2,-14],[x+1,-19],[x+4,9]],'#809082');line([[x-1,-14],[x+2,6]],'#b2b9a3');bolt(x,12);}
    }else if(type==='wire'){
      rect(-25,11,50,5,'#6b725e');for(const x of [-21,21]){rect(x-2,-17,4,32,'#849080');bolt(x,12);}
      c.strokeStyle='#8da190';c.lineWidth=1.4;for(let x=-18;x<=15;x+=9){c.beginPath();c.ellipse(x,0,7,13,.2,0,Math.PI*2);c.stroke();}
      line([[-21,-6],[21,5]],'#bdc6ad');for(const x of [-15,-4,7,17]){const y=-6+(x+21)*11/42;line([[x-2,y-3],[x+2,y+3]],'#b9bfa7');line([[x-2,y+2],[x+2,y-2]],'#b9bfa7');}
    }else if(type==='shuriken'){
      const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?7:22;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}path(pts,'#9ba79f',edge);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;line([[Math.cos(a)*7,Math.sin(a)*7],[Math.cos(a)*20,Math.sin(a)*20]],'#d0d5c2');}
      orb(c,0,0,4.2,'#3a5047');orb(c,-.5,-.5,2.5,'#162c24');
    }else if(type==='gold'){
      orb(c,1,2,11,'#826b3b');orb(c,0,0,11,'#c5a465');orb(c,0,0,8,'#9b803f');
      c.strokeStyle='#e0c890';c.lineWidth=1;c.beginPath();c.arc(0,0,9,3.1,5.7);c.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;orb(c,Math.cos(a)*9,Math.sin(a)*9,.6,'#edd7a0');}
      rect(-1,-5,2,10,'#dcca8f');rect(-4,-2,8,2,'#dcca8f');
    }else if(type==='bill'){
      c.rotate(-.12);rect(-23,-10,45,24,'#526c4c');path([[-20,-15],[24,-15],[24,10],[-20,10]],'#96a382',edge);
      c.strokeStyle='#536d4b';c.lineWidth=1;c.strokeRect(-17,-12,38,19);orb(c,2,-2,7,'#5e7e57');orb(c,2,-2,5,'#879b74');line([[1,-6],[4,-3],[1,3]],'#405f42',2);
      for(const x of [-12,13]){rect(x,-7,5,2,'#486448');rect(x,0,5,1,'#486448');}line([[-3,-13],[-1,8]],'#adba97');
    }else if(type==='frag'){
      path([[-8,-8],[-5,-13],[5,-13],[9,-6],[8,10],[4,15],[-5,15],[-9,8]],'#5f6c45',edge);
      for(const y of [-6,0,6])line([[-7,y],[7,y]],'#97a178');line([[-3,-10],[-3,11]],'#414f31');line([[3,-10],[3,11]],'#414f31');
      rect(-4,-16,8,4,'#74846c');path([[-1,-17],[7,-17],[11,9],[8,10],[3,-12],[-1,-12]],'#a3aaa0');
      c.strokeStyle='#aab49e';c.lineWidth=1.2;c.beginPath();c.arc(-4,-18,3.6,0,Math.PI*2);c.stroke();
    }else if(type==='flash'||type==='shock'){
      const shock=type==='shock';path([[-7,-13],[-5,-16],[5,-16],[8,-12],[8,14],[-7,14]],shock?'#4b6664':'#849384',edge);
      rect(-7,-7,15,3,shock?'#93b6b0':'#bdbea2');rect(-7,6,15,3,shock?'#93b6b0':'#bdbea2');
      for(const y of [-11,0,10])for(const x of [-3,3]){if(shock)rect(x-1,y,2,4,'#263f3c');else orb(c,x,y,1.3,'#374e42');}
      rect(-4,-20,8,5,'#6f806e');line([[2,-20],[9,-18],[10,13]],'#abb6a2',2);
      c.strokeStyle='#a7b3a0';c.lineWidth=1;c.beginPath();c.arc(-5,-19,3,0,Math.PI*2);c.stroke();
      if(shock){rect(-3,-2,6,7,'#b7cbc1');line([[-1,-1],[2,1],[-1,3],[1,4]],'#4a7972');}
    }else if(type==='molotov'){
      path([[-4,-18],[4,-18],[4,-9],[8,-5],[8,17],[5,20],[-5,20],[-8,17],[-8,-5],[-4,-9]],'#60785c',edge);
      rect(-6,5,12,12,'#817346');rect(-7,-1,14,7,'#b0ad81');rect(-5,0,8,1,'#d0c9a0');line([[-5,9],[-5,16]],'#8ba179');line([[-2,-15],[-2,-9]],'#9eb596');
      path([[-4,-20],[4,-20],[4,-16],[-3,-16]],'#b3ab85');line([[2,-19],[6,-23],[8,-21]],'#d3c49b',2);orb(c,8,-23,2.7,'#d69b56');orb(c,8,-24,1.3,'#eac887');
    }
    c.restore();
  }
  function pickup(c,p,t){
    const ammo=Object.values(AMMO).find(a=>a.pickup===p.type),color=ammo?.color||GRENADES[p.type]?.color||({gold:'#e5c66d',bill:'#aad2a6',vest:'#95c8df',fuel:'#d49d61',med:'#deaea0'})[p.type]||'#bad688';
    c.save();c.translate(p.x,p.y);if(Number.isFinite(p.life))c.globalAlpha*=Math.max(0,Math.min(1,p.life/4));
    const glow=c.createRadialGradient(0,0,0,0,0,30);glow.addColorStop(0,color+'20');glow.addColorStop(1,color+'00');orb(c,0,0,30,glow);
    c.fillStyle='#040e0e65';c.beginPath();c.ellipse(2,11,17,7,0,0,Math.PI*2);c.fill();c.translate(0,Math.sin(t*2+(p.phase||0))*1.8);
    c.drawImage(itemTexture(p.type),-40,-40,80,80);c.restore();
  }
  function shopItem(c,type,width=220,height=80){
    const scale=Math.min((width-24)/62,(height-12)/60);c.save();c.translate(width/2,height/2);c.scale(scale,scale);
    c.drawImage(itemTexture(type),-40,-40,80,80);c.restore();
  }
  function grenade(c,g,t,onFloor=false){
    c.save();c.translate(g.x,g.y);const arc=onFloor?0:Math.sin(Math.min(g.age/.8,1)*Math.PI)*28;
    orb(c,3,5,6,'#030a0977');c.translate(0,-arc);if(!onFloor)c.rotate(g.age*13);
    c.drawImage(itemTexture(g.type),-40,-40,80,80);c.restore();
  }
  function barrierSurface(c,b){
    c.save();c.translate(b.x,b.y);const vertical=b.h>b.w,span=vertical?b.h:b.w,thick=vertical?b.w:b.h,tier=b.tier||0;
    if(tier===0&&b.type!=='wire'&&b.type!=='spikes'){
      c.strokeStyle='#b89a6b';c.lineWidth=1;for(let i=4;i<span-3;i+=15){c.beginPath();if(vertical){c.moveTo(3,i);c.lineTo(thick-3,i+2);}else{c.moveTo(i,3);c.lineTo(i+2,thick-3);}c.stroke();}
    }else if(tier>=2){c.strokeStyle=tier>=4?'#9dac9c':'#8b9e9d';c.lineWidth=1;c.beginPath();c.moveTo(5,5);c.lineTo(b.w-5,5);c.moveTo(5,b.h-5);c.lineTo(b.w-5,b.h-5);c.stroke();}
    c.restore();
  }
  function web(c,w,t){c.save();c.translate(w.x,w.y);c.globalAlpha=Math.min(.55,w.life/3);c.strokeStyle='#d0c7e5';c.lineWidth=1;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*w.r,Math.sin(a)*w.r);c.stroke();}for(let j=1;j<5;j++){c.beginPath();for(let i=0;i<=12;i++){const a=i*Math.PI/6,r=w.r*j/5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();}c.restore();}
  function mine(c,m,t){c.save();c.translate(m.x,m.y);c.globalAlpha*=Math.max(0,Math.min(1,m.life/3));orb(c,2,4,17,'#18251c70');orb(c,0,0,15,'#56664b');orb(c,0,0,12,'#7e8961');c.strokeStyle='#adb58d';c.lineWidth=1;c.strokeRect(-8,-8,16,16);c.fillStyle='#364c34';c.fillRect(-6,-6,12,12);for(const x of [-10,10])for(const y of [-6,6])orb(c,x,y,1.2,'#c1c4a0');c.fillStyle='#a19b6c';c.fillRect(-12,-2,5,4);c.fillRect(7,-2,5,4);orb(c,0,0,2,Math.sin(t*4)>0?'#c2a26c':'#77845a');c.fillStyle='#d6dbc0';c.font='bold 10px Consolas';c.textAlign='center';c.fillText('МИНА',0,-24);c.restore();}
  function cocoon(c,o,t){c.save();c.translate(o.x,o.y);const pulse=1+Math.sin(t*5+o.id)*.04;c.scale(pulse,pulse);orb(c,3,5,29,'#040e0a77');c.fillStyle='#b8afa9';c.beginPath();c.ellipse(0,0,23,31,0,0,Math.PI*2);c.fill();c.strokeStyle='#e6e0ca';c.lineWidth=1.4;for(let i=0;i<9;i++){c.beginPath();c.moveTo(-19,-23+i*6);c.quadraticCurveTo(0,-9+i*4,19,-19+i*6);c.stroke();}orb(c,3,0,7,'#7a65785a');c.fillStyle='#111d1f';c.fillRect(-25,-43,50,4);c.fillStyle='#ddbac7';c.fillRect(-25,-43,50*o.hp/o.maxHp,4);c.fillStyle='#ead8da';c.font='10px Consolas';c.textAlign='center';c.fillText(Math.ceil(o.life)+'с',0,48);c.restore();}
  function shopTurret(c,type,width,height){
    const scale=Math.min((width-32)/88,(height-16)/76);
    c.save();c.translate(width/2-5*scale,height/2);c.scale(scale,scale);
    turret(c,{type,x:-24,y:-24,w:48,h:48,angle:0,recoil:0},0,true);
    c.restore();
  }
  function turret(c,b,t,preview=false){const spec=TURRETS[b.type]||TURRETS.turret,heavy=b.type==='turretHeavy',flame=b.type==='turretFlame',x=b.x+b.w/2,y=b.y+b.h/2,recoil=b.recoil||0;c.save();c.translate(x,y);orb(c,4,5,32,'#030a0990');orb(c,0,0,27,heavy?'#536a7f':flame?'#705447':'#5d7e73');c.strokeStyle=heavy?'#acc8df':flame?'#edb66d':'#bad9ad';c.lineWidth=2;c.beginPath();c.arc(0,0,27,0,Math.PI*2);c.stroke();for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.fillStyle='#839899';c.fillRect(17,-5,18,10);c.fillStyle='#c3d2bd';c.fillRect(27,-4,6,8);c.restore();}if(b.armor>0){c.strokeStyle='#a7d9f0';c.lineWidth=5;c.beginPath();c.arc(0,0,29,0,Math.PI*2);c.stroke();}c.rotate(b.angle||0);c.fillStyle=heavy?'#314d60':flame?'#573e37':'#294640';c.fillRect(-20,-16,36,32);c.fillStyle='#b3c8ca';c.fillRect(-15,-14,25,5);for(const y of heavy?[-8,8]:[0]){c.fillStyle='#162d38';c.fillRect(5-recoil*5,y-4,38,8);c.fillStyle=flame?'#d09854':'#c4d4cf';c.fillRect(35-recoil*5,y-5,10,10);for(let i=10;i<32;i+=5){c.fillStyle='#718f92';c.fillRect(i-recoil*5,y-4,2,8);}if(recoil>.3){c.fillStyle=flame?'#ffd082':'#ffefa9';c.beginPath();c.moveTo(43,y-4);c.lineTo(59+recoil*8,y);c.lineTo(43,y+4);c.closePath();c.fill();c.strokeStyle='#f4b16f';c.lineWidth=2;c.beginPath();c.moveTo(47,y-8);c.lineTo(50,y+8);c.stroke();}}if(flame){c.fillStyle='#b78342';c.fillRect(-26,-13,12,26);c.strokeStyle='#efd197';c.lineWidth=2;c.strokeRect(-26,-13,12,26);}c.strokeStyle='#6f8377';c.lineWidth=1;c.strokeRect(-18,-12,30,23);for(const x of [-15,8])for(const y of [-11,10])orb(c,x,y,1.5,'#b3bfaa');c.fillStyle='#1c342b';for(let y=-5;y<6;y+=4)c.fillRect(-17,y,10,2);c.fillStyle='#8f9d83';c.fillRect(-12,-14,15,1);orb(c,-5,0,4,'#819a66');for(let i=0;i<(b.level||0);i++)orb(c,-12+i*7,11,2,'#ffe5a1');c.restore();if(preview)return;c.fillStyle='#0d2224';c.fillRect(x-30,y-42,60,4);c.fillStyle='#a0d8e8';c.fillRect(x-30,y-42,60*Math.max(0,b.hp/b.maxHp),4);if(b.armor>0){c.fillStyle='#76c4ed';c.fillRect(x-30,y-47,60*b.armor/b.maxArmor,3);}c.font='bold 10px Consolas';c.textAlign='center';c.fillStyle='#e5f4d5';c.strokeStyle='#07161d';c.lineWidth=3;const text=Math.ceil(b.hp)+' / '+b.maxHp;c.strokeText(text,x,y-52);c.fillText(text,x,y-52);}
  function totem(c,t,time){c.save();c.translate(t.x,t.y);orb(c,0,8,31,'#110c1866');const glow=c.createRadialGradient(0,0,3,0,0,42);glow.addColorStop(0,'#c97bff44');glow.addColorStop(1,'#8f4bc900');orb(c,0,0,42,glow);c.fillStyle='#493444';c.fillRect(-14,-30,28,56);c.strokeStyle='#d4b599';c.lineWidth=3;c.strokeRect(-14,-30,28,56);for(let y=-21;y<25;y+=14){c.strokeStyle='#ebc6a5';c.beginPath();c.moveTo(-10,y);c.lineTo(10,y+5);c.stroke();}orb(c,0,-18,10,'#9e5fbe');orb(c,0,-18,5+Math.sin(time*4),'#edbaff');c.fillStyle='#bca28f';for(const side of [-1,1]){c.beginPath();c.moveTo(side*10,-23);c.lineTo(side*23,-37);c.lineTo(side*13,-8);c.fill();}c.restore();c.fillStyle='#182029';c.fillRect(t.x-30,t.y-48,60,4);c.fillStyle='#c594d8';c.fillRect(t.x-30,t.y-48,60*Math.max(0,t.hp/t.maxHp),4);c.font='bold 10px Consolas';c.textAlign='center';c.fillStyle='#f0d6f5';c.fillText(Math.ceil(t.hp)+' / '+t.maxHp,t.x,t.y-55);}
  function grave(c,g){c.save();c.translate(g.x,g.y);c.rotate(-Math.PI/2);c.fillStyle='#03080799';c.fillRect(-33,-14,68,29);c.fillStyle='#775846';c.beginPath();c.moveTo(-32,-10);c.lineTo(-19,-17);c.lineTo(23,-15);c.lineTo(35,-6);c.lineTo(35,6);c.lineTo(23,15);c.lineTo(-19,17);c.lineTo(-32,10);c.closePath();c.fill();c.strokeStyle='#c5a976';c.lineWidth=2;c.stroke();c.strokeStyle='#3c2e25';c.lineWidth=1;for(let y=-10;y<=10;y+=5){c.beginPath();c.moveTo(-25,y);c.lineTo(27,y);c.stroke();}c.fillStyle='#e1d6ab';c.fillRect(-4,-9,4,18);c.fillRect(-10,-3,16,4);c.restore();c.font='10px Consolas';c.textAlign='center';c.fillStyle='#cab4a1';c.fillText(g.name||'Боец',g.x,g.y-45);}
  function weaponProfile(c,gun,style='field',detail=2){
    const tactical=style==='tactical',field=style==='field',state={detail};c.save();
    const ink='#0a0f12',edge='#7a8c8b',metal='#36474e',light='#60777c',wood=field?'#795d43':'#9b6945',grain=field?'#a78860':'#c4905e';
    function shape(points,fill,stroke=ink,width=1.4){c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
    function rect(x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}
    function line(points,color=edge,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
    function dot(x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    if(gun==='ak'){
      // Preserve the characteristic stock/receiver/gas-tube/barrel proportions.
      if(tactical){shape([[-143,-3],[-75,-3],[-68,8],[-139,19],[-146,13]],'#32464a');shape([[-135,2],[-89,2],[-83,6],[-135,13]],'#171d20',null);rect(-146,-4,4,22,'#607376');}
      else{shape([[-147,-10],[-79,-7],[-63,2],[-77,9],[-99,16],[-140,24],[-147,18]],wood);line([[-145,-7],[-94,-5],[-75,2]],grain,1.5);rect(-148,-10,4,33,'#34464c');}
      shape([[-73,-13],[-13,-13],[13,-9],[25,-3],[25,9],[-66,9],[-72,5]],metal);rect(-69,-12,72,3,light);rect(-66,7,87,3,'#172b32');
      shape([[-51,8],[-32,8],[-38,38],[-56,34]],tactical?'#283c40':wood);line([[-47,12],[-40,13],[-45,29]],tactical?edge:grain);
      c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(-28,10);c.lineTo(-7,10);c.quadraticCurveTo(-2,22,-20,23);c.lineTo(-27,17);c.stroke();line([[-18,10],[-21,17]],'#a2afa5',1.8);
      c.fillStyle='#25383f';c.beginPath();c.moveTo(-5,9);c.lineTo(17,9);c.quadraticCurveTo(17,38,37,57);c.lineTo(18,66);c.quadraticCurveTo(-6,41,-5,9);c.fill();c.strokeStyle=edge;c.lineWidth=1.2;c.stroke();
      for(const x of [0,6,12]){c.beginPath();c.moveTo(x,17);c.quadraticCurveTo(x+1,39,x+20,59);c.strokeStyle='#516971';c.stroke();}
      rect(24,-8,106,5,'#32474e');rect(25,-8,101,1,'#91a19a');
      shape([[23,-9],[68,-9],[71,-4],[65,9],[24,10]],tactical?'#35494b':wood);line([[28,-8],[61,-8]],tactical?edge:grain,1.4);
      shape([[27,-14],[65,-14],[69,-10],[25,-9]],tactical?'#32464b':wood);line([[29,-13],[62,-13]],tactical?edge:grain);
      rect(28,-12,44,3,'#50656a');shape([[70,-13],[77,-12],[83,-6],[79,-5],[74,-9],[70,-9]],'#344b53');line([[73,-12],[79,-7]],edge);
      rect(114,-11,6,7,'#526970');shape([[112,-11],[114,-20],[119,-21],[123,-16],[123,-11]],'#344a51');line([[116,-20],[118,-20]],'#a7b7a5',1.2);rect(123,-9,16,7,'#53696b');rect(134,-7,5,3,ink);
      shape([[10,-14],[14,-17],[25,-17],[27,-12],[10,-11]],'#465c60');line([[13,-18],[24,-18]],'#82958d',1.5);
      if(tactical){for(let x=28;x<65;x+=6)rect(x,-6,2,11,ink);rect(-65,-16,62,2,'#7e918c');for(let x=-61;x<-7;x+=6)rect(x,-18,3,2,'#3a5056');shape([[-42,-18],[-42,-29],[-23,-31],[-16,-27],[-16,-18]],'#354d52');shape([[-37,-19],[-37,-26],[-24,-28],[-21,-25],[-21,-19]],'#172529');line([[-36,-26],[-26,-28]],'#748e8d');}
      if(state.detail>=2){rect(-35,-6,25,5,ink);rect(-32,-6,18,1,'#839992');line([[-30,4],[-15,-1],[2,-1]],'#91a299',1.5);for(const x of [-61,-47,9]){dot(x,2,1.7,'#81968e');line([[x-1,2],[x+1,2]],'#2c4146');}for(let x=32;x<65;x+=10)line([[x,-3],[x+6,-2]],tactical?edge:grain);}
      if(field){shape([[-137,-7],[-110,-5],[-108,16],[-134,22]],'#757861');for(let x=-135;x<-111;x+=6)line([[x,-6],[x+4,19]],'#a0a58a');line([[-65,-11],[-56,-11]],'#afbab0');line([[4,8],[17,8]],'#9bac9f');}
    }else if(gun==='pistol'){
      // G17 Gen5-inspired left profile: full-size grip, 186-unit slide,
      // about 202 x 139 overall; no oversized muzzle or side ejection window.
      c.translate(3,-10);
      shape([[-89,-41],[92,-41],[96,-36],[96,-15],[-89,-15]],'#303a3e');
      rect(-86,-40,177,2,'#73807b');rect(-88,-19,182,3,'#202b2e');
      line([[-87,-37],[-87,-23]],'#52615f');line([[92,-35],[92,-20]],'#52615f');
      // Polymer frame and curved backstrap, without Gen3 finger grooves.
      c.fillStyle='#26312f';c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();
      c.moveTo(-89,-14);c.lineTo(93,-14);c.lineTo(93,-1);c.lineTo(25,-1);
      c.lineTo(20,13);c.quadraticCurveTo(17,20,5,21);c.lineTo(-29,19);
      c.lineTo(-39,46);c.lineTo(-58,88);c.lineTo(-102,78);
      c.quadraticCurveTo(-86,42,-80,12);c.quadraticCurveTo(-77,0,-90,-4);
      c.lineTo(-94,-7);c.closePath();c.fill();c.stroke();
      // Squared guard with rounded lower corners and the safety trigger.
      c.fillStyle='#171d20';c.strokeStyle='#72817a';c.lineWidth=1.4;c.beginPath();
      c.moveTo(-25,1);c.lineTo(18,1);c.lineTo(16,12);c.quadraticCurveTo(15,17,8,17);
      c.lineTo(-25,16);c.quadraticCurveTo(-32,13,-25,1);c.fill();c.stroke();
      line([[-12,1],[-16,11],[-11,13]],'#8a9890',2);line([[-13,4],[-13,9]],'#3b4b45',1);
      // Grip panel follows the backstrap rather than a separate block.
      shape([[-76,16],[-38,21],[-64,78],[-95,72]],'#35413a','#47554b',1);
      shape([[-102,78],[-58,88],[-58,93],[-106,82]],'#35413d');
      line([[-99,79],[-62,87]],'#69766a');
      rect(-78,-46,8,5,'#313b3c');rect(81,-46,5,5,'#455246');rect(82,-46,2,1,'#c0c6ab');
      for(let x=-77;x<-48;x+=5)line([[x,-36],[x,-21]],'#687570',1.2);
      for(let x=66;x<87;x+=5)line([[x,-35],[x,-21]],'#5a6863',1.1);
      line([[29,-2],[83,-2]],'#495a52');rect(69,-2,4,3,'#1b2827');
      if(state.detail>=2){
        // Magazine catch, slide stop and takedown notch; quiet stippling.
        shape([[-56,3],[-46,3],[-47,9],[-57,9]],'#536258',null);
        rect(-36,-11,14,3,'#748278');rect(-12,-8,7,2,'#475950');
        dot(-62,-2,1.6,'#707e6e');dot(-36,-3,1.5,'#707e6e');
        for(let y=25;y<72;y+=6){const shift=(y-25)*.34;for(let x=-73;x<-47;x+=6)dot(x-shift,y,0.7,'#68745b');}
        c.fillStyle='#8c9790';c.font='7px system-ui';c.textAlign='left';c.fillText('G17',-41,-27);c.fillStyle='#60716a';c.fillText('9×19',-11,-27);
      }
      if(tactical){shape([[-77,-42],[-77,-57],[-62,-60],[-49,-54],[-49,-42]],'#344542');shape([[-71,-44],[-71,-53],[-62,-56],[-54,-52],[-54,-44]],'#172a26');line([[-68,-54],[-62,-56]],'#809789');}
      if(field){shape([[-85,40],[-49,48],[-61,75],[-94,67]],'#69715b');for(let y=44;y<65;y+=5)line([[-85-(y-44)*.32,y],[-51-(y-44)*.4,y+7]],'#99a187');line([[-86,-40],[-74,-40]],'#a1afa0');line([[76,-16],[88,-16]],'#87998b');}
      if(state.detail===3){line([[-46,-38],[14,-38]],'#4f6058');rect(-31,-23,16,1,'#596b60');line([[-102,79],[-90,82]],'#879581');}
    }else if(gun==='smg'){
      // Vector-inspired tall recoil housing and magazine close to the grip.
      shape([[-135,-14],[-76,-14],[-68,-7],[-80,1],[-133,13]],'#344440');
      shape([[-127,-9],[-88,-9],[-82,-5],[-126,6]],'#171d20',null);rect(-136,-15,5,29,'#627269');
      shape([[-75,-23],[9,-23],[27,-12],[24,3],[-13,3],[-16,37],[-54,37],[-57,10],[-75,7]],'#3b4a47');
      rect(-70,-22,71,3,'#74847b');shape([[-59,7],[-40,10],[-50,58],[-71,53]],'#263631');
      shape([[-32,29],[-15,29],[-15,74],[-32,74]],'#2f4038');rect(-34,72,21,4,'#59685a');
      shape([[-37,3],[-20,3],[-20,17],[-42,17]],'#171d20',edge);line([[-30,4],[-33,12]],edge,2);
      shape([[26,-13],[66,-13],[69,4],[24,4]],'#334a44');rect(67,-8,28,8,'#4d625e');rect(87,-10,12,12,'#283c39');rect(96,-6,3,4,ink);
      rect(-70,-28,80,4,'#5e746b');for(let x=-67;x<7;x+=7)rect(x,-30,3,3,'#273c37');
      rect(-61,-33,5,5,'#859487');rect(58,-20,5,7,'#7b8d7c');
      for(let x=32;x<61;x+=7)rect(x,-9,3,9,'#172c28');
      if(state.detail>=2){shape([[-47,-16],[-4,-16],[-4,-4],[-48,-4]],'#253833',edge);rect(-39,-14,22,3,'#101f1c');for(let y=38;y<69;y+=6)line([[-28,y],[-19,y]],'#687765');dot(-61,-8,2,'#a4afa0');dot(-26,24,2,'#8f9f88');}
      if(field){shape([[-126,-10],[-106,-10],[-106,7],[-126,11]],'#6b7058');for(let x=-124;x<-106;x+=5)line([[x,-9],[x+2,9]],'#9ca187');}
    }else if(gun==='rifle'||gun==='dmr'){
      const heavy=gun==='rifle';
      if(heavy){shape([[-146,-16],[-93,-12],[-77,-3],[-92,11],[-142,19]],'#626955');rect(-148,-16,5,35,'#273934');}else{rect(-121,-5,35,7,'#2c4434');shape([[-145,-15],[-116,-15],[-112,-7],[-115,9],[-129,18],[-146,17]],'#445247');shape([[-139,-8],[-122,-8],[-124,9],[-139,11]],'#253c2d',null);rect(-149,-15,4,33,'#293d2d');}
      shape([[-91,-15],[-19,-15],[11,-10],[13,11],[-84,11],[-94,4]],heavy?'#586151':'#3a4c43');rect(-89,-15,83,3,'#8b9781');
      shape([[-70,11],[-49,11],[-57,47],[-77,42]],'#2c3c33');
      shape([[-42,11],[-19,11],[-17,heavy?50:42],[-43,heavy?50:42]],'#3c4e40');rect(-44,heavy?47:39,29,4,'#60735b');
      shape([[-49,10],[-24,10],[-23,24],[-53,24]],'#171d20',edge);line([[-42,11],[-46,20]],edge,2);
      shape([[10,-11],[83,-11],[91,-3],[86,10],[10,10]],heavy?'#67715b':'#43564a');
      rect(86,-4,46,5,'#566c5e');shape([[129,-9],[146,-9],[150,-6],[150,5],[132,5]],'#526457');
      for(let x=135;x<148;x+=5)rect(x,-6,2,8,'#172e25');
      for(let x=18;x<79;x+=10){if(heavy){shape([[x,-5],[x+6,-5],[x+4,4],[x-1,4]],'#1f3229',null);}else rect(x,-4,5,8,'#233b2d');}
      rect(-72,-20,81,4,'#344a3d');rect(-58,-25,6,8,'#7d8c74');rect(-14,-25,6,8,'#7d8c74');
      shape([[-70,-35],[-62,-39],[-12,-39],[-3,-34],[-3,-25],[-65,-25]],'#324b3d');
      rect(-72,-38,9,14,'#61775d');rect(-8,-39,13,15,'#698066');rect(3,-37,2,10,'#9aaea1');if(heavy)rect(-40,-45,9,7,'#63775b');
      if(heavy){line([[65,10],[52,42],[48,44]],'#7d8f74',2);line([[65,10],[80,39],[85,40]],'#7d8f74',2);rect(-44,-8,30,8,'#263c2d');line([[-17,-2],[-8,17]],'#839a77',2);dot(-7,18,3,'#9eaf8b');}
      else{rect(-86,-20,40,4,'#647858');line([[-137,-10],[-111,-8]],'#80906e');}
      if(state.detail>=2){for(const x of [-82,-12])dot(x,5,2,'#a1ae93');for(let y=19;y<36;y+=5)line([[-37,y],[-23,y]],'#748565');line([[-66,4],[-54,0]],'#a5b093',2);}
      if(field){shape([[-138,-12],[-120,-11],[-120,15],[-138,18]],'#777b59');for(let x=-136;x<-120;x+=5)line([[x,-11],[x+2,15]],'#a5ac87');}
    }else if(gun==='shotgun'){
      // Traditional pump-action profile, long tube and flowing stock wrist.
      shape([[-149,-12],[-104,-9],[-77,2],[-57,7],[-66,16],[-87,9],[-106,17],[-145,28]],wood);
      rect(-150,-12,4,40,'#30423a');line([[-143,-8],[-106,-5],[-83,4]],grain);
      shape([[-65,-12],[-13,-12],[0,-8],[0,9],[-64,9]],'#3a4b45');rect(-62,-12,46,2,'#899b89');
      shape([[-55,9],[-30,9],[-31,23],[-50,24]],'#171d20',edge);line([[-43,10],[-47,18]],edge,2);
      rect(-2,-10,136,5,'#65796c');rect(0,0,126,7,'#3e5447');rect(123,-2,6,10,'#7e9177');rect(130,-12,6,5,'#74866f');
      shape([[6,-3],[49,-3],[53,12],[4,12]],wood);line([[9,-2],[45,-2]],grain);
      for(let x=12;x<49;x+=6)line([[x,-1],[x,10]],'#594534',1.5);
      if(state.detail>=2){rect(-46,-7,24,5,'#1d3129');rect(-44,-7,20,1,'#90a18c');dot(-59,2,1.6,'#afbaa2');line([[67,-8],[113,-8]],'#97a58e');}
      if(field){shape([[-137,-8],[-117,-7],[-117,20],[-137,26]],'#74765b');for(let x=-135;x<-117;x+=5)line([[x,-7],[x+2,22]],'#a4a88b');}
    }else if(gun==='superShotgun'){
      // DP-12-inspired compact bullpup, two barrels and two lower tubes.
      shape([[-136,-20],[-21,-20],[2,-10],[0,19],[-134,19]],'#43594c');rect(-133,-19,107,3,'#7d9380');rect(-137,-21,5,41,'#2d4035');
      shape([[-29,14],[-9,17],[-19,56],[-42,50]],'#2e4436');
      shape([[-4,13],[19,13],[15,29],[-8,28]],'#171d20',edge);line([[5,14],[0,22]],edge,2);
      shape([[1,-13],[84,-13],[94,-7],[94,13],[1,13]],'#536b56');rect(4,-12,81,2,'#81967c');
      for(const y of [-9,0]){rect(88,y,43,6,'#53695b');rect(126,y-1,8,8,'#8a9d85');rect(131,y+1,3,3,'#12291c');}
      rect(77,12,50,4,'#394f3e');
      shape([[21,5],[62,5],[67,21],[19,21]],'#314a37');for(let x=26;x<61;x+=7)line([[x,7],[x+1,19]],'#70826b',1.4);
      rect(-112,-25,182,4,'#657b62');for(let x=-108;x<66;x+=8)rect(x,-27,3,3,'#2b4432');rect(-105,-31,5,6,'#90a488');rect(63,-31,5,6,'#90a488');
      if(state.detail>=2){rect(-92,-8,41,11,'#233c2a');rect(-87,-7,20,2,'#91a183');dot(-116,9,2,'#9aab89');dot(-37,7,2,'#9aab89');for(let x=-108;x<-68;x+=10)line([[x,8],[x+5,8]],'#728565');}
      if(field){shape([[-128,-15],[-112,-15],[-112,15],[-128,15]],'#737a57');for(let y=-12;y<13;y+=5)line([[-126,y],[-114,y+2]],'#a2ab82');}
    }else if(gun==='hmg'){
      // Heavy belt-fed receiver, cooling sleeve and pronounced muzzle brake.
      shape([[-145,-9],[-94,-9],[-83,1],[-102,17],[-144,23]],'#576451');rect(-147,-10,5,35,'#2c3f34');
      shape([[-94,-21],[-22,-21],[-10,-13],[-10,17],[-92,17]],'#526451');rect(-91,-20,70,3,'#92a084');
      shape([[-63,17],[-44,17],[-50,48],[-70,43]],'#2d4232');
      rect(-26,-13,77,22,'#465f4c');for(let x=-18;x<45;x+=9){dot(x,-5,2.5,'#182f21');dot(x+4,3,2.5,'#182f21');}
      rect(50,-6,80,7,'#526e57');shape([[128,-12],[148,-12],[151,-9],[151,6],[132,6]],'#677c60');for(let x=133;x<149;x+=6)rect(x,-8,3,10,'#213a28');
      line([[-71,-22],[-71,-31],[-35,-31],[-35,-22]],'#85977b',3);rect(-37,-26,5,5,'#42573f');rect(106,-17,5,11,'#809574');
      for(let x=-69;x<-10;x+=7){rect(x,18,4,22,'#ae9660');rect(x,23,4,3,'#d1bb85');rect(x,34,4,4,'#6c7c66');}
      line([[58,3],[45,42],[39,43]],'#89a078',2.5);line([[58,3],[76,37],[83,38]],'#89a078',2.5);
      if(state.detail>=2){rect(-79,-13,44,14,'#2f4834');rect(-74,-12,33,2,'#9eaf8b');dot(-87,9,2,'#b2b99b');dot(-24,9,2,'#b2b99b');line([[-81,3],[-62,3]],'#7e9472');}
      if(field){shape([[-139,-5],[-122,-5],[-122,20],[-139,23]],'#797e58');for(let y=-3;y<19;y+=5)line([[-137,y],[-124,y+1]],'#abb08a');}
    }else if(gun==='flame'){
      // Fictional industrial flamethrower: no cosmetic scope or neon glow.
      c.strokeStyle='#736d4b';c.lineWidth=6;c.beginPath();c.moveTo(-48,10);c.bezierCurveTo(-101,61,-141,40,-142,-19);c.stroke();
      shape([[-155,-44],[-128,-44],[-122,-37],[-122,20],[-154,20],[-159,12],[-159,-36]],'#65705a');rect(-154,-41,26,3,'#acaf83');
      for(const y of [-28,6])rect(-159,y,37,6,'#3c5040');rect(-149,-53,15,9,'#879476');rect(-146,-57,9,5,'#4c6350');
      shape([[-85,-14],[-15,-14],[0,-5],[0,11],[-82,11]],'#6b6548');rect(-81,-13,64,2,'#b0a376');
      shape([[-67,11],[-48,11],[-56,46],[-78,39]],'#3f4e3a');shape([[-44,10],[-19,10],[-21,25],[-48,23]],'#171d20',edge);
      rect(-5,-6,82,10,'#536a51');rect(19,-10,43,18,'#7e8255');for(let x=23;x<59;x+=7)rect(x,-7,3,12,'#394e37');
      shape([[76,-13],[112,-13],[118,-5],[118,8],[77,8]],'#9b8854');for(let x=82;x<111;x+=8)rect(x,-9,3,13,'#4c563c');rect(114,-4,7,4,'#2c3c2a');
      line([[59,7],[102,14],[115,11]],'#7d7650',3);dot(117,11,2,'#bba576');dot(-45,-2,9,'#364c3d');dot(-45,-2,6,'#b4b489');line([[-45,-2],[-41,-5]],'#354431',1.5);
      if(state.detail>=2){dot(-76,4,2,'#b7b88d');dot(-16,4,2,'#b7b88d');rect(-151,-21,22,18,'#849071');rect(-148,-18,16,2,'#c5c3a0');}
      if(field){shape([[-74,17],[-52,22],[-58,36],[-78,32]],'#7b7f59');for(let y=20;y<31;y+=4)line([[-73,y],[-56,y+4]],'#a9ad84');}
    }else if(gun==='hammer'){
      c.rotate(-.15);shape([[-139,-4],[74,-4],[76,5],[-139,5]],wood);line([[-127,-3],[51,-3]],grain);
      shape([[62,-36],[81,-36],[83,-27],[109,-26],[114,-20],[114,17],[81,17],[81,31],[61,31]],'#72817d');
      rect(64,-35,14,3,'#b3bcb0');rect(83,-24,29,3,'#a4b4a8');rect(107,-19,5,34,'#4b6059');dot(72,0,4,'#405a50');
      rect(-135,-5,55,11,'#3b4c3d');for(let x=-131;x<-80;x+=8)line([[x,-4],[x+3,5]],'#8e9b7a');
      if(state.detail>=2){line([[66,-30],[76,-30],[78,-7]],'#556960');line([[87,-16],[101,-16]],'#cad0be');}

    }
    if(state.detail===3&&gun==='ak'){line([[-57,-4],[-46,-4]],'#5f7976');rect(-42,-10,3,1,'#bdc4af');for(const x of [39,54])dot(x,4,1.2,'#c1b498');}
    c.restore();
  }
  function shopWeapon(c,key,width=220,height=80){
    const frame={pistol:[220,150,0,24],ak:[320,100,-4,20],smg:[265,120,-19,20],rifle:[320,115,0,0],dmr:[320,115,0,0],shotgun:[320,75,-7,7],superShotgun:[300,105,-2,15],hmg:[320,105,0,5],flame:[305,125,-20,-2],hammer:[310,110,-10,0]}[key];
    if(!frame)return;
    const scale=Math.min((width-16)/frame[0],(height-12)/frame[1]);
    c.save();c.translate(width/2,height/2);c.scale(scale,scale);c.translate(-frame[2],-frame[3]);
    weaponProfile(c,key);c.restore();
  }
  return{enemy,player,pickup,grenade,weapon,web,mine,cocoon,turret,totem,grave,shopWeapon,shopTurret,shopItem,barrierSurface};
};
