(function(root){
  'use strict';
  const S=typeof module!=='undefined'&&module.exports?require('./simulation.js'):root.GameSimulation;
  const STEP=1/60;
  class Predictor{
    constructor(){this.reset();}
    reset(){this.player=null;this.pending=[];this.seq=0;this.error={x:0,y:0};}
    reconcile(player,barriers){
      if(!player)return;const old=this.player,wasAlive=old?.hp>0;
      this.pending=this.pending.filter(f=>f.seq>(player.ack||0));
      this.player={...player};
      if(player.hp>0)for(const f of this.pending)S.movePlayer(this.player,f,STEP,barriers);
      // Aim is owned by the local mouse. An older snapshot must never rewind it.
      if(player.hp>0)this.player.angle=this.pending.at(-1)?.angle??old?.angle??player.angle;
      if(old&&wasAlive&&player.hp>0){const dx=old.x-this.player.x,dy=old.y-this.player.y;if(Math.hypot(dx,dy)<80){this.error.x+=dx;this.error.y+=dy;}else this.error={x:0,y:0};}else this.error={x:0,y:0};
    }
    step(input,barriers){
      if(!this.player||this.pending.length>=120)return null;
      const f={...input,seq:++this.seq};this.pending.push(f);
      S.movePlayer(this.player,f,STEP,barriers);this.player.angle=f.angle;return f;
    }
    visual(dt){if(!this.player)return null;const decay=Math.exp(-dt*18);this.error.x*=decay;this.error.y*=decay;return{...this.player,x:this.player.x+this.error.x,y:this.player.y+this.error.y};}
  }
  class Timeline{
    constructor(delay=.09){this.delay=delay;this.reset();}
    reset(){this.samples=[];this.offset=null;this.lastTime=-Infinity;}
    push(snapshot,now){
      const time=snapshot.serverTime;if(!Number.isFinite(time))return;
      if(this.samples.length&&snapshot.round!==this.samples.at(-1).round)this.reset();
      if(this.samples.length&&time<this.samples.at(-1).serverTime)return;
      const offset=now-time;
      // Follow the lowest observed transport delay; a late packet must not rewind the world.
      this.offset=this.offset===null?offset:Math.min(offset,this.offset+.0005);
      if(this.samples.at(-1)?.serverTime===time)this.samples.pop();
      this.samples.push(snapshot);while(this.samples.length>45)this.samples.shift();
    }
    render(now){
      if(!this.samples.length)return null;
      const time=Math.max(this.lastTime,now-this.offset-this.delay);this.lastTime=time;
      let a=this.samples[0],b=null;for(const s of this.samples){if(s.serverTime<=time)a=s;else{b=s;break;}}
      const dt=Math.max(0,Math.min(.1,time-a.serverTime)),alpha=b?Math.min(1,dt/(b.serverTime-a.serverTime||1)):0;
      const entities=key=>{const next=new Map((b?.[key]||[]).map(e=>[e.id,e]));return a[key].map(e=>{const n=next.get(e.id);if(n){const p={...e,x:e.x+(n.x-e.x)*alpha,y:e.y+(n.y-e.y)*alpha};if(Number.isFinite(e.angle)&&Number.isFinite(n.angle))p.angle=e.angle+Math.atan2(Math.sin(n.angle-e.angle),Math.cos(n.angle-e.angle))*alpha;for(const field of ['step','swing','recoil','age','windup','jump','hit','reload'])if(Number.isFinite(e[field])&&Number.isFinite(n[field]))p[field]=e[field]+(n[field]-e[field])*alpha;return p;}if(key==='bullets')return{...e,x:e.x+e.vx*Math.min(dt,e.life),y:e.y+e.vy*Math.min(dt,e.life)};return e;});};
      return{...a,players:entities('players'),enemies:entities('enemies'),bullets:entities('bullets').filter(e=>e.life>dt),grenades:entities('grenades')};
    }
  }
  const api={Predictor,Timeline,STEP};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameNet=api;
})(typeof window!=='undefined'?window:globalThis);
