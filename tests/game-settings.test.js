const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameSettings}=require('../desktop/game-settings.cjs');
const {Bindings}=require('../controls.js');
test('Game preferences survive a restarted application and a replacement game runtime',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'quarantine-settings-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const first=createGameSettings(root),binds=new Bindings();binds.bind('grenade','KeyH');
  first.save('quarantine-controls-v3',binds.map);first.save('quarantine-audio-v3',{music:false,effects:true,volume:.17,effectsVolume:.41});first.save('quarantine-display-v1',{fullscreen:true});
  // Installer/runtime contents are independent of the application data directory.
  fs.mkdirSync(path.join(root,'game-updates','versions','6.0.8'),{recursive:true});
  fs.writeFileSync(path.join(root,'game-updates','versions','6.0.8','package.json'),'{"version":"6.0.8"}');
  const second=createGameSettings(root).get();assert.equal(second['quarantine-controls-v3'].grenade,'KeyH');assert.deepEqual(second['quarantine-audio-v3'],{music:false,effects:true,volume:.17,effectsVolume:.41});assert.deepEqual(second['quarantine-display-v1'],{fullscreen:true});
  assert.equal(fs.existsSync(path.join(root,'game-settings.json.tmp')),false);
});
test('Invalid stored settings cannot erase other settings or introduce arbitrary keys',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'quarantine-settings-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const settings=createGameSettings(root);settings.save('quarantine-display-v1',{fullscreen:true});assert.throws(()=>settings.save('../../config',{fullscreen:false}));assert.throws(()=>settings.save('quarantine-controls-v3',null));
  settings.save('quarantine-audio-v3',{volume:3,effectsVolume:-1});assert.equal(settings.get()['quarantine-audio-v3'].volume,1);assert.equal(settings.get()['quarantine-audio-v3'].effectsVolume,0);assert.equal(createGameSettings(root).get()['quarantine-display-v1'].fullscreen,true);
});
