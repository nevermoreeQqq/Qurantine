const {app,BrowserWindow,dialog,ipcMain,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createUpdater}=require('./updater.cjs');
const {createGitHubReleases}=require('./github-releases.cjs');
const {createSettings}=require('./settings.cjs');
const {createGameSettings}=require('./game-settings.cjs');
const {isTrustedNavigation}=require('./navigation.cjs');
app.setName('Quarantine');
if(process.platform==='win32')app.setAppUserModelId('com.quarantine.cordon');
let server,window,updater,address,busy=false;
const cycleTest=process.argv.includes('--smoke-update-cycle'),cycleStage=Number(process.argv.find(a=>a.startsWith('--smoke-cycle='))?.split('=')[1]||0);
if(cycleTest||process.argv.includes('--smoke-test')||process.argv.includes('--launcher-review')){const smokeData=path.join(require('node:os').tmpdir(),cycleTest?'quarantine-bootstrap-cycle-v6':process.argv.includes('--launcher-review')?'quarantine-launcher-review':'quarantine-bootstrap-smoke-v6');fs.mkdirSync(smokeData,{recursive:true});app.setPath('userData',smokeData);}
const launcherSettings=createSettings(app.getPath('userData'));
const gameSettings=createGameSettings(app.getPath('userData'));
app.commandLine.appendSwitch('js-flags','--max-old-space-size='+launcherSettings.get().memoryMB);
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
  app.whenReady().then(async()=>{
    const baseRoot=path.resolve(__dirname,'..'),baseVersion=JSON.parse(fs.readFileSync(path.join(baseRoot,'package.json'))).version;
    const updateData=cycleTest?path.join(app.getPath('temp'),'quarantine-native-update-cycle-v6'):path.join(app.getPath('userData'),'game-updates');
    const releaseSource=cycleTest||process.argv.includes('--smoke-test')||process.argv.includes('--launcher-review')?undefined:createGitHubReleases({token:process.env.QUARANTINE_GITHUB_TOKEN||''});
    updater=createUpdater({baseRoot,dataRoot:updateData,downloads:app.getPath('downloads'),extraDirs:app.isPackaged?[]:[path.join(baseRoot,'release')],publicKey:fs.readFileSync(path.join(baseRoot,'update-public.pem')),releaseSource});
    process.env.NODE_PATH=path.join(baseRoot,'node_modules');require('node:module').Module._initPaths();
    const {createGameServer}=require(path.join(updater.runtimeRoot,'server.js'));
    server=createGameServer({updateHandler:updater.handle});
    const gameHandlers=server.listeners('request');server.removeAllListeners('request');
    server.on('request',async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/assets/icon.png'){res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-cache'});res.end(fs.readFileSync(path.join(baseRoot,'assets/icon.png')));return;}if(await updater.handle(req,res,url))return;for(const handler of gameHandlers)handler(req,res);}catch(error){if(!res.headersSent)res.writeHead(400);res.end('Неверный запрос');}});
    try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5173,'0.0.0.0',resolve);});}
    catch(error){if(error.code==='EADDRINUSE')await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'0.0.0.0',resolve);});else{dialog.showErrorBox('Карантин',error.message);app.quit();return;}}
    address=`http://localhost:${server.address().port}`;
    const launcherFile=path.join(__dirname,'launcher.html');
    window=new BrowserWindow({width:1440,height:960,minWidth:1024,minHeight:720,title:'Карантин — Лаунчер',icon:path.join(baseRoot,'assets/icon.png'),backgroundColor:'#0b1112',autoHideMenuBar:true,show:!process.argv.includes('--smoke-test')&&!process.argv.includes('--performance-test')&&!process.argv.includes('--launcher-review')&&!cycleTest,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
    if(process.platform==='darwin')Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Карантин',submenu:[{role:'about',label:'О Карантине'},{type:'separator'},{role:'hide',label:'Скрыть Карантин'},{role:'hideOthers',label:'Скрыть остальные'},{type:'separator'},{role:'quit',label:'Завершить Карантин'}]},{label:'Правка',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Вид',submenu:[{role:'togglefullscreen',label:'Полный экран'}]},{label:'Окно',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}]));
    window.webContents.on('will-prevent-unload',event=>{if(dialog.showMessageBoxSync(window,{type:'question',buttons:['Остаться в игре','Выйти'],defaultId:0,cancelId:0,title:'Карантин',message:'Вы точно хотите выйти из игры?'})===1)event.preventDefault();});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    const trusted=url=>isTrustedNavigation(url,address,launcherFile);
    window.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
    window.webContents.session.setPermissionRequestHandler((_,__,callback)=>callback(false));
    const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{if(!trusted(event.senderFrame.url))throw Error('Недопустимый источник');return fn(...args);});
    handle('update:check',source=>updater.refresh(source));
    handle('launcher:settings',()=>launcherSettings.get());
    handle('launcher:save-settings',value=>{
      const settings=launcherSettings.save(value);
      const audio=gameSettings.get()['quarantine-audio-v3']||{};
      gameSettings.save('quarantine-audio-v3',{...audio,music:settings.gameMusic,effects:settings.gameEffects,volume:settings.gameMusicVolume/100});
      return settings;
    });
    handle('game:save-settings',(key,value)=>{
      const state=gameSettings.save(key,value);
      if(key==='quarantine-audio-v3'){const audio=state[key];launcherSettings.save({gameMusic:audio.music,gameEffects:audio.effects,gameMusicVolume:audio.volume*100});}
      return state;
    });
    handle('game:fullscreen',value=>{if(typeof value!=='boolean')throw Error('Неверный режим экрана');gameSettings.save('quarantine-display-v1',{fullscreen:value});window.setFullScreen(value);return value;});
    ipcMain.on('game:settings-sync',event=>{event.returnValue=trusted(event.senderFrame.url)?gameSettings.get():{};});
    ipcMain.on('game:import-settings',(event,key,value)=>{event.returnValue=false;if(!trusted(event.senderFrame.url))return;try{if(gameSettings.get()[key]===undefined)gameSettings.save(key,value);event.returnValue=true;}catch{}});
    const fullscreenChanged=value=>{gameSettings.save('quarantine-display-v1',{fullscreen:value});window.webContents.send('game:fullscreen-changed',value);};
    window.on('enter-full-screen',()=>fullscreenChanged(true));window.on('leave-full-screen',()=>fullscreenChanged(false));
    if(gameSettings.get()['quarantine-display-v1']?.fullscreen)window.setFullScreen(true);
    handle('launcher:news-video',async version=>{
      if(!/^\d+\.\d+\.\d+$/.test(String(version))||!releaseSource)throw Error('Видео новости недоступно');
      const entry=(await releaseSource.catalog()).news.find(n=>n.version===version)?.video;if(!entry)throw Error('Видео новости недоступно');
      const folder=path.join(app.getPath('userData'),'news');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,version+'.webm');
      const hash=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');
      if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==entry.digest.replace(/^sha256:/,'')){const video=await releaseSource.downloadNews(version);fs.writeFileSync(file,video.buffer);}
      return require('node:url').pathToFileURL(file).href;
    });
    ipcMain.on('launcher:settings-sync',event=>{event.returnValue=trusted(event.senderFrame.url)?launcherSettings.get():{};});
    async function install(version,choose){if(busy)throw Error('Обновление уже устанавливается');busy=true;try{const result=await updater.install(version,value=>window?.webContents.send('update:progress',value),choose);setTimeout(()=>{if(cycleTest)app.relaunch({args:process.argv.slice(1).filter(a=>!a.startsWith('--smoke-cycle=')).concat('--smoke-cycle='+(cycleStage+1))});else app.relaunch();app.quit();},700);return result;}finally{busy=false;}}
    handle('update:install',version=>install(version,false));handle('launcher:install',version=>install(version,true));
    handle('launcher:show',()=>window.loadFile(launcherFile));
    handle('launcher:play',()=>{if(gameSettings.get()['quarantine-display-v1']?.fullscreen)window.setFullScreen(true);return window.loadURL(address+'/?desktop=1');});
    handle('update:import',async()=>{const selection=await dialog.showOpenDialog(window,{title:'Добавить обновление Карантина',properties:['openFile'],filters:[{name:'Обновление Карантина',extensions:['qtu']}]});if(selection.canceled)return null;return updater.importFile(selection.filePaths[0]);});
    if(cycleTest){
      await window.loadFile(launcherFile);const versions=await window.webContents.executeJavaScript('window.quarantineDesktop.checkUpdates()');
      const log=path.join(updateData,'cycle.log');if(cycleStage===0)fs.writeFileSync(log,'');fs.appendFileSync(log,JSON.stringify({stage:cycleStage,current:versions.current,available:versions.available,versions:versions.versions.map(v=>v.version)})+'\n');
      if(cycleStage===0)await window.webContents.executeJavaScript('window.quarantineDesktop.installVersion("5.0.0")');
      else if(cycleStage===1){if(versions.current!=='5.0.0'||!versions.available)throw Error('Не обнаружена новая версия после отката');await window.loadURL(address+'/?desktop=1');const version=await window.webContents.executeJavaScript('GameContent.VERSION');if(version!==5)throw Error('Не запущена старая версия');await window.webContents.executeJavaScript(`window.quarantineDesktop.installUpdate(${JSON.stringify(baseVersion)})`);}
      else{await window.loadURL(address+'/?desktop=1');const version=await window.webContents.executeJavaScript('GameContent.VERSION');if(version!==6||versions.current!==baseVersion)throw Error('Обновлённая версия не запустилась');fs.appendFileSync(log,'UPDATE_CYCLE_OK\n');app.quit();}
    }else if(process.argv.includes('--smoke-test')){
      await window.loadFile(launcherFile);
      const launcher=await window.webContents.executeJavaScript('window.quarantineDesktop.checkUpdates().then(s=>({title:document.title,play:!!document.querySelector("#play"),settings:!!document.querySelector("#settings-dialog"),news:!!document.querySelector("#collision-video"),updates:!!window.quarantineDesktop,current:s.current,versions:s.versions.map(v=>v.version),node:typeof require}))');
      await window.loadURL(address+'/?desktop=1');
      const state=await window.webContents.executeJavaScript('({title:document.title,canvas:!!document.querySelector("#game"),settings:!!document.querySelector("#settings-button"),version:GameContent.VERSION,update:!!document.querySelector("#update-button"),build:!!document.querySelector("#build-wheel"),map:!!document.querySelector("#minimap"),serverAddress:document.querySelector("#server-address").value,defaultServer:GameContent.COOP_SERVER,advancedClosed:!document.querySelector("details.server-row").open,node:typeof require})');
      console.log('DESKTOP_SMOKE',JSON.stringify({launcher,game:state}));
      if(!launcher.play||!launcher.settings||!launcher.news||!launcher.updates||launcher.current!==baseVersion||!launcher.versions.includes(baseVersion)||!launcher.versions.includes('4.0.0')||!launcher.versions.includes('5.0.0')||!launcher.versions.includes('6.0.0')||!state.canvas||!state.settings||!state.update||!state.build||!state.map||state.version!==6||state.serverAddress!==state.defaultServer||!state.advancedClosed||state.node!=='undefined'){app.exit(1);return;}app.quit();
    }else await window.loadFile(launcherFile);
  }).catch(error=>{console.error(error);dialog.showErrorBox('Карантин',error.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>{if(server){server.closeAllConnections();server.close();}});
}
