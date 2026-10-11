const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {WEAPONS}=require('../content.js');
const SFX=require('../music.js');

test('Every weapon has distinct, finite, unclipped audio at desktop and web sample rates',()=>{
  assert.deepEqual(Object.keys(SFX.profiles).sort(),Object.keys(WEAPONS).sort());
  for(const rate of [44100,48000]){
    const hashes=new Set();
    for(const key of Object.keys(WEAPONS))for(let variant=0;variant<3;variant++){
      const data=SFX.samples(key,rate,variant);let peak=0,energy=0;
      for(const value of data){assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));energy+=value*value;}
      assert.ok(peak<=.731&&peak>.1);assert.ok(energy/data.length>.0001);
      assert.ok(Math.abs(data[0])<.001&&Math.abs(data.at(-1))<.01,'Click-free endpoints');
      hashes.add(createHash('sha256').update(Buffer.from(data.buffer)).digest('hex'));
    }
    assert.equal(hashes.size,Object.keys(WEAPONS).length*3);
  }
});

function context(){
  const result={sampleRate:48000,currentTime:0,state:'running',destination:{},buffers:0,sources:[],gains:[],pans:[]};
  const node=()=>({connect(){},disconnect(){}});
  const param=()=>({value:0});
  result.createGain=()=>{const n={...node(),gain:param()};result.gains.push(n);return n;};
  result.createDynamicsCompressor=()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  result.createBiquadFilter=()=>({...node(),frequency:param()});
  result.createStereoPanner=()=>{const n={...node(),pan:param()};result.pans.push(n);return n;};
  result.createBuffer=(channels,n,rate)=>{result.buffers++;const data=new Float32Array(n);return{getChannelData:()=>data};};
  result.createBufferSource=()=>{const n={...node(),playbackRate:param(),stopped:false,start(){},stop(){this.stopped=true;}};result.sources.push(n);return n;};
  return result;
}

test('Rapid automatic fire reuses buffers and bounds simultaneous voices',()=>{
  const ctx=context(),audio=SFX.create(ctx,{random:()=>.5,maxVoices:8});audio.warm();
  const warmed=ctx.buffers;
  for(let i=0;i<200;i++)assert.equal(audio.play('hmg'),true);
  assert.equal(ctx.buffers,warmed+1);assert.equal(ctx.sources.filter(s=>!s.stopped).length,8);
  audio.setEnabled(false);assert.equal(ctx.sources.filter(s=>!s.stopped).length,0);
  assert.equal(audio.play('pistol'),false);audio.setEnabled(true);assert.equal(audio.play('pistol'),true);
  ctx.sources.at(-1).onended();audio.stopAll();
});

test('Remote shots attenuate, pan and respect pause without muting local weapons',()=>{
  const ctx=context(),audio=SFX.create(ctx,{random:()=>0});
  audio.play('ak');const local=ctx.gains.at(-1).gain.value;assert.equal(ctx.pans.at(-1).pan.value,0);
  audio.play('ak',{local:false,dx:600,dy:0});assert.ok(ctx.gains.at(-1).gain.value<local/3);assert.ok(ctx.pans.at(-1).pan.value>0);
  audio.play('ak',{local:false,dx:-600,dy:0});assert.ok(ctx.pans.at(-1).pan.value<0);
  const count=ctx.sources.length;assert.equal(audio.play('ak',{local:false,dx:1600}),false);
  assert.equal(audio.play('unknown'),false);assert.equal(audio.play('ak',{dx:NaN}),false);
  ctx.state='suspended';assert.equal(audio.play('ak'),false);assert.equal(ctx.sources.length,count);
});

test('Voice limit drops a remote tail before a local shot, and supports browsers without stereo panners',()=>{
  const ctx=context();delete ctx.createStereoPanner;const audio=SFX.create(ctx,{maxVoices:2});
  audio.play('rifle');audio.play('ak',{local:false,dx:500});audio.play('pistol');
  assert.equal(ctx.sources[0].stopped,false);assert.equal(ctx.sources[1].stopped,true);assert.equal(ctx.sources[2].stopped,false);
});


test('Gun reports use eight different recordings and keep the effects bus quiet',()=>{
  assert.equal(Object.keys(SFX.sources).length,8);assert.equal(new Set(Object.values(SFX.sources)).size,8);
  assert.match(SFX.sources.ak,/AK-47/);
  const ctx=context(),audio=SFX.create(ctx);
  assert.equal(ctx.gains[0].gain.value,.5);
  for(const key of Object.keys(SFX.profiles)){audio.play(key);assert.ok(ctx.gains.at(-1).gain.value<=.32);}
  audio.stopAll();
});

test('All four approved grenade effects remain distinct, quiet and click-free at web and desktop rates',()=>{
  const kinds=Object.keys(require('../content.js').GRENADES);
  assert.deepEqual(Object.keys(SFX.grenadeProfiles).sort(),kinds.map(k=>'grenade:'+k).sort());
  for(const rate of [24000,44100,48000]){
    const hashes=new Set();
    for(const kind of kinds){
      const key='grenade:'+kind,data=SFX.samples(key,rate);let peak=0,energy=0;
      for(const n of data){assert.ok(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));energy+=n*n;}
      assert.ok(peak>.15&&peak<=.321);assert.ok(energy>1);
      assert.ok(Math.abs(data[0])<.001&&Math.abs(data.at(-1))<.001);
      assert.equal(data.length,Math.ceil(SFX.grenadeProfiles[key].length*rate));
      hashes.add(createHash('sha256').update(Buffer.from(data.buffer)).digest('hex'));
    }
    assert.equal(hashes.size,4);
  }
});

test('Grenade playback caches the approved variant and obeys distance, muting, pause and voice limits',()=>{
  const ctx=context(),audio=SFX.create(ctx,{random:()=>.5,maxVoices:3});audio.warm();const warmed=ctx.buffers;
  audio.playGrenade('frag');const near=ctx.gains.at(-1).gain.value;
  audio.playGrenade('frag',{local:false,dx:-600,dy:0});assert.ok(ctx.gains.at(-1).gain.value<near/3);assert.ok(ctx.pans.at(-1).pan.value<0);
  for(let i=0;i<20;i++)audio.playGrenade('molotov');
  assert.equal(ctx.buffers,warmed);assert.equal(ctx.sources.filter(s=>!s.stopped).length,3);
  assert.equal(ctx.sources.at(-1).playbackRate.value,1);
  assert.equal(audio.playGrenade('mine'),false);assert.equal(audio.playGrenade('frag',{local:false,dx:1600}),false);
  audio.setEnabled(false);assert.equal(ctx.sources.filter(s=>!s.stopped).length,0);assert.equal(audio.playGrenade('flash'),false);
  audio.setEnabled(true);ctx.state='suspended';assert.equal(audio.playGrenade('shock'),false);
});
