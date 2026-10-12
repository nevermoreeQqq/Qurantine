window.QuarantineTerrain = function(WORLD, obstacles) {
  const {ROADS,DISTRICTS,nearbyObstacles}=GameContent;
  const SIZE=768,LIMIT=24,tiles=new Map();let scale=1;
  const overlaps=(a,b)=>a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y;
  function tile(tx,ty){
    const key=scale+':'+tx+','+ty;if(tiles.has(key)){const value=tiles.get(key);tiles.delete(key);tiles.set(key,value);return value;}
    const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;const c=canvas.getContext('2d');
    const span=SIZE*scale,x=tx*span,y=ty*span,box={x,y,w:span,h:span};c.scale(1/scale,1/scale);c.translate(-x,-y);
    c.fillStyle='#293b2c';c.fillRect(x,y,span,span);
    for(const d of DISTRICTS)if(overlaps(box,d)){c.fillStyle=({industrial:'#303a38',town:'#35403b',residential:'#394432',farm:'#4b5132',forest:'#213927'})[d.kind];c.fillRect(d.x,d.y,d.w,d.h);if(d.kind==='farm'){c.strokeStyle='#71644055';c.lineWidth=7;for(let row=d.y+900;row<d.y+d.h;row+=38){c.beginPath();c.moveTo(d.x+80,row);c.lineTo(d.x+d.w-80,row);c.stroke();}}}
    let seed=(tx*73856093^ty*19349663^731)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<520;i++){c.fillStyle=i%2?'#09180d20':'#a4af7914';c.fillRect(x+random()*span,y+random()*span,1+random()*4,1+random()*4);}
    for(const road of ROADS)if(overlaps(box,road)){
      c.fillStyle='#565b50';c.fillRect(road.x-12,road.y-12,road.w+24,road.h+24);c.fillStyle='#272e2e';c.fillRect(road.x,road.y,road.w,road.h);
      c.strokeStyle='#b5ac735e';c.lineWidth=2;c.setLineDash([22,30]);c.beginPath();
      if(road.w>road.h){c.moveTo(Math.max(x,road.x),road.y+road.h/2);c.lineTo(Math.min(x+span,road.x+road.w),road.y+road.h/2);}else{c.moveTo(road.x+road.w/2,Math.max(y,road.y));c.lineTo(road.x+road.w/2,Math.min(y+span,road.y+road.h));}c.stroke();c.setLineDash([]);
    }
    for(const o of nearbyObstacles(x-80,y-80,span+160,span+160))drawObstacle(c,o);
    c.strokeStyle='#7a877859';c.lineWidth=4;c.strokeRect(20,20,WORLD.w-40,WORLD.h-40);
    tiles.set(key,canvas);while(tiles.size>LIMIT){const first=tiles.keys().next().value;const discarded=tiles.get(first);discarded.width=discarded.height=0;tiles.delete(first);}return canvas;
  }
  function draw(c,left,top,right,bottom){
    const countAt=s=>(Math.ceil((right-left)/(SIZE*s))+1)*(Math.ceil((bottom-top)/(SIZE*s))+1);
    scale=1;while(countAt(scale)>LIMIT)scale*=2;
    const span=SIZE*scale;for(let ty=Math.max(0,Math.floor(top/span));ty<=Math.min(Math.ceil(WORLD.h/span)-1,Math.floor(bottom/span));ty++)for(let tx=Math.max(0,Math.floor(left/span));tx<=Math.min(Math.ceil(WORLD.w/span)-1,Math.floor(right/span));tx++)c.drawImage(tile(tx,ty),tx*span,ty*span,span,span);
  }
  function drawObstacle(c,o) {
    const {x,y,w,h,type}=o;c.fillStyle='#090e0b70';c.fillRect(x+11,y+13,w+3,h+3);
    if(type==='tree'){circle(c,x+w/2+8,y+h/2+8,45,'#101e1670');for(const [dx,dy,r]of[[0,0,42],[-22,7,29],[18,-18,32]]){circle(c,x+w/2+dx,y+h/2+dy,r,'#243e2a');circle(c,x+w/2+dx-6,y+h/2+dy-5,r*.7,'#345039');}return;}if(type==='car'){
      c.save();c.translate(x+w/2,y+h/2);if(h>w)c.rotate(Math.PI/2);const length=Math.max(w,h),width=Math.min(w,h);c.fillStyle='#111e23';for(const side of [-1,1])for(const wheel of [-1,1])c.fillRect(wheel*length*.29-8,side*width*.45-5,17,11);
      const paint=c.createLinearGradient(0,-width/2,0,width/2);paint.addColorStop(0,o.paint||'#6c8790');paint.addColorStop(.45,'#34464a');paint.addColorStop(1,o.paint||'#667b7b');c.fillStyle=paint;c.beginPath();c.roundRect(-length/2,-width/2,length,width,9);c.fill();c.strokeStyle='#bbcbc95c';c.lineWidth=2;c.stroke();
      c.fillStyle='#162b35';c.fillRect(-length*.18,-width*.39,length*.43,width*.78);c.fillStyle='#4a6874';c.fillRect(length*.12,-width*.34,length*.14,width*.68);c.strokeStyle='#b6c8cb';c.lineWidth=1;c.beginPath();c.moveTo(length*.2,-width*.35);c.lineTo(length*.09,0);c.lineTo(length*.22,width*.35);c.stroke();
      c.fillStyle='#242f34';c.fillRect(-length*.08,-width*.34,length*.21,width*.68);c.strokeStyle='#9da8a54c';c.strokeRect(-length*.08,-width*.34,length*.21,width*.68);
      for(const side of [-1,1]){c.fillStyle='#d9d3a0';c.fillRect(length/2-6,side*width*.27-4,5,8);c.fillStyle='#b96b55';c.fillRect(-length/2+2,side*width*.29-4,5,8);}
      c.strokeStyle='#0f2026';c.lineWidth=2;c.beginPath();c.moveTo(length*.28,-width*.25);c.lineTo(length*.39,width*.15);c.lineTo(length*.45,0);c.stroke();c.restore();
    }else if(type==='building') {
      c.fillStyle=o.roof||'#394239';c.fillRect(x,y,w,h);c.strokeStyle='#61705c';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);
      c.fillStyle=o.roof||'#252f29';c.fillRect(x+9,y+9,w-18,h-18);c.strokeStyle='#424e41';c.lineWidth=1;c.strokeRect(x+15,y+15,w-30,h-30);
      for(let i=0;i<Math.min(3,Math.floor((w-40)/70));i++){c.fillStyle='#1c2521';c.fillRect(x+35+i*70,y+35,44,36);c.strokeStyle='#54604b';c.strokeRect(x+35+i*70,y+35,44,36);for(let j=0;j<4;j++){c.beginPath();c.moveTo(x+39+i*70,y+41+j*7);c.lineTo(x+74+i*70,y+41+j*7);c.stroke();}}
      c.font='10px Consolas';c.fillStyle='#82927155';c.textAlign='left';c.fillText(o.label||'C-07 / БЛОК',x+25,y+h-25);if(o.label==='ДОМ'){c.strokeStyle='#252d2a';c.lineWidth=4;c.beginPath();c.moveTo(x+12,y+h/2);c.lineTo(x+w-12,y+h/2);c.stroke();c.fillStyle='#29302d';c.fillRect(x+w-38,y+20,18,25);}
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

  return {draw,cacheSize:()=>tiles.size,tileSize:SIZE,cacheLimit:LIMIT};
};
