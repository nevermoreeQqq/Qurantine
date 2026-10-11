const test=require('node:test');
const assert=require('node:assert/strict');
const {segmentRect}=require('../core.js');
const {OBSTACLES}=require('../content.js');
const {Simulation}=require('../simulation.js');

// Original slab intersection is the reference for collision and sight behavior.
function reference(x1,y1,x2,y2,box){
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[x1,x2-x1,box.x,box.x+box.w],[y1,y2-y1,box.y,box.y+box.h]]){
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return null;}
    else{const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;}
  }
  return lo;
}
test('Fast sight and bullet geometry preserves intersections, padding and wall edges',()=>{
  let seed=1701;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const game=new Simulation(random);
  for(let i=0;i<1000;i++){
    const a={x:random()*3100,y:random()*2200},b={x:random()*3100,y:random()*2200},padding=i%4*15;
    let clear=true;
    for(const o of OBSTACLES){
      const expected=reference(a.x,a.y,b.x,b.y,{x:o.x-padding,y:o.y-padding,w:o.w+padding*2,h:o.h+padding*2});
      assert.equal(segmentRect(a.x,a.y,b.x,b.y,o,padding),expected);
      if(expected!==null)clear=false;
    }
    assert.equal(game.sight(a,b,padding),clear);
  }
  const box={x:10,y:20,w:30,h:40};
  for(const ray of [[0,20,40,20],[10,0,10,60],[40,60,40,60],[10-1e-10,30,10+1e-10,30],[0,0,0,0],[20,30,20,30],[0,0,10,20],[45,30,40,30]]){
    assert.equal(segmentRect(...ray,box),reference(...ray,box));
  }
});
