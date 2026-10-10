const { app } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
process.argv.push('--launcher-review');
const output = path.resolve(__dirname, '../diagnostics/launcher');
fs.mkdirSync(output, { recursive: true });
app.on('browser-window-created', (_, window) => {
  window.webContents.setAudioMuted(true);
  const errors = [];
  window.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  window.webContents.once('did-finish-load', async () => {
    try {
      async function screenshot(name){await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))');fs.writeFileSync(path.join(output,name+'.png'),(await window.webContents.capturePage()).toPNG());}
      await window.webContents.executeJavaScript('window.quarantineDesktop.checkUpdates()');
      const state = await window.webContents.executeJavaScript(`(async()=>{
        const settings=await window.quarantineDesktop.settings();
        document.getElementById('open-settings').click();
        return {title:document.title,settingsOpen:document.getElementById('settings-dialog').open,settings,node:typeof require,hasSource:!!document.getElementById('source'),width:innerWidth};
      })()`);
      assert.equal(state.settingsOpen, true); assert.equal(state.node, 'undefined'); assert.equal(state.hasSource, false);
      await screenshot('settings');
      const saved = await window.webContents.executeJavaScript(`(async()=>{
        document.getElementById('memory').value='512';document.getElementById('launcher-music').checked=false;document.getElementById('game-effects').checked=false;document.getElementById('game-volume').value=17;
        document.getElementById('settings-form').requestSubmit();
        for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,20));const s=await window.quarantineDesktop.settings();if(s.memoryMB===512&&s.gameMusicVolume===17)return s;}throw Error('Settings did not save');
      })()`);
      assert.equal(saved.gameEffects, false); assert.equal(saved.launcherMusic, false);
      await window.webContents.executeJavaScript('document.getElementById("close-settings").click();undefined');
      await window.webContents.executeJavaScript(`(async()=>{const v=document.getElementById('collision-video');await v.play();if(v.readyState<2)await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('Video unavailable'));});v.pause();await new Promise(resolve=>{v.onseeked=resolve;v.currentTime=2;});return {duration:v.duration,width:v.videoWidth,height:v.videoHeight};})()`).then(video => { assert.ok(video.duration >= 8 || video.duration === Infinity); assert.equal(video.width, 640); });
      await screenshot('home');
      for (const page of ['versions', 'news']) {
        await window.webContents.executeJavaScript(`document.querySelector('[data-page="${page}"]').click();undefined`);
        await screenshot(page);
      }
      window.setSize(1024, 720);
      await window.webContents.executeJavaScript('document.querySelector("[data-page=home]").click();undefined');
      await screenshot('compact');
      const gameLoaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve));
      await window.webContents.executeJavaScript('void window.quarantineDesktop.play()');
      await gameLoaded;
      const audio = await window.webContents.executeJavaScript('JSON.parse(localStorage.getItem("quarantine-audio-v3"))');
      assert.equal(audio.effects, false); assert.equal(audio.volume, .17);
      const heapMB=await window.webContents.executeJavaScript('performance.memory.jsHeapSizeLimit/1024/1024');
      assert.ok(heapMB<=state.settings.memoryMB+96,'Memory setting must reach the game renderer');
      assert.equal(errors.length, 0, errors.join('\n'));
      fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ state, saved, audio, heapMB, errors }, null, 2));
      console.log('LAUNCHER_UI_OK', JSON.stringify({ screenshots: output, audio, errors })); app.quit();
    } catch (error) { console.error(error); app.exit(1); }
  });
});
require('../desktop/main.cjs');
setTimeout(()=>{console.error('Launcher UI verification timed out');app.exit(1);},45000).unref();
