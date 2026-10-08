window.QuarantineMusic=function(){
  let context,master,timer,index=0,next=0,enabled=true,volume=.32;
  const notes=[36,36,43,39,36,46,43,39,34,34,41,38,34,44,41,38];
  function voice(time,freq,length,gain,type='sine',filter=900){const o=context.createOscillator(),g=context.createGain(),f=context.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=filter;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(f);f.connect(g);g.connect(master);o.start(time);o.stop(time+length+.02);}
  function schedule(){if(!context||!enabled)return;while(next<context.currentTime+.35){const beat=index%16,note=notes[beat],hz=440*Math.pow(2,(note-69)/12);voice(next,hz,.6,.11,'triangle',480);if(beat%4===0){voice(next,55,.2,.15);voice(next,110,.06,.06);}
    if(beat%8===0){for(const semitone of [0,7,12])voice(next,hz*Math.pow(2,semitone/12),3.1,.018,'sawtooth',550);}
    if(beat%2===1)voice(next,hz*4,.2,.02,'sine',1500);next+=.375;index++;}}
  return{start(){if(!enabled)return;try{if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=volume;master.connect(context.destination);}context.resume();if(!timer){next=context.currentTime+.08;timer=setInterval(schedule,100);schedule();}}catch{}},setEnabled(value){enabled=value;if(context){master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.08);if(enabled)this.start();else{clearInterval(timer);timer=null;}}},setVolume(value){volume=Math.max(0,Math.min(1,value));if(context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.05);}};
};
