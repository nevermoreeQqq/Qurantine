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
  for(const position of [{x:3090,y:2950},{x:6090,y:5790},{x:9090,y:5790}]){Object.assign(p,position);assert.ok(g.valid(p.x,p.y,p.r));g.buildFlow(p);assert.ok(g.flow.some(d=>d===0));for(let i=0;i<30;i++){const e=g.spawn('walker');assert.ok(g.staticValid(e.x,e.y,e.r));const distance=Math.hypot(e.x-p.x,e.y-p.y);assert.ok(distance>=1000&&distance<=1650);g.enemies=[];}}
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
