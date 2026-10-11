const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('quarantineDesktop',{
  checkUpdates:source=>ipcRenderer.invoke('update:check',source),
  installUpdate:version=>ipcRenderer.invoke('update:install',version),
  launcher:()=>ipcRenderer.invoke('launcher:show'),
  play:()=>ipcRenderer.invoke('launcher:play'),
  importUpdate:()=>ipcRenderer.invoke('update:import'),
  installVersion:version=>ipcRenderer.invoke('launcher:install',version),
  settings:()=>ipcRenderer.invoke('launcher:settings'),
  saveSettings:value=>ipcRenderer.invoke('launcher:save-settings',value),
  saveGameSettings:(key,value)=>ipcRenderer.invoke('game:save-settings',key,value),
  fullscreen:value=>ipcRenderer.invoke('game:fullscreen',value),
  fullscreenChanged:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('game:fullscreen-changed',listener);return()=>ipcRenderer.removeListener('game:fullscreen-changed',listener);},
  newsVideo:version=>ipcRenderer.invoke('launcher:news-video',version),
  progress:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('update:progress',listener);return()=>ipcRenderer.removeListener('update:progress',listener);}
});
if(/^https?:$/.test(location.protocol)){
  const preferences=ipcRenderer.sendSync('launcher:settings-sync');
  const stored=ipcRenderer.sendSync('game:settings-sync');
  // Import older local preferences once; afterwards the file survives ports and updates.
  for(const key of ['quarantine-controls-v3','quarantine-interface-keys-v1','quarantine-audio-v3','quarantine-display-v1'])try{
    let value=stored[key];
    if(value===undefined){value=JSON.parse(localStorage.getItem(key));if(value===null&&key==='quarantine-audio-v3')value={music:preferences.gameMusic,effects:preferences.gameEffects,volume:preferences.gameMusicVolume/100,effectsVolume:1};if(value!==null)ipcRenderer.sendSync('game:import-settings',key,value);}
    if(value!==undefined&&value!==null)localStorage.setItem(key,JSON.stringify(value));
  }catch{}
}
window.addEventListener('DOMContentLoaded',async()=>{
  if(!/^https?:$/.test(location.protocol)||document.querySelector('#update-button'))return;
  // The launcher still offers updates when an older game version is selected.
  const button=document.createElement('button');button.textContent='↻ ВЕРСИИ / ОБНОВЛЕНИЕ';button.style.cssText='position:fixed;right:16px;top:66px;z-index:99;background:#c2df86;color:#183124;border:1px solid #d8edb2;padding:9px;font:11px Consolas;cursor:pointer';button.addEventListener('click',()=>ipcRenderer.invoke('launcher:show'));document.body.append(button);
  try{const state=await ipcRenderer.invoke('update:check');if(state.available)button.textContent='↻ ОБНОВИТЬ ДО '+state.latest;}catch{}
});
