const {app,BrowserWindow,dialog,ipcMain,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createUpdater}=require('./updater.cjs');
const {isTrustedNavigation}=require('./navigation.cjs');
app.setName('Quarantine');
let server,window,updater,address,busy=false;
const cycleTest=process.argv.includes('--smoke-update-cycle'),cycleStage=Number(process.argv.find(a=>a.startsWith('--smoke-cycle='))?.split('=')[1]||0);
if(cycleTest||process.argv.includes('--smoke-test')){const smokeData=path.join(require('node:os').tmpdir(),cycleTest?'quarantine-bootstrap-cycle-v6':'quarantine-bootstrap-smoke-v6');fs.mkdirSync(smokeData,{recursive:true});app.setPath('userData',smokeData);}
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
  app.whenReady().then(async()=>{
    const baseRoot=path.resolve(__dirname,'..');
    const updateData=cycleTest?path.join(app.getPath('temp'),'quarantine-native-update-cycle-v6'):path.join(app.getPath('userData'),'game-updates');
    updater=createUpdater({baseRoot,dataRoot:updateData,downloads:app.getPath('downloads'),extraDirs:app.isPackaged?[]:[path.join(baseRoot,'release')],publicKey:fs.readFileSync(path.join(baseRoot,'update-public.pem'))});
    process.env.NODE_PATH=path.join(baseRoot,'node_modules');require('node:module').Module._initPaths();
    const {createGameServer}=require(path.join(updater.runtimeRoot,'server.js'));
    server=createGameServer({updateHandler:updater.handle});
    const gameHandlers=server.listeners('request');server.removeAllListeners('request');
    server.on('request',async(req,res)=>{try{if(await updater.handle(req,res,new URL(req.url,'http://localhost')))return;for(const handler of gameHandlers)handler(req,res);}catch(error){if(!res.headersSent)res.writeHead(400);res.end('Неверный запрос');}});
    try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5173,'0.0.0.0',resolve);});}
    catch(error){if(error.code==='EADDRINUSE')await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'0.0.0.0',resolve);});else{dialog.showErrorBox('Карантин',error.message);app.quit();return;}}
    address=`http://localhost:${server.address().port}`;
    const launcherFile=path.join(__dirname,'launcher.html');
    window=new BrowserWindow({width:1440,height:960,minWidth:1024,minHeight:720,title:'Карантин — Лаунчер',icon:path.join(baseRoot,'assets/icon.png'),backgroundColor:'#0b1112',autoHideMenuBar:true,show:!process.argv.includes('--smoke-test')&&!process.argv.includes('--performance-test')&&!cycleTest,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
    if(process.platform==='darwin')Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Карантин',submenu:[{role:'about',label:'О Карантине'},{type:'separator'},{role:'hide',label:'Скрыть Карантин'},{role:'hideOthers',label:'Скрыть остальные'},{type:'separator'},{role:'quit',label:'Завершить Карантин'}]},{label:'Правка',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Вид',submenu:[{role:'togglefullscreen',label:'Полный экран'}]},{label:'Окно',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}]));
    window.webContents.on('will-prevent-unload',event=>{if(dialog.showMessageBoxSync(window,{type:'question',buttons:['Остаться в игре','Выйти'],defaultId:0,cancelId:0,title:'Карантин',message:'Вы точно хотите выйти из игры?'})===1)event.preventDefault();});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    const trusted=url=>isTrustedNavigation(url,address,launcherFile);
    window.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
    window.webContents.session.setPermissionRequestHandler((_,__,callback)=>callback(false));
    const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{if(!trusted(event.senderFrame.url))throw Error('Недопустимый источник');return fn(...args);});
    handle('update:check',source=>updater.refresh(source));
    async function install(version,choose){if(busy)throw Error('Обновление уже устанавливается');busy=true;try{const result=await updater.install(version,value=>window?.webContents.send('update:progress',value),choose);setTimeout(()=>{if(cycleTest)app.relaunch({args:process.argv.slice(1).filter(a=>!a.startsWith('--smoke-cycle=')).concat('--smoke-cycle='+(cycleStage+1))});else app.relaunch();app.quit();},700);return result;}finally{busy=false;}}
    handle('update:install',version=>install(version,false));handle('launcher:install',version=>install(version,true));
    handle('launcher:show',()=>window.loadFile(launcherFile));
    handle('launcher:play',()=>window.loadURL(address+'/?desktop=1'));
    handle('update:import',async()=>{const selection=await dialog.showOpenDialog(window,{title:'Добавить обновление Карантина',properties:['openFile'],filters:[{name:'Обновление Карантина',extensions:['qtu']}]});if(selection.canceled)return null;return updater.importFile(selection.filePaths[0]);});
    if(cycleTest){
      await window.loadFile(launcherFile);const versions=await window.webContents.executeJavaScript('window.quarantineDesktop.checkUpdates()');
      const log=path.join(updateData,'cycle.log');if(cycleStage===0)fs.writeFileSync(log,'');fs.appendFileSync(log,JSON.stringify({stage:cycleStage,current:versions.current,available:versions.available,versions:versions.versions.map(v=>v.version)})+'\n');
      if(cycleStage===0)await window.webContents.executeJavaScript('window.quarantineDesktop.installVersion("5.0.0")');
      else if(cycleStage===1){if(versions.current!=='5.0.0'||!versions.available)throw Error('Не обнаружена новая версия после отката');await window.loadURL(address+'/?desktop=1');const version=await window.webContents.executeJavaScript('GameContent.VERSION');if(version!==5)throw Error('Не запущена старая версия');await window.webContents.executeJavaScript('window.quarantineDesktop.installUpdate("6.0.0")');}
      else{await window.loadURL(address+'/?desktop=1');const version=await window.webContents.executeJavaScript('GameContent.VERSION');if(version!==6||versions.current!=='6.0.0')throw Error('Обновлённая версия не запустилась');fs.appendFileSync(log,'UPDATE_CYCLE_OK\n');app.quit();}
    }else if(process.argv.includes('--smoke-test')){
      await window.loadFile(launcherFile);
      const launcher=await window.webContents.executeJavaScript('window.quarantineDesktop.checkUpdates().then(s=>({title:document.title,play:!!document.querySelector("#play"),updates:!!window.quarantineDesktop,versions:s.versions.map(v=>v.version),node:typeof require}))');
      await window.loadURL(address+'/?desktop=1');
      const state=await window.webContents.executeJavaScript('({title:document.title,canvas:!!document.querySelector("#game"),settings:!!document.querySelector("#settings-button"),version:GameContent.VERSION,update:!!document.querySelector("#update-button"),build:!!document.querySelector("#build-wheel"),map:!!document.querySelector("#minimap"),node:typeof require})');
      console.log('DESKTOP_SMOKE',JSON.stringify({launcher,game:state}));
      if(!launcher.play||!launcher.updates||!launcher.versions.includes('4.0.0')||!launcher.versions.includes('5.0.0')||!launcher.versions.includes('6.0.0')||!state.canvas||!state.settings||!state.update||!state.build||!state.map||state.version!==6||state.node!=='undefined'){app.exit(1);return;}app.quit();
    }else await window.loadFile(launcherFile);
  }).catch(error=>{console.error(error);dialog.showErrorBox('Карантин',error.message);app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>{if(server){server.closeAllConnections();server.close();}});
}
