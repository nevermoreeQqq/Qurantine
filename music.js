(typeof window!=='undefined'?window:globalThis).QuarantineMusic=function(){
  let context,master,timer,index=0,next=0,enabled=true,suspended=false,volume=.32;
  const notes=[36,36,43,39,36,46,43,39,34,34,41,38,34,44,41,38];
  function voice(time,freq,length,gain,type='sine',filter=900){const o=context.createOscillator(),g=context.createGain(),f=context.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=filter;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(f);f.connect(g);g.connect(master);o.start(time);o.stop(time+length+.02);}
  function schedule(){if(!context||!enabled||suspended)return;while(next<context.currentTime+.35){const beat=index%16,note=notes[beat],hz=440*Math.pow(2,(note-69)/12);voice(next,hz,.6,.11,'triangle',480);if(beat%4===0){voice(next,55,.2,.15);voice(next,110,.06,.06);}
    if(beat%8===0){for(const semitone of [0,7,12])voice(next,hz*Math.pow(2,semitone/12),3.1,.018,'sawtooth',550);}
    if(beat%2===1)voice(next,hz*4,.2,.02,'sine',1500);next+=.375;index++;}}
  return{start(){if(!enabled||suspended)return;try{if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=volume;master.connect(context.destination);}context.resume().catch(()=>{});if(!timer){next=context.currentTime+.08;timer=setInterval(schedule,100);schedule();}}catch{}},setEnabled(value){enabled=value;if(context){master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.08);if(enabled)this.start();else{clearInterval(timer);timer=null;}}},setSuspended(value){suspended=!!value;if(!context)return;if(suspended){clearInterval(timer);timer=null;context.suspend().catch(()=>{});}else if(enabled)this.start();},setVolume(value){volume=Math.max(0,Math.min(1,value));if(context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.05);}};
};

