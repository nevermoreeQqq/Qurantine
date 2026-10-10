const {app}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
process.argv.push('--launcher-review');
const output=path.resolve(__dirname,'../diagnostics/launcher-rework');fs.mkdirSync(output,{recursive:true});
app.on('browser-window-created',(_,window)=>{
  window.webContents.setAudioMuted(true);const errors=[];
  window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  const execute=async code=>{try{return await window.webContents.executeJavaScript(code,true);}catch(error){console.error('REVIEW_SCRIPT_FAILED',code.slice(0,250),errors);throw error;}};
  async function settled(){await execute('(async()=>{for(let i=0;i<120;i++){if(state&&settings&&document.querySelectorAll("#release-news article").length>=6)return;await new Promise(r=>setTimeout(r,20));}throw Error("Launcher did not load");})()');}
  async function screenshot(name){await execute('document.getAnimations().forEach(a=>{if(a.effect.getComputedTiming().iterations!==Infinity)a.finish();});undefined');await execute('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.writeFileSync(path.join(output,name+'.png'),(await window.webContents.capturePage()).toPNG());}
  async function reload(){const loaded=new Promise(r=>window.webContents.once('did-finish-load',r));window.webContents.reload();await loaded;await settled();}
  window.webContents.once('did-finish-load',async()=>{try{
    await settled();await execute('localStorage.removeItem(NEWS_KEY);undefined');await reload();await screenshot('home');
    const archive=await execute('Array.from(document.querySelectorAll("#release-news article"),a=>a.dataset.version)');assert.deepEqual(archive,['6.0.0','5.0.0','4.0.0','3.0.0','2.0.0','1.0.0']);
    const initial=await execute('({cache:localStorage.getItem(NEWS_KEY),icon:document.querySelector(".brand-mark img").naturalWidth,summary:document.getElementById("latest-summary-version").textContent,summaryBottom:document.querySelector(".latest-summary").getBoundingClientRect().bottom,playTop:document.getElementById("play").getBoundingClientRect().top})');assert.equal(initial.icon,512);assert.ok(initial.summary.includes('6.0.4'));assert.ok(initial.summaryBottom<=initial.playTop);
    await execute('showPage("news");undefined');await screenshot('news');
    await execute('archiveNews([{version:"8.0.0",title:"Saved release",notes:"Persistent archive"}]);state.news=[];renderNews();undefined');await reload();assert.ok(await execute('Array.from(document.querySelectorAll("#release-news article"),a=>a.dataset.version).includes("8.0.0")'));
    await execute('localStorage.setItem(NEWS_KEY,'+JSON.stringify(initial.cache)+');undefined');await reload();
    await execute('music.configure(false,.3);music.effects(true);document.getElementById("open-settings").click();const p=AudioContext.prototype,o=p.createOscillator;window.__clickOscillators=0;p.createOscillator=function(){window.__clickOscillators++;return o.call(this);};document.getElementById("game-effects").click();undefined');
    await new Promise(r=>setTimeout(r,120));const audible=await execute('({oscillators:window.__clickOscillators,...music.info()})');assert.ok(audible.oscillators>=2);assert.equal(audible.context,'running');assert.equal(audible.playing,false);
    await execute('document.getElementById("launcher-effects").checked=false;document.getElementById("launcher-effects").dispatchEvent(new Event("change"));undefined');const count=await execute('window.__clickOscillators');await execute('document.getElementById("game-effects").click();undefined');await new Promise(r=>setTimeout(r,80));assert.equal(await execute('window.__clickOscillators'),count);
    await screenshot('settings');
    await execute('document.getElementById("memory").value="512";document.getElementById("launcher-music").checked=false;document.getElementById("launcher-effects").checked=true;document.getElementById("game-effects").checked=false;document.getElementById("game-volume").value=17;document.getElementById("settings-form").requestSubmit();undefined');
    const saved=await execute('(async()=>{for(let i=0;i<120;i++){if(!document.getElementById("settings-dialog").open)return window.quarantineDesktop.settings();await new Promise(r=>setTimeout(r,20));}throw Error("Save did not close the dialog");})()');assert.equal(saved.memoryMB,512);assert.equal(saved.launcherEffects,true);assert.equal(saved.gameEffects,false);
    const afterReload=await execute('window.quarantineDesktop.settings()');assert.equal(afterReload.launcherEffects,true);
    const hashes=[];
    for(let index=0;index<4;index++){
      const sound=await execute('(async()=>{const b=await music.previewTrack('+index+',8),channels=b.numberOfChannels,frames=b.length,bytes=new ArrayBuffer(44+frames*channels*2),d=new DataView(bytes);const str=(off,s)=>{for(let i=0;i<s.length;i++)d.setUint8(off+i,s.charCodeAt(i));};str(0,"RIFF");d.setUint32(4,bytes.byteLength-8,true);str(8,"WAVE");str(12,"fmt ");d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,channels,true);d.setUint32(24,b.sampleRate,true);d.setUint32(28,b.sampleRate*channels*2,true);d.setUint16(32,channels*2,true);d.setUint16(34,16,true);str(36,"data");d.setUint32(40,bytes.byteLength-44,true);let total=0;for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){const value=b.getChannelData(c)[i];total+=value*value;d.setInt16(44+(i*channels+c)*2,Math.max(-1,Math.min(1,value))*32767,true);}let result="";const data=new Uint8Array(bytes);for(let i=0;i<data.length;i+=8192)result+=String.fromCharCode(...data.subarray(i,i+8192));return{data:btoa(result),rms:Math.sqrt(total/(frames*channels))};})()');assert.ok(sound.rms>.01);const bytes=Buffer.from(sound.data,'base64');fs.writeFileSync(path.join(output,'track-'+(index+1)+'.wav'),bytes);hashes.push(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(new Set(hashes).size,4);
    await execute('(async()=>{music.configure(true,.15);music.effects(true);musicPlaying=await music.start();musicLabel();})()');const names=[];for(let i=0;i<4;i++){names.push(await execute('music.track().name'));await execute('document.getElementById("next-track").click();undefined');}assert.equal(new Set(names).size,4);
    const duration=await execute('music.track().duration');console.log('LAUNCHER_AUDIO_WAIT',JSON.stringify({tracks:names,seconds:duration}));
    await new Promise(r=>setTimeout(r,(duration+.6)*1000));const automatic=await execute('({index:music.track().index,label:document.getElementById("music-label").textContent})');assert.equal(automatic.index,1);assert.ok(automatic.label.includes(names[1]));await execute('music.configure(false,.15);showPage("home");undefined');
    window.setSize(1024,720);const layout=await execute('({horizontal:document.documentElement.scrollWidth>innerWidth,playBottom:document.getElementById("play").getBoundingClientRect().bottom,height:innerHeight})');assert.equal(layout.horizontal,false);assert.ok(layout.playBottom<layout.height);await screenshot('compact');
    await execute('showPage("versions");undefined');await screenshot('versions');
    const loaded=new Promise(r=>window.webContents.once('did-finish-load',r));await execute('void window.quarantineDesktop.play()');await loaded;const preferences=await execute('JSON.parse(localStorage.getItem("quarantine-audio-v3"))');assert.equal(preferences.effects,false);assert.equal(preferences.volume,.17);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({archive,initial,saved,audible,tracks:names,automatic,layout,preferences,errors},null,2));console.log('LAUNCHER_REWORK_UI_OK',output);app.quit();
  }catch(error){console.error(error);app.exit(1);}});
});
require('./main.cjs');setTimeout(()=>{console.error('Launcher review timeout');app.exit(1);},150000).unref();
