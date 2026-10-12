window.QuarantineTerrain = function(WORLD, obstacles) {
  const {ROADS,DISTRICTS,nearbyObstacles}=GameContent;
  const SIZE=768,LIMIT=24,tiles=new Map();let scale=1;
  const overlaps=(a,b)=>a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y;
  function tile(tx,ty){
    const key=scale+':'+tx+','+ty;if(tiles.has(key)){const value=tiles.get(key);tiles.delete(key);tiles.set(key,value);return value;}
    const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;const c=canvas.getContext('2d');
    const span=SIZE*scale,x=tx*span,y=ty*span,box={x,y,w:span,h:span};c.scale(1/scale,1/scale);c.translate(-x,-y);
    c.fillStyle='#415347';c.fillRect(x,y,span,span);
    for(const d of DISTRICTS)if(overlaps(box,d)){if(d.kind==='farm'){c.fillStyle='#4b5132';c.fillRect(d.x,d.y,d.w,d.h);}if(d.kind==='farm'){c.strokeStyle='#71644055';c.lineWidth=7;for(let row=d.y+900;row<d.y+d.h;row+=38){c.beginPath();c.moveTo(d.x+80,row);c.lineTo(d.x+d.w-80,row);c.stroke();}}}
    let seed=(tx*73856093^ty*19349663^731)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<520;i++){c.fillStyle=i%2?'#09180d20':'#a4af7914';c.fillRect(x+random()*span,y+random()*span,1+random()*4,1+random()*4);}
    // Small grass and gravel clusters are baked into each tile once.
    for(let i=0;i<105;i++){const gx=x+random()*span,gy=y+random()*span;c.strokeStyle=i%4?'#79815b38':'#b3af8e20';c.lineWidth=1;c.beginPath();c.moveTo(gx-3,gy+2);c.lineTo(gx,gy-5);c.lineTo(gx+2,gy+1);c.stroke();}
    const visibleRoads=ROADS.filter(road=>overlaps(box,road));
    // Curbs first, asphalt second: crossings stay continuous and clean.
    for(const road of visibleRoads){c.fillStyle='#62685a';c.beginPath();c.roundRect(road.x-10,road.y-10,road.w+20,road.h+20,14);c.fill();}
    for(const road of visibleRoads){c.fillStyle='#454b48';c.beginPath();c.roundRect(road.x,road.y,road.w,road.h,8);c.fill();}
    for(const road of visibleRoads){if(road.local)continue;c.strokeStyle='#b5ac735e';c.lineWidth=2;c.setLineDash([22,30]);c.beginPath();
      if(road.w>road.h){c.moveTo(Math.max(x,road.x+18),road.y+road.h/2);c.lineTo(Math.min(x+span,road.x+road.w-18),road.y+road.h/2);}else{c.moveTo(road.x+road.w/2,Math.max(y,road.y+18));c.lineTo(road.x+road.w/2,Math.min(y+span,road.y+road.h-18));}c.stroke();c.setLineDash([]);
    }
    for(const road of visibleRoads){c.save();c.beginPath();c.roundRect(road.x,road.y,road.w,road.h,8);c.clip();
      for(let i=0;i<18;i++){const px=road.w>road.h?x+random()*span:road.x+random()*road.w,py=road.w>road.h?road.y+random()*road.h:y+random()*span;
        c.strokeStyle='#10191838';c.lineWidth=1;c.beginPath();c.moveTo(px-12,py-8);c.lineTo(px,py-2);c.lineTo(px+7,py+9);c.stroke();c.fillStyle='#87918312';c.fillRect(px-4,py-1,18,2);
      }c.restore();
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
  function drawObstacle(c,o){
    const {x,y,w,h,type}=o;
    const stroke='#24302bb0',line=1;
    const rect=(rx,ry,rw,rh,fill)=>{c.fillStyle=fill;c.fillRect(rx,ry,rw,rh);};
    const path=(pts,fill,edge=stroke)=>{c.fillStyle=fill;c.strokeStyle=edge;c.lineWidth=line;c.beginPath();pts.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fill();c.stroke();};
    let seed=(Math.imul(Math.round(x),31)^Math.imul(Math.round(y),17))>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    if(type==='tree'){
      const r=o.canopy||40,cx=x+w/2,cy=y+h/2;c.save();c.translate(cx,cy);c.fillStyle='#0c181a50';c.beginPath();c.ellipse(12,16,r*1.2,r*.7,-.35,0,Math.PI*2);c.fill();
      const points=Array.from({length:14},(_,i)=>{const a=i*Math.PI/7,rr=r*(.79+random()*.22);return[Math.cos(a)*rr,Math.sin(a)*rr];});
      const fill='#365044';path(points,fill);
      {for(let i=0;i<23;i++){const a=i*2.399,rad=r*Math.sqrt(random())*.8;c.fillStyle=i%3?'#8b9b6727':'#192f285c';c.beginPath();c.ellipse(Math.cos(a)*rad-4,Math.sin(a)*rad-5,4+random()*6,3+random()*5,a,0,Math.PI*2);c.fill();}}
      c.restore();return;
    }
    rect(x+9,y+11,w+5,h+5,'#08131665');
    if(type==='building'){
      const house=o.label==='ДОМ',front=o.front||1,roof=o.roof||'#7e7b6b';
      if(o.label==='ДОМ'){rect(x+w*.36,front<0?y+h:y-48,w*.28,48,'#9b9880');for(let row=0;row<4;row++)rect(x+w*.36,front<0?y+h+row*12:y-48+row*12,w*.28,1,'#4f57483d');}
      rect(x,y+h-4,w,12,'#454f48');rect(x+4,y+4,w-8,h-8,roof);
      if(house){
        const vertical=o.roofStyle%2;
        if(vertical){path([[x-4,y-4],[x+w/2,y+10],[x+w/2,y+h-10],[x-4,y+h+4]],roof);path([[x+w/2,y+10],[x+w+4,y-4],[x+w+4,y+h+4],[x+w/2,y+h-10]],'#555d50');}
        else{path([[x-4,y-4],[x+w+4,y-4],[x+w-8,y+h/2],[x+8,y+h/2]],roof);path([[x+8,y+h/2],[x+w-8,y+h/2],[x+w+4,y+h+4],[x-4,y+h+4]],'#555d50');}
        c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.strokeStyle='#25352e48';c.lineWidth=1;
        for(let row=0;row<(vertical?w:h);row+=9){c.beginPath();if(vertical){c.moveTo(x+row,y);c.lineTo(x+row,y+h);}else{c.moveTo(x,y+row);c.lineTo(x+w,y+row);}c.stroke();}
        for(let i=0;i<80;i++)rect(x+random()*w,y+random()*h,1+random()*2,1,'#d8c9a023');c.restore();
        rect(x+w*.68,y+h*.25,14,21,'#343b34');rect(x+w*.68-1,y+h*.25-1,14,4,'#a6a58b');
        rect(x+14,y+h-3,25,5,'#202e2f');rect(x+17,y+h-2,19,2,'#bac2aa66');rect(x+w-41,y+h-3,25,5,'#202e2f');
      }else{
        path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],roof);rect(x+8,y+8,w-16,h-16,'#6b7067');
        for(let col=x+20;col<x+w-10;col+=38){rect(col,y+9,1,h-18,'#bfc5b22b');rect(col+2,y+9,1,h-18,'#343e343d');}
        const vents=Math.min(4,Math.max(1,Math.floor(w/95)));for(let i=0;i<vents;i++){const vx=x+24+i*75,vy=y+25;rect(vx+3,vy+4,45,34,'#1a292a55');rect(vx,vy,42,28,'#414e4b');rect(vx+3,vy+3,36,22,'#88928a');for(let slat=0;slat<4;slat++)rect(vx+6,vy+6+slat*4,30,1,'#253632');}
        rect(x+w-40,y+h-30,19,19,'#303e3c');c.strokeStyle='#c5c5a463';c.lineWidth=1;c.strokeRect(x+w-38,y+h-28,15,15);
      }
      c.strokeStyle='#bec3a966';c.lineWidth=2;c.strokeRect(x,y,w,h);
      return;
    }
    if(type==='car'){
      c.save();c.translate(x+w/2,y+h/2);if(h>w)c.rotate(Math.PI/2);const len=Math.max(w,h),width=Math.min(w,h);for(const side of [-1,1])for(const end of [-1,1])rect(end*len*.3-8,side*width*.45-5,16,10,'#172325');
      c.fillStyle=o.paint||'#708884';c.strokeStyle=stroke;c.lineWidth=line;c.beginPath();c.roundRect(-len/2,-width/2,len,width,8);c.fill();c.stroke();
      rect(-len*.08,-width*.4,len*.3,width*.8,'#4d6468');path([[len*.22,-width*.38],[len*.37,-width*.25],[len*.37,width*.25],[len*.22,width*.38]],'#adc0b34f');
      rect(-len*.24,-width*.38,len*.13,width*.76,'#31454b');rect(-len*.04,-width*.33,len*.2,width*.66,'#76837b');for(const side of [-1,1]){rect(len/2-5,side*width*.3-3,3,6,'#dac9a0');rect(-len/2+2,side*width*.3-3,3,6,'#935e46');}c.restore();return;
    }
    if(type==='container'){
      path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#747e6a');for(let stripe=8;stripe<(w>h?w:h)-4;stripe+=10){if(w>h){rect(x+stripe,y+4,3,h-8,'#263c3455');rect(x+stripe+3,y+4,1,h-8,'#d3cead4d');}else{rect(x+4,y+stripe,w-8,3,'#263c3455');rect(x+4,y+stripe+3,w-8,1,'#d3cead4d');}}rect(x+9,y+9,27,15,'#2c3b34');for(let i=0;i<6;i++)rect(x+8+random()*(w-16),y+8+random()*(h-16),6,2,'#9b775c88');return;
    }
    path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'#85795e');for(let row=4;row<h-3;row+=13){rect(x+4,y+row,w-8,1,'#342f264d');rect(x+5,y+row+1,w-10,1,'#dbce9a33');}rect(x+5,y+5,7,h-10,'#a29470');rect(x+w-12,y+5,7,h-10,'#a29470');c.strokeStyle='#544932';c.lineWidth=5;c.beginPath();c.moveTo(x+12,y+8);c.lineTo(x+w-12,y+h-8);c.stroke();
  }
  function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}

  return {draw,cacheSize:()=>tiles.size,tileSize:SIZE,cacheLimit:LIMIT};
};
