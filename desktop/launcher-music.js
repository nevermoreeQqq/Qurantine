/* Original melodies: retro adventure instruments, minor harmony and a ruined-city atmosphere. */
(function(){
  const TRACKS=[
    {name:'Пепельный рассвет',bpm:104,root:50,chords:[0,-3,5,-5],lead:[12,15,19,17,15,12,10,7,12,19,22,19,17,15,14,10],wave:'triangle',cutoff:2500},
    {name:'Огни кордона',bpm:94,root:45,chords:[0,5,-3,-5],lead:[19,17,12,15,10,12,7,10,15,19,22,20,19,15,12,10],wave:'sine',cutoff:3200},
    {name:'Последний форпост',bpm:116,root:48,chords:[0,-5,-3,5],lead:[12,12,19,15,17,19,22,19,15,17,12,10,7,10,14,12],wave:'square',cutoff:1400},
    {name:'Ночная смена',bpm:86,root:50,chords:[0,-3,-5,5],lead:[24,22,19,17,19,15,12,10,19,22,24,26,22,19,17,14],wave:'sine',cutoff:1900}
  ];
  const noiseBuffers=new WeakMap();
  const hz=midi=>440*2**((midi-69)/12);
  function tone(ctx,bus,time,note,length,level,type='triangle',cutoff=1800,pan=0,active){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),stereo=ctx.createStereoPanner();
    osc.type=type;osc.frequency.value=hz(note);filter.type='lowpass';filter.frequency.value=cutoff;stereo.pan.value=pan;
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+Math.min(.025,length/5));gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(bus);osc.start(time);osc.stop(time+length+.02);active?.add(osc);
    osc.onended=()=>{active?.delete(osc);osc.disconnect();gain.disconnect();filter.disconnect();stereo.disconnect();};
  }
  function beat(ctx,bus,time,strong){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(strong?95:64,time);osc.frequency.exponentialRampToValueAtTime(32,time+.14);
    gain.gain.setValueAtTime(strong?.11:.065,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.22);osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+.24);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function hat(ctx,bus,time,level=.012){
    let buffer=noiseBuffers.get(ctx);if(!buffer){buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.12),ctx.sampleRate);const data=buffer.getChannelData(0);let seed=72613;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/4294967296)*2-1;}noiseBuffers.set(ctx,buffer);}
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='highpass';filter.frequency.value=5800;gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.08);source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(time);source.stop(time+.1);source.onended=()=>{source.disconnect();gain.disconnect();filter.disconnect();};
  }
  function compose(ctx,bus,track,step,time,active){
    const duration=60/track.bpm/2,bar=step%32,chord=track.root+track.chords[Math.floor(step/32)%track.chords.length];
    if(bar===0)for(const [interval,pan] of [[0,-.35],[7,.35],[12,0]])tone(ctx,bus,time,chord+interval,duration*29,.018,'triangle',550,pan,active);
    if(step%4===0){tone(ctx,bus,time,chord-12,duration*2.7,.105,'triangle',550,0,active);beat(ctx,bus,time,step%8===0);}
    if(step%2===1)hat(ctx,bus,time,track.wave==='square'?.015:.009);
    const arpeggio=[0,7,12,15,19,15,12,7];tone(ctx,bus,time,chord+12+arpeggio[step%8],duration*.72,.034,'triangle',track.cutoff,step%2?-.42:.42,active);
    if(step%2===0){const note=track.root+track.lead[Math.floor(step/2)%track.lead.length]+(Math.floor(step/64)%2?0:-12);tone(ctx,bus,time,note,duration*1.65,track.wave==='square'?.042:.095,track.wave,track.cutoff,-.05,active);if(track.wave==='sine')tone(ctx,bus,time,note+12,duration*.85,.021,'sine',4000,.25,active);}
  }
  async function previewTrack(index=0,seconds=8){
    const duration=Math.max(1,Math.min(90,seconds)),ctx=new window.OfflineAudioContext(2,Math.ceil(duration*44100),44100),bus=ctx.createGain(),track=TRACKS[index%TRACKS.length];bus.gain.value=.65;bus.connect(ctx.destination);
    const tick=60/track.bpm/2;for(let step=0,time=.04;time<duration;step++,time+=tick)compose(ctx,bus,track,step,time);
    return ctx.startRendering();
  }
  window.LauncherMusic=function(){
    let context,musicBus,fxBus,timer,next=0,step=0,index=0,enabled=true,effectsEnabled=true,volume=.35,listener=()=>{};
    const active=new Set();
    function init(){if(context&&context.state!=='closed')return;context=new(window.AudioContext||window.webkitAudioContext)();musicBus=context.createGain();fxBus=context.createGain();musicBus.gain.value=enabled?volume:0;fxBus.gain.value=effectsEnabled?.5:0;const compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=3;musicBus.connect(compressor);fxBus.connect(compressor);compressor.connect(context.destination);}
    function changed(){listener({name:TRACKS[index].name,index,duration:256*60/TRACKS[index].bpm/2});}
    function advance(){index=(index+1)%TRACKS.length;step=0;changed();}
    function schedule(){if(!context||context.state!=='running'||!enabled)return;while(next<context.currentTime+.35){const track=TRACKS[index];compose(context,musicBus,track,step,next,active);next+=60/track.bpm/2;if(++step>=256)advance();}}
    async function sound(checked,click=false){if(!effectsEnabled)return;try{init();await context.resume();if(context.state!=='running')return;const time=context.currentTime+.006;tone(context,fxBus,time,checked?79:69,.055,click?.065:.16,'triangle',4400);if(!click)tone(context,fxBus,time+.025,checked?86:64,.07,.095,'sine',5000);}catch{}}
    return{
      async start(){if(!enabled)return false;try{init();await context.resume();if(context.state!=='running')return false;if(!timer){next=context.currentTime+.04;timer=setInterval(schedule,80);schedule();}return true;}catch{return false;}},
      configure(value,level){enabled=!!value;volume=Math.max(0,Math.min(1,level));if(context)musicBus.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.09);if(!enabled){clearInterval(timer);timer=null;}},
      effects(value){effectsEnabled=!!value;if(context)fxBus.gain.setTargetAtTime(effectsEnabled?.5:0,context.currentTime,.025);},
      toggleSound:checked=>sound(checked),clickSound:()=>sound(true,true),
      track:()=>({name:TRACKS[index].name,index,duration:256*60/TRACKS[index].bpm/2}),
      onTrackChange(callback){listener=callback;changed();},
      nextTrack(){if(context){for(const osc of active)try{osc.stop(context.currentTime+.03);}catch{}active.clear();next=context.currentTime+.08;}advance();if(timer)schedule();},
      previewTrack,
      info:()=>({playing:!!timer,context:context?.state||'idle',effects:effectsEnabled,index}),
      stop(){clearInterval(timer);timer=null;const closing=context;context=null;active.clear();closing?.close().catch(()=>{});}
    };
  };
})();
