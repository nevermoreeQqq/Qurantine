const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const content=require('../content.js');
test('All enemy species and boss abilities render three variants and reuse cached textures',()=>{
  const canvases=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const root={window:{},GameContent:content,document:{createElement(){const canvas={width:0,height:0,getContext:()=>ctx};canvases.push(canvas);return canvas;}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../render.js'),'utf8'),root);const art=root.window.QuarantineArt(),enemies=[];
  for(const [type,stats]of Object.entries(content.STATS))for(let variant=0;variant<3;variant++)enemies.push({...stats,type,id:variant,x:100,y:100,angle:0,hp:stats.hp,maxHp:stats.hp,maxArmor:stats.armor||0,armor:stats.armor||0});
  for(const boss of content.BOSSES)enemies.push({...content.STATS.boss,...boss,type:'boss',id:0,x:100,y:100,angle:0,hp:1450,maxHp:1450});
  for(const e of enemies)art.enemy(ctx,e,0);const allocated=canvases.length;
  assert.equal(allocated,enemies.length);assert.ok(canvases.every(c=>c.width===144&&c.height===144));
  for(let frame=0;frame<15;frame++)for(const e of enemies)art.enemy(ctx,{...e,id:e.id+300,hit:.1,frozen:.1},frame/60);
  assert.equal(canvases.length,allocated);
});
