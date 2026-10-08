window.QuarantineTerrain = function(WORLD, obstacles) {
  // Fixed map art is drawn once; moving objects are rendered separately.
  const terrain=document.createElement('canvas');terrain.width=WORLD.w;terrain.height=WORLD.h;const tc=terrain.getContext('2d');
  let seed=731;function seeded(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  function mapArt() {
    tc.fillStyle='#2a3537';tc.fillRect(0,0,WORLD.w,WORLD.h);
    for(let y=0;y<WORLD.h;y+=100)for(let x=0;x<WORLD.w;x+=100){const v=Math.floor(32+seeded()*7);tc.fillStyle=`rgb(${v},${v+12},${v})`;tc.fillRect(x+1,y+1,98,98);tc.strokeStyle='#1c231c66';tc.strokeRect(x,y,100,100);}
    for(let i=0;i<10500;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;tc.fillStyle=seeded()<.5?'#79866d10':'#080e0c26';tc.fillRect(x,y,1+seeded()*3,1+seeded()*3);}
    // Service roads and faded painted markings.
    tc.fillStyle='#1e251f';tc.fillRect(30,820,WORLD.w-60,180);tc.fillRect(1120,30,175,WORLD.h-60);
    tc.strokeStyle='#8d96663c';tc.lineWidth=3;tc.setLineDash([24,30]);tc.beginPath();tc.moveTo(45,909);tc.lineTo(WORLD.w-45,909);tc.moveTo(1207,40);tc.lineTo(1207,WORLD.h-40);tc.stroke();tc.setLineDash([]);
    tc.strokeStyle='#66734a38';tc.lineWidth=2;tc.strokeRect(668,440,1000,950);
    for(let i=0;i<25;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;tc.strokeStyle='#111a1680';tc.lineWidth=1;tc.beginPath();tc.moveTo(x,y);for(let j=0;j<4;j++)tc.lineTo(x+seeded()*80-40,y+j*18);tc.stroke();}
    tc.textAlign='center';tc.font='bold 58px Consolas, monospace';tc.fillStyle='#84956b12';tc.save();tc.translate(1200,790);tc.rotate(-Math.PI/2);tc.fillText('QUARANTINE / 07',0,0);tc.restore();
    tc.font='bold 16px Consolas, monospace';tc.fillStyle='#9daa7735';tc.fillText('RESTRICTED AREA',1200,1100);
    // Rain-dark asphalt, service lanes, paving and the eastern loading yard.
    tc.fillStyle='#182b32';tc.fillRect(2180,630,790,145);tc.fillRect(2220,1430,740,110);
    tc.strokeStyle='#bfd0be28';tc.lineWidth=3;tc.setLineDash([26,32]);for(const y of [702,1485]){tc.beginPath();tc.moveTo(2200,y);tc.lineTo(WORLD.w-50,y);tc.stroke();}tc.setLineDash([]);
    for(let x=170;x<WORLD.w-150;x+=300){tc.fillStyle='#b4c4b435';tc.fillRect(x,819,100,3);tc.fillRect(x,998,100,3);}
    for(let y=1040;y<1400;y+=30){tc.fillStyle='#c6bca53b';tc.fillRect(2210,y,125,3);}
    tc.fillStyle='#8299991b';tc.fillRect(2300,1080,490,260);tc.strokeStyle='#c9b77755';tc.strokeRect(2300,1080,490,260);
    for(let i=0;i<48;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;tc.save();tc.translate(x,y);tc.scale(1,.45);const puddle=tc.createRadialGradient(0,0,4,0,0,30+seeded()*45);puddle.addColorStop(0,'#94b3bc17');puddle.addColorStop(1,'#10232a00');circle(tc,0,0,75,puddle);tc.restore();}
    for(let i=0;i<32;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;if(obstacles.some(o=>x>o.x-20&&x<o.x+o.w+20&&y>o.y-20&&y<o.y+o.h+20))continue;tc.save();tc.translate(x,y);tc.strokeStyle='#151e1f';tc.lineWidth=8;tc.beginPath();tc.moveTo(-15,-17);tc.lineTo(17,13);tc.stroke();tc.strokeStyle='#83959650';tc.lineWidth=2;tc.stroke();tc.restore();}
    for(const [x,y]of[[170,570],[2280,810],[1260,1870],[2680,620]]){tc.fillStyle='#14252c';tc.fillRect(x,y,10,32);circle(tc,x+5,y,9,'#839ba766');const light=tc.createRadialGradient(x+5,y,5,x+5,y,115);light.addColorStop(0,'#a2dcbd14');light.addColorStop(1,'#a2dcbd00');circle(tc,x+5,y,115,light);}
    // Border fence.
    tc.strokeStyle='#71826250';tc.lineWidth=3;tc.strokeRect(20,20,WORLD.w-40,WORLD.h-40);tc.strokeStyle='#0b110bb0';tc.lineWidth=12;tc.strokeRect(7,7,WORLD.w-14,WORLD.h-14);
    for(let x=20;x<WORLD.w;x+=65){tc.fillStyle='#7b8b61';tc.fillRect(x,15,5,12);tc.fillRect(x,WORLD.h-26,5,12);}
    for(let y=20;y<WORLD.h;y+=65){tc.fillStyle='#7b8b61';tc.fillRect(15,y,12,5);tc.fillRect(WORLD.w-26,y,12,5);}
    // Debris, drains, weeds and stains.
    for(let i=0;i<110;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;tc.save();tc.translate(x,y);tc.rotate(seeded()*6.28);tc.fillStyle='#a7af9144';tc.fillRect(0,0,3+seeded()*8,2+seeded()*5);tc.restore();}
    for(let i=0;i<75;i++){const x=seeded()*WORLD.w,y=seeded()*WORLD.h;tc.strokeStyle='#65754945';tc.lineWidth=2;tc.beginPath();tc.moveTo(x,y);tc.lineTo(x-5,y-12);tc.moveTo(x,y);tc.lineTo(x+5,y-8);tc.stroke();}
    for(const p of [{x:670,y:690},{x:1640,y:1030},{x:980,y:1340},{x:1600,y:430}]){tc.fillStyle='#111811';tc.fillRect(p.x,p.y,42,32);tc.strokeStyle='#55614a';for(let i=0;i<6;i++){tc.beginPath();tc.moveTo(p.x+4+i*6,p.y+3);tc.lineTo(p.x+4+i*6,p.y+29);tc.stroke();}}
    for(const o of obstacles)drawObstacle(tc,o);
  }
  function drawObstacle(c,o) {
    const {x,y,w,h,type}=o;c.fillStyle='#090e0b70';c.fillRect(x+11,y+13,w+3,h+3);
    if(type==='car'){
      c.save();c.translate(x+w/2,y+h/2);if(h>w)c.rotate(Math.PI/2);const length=Math.max(w,h),width=Math.min(w,h);c.fillStyle='#111e23';for(const side of [-1,1])for(const wheel of [-1,1])c.fillRect(wheel*length*.29-8,side*width*.45-5,17,11);
      const paint=c.createLinearGradient(0,-width/2,0,width/2);paint.addColorStop(0,o.paint||'#6c8790');paint.addColorStop(.45,'#34464a');paint.addColorStop(1,o.paint||'#667b7b');c.fillStyle=paint;c.beginPath();c.roundRect(-length/2,-width/2,length,width,9);c.fill();c.strokeStyle='#bbcbc95c';c.lineWidth=2;c.stroke();
      c.fillStyle='#162b35';c.fillRect(-length*.18,-width*.39,length*.43,width*.78);c.fillStyle='#4a6874';c.fillRect(length*.12,-width*.34,length*.14,width*.68);c.strokeStyle='#b6c8cb';c.lineWidth=1;c.beginPath();c.moveTo(length*.2,-width*.35);c.lineTo(length*.09,0);c.lineTo(length*.22,width*.35);c.stroke();
      c.fillStyle='#242f34';c.fillRect(-length*.08,-width*.34,length*.21,width*.68);c.strokeStyle='#9da8a54c';c.strokeRect(-length*.08,-width*.34,length*.21,width*.68);
      for(const side of [-1,1]){c.fillStyle='#d9d3a0';c.fillRect(length/2-6,side*width*.27-4,5,8);c.fillStyle='#b96b55';c.fillRect(-length/2+2,side*width*.29-4,5,8);}
      c.strokeStyle='#0f2026';c.lineWidth=2;c.beginPath();c.moveTo(length*.28,-width*.25);c.lineTo(length*.39,width*.15);c.lineTo(length*.45,0);c.stroke();c.restore();
    }else if(type==='building') {
      c.fillStyle='#394239';c.fillRect(x,y,w,h);c.strokeStyle='#61705c';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);
      c.fillStyle='#252f29';c.fillRect(x+9,y+9,w-18,h-18);c.strokeStyle='#424e41';c.lineWidth=1;c.strokeRect(x+15,y+15,w-30,h-30);
      for(let i=0;i<3;i++){c.fillStyle='#1c2521';c.fillRect(x+35+i*70,y+35,44,36);c.strokeStyle='#54604b';c.strokeRect(x+35+i*70,y+35,44,36);for(let j=0;j<4;j++){c.beginPath();c.moveTo(x+39+i*70,y+41+j*7);c.lineTo(x+74+i*70,y+41+j*7);c.stroke();}}
      c.font='10px Consolas';c.fillStyle='#82927155';c.textAlign='left';c.fillText('C-07 / БЛОК',x+25,y+h-25);
    } else if(type==='container') {
      c.fillStyle='#3b4940';c.fillRect(x,y,w,h);c.strokeStyle='#6d7b61';c.lineWidth=2;c.strokeRect(x,y,w,h);
      const vertical=h>w;for(let i=8;i<(vertical?h:w)-4;i+=12){c.fillStyle='#26372f';c.fillRect(x+(vertical?5:i),y+(vertical?i:5),vertical?w-10:3,vertical?3:h-10);c.fillStyle='#75826740';c.fillRect(x+(vertical?5:i+3),y+(vertical?i+3:5),vertical?w-10:1,vertical?1:h-10);}
      c.fillStyle='#19241d';c.fillRect(x+8,y+8,34,18);c.fillStyle='#9ea77a';c.font='8px Consolas';c.fillText('07-A',x+11,y+20);
    } else if(type==='crates') {
      c.fillStyle='#5f6247';c.fillRect(x,y,w,h);c.strokeStyle='#8a8b60';c.lineWidth=3;c.strokeRect(x+3,y+3,w-6,h-6);c.strokeStyle='#343b2d';c.lineWidth=7;c.beginPath();c.moveTo(x+7,y+7);c.lineTo(x+w-7,y+h-7);c.moveTo(x+w-7,y+7);c.lineTo(x+7,y+h-7);c.stroke();c.strokeStyle='#92966a50';c.lineWidth=2;c.strokeRect(x+12,y+12,w-24,h-24);
    } else {
      c.fillStyle='#4d5746';c.fillRect(x,y,w,h);c.strokeStyle='#7d8865';c.lineWidth=2;c.strokeRect(x+2,y+2,w-4,h-4);
      c.save();c.beginPath();c.rect(x+5,y+8,w-10,15);c.clip();c.fillStyle='#a6a372';c.fillRect(x+5,y+8,w-10,15);c.strokeStyle='#333c2c';c.lineWidth=10;for(let i=-20;i<w+20;i+=22){c.beginPath();c.moveTo(x+i,y+8);c.lineTo(x+i+15,y+23);c.stroke();}c.restore();c.fillStyle='#252f23';c.fillRect(x+10,y+35,w-20,18);
    }
  }
  function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}

mapArt(); return terrain; };
