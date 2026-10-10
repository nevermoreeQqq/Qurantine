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
  newsVideo:version=>ipcRenderer.invoke('launcher:news-video',version),
  progress:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('update:progress',listener);return()=>ipcRenderer.removeListener('update:progress',listener);}
});
if(/^https?:$/.test(location.protocol)){
  const preferences=ipcRenderer.sendSync('launcher:settings-sync');
  if(typeof preferences.gameMusic==='boolean'){
    try{localStorage.setItem('quarantine-audio-v3',JSON.stringify({music:preferences.gameMusic,effects:preferences.gameEffects,volume:preferences.gameMusicVolume/100}));}catch{}
  }
}
window.addEventListener('DOMContentLoaded',async()=>{
  if(!/^https?:$/.test(location.protocol)||document.querySelector('#update-button'))return;
  // The launcher still offers updates when an older game version is selected.
  const button=document.createElement('button');button.textContent='↻ ВЕРСИИ / ОБНОВЛЕНИЕ';button.style.cssText='position:fixed;right:16px;top:66px;z-index:99;background:#c2df86;color:#183124;border:1px solid #d8edb2;padding:9px;font:11px Consolas;cursor:pointer';button.addEventListener('click',()=>ipcRenderer.invoke('launcher:show'));document.body.append(button);
  try{const state=await ipcRenderer.invoke('update:check');if(state.available)button.textContent='↻ ОБНОВИТЬ ДО '+state.latest;}catch{}
});
