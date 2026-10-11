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
      assert.ok(peak<=.821&&peak>.5);assert.ok(energy/data.length>.0001);
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