(function(root){
  'use strict';
  // Original sound design: no downloaded recordings or network requests.
  const profiles=Object.freeze({
    pistol:{length:.29,crack:.75,crackTime:.007,body:155,bodyTime:.032,tail:.055,cutoff:5800,metal:2450,bolt:.048,gain:.24},
    ak:{length:.35,crack:1,crackTime:.009,body:118,bodyTime:.046,tail:.08,cutoff:7600,metal:1750,bolt:.039,gain:.28},
    smg:{length:.19,crack:.64,crackTime:.005,body:205,bodyTime:.021,tail:.035,cutoff:6200,metal:3100,bolt:.026,gain:.18},
    dmr:{length:.43,crack:1.05,crackTime:.011,body:105,bodyTime:.062,tail:.1,cutoff:9000,metal:2100,bolt:.067,gain:.29},
    rifle:{length:.65,crack:1.2,crackTime:.014,body:67,bodyTime:.11,tail:.17,cutoff:7200,metal:1300,bolt:.14,gain:.34},
    shotgun:{length:.57,crack:.83,crackTime:.017,body:85,bodyTime:.075,tail:.13,cutoff:3900,metal:1550,bolt:.19,gain:.3},
    superShotgun:{length:.68,crack:1.1,crackTime:.025,body:58,bodyTime:.105,tail:.18,cutoff:3300,metal:1050,bolt:.23,gain:.34},
    hmg:{length:.32,crack:.92,crackTime:.012,body:76,bodyTime:.052,tail:.072,cutoff:4700,metal:920,bolt:.038,gain:.22},
    flame:{length:.19,kind:'flame',gain:.18},
    hammer:{length:.32,kind:'hammer',gain:.2}
  });
  function samples(weapon,sampleRate=44100,variant=0){
    const p=profiles[weapon];if(!p)return null;
    const out=new Float32Array(Math.ceil(p.length*sampleRate));
    let seed=(Object.keys(profiles).indexOf(weapon)+1)*9157+(variant+1)*3571;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
    const shift=1+(variant-1)*.017,dt=1/sampleRate;
    let low=0,bass=0,phase=0,metalPhase=0,peak=0,dc=0;
    const cutoff=p.cutoff||1600,filter=1-Math.exp(-2*Math.PI*cutoff*dt),bassFilter=1-Math.exp(-2*Math.PI*240*dt);
    for(let i=0;i<out.length;i++){
      const t=i*dt,n=random();low+=(n-low)*filter;bass+=(n-bass)*bassFilter;
      let value;
      if(p.kind==='flame'){
        // Overlapping jets have a soft onset/release rather than repeated bangs.
        const env=Math.min(1,t/.016)*Math.min(1,(p.length-t)/.055);
        value=(low*.95+bass*1.3)*(1+.1*Math.sin(t*43))*env;
      }else if(p.kind==='hammer'){
        const impact=Math.max(0,t-.057);phase+=2*Math.PI*165*dt;
        const swing=low*.2*Math.sin(Math.PI*Math.min(1,t/.08))*Math.exp(-t/.055);
        const hit=t<.057?0:(bass*2.4+low*.58+Math.sin(phase)*.14)*Math.exp(-impact/.024)*Math.min(1,impact/.001);
        value=swing+hit;
      }else{
        // Muzzle crack, low pressure thump, diffuse outdoor tail and action clack.
        phase+=2*Math.PI*p.body*shift*(1+.8*Math.exp(-t/.012))*dt;
        const onset=Math.min(1,t/.00045);
        const crack=(n-low*.42)*p.crack*Math.exp(-t/p.crackTime);
        const body=(Math.sin(phase)*.24+bass*2.3)*Math.exp(-t/p.bodyTime);
        const tail=low*.32*Math.exp(-t/p.tail)*(1-Math.exp(-t/.003));
        const m=t-p.bolt;metalPhase+=2*Math.PI*p.metal*shift*dt;
        const clack=m<0?0:(low*.2+Math.sin(metalPhase)*.055)*Math.exp(-m/.011)*Math.min(1,m/.0007);
        value=(crack+body+tail)*onset+clack;
      }
      // A DC blocker and short end taper avoid clicks and asymmetric pulses.
      dc+=.002*(value-dc);value=(value-dc)*Math.min(1,(p.length-t)/.015);
      out[i]=value;peak=Math.max(peak,Math.abs(value));
    }
    if(!p.kind){
      // Quiet, diffuse reflections retain space without an indoor echo loop.
      const direct=out.slice();for(const [delay,level]of [[.037,.075],[.073,.04],[.119,.025]]){
        const offset=Math.round(delay*sampleRate);for(let i=offset;i<out.length;i++)out[i]+=direct[i-offset]*level;
      }
      peak=out.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
    }
    const scale=.82/Math.max(.001,peak);for(let i=0;i<out.length;i++)out[i]*=scale;
    return out;
  }
  function create(context,{random=Math.random,maxVoices=24}={}){
    const cache=new Map(),voices=new Set();let enabled=true;
    const bus=context.createGain(),limiter=context.createDynamicsCompressor();bus.gain.value=.5;
    limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.002;limiter.release.value=.09;
    bus.connect(limiter);limiter.connect(context.destination);
    function buffer(weapon,variant){const key=weapon+':'+variant;if(cache.has(key))return cache.get(key);const data=samples(weapon,context.sampleRate,variant);if(!data)return null;const b=context.createBuffer(1,data.length,context.sampleRate);b.getChannelData(0).set(data);cache.set(key,b);return b;}
    function release(v){voices.delete(v);for(const n of v.nodes)n.disconnect();}
    function stopAll(){for(const v of [...voices]){v.source.stop();release(v);}}
    function play(weapon,{dx=0,dy=0,local=true,strength=1}={}){
      if(!enabled||context.state!=='running'||!profiles[weapon]||![dx,dy,strength].every(Number.isFinite))return false;
      const distance=local?0:Math.hypot(dx,dy);if(distance>=1500||strength<=0)return false;
      if(voices.size>=maxVoices){const oldest=[...voices].find(v=>!v.local)||voices.values().next().value;oldest.source.stop();release(oldest);}
      const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter(),pan=context.createStereoPanner?.();
      source.buffer=buffer(weapon,Math.min(2,Math.floor(random()*3)));source.playbackRate.value=.985+random()*.03;
      gain.gain.value=profiles[weapon].gain*Math.min(1,strength)/(1+(distance/340)**2)*Math.min(1,(1500-distance)/250);
      filter.type='lowpass';filter.frequency.value=local?18000:Math.max(1000,16000/(1+distance/250));
      source.connect(filter);filter.connect(gain);if(pan){pan.pan.value=local?0:Math.max(-.85,Math.min(.85,dx/600));gain.connect(pan);pan.connect(bus);}else gain.connect(bus);
      const v={source,local,nodes:[source,filter,gain,...(pan?[pan]:[])]};voices.add(v);source.onended=()=>release(v);source.start();return true;
    }
    return{play,stopAll,setEnabled(value){enabled=!!value;if(!enabled)stopAll();},warm(){for(const key of Object.keys(profiles))buffer(key,0);}};
  }
  const api={profiles,samples,create};root.QuarantineSFX=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
