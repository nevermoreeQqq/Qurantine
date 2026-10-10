const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const {Simulation}=require('./simulation.js');
const {VERSION}=require('./content.js');
const root=__dirname,mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webm':'video/webm'};
function createGameServer(options={}){
  const newSimulation=options.simulationFactory||(opts=>new Simulation(Math.random,opts));
  const updateHandler=options.updateHandler||serveUpdates;
  const rooms=new Map(),sessions=new Map(),sockets=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:{threshold:2048,serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:4,zlibDeflateOptions:{level:3}}});
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const body=req=>new Promise((resolve,reject)=>{let text='';req.on('data',c=>{text+=c;if(text.length>8192){reject(Error('Слишком большой запрос'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(text||'{}'));}catch{reject(Error('Неверный JSON'));}});req.on('error',reject);});
  const snapshot=(room,viewerId)=>({...room.game.snapshot(viewerId),room:room.code,host:room.host,round:room.round,serverTime:room.clock});
  const broadcast=room=>{
    if(!room.streams.size&&!room.sockets.size)return;
    const state=snapshot(room);
    const compact=e=>{const result={...e};for(const field of ['x','y','vx','vy','angle','step','swing','recoil','age','life','windup','jump','hit','reload','hp','armor'])if(Number.isFinite(result[field]))result[field]=Math.round(result[field]*100)/100;return result;};
    const enemies=state.enemies.map(({attack,knockX,knockY,burnOwner,burnTick,damage,speed,...e})=>compact(e));
    const bullets=state.bullets.map(({hit,damage,pierce,...b})=>compact(b));
    const common={...state,enemies,bullets,players:state.players.map(compact),grenades:state.grenades.map(compact)};
    for(const [viewerId,ws] of room.sockets)if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<8192){
      const events=state.events.filter(e=>e.id>(ws.eventAck||0));
      const mines=room.game.mines.filter(m=>m.revealedTo.includes(viewerId)).map(({revealedTo,...mine})=>mine);
      ws.send(JSON.stringify({type:'snapshot',snapshot:{...common,mines,events}}));
    }
    if(room.streams.size){for(const [viewerId,res] of room.streams)if(!res.writableEnded&&!res.destroyed){if(res.writableLength>256000)res.destroy();else res.write(`data: ${JSON.stringify({...state,mines:room.game.snapshot(viewerId).mines})}\n\n`);}}
  };
  function action(session,data){const {room,id}=session;
    if(data.type==='launch'){if(room.host!==id)return{status:403,error:'Начать бой может хозяин комнаты'};room.game.start();}
    else if(data.type==='restart'){if(room.host!==id)return{status:403,error:'Перезапуск доступен хозяину комнаты'};if(room.game.state!=='over')return{status:409,error:'Перезапуск доступен после завершения матча'};const roster=room.game.players;room.game=newSimulation({difficulty:room.game.difficulty,maxPlayers:room.game.maxPlayers});room.round++;for(const p of roster){room.game.addPlayer(p.id,p.name);if(room.sockets.has(p.id))room.game.networkPlayer(p.id);}for(const ws of room.sockets.values())ws.eventAck=0;room.game.start();}
    else return{ok:room.game.action(id,data.type,data.item,data.angle)};
    return{ok:true};
  }
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.headers.origin){let allowed=false;try{const origin=new URL(req.headers.origin);allowed=origin.host===req.headers.host||['localhost','127.0.0.1','[::1]'].includes(origin.hostname);}catch{}if(!allowed)return json(res,403,{error:'Этот источник не разрешён'});res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Session');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}}
      const url=new URL(req.url,'http://localhost');
      if(await updateHandler(req,res,url))return;
      if(url.pathname==='/api/info')return json(res,200,{version:VERSION,appVersion:require('./package.json').version,maxPlayers:4,addresses:Object.values(require('node:os').networkInterfaces()).flat().filter(a=>a?.family==='IPv4'&&!a.internal).map(a=>'http://'+a.address+':'+server.address().port)});
      if(url.pathname==='/api/join'&&req.method==='POST'){
        const data=await body(req);if(data.version!==undefined&&data.version!==VERSION)return json(res,409,{error:'Версии игры отличаются. Обновите приложение на обоих компьютерах.'});let code=String(data.room||'').trim().toUpperCase(),room;
        if(code){room=rooms.get(code);if(!room)return json(res,404,{error:'Комната не найдена. Проверь код.'});if(room.game.state==='over')return json(res,409,{error:'Матч завершён. Хозяин должен начать заново.'});}
        else{if(rooms.size>=30)return json(res,503,{error:'Сервер занят'});do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));room={code,game:newSimulation({difficulty:data.difficulty,maxPlayers:data.maxPlayers}),streams:new Map(),sockets:new Map(),clock:0,round:1,host:null,touched:Date.now()};rooms.set(code,room);}
        if(room.game.players.length>=(room.game.maxPlayers||4))return json(res,409,{error:'Комната заполнена ('+(room.game.maxPlayers||4)+' игрока)'});
        const token=crypto.randomBytes(24).toString('hex'),id=crypto.randomBytes(6).toString('hex');room.game.addPlayer(id,data.name);if(!room.host)room.host=id;room.touched=Date.now();sessions.set(token,{room,id,touched:Date.now(),lastInput:Date.now()});broadcast(room);return json(res,200,{token,id,room:code,snapshot:snapshot(room,id)});
      }
      if(url.pathname.startsWith('/api/')){
        const token=req.headers['x-session']||url.searchParams.get('token'),session=sessions.get(token);if(!session)return json(res,401,{error:'Сессия завершена. Войди в комнату снова.'});const {room,id}=session;session.touched=Date.now();room.touched=Date.now();
        if(url.pathname==='/api/events'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});room.streams.get(id)?.end();room.streams.set(id,res);res.write(`data: ${JSON.stringify(snapshot(room,id))}\n\n`);req.on('close',()=>{if(room.streams.get(id)===res)room.streams.delete(id);});return;}
        if(url.pathname==='/api/input'&&req.method==='POST'){room.game.input(id,await body(req));session.lastInput=Date.now();return json(res,200,{ok:true});}
        if(url.pathname==='/api/action'&&req.method==='POST'){const result=action(session,await body(req));broadcast(room);return json(res,result.status||200,result);}
        if(url.pathname==='/api/leave'&&req.method==='POST'){room.game.removePlayer(id);room.streams.get(id)?.end();room.streams.delete(id);room.sockets.get(id)?.close();room.sockets.delete(id);sessions.delete(token);if(room.host===id)room.host=room.game.players[0]?.id||null;broadcast(room);return json(res,200,{ok:true});}
        return json(res,404,{error:'Неизвестный запрос'});
      }
      if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return json(res,400,{error:'Bad path'});}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const allowed=new Set(['index.html','style.css','game.js','core.js','content.js','controls.js','music.js','render.js','simulation.js','terrain.js','netcode.js','preview.jpg']);
      for(const f of ['desktop/launcher.html','desktop/launcher.js','desktop/launcher.css','desktop/launcher-music.js','desktop/media/cordon.svg','desktop/media/collision-poster.svg','desktop/media/collision-6.0.1.webm'])allowed.add(path.normalize(f));
      if(!file.startsWith(root+path.sep)||!allowed.has(path.relative(root,file)))return json(res,404,{error:'Not found'});
      fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
    }catch(error){if(!res.headersSent)json(res,400,{error:error.message});else res.end();}
  });
  server.on('upgrade',(req,socket,head)=>{
    const url=new URL(req.url,'http://localhost'),session=sessions.get(url.searchParams.get('token'));
    let originOK=true;try{if(req.headers.origin){const origin=new URL(req.headers.origin);originOK=origin.host===req.headers.host||['localhost','127.0.0.1','[::1]'].includes(origin.hostname);}}catch{originOK=false;}
    if(url.pathname!=='/api/socket'||!session||!originOK){socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return;}
    socket.setNoDelay(true);sockets.handleUpgrade(req,socket,head,ws=>{
      const {room,id}=session;room.sockets.get(id)?.close();room.sockets.set(id,ws);room.game.networkPlayer(id);ws.eventAck=0;
      ws.on('error',()=>{});
      ws.on('message',raw=>{if(sessions.get(url.searchParams.get('token'))!==session)return ws.close();let data;try{data=JSON.parse(raw.toString());}catch{return ws.close(1007);}if(!data||typeof data!=='object')return;
        session.touched=room.touched=Date.now();
        if(Number.isSafeInteger(data.eventAck))ws.eventAck=Math.max(ws.eventAck,Math.min(data.eventAck,room.game.eventId));
        if(data.type==='input'){room.game.queueInput(id,data.frames);session.lastInput=Date.now();}
        else if(data.type==='ping')ws.send(JSON.stringify({type:'pong',clientTime:data.clientTime}));
        else if(data.type==='action'){const result=action(session,{...data,type:data.action});ws.send(JSON.stringify({type:'result',...result}));}
      });
      ws.on('close',()=>{if(room.sockets.get(id)===ws){room.sockets.delete(id);const p=room.game.players.find(p=>p.id===id);if(p)p.commands=[];room.game.input(id,{});}});broadcast(room);
    });
  });
  let previous=performance.now(),accumulator=0,frames=0;
  const timer=setInterval(()=>{
    const current=performance.now();accumulator+=Math.min(.25,(current-previous)/1000);previous=current;
    const now=Date.now();for(const [token,s]of sessions){if(now-s.touched>20000){s.room.game.removePlayer(s.id);s.room.streams.get(s.id)?.end();s.room.streams.delete(s.id);s.room.sockets.get(s.id)?.close();s.room.sockets.delete(s.id);if(s.room.host===s.id)s.room.host=s.room.game.players[0]?.id||null;sessions.delete(token);}else{const p=s.room.game.players.find(p=>p.id===s.id),gap=now-s.lastInput;if(p)p.connectionGrace=gap>700&&gap<3200&&s.room.sockets.has(s.id)&&!s.room.game.timeoutRemaining?1:0;if(gap>350)s.room.game.input(s.id,{angle:p?.angle||0});}}
    while(accumulator>=1/60){accumulator-=1/60;frames++;for(const [code,room]of rooms){room.clock+=1/60;if(!room.game.players.length&&now-room.touched>30000){rooms.delete(code);continue;}if(room.game.players.length)room.game.tick(1/60);}}
    if(frames>=3){frames=0;for(const room of rooms.values())broadcast(room);}
  },8);
  timer.unref();server.on('close',()=>{clearInterval(timer);for(const room of rooms.values()){for(const res of room.streams.values())res.end();for(const ws of room.sockets.values())ws.terminate();}sockets.close();});return server;
}
if(require.main===module){
  const server=createGameServer();
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Порт уже занят. Открой http://localhost:5173 или останови предыдущий сервер.':error.message);process.exitCode=1;});
  server.listen(process.env.PORT||5173,process.env.HOST||'0.0.0.0',()=>{
    const port=server.address().port;
    console.log(`КАРАНТИН → http://localhost:${port} · кооператив до 4 игроков`);
    for(const [name,addresses] of Object.entries(require('node:os').networkInterfaces()))for(const address of addresses||[])if(address.family==='IPv4'&&!address.internal)console.log(`${name}: http://${address.address}:${port}`);
    console.log('Оставь окно сервера открытым. Codex для игры не нужен.');
  });
}
function serveUpdates(req,res,url){
  if(!url.pathname.startsWith('/updates/'))return false;
  if(req.method!=='GET'){res.writeHead(405);res.end();return true;}
  const {readBundle}=require('./desktop/updater.cjs');let publicKey;try{publicKey=fs.readFileSync(path.join(root,'update-public.pem'));}catch{res.writeHead(404);res.end();return true;}
  const bundles=new Map();for(const dir of [path.join(root,'assets'),path.join(root,'release')]){let files;try{files=fs.readdirSync(dir);}catch{continue;}for(const file of files){if(!/^((Quarantine-Update-\d+\.\d+\.\d+)|update(-\d+\.\d+\.\d+)?)\.qtu$/.test(file))continue;try{const bundle=readBundle(fs.readFileSync(path.join(dir,file)),publicKey);bundles.set(bundle.version,bundle);}catch{}}}
  if(url.pathname==='/updates/catalog.json'){const versions=[...bundles.values()].map(b=>({version:b.version,protocol:b.protocol,notes:b.version.startsWith('6.')?'Ночь, новые мутанты, турели и круговые меню.':b.version.startsWith('5.')?'Новый арсенал, турели, режимы и строительство.':'Предыдущая версия.'})).sort((a,b)=>require('./desktop/updater.cjs').compare(b.version,a.version));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({versions}));return true;}
  const match=/^\/updates\/(\d+\.\d+\.\d+)\.qtu$/.exec(url.pathname),bundle=match&&bundles.get(match[1]);if(!bundle){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bundle.buffer.length});res.end(bundle.buffer);return true;
}
module.exports={createGameServer};
