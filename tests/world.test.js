const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const content=require('../content.js'),{Simulation}=require('../simulation.js'),{circleRect,segmentRect}=require('../core.js');
const {WORLD,OBSTACLES,DISTRICTS,ROADS,nearbyObstacles}=content;
test('County has sixteen times the area, eleven districts, woods and clear through-roads',()=>{
  assert.equal(WORLD.w*WORLD.h/(3000*2160),16);assert.equal(DISTRICTS.length,11);
  assert.ok(OBSTACLES.filter(o=>o.type==='tree').length>150);
  for(const o of OBSTACLES){assert.ok(o.x>=0&&o.y>=0&&o.x+o.w<WORLD.w&&o.y+o.h<WORLD.h);if(o.x>3000&&o.type==='building')assert.ok(!ROADS.some(r=>o.x<r.x+r.w&&o.x+o.w>r.x&&o.y<r.y+r.h&&o.y+o.h>r.y));}
});
test('Spatial queries preserve collision and sight throughout the county',()=>{
  const g=new Simulation(()=>.5);let seed=77;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<600;i++){const x=random()*WORLD.w,y=random()*WORLD.h,r=10+random()*40;
    assert.equal(nearbyObstacles(x-r,y-r,r*2,r*2).some(o=>circleRect(x,y,r,o)),OBSTACLES.some(o=>circleRect(x,y,r,o)));
    const b={x:Math.min(WORLD.w,x+random()*1200),y:Math.min(WORLD.h,y+random()*1200)},a={x,y};
    assert.equal(g.sight(a,b,r),!OBSTACLES.some(o=>segmentRect(x,y,b.x,b.y,o,r)!==null));
  }
});
test('Far districts have valid paths and encounters around the active player',()=>{
  const g=new Simulation();const p=g.addPlayer('solo');
  for(const position of [{x:4039,y:3359},{x:7419,y:6029},{x:10639,y:6029}]){Object.assign(p,position);assert.ok(g.valid(p.x,p.y,p.r));g.buildFlow(p);assert.ok(g.flow.some(d=>d===0));for(let i=0;i<30;i++){const e=g.spawn('walker');assert.ok(g.staticValid(e.x,e.y,e.r));const distance=Math.hypot(e.x-p.x,e.y-p.y);assert.ok(distance>=1000&&distance<=1650);g.enemies=[];}}
  for(let i=0;i<g.flowBlocked.length;i+=53){const x=(i%g.flowCols+.5)*60,y=(Math.floor(i/g.flowCols)+.5)*60;assert.equal(Boolean(g.flowBlocked[i]),!g.staticValid(x,y,48));}
});
test('Terrain renders every district with bounded tile canvases',()=>{
  const canvases=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  const root={window:{},GameContent:content,document:{createElement(){const canvas={width:0,height:0,getContext:()=>ctx};canvases.push(canvas);return canvas;}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../terrain.js'),'utf8'),root);
  const terrain=root.window.QuarantineTerrain(WORLD,OBSTACLES);
  for(const d of DISTRICTS)terrain.draw(ctx,d.x,d.y,d.x+1400,d.y+900);
  assert.ok(terrain.cacheSize()<=24);assert.ok(canvases.every(c=>c.width<=768&&c.height<=768));assert.ok(canvases.filter(c=>c.width>0).length<=24);
});

test('Stationary targets reuse their navigation field; moving to another cell rebuilds it',()=>{
  const g=new Simulation(()=>.5),p=g.addPlayer('solo');g.buildFlow(p);
  const original=g.flow,values=Array.from(original),fill=original.fill;let fills=0;
  original.fill=function(...args){fills++;return fill.apply(this,args);};
  for(let i=0;i<30;i++)g.buildFlow(p);
  assert.equal(fills,0);assert.deepEqual(Array.from(g.flow),values);
  p.y+=120;g.buildFlow(p);assert.equal(fills,1);assert.equal(g.flow,original);
  assert.ok(g.flow.some(value=>value===0));
});
test('Wide viewports keep visible terrain resident instead of regenerating it every frame',()=>{
  const canvases=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  const root={window:{},GameContent:content,document:{createElement(){const canvas={width:0,height:0,getContext:()=>ctx};canvases.push(canvas);return canvas;}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../terrain.js'),'utf8'),root);
  const terrain=root.window.QuarantineTerrain(WORLD,OBSTACLES);
  terrain.draw(ctx,2700,2300,7700,5500);const allocated=canvases.length;
  assert.ok(allocated<=24);
  for(let frame=0;frame<20;frame++)terrain.draw(ctx,2700,2300,7700,5500);
  assert.equal(canvases.length,allocated);assert.ok(terrain.cacheSize()<=24);
});

test('County generation is reproducible, seed-dependent and connects every road',()=>{
  const {generateCounty}=content,a=generateCounty(731),b=generateCounty(731),other=generateCounty(119);
  assert.deepEqual(a,b);assert.notDeepEqual(a.obstacles,other.obstacles);
  const connected=new Set([0]),queue=[0],touch=(r,s)=>r.x<=s.x+s.w&&r.x+r.w>=s.x&&r.y<=s.y+s.h&&r.y+r.h>=s.y;
  for(let head=0;head<queue.length;head++)for(let i=0;i<a.roads.length;i++)if(!connected.has(i)&&touch(a.roads[queue[head]],a.roads[i])){connected.add(i);queue.push(i);}
  assert.equal(connected.size,a.roads.length,'no disconnected street stubs');
  const shapes=new Set(a.obstacles.filter(o=>o.label==='ДОМ').map(o=>o.w+':'+o.h));assert.ok(shapes.size>20);
});
