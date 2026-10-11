// Exercise the actual sandboxed preload, disk storage and native fullscreen window.
const {app}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
process.argv.push('--launcher-review');
const stage=process.argv.includes('--verify-restart')?2:1;
const output=path.resolve(__dirname,'../diagnostics/game-settings');fs.mkdirSync(output,{recursive:true});
const blocker=http.createServer((req,res)=>res.end('port occupied'));
if(stage===2)blocker.listen(5173,'0.0.0.0');
app.on('browser-window-created',(_,window)=>{
  window.webContents.setAudioMuted(true);
  const execute=code=>window.webContents.executeJavaScript(code,true);
  const wait=async code=>{for(let i=0;i<100;i++){if(await execute(code))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+code);};
  window.webContents.once('did-finish-load',async()=>{try{
    await execute('window.quarantineDesktop.play();undefined');await wait('!!document.querySelector("#effects-volume")&&typeof GameContent!=="undefined"');
    if(stage===1){
      await execute('document.getElementById("effects-enabled").checked=true;document.getElementById("effects-enabled").dispatchEvent(new Event("change"));undefined');
      await execute('document.getElementById("settings-button").click();document.querySelector("[data-action=grenade]").click();window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyH",key:"h",bubbles:true}));document.getElementById("music-volume").value=17;document.getElementById("music-volume").dispatchEvent(new Event("input"));document.getElementById("effects-volume").value=41;document.getElementById("effects-volume").dispatchEvent(new Event("input"));document.getElementById("music-enabled").checked=false;document.getElementById("music-enabled").dispatchEvent(new Event("change"));document.getElementById("fullscreen-enabled").checked=true;document.getElementById("fullscreen-enabled").dispatchEvent(new Event("change"));undefined');
      await wait('document.getElementById("fullscreen-enabled").checked');
      for(let i=0;i<100&&!window.isFullScreen();i++)await new Promise(r=>setTimeout(r,30));
      assert.equal(window.isFullScreen(),true);
      const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'game-settings.json'),'utf8'));
      assert.equal(saved['quarantine-controls-v3'].grenade,'KeyH');assert.equal(saved['quarantine-audio-v3'].effectsVolume,.41);assert.equal(saved['quarantine-display-v1'].fullscreen,true);
      fs.writeFileSync(path.join(output,'settings.png'),(await window.webContents.capturePage()).toPNG());
      fs.writeFileSync(path.join(output,'origin.json'),JSON.stringify(await execute('location.origin')));
    }else{
      const previous=JSON.parse(fs.readFileSync(path.join(output,'origin.json')));assert.notEqual(await execute('location.origin'),previous);
      assert.equal(window.isFullScreen(),true);
      const state=await execute('({bindings:JSON.parse(localStorage.getItem("quarantine-controls-v3")),audio:JSON.parse(localStorage.getItem("quarantine-audio-v3")),fullscreen:document.getElementById("fullscreen-enabled").checked})');
      assert.equal(state.bindings.grenade,'KeyH');assert.deepEqual(state.audio,{music:false,effects:true,volume:.17,effectsVolume:.41});assert.equal(state.fullscreen,true);
      await execute('window.quarantineDesktop.fullscreen(false)');for(let i=0;i<100&&window.isFullScreen();i++)await new Promise(r=>setTimeout(r,30));
      await wait('!document.getElementById("fullscreen-enabled").checked');assert.equal(window.isFullScreen(),false);
    }
    console.log('GAME_SETTINGS_OK',JSON.stringify({stage,nativeFullscreen:true,restartOnDifferentPort:stage===2}));blocker.close();app.quit();
  }catch(error){console.error(error);blocker.close();app.exit(1);}});
});
require('./main.cjs');
