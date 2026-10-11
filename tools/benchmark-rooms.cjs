// Isolated loopback load test; never joins or changes live player rooms.
const path=require('node:path');
const {createRequire}=require('node:module');
const {monitorEventLoopDelay}=require('node:perf_hooks');
const root=process.env.QUARANTINE_BENCH_ROOT||path.resolve(__dirname,'..');
const gameRequire=createRequire(path.join(root,'package.json'));
const {createGameServer}=gameRequire('./server.js');
const {Simulation}=gameRequire('./simulation.js');
const {WebSocket}=gameRequire('ws');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const duration=Number(process.env.QUARANTINE_BENCH_SECONDS||5);
if(!Number.isFinite(duration)||duration<5||duration>120)throw Error('Benchmark duration must be 5..120 seconds');
const scenarios=[{rooms:1,enemies:12},{rooms:2,enemies:80},{rooms:3,enemies:80},{rooms:4,enemies:80},{rooms:3,enemies:140},{rooms:2,enemies:25},{rooms:3,enemies:25}];
async function run({rooms,enemies}){
  const games=[],clients=[],timers=[];
  const server=createGameServer({roomLimit:rooms,simulationFactory:options=>{const game=new Simulation(Math.random,options);games.push(game);return game;}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const lag=monitorEventLoopDelay({resolution:10});
  try{
    for(let roomIndex=0;roomIndex<rooms;roomIndex++){
      let code;
      for(let p=0;p<4;p++){
        const response=await fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Load '+p,room:code,maxPlayers:4,difficulty:'normal'})});
        if(!response.ok)throw Error('Load client join failed: '+response.status);
        const session=await response.json();code=session.room;
        const client={ws:new WebSocket(base.replace('http:','ws:')+'/api/socket?token='+session.token),seq:0,gaps:[],measuring:false,last:0};clients.push(client);
        client.ws.on('message',raw=>{const message=JSON.parse(raw);if(message.type!=='snapshot')return;const now=performance.now();if(client.measuring&&client.last)client.gaps.push(now-client.last);client.last=now;client.state=message.snapshot;const eventAck=Math.max(0,...message.snapshot.events.map(e=>e.id));if(eventAck)client.ws.send(JSON.stringify({type:'ping',clientTime:now,eventAck}));});
        await new Promise((resolve,reject)=>{client.ws.once('open',resolve);client.ws.once('error',reject);});
        timers.push(setInterval(()=>client.ws.send(JSON.stringify({type:'input',frames:Array.from({length:3},()=>({seq:++client.seq,dx:0,dy:0,angle:p*Math.PI/2,shoot:true}))})),50));
      }
      const game=games[roomIndex];game.start();game.wave=20;game.pending=0;game.enemies=[];game.nextNight=99999;
      for(const p of game.players){p.hp=p.maxHp=1000000;p.owned.push('hmg');p.weapon='hmg';p.clips.hmg=100000;p.ammo.belt=100000;}
      const kinds=['walker','runner','armored','robot','healer','tank','giant','spitter','lavspitter'];
      for(let i=0;i<enemies;i++){const enemy=game.spawn(kinds[i%kinds.length]);const pos=game.spot(1200,900,350,650,enemy.r);Object.assign(enemy,pos,{hp:1000000,maxHp:1000000});}
      const boss=game.spawn('boss');if(boss){Object.assign(boss,{hp:1000000,maxHp:1000000});}
      for(let i=0;i<4;i++)game.barriers.push({id:game.id(),type:'turretHeavy',x:1160+(i%2)*120,y:820+Math.floor(i/2)*160,w:52,h:52,hp:1000000,maxHp:1000000,fireTimer:0,owner:game.players[0].id});
    }
    await delay(1000);
    const started=performance.now(),cpu=process.cpuUsage(),initialTimes=games.map(g=>g.elapsed),initialBytes=clients.reduce((n,c)=>n+c.ws._socket.bytesRead,0);
    for(const c of clients){c.measuring=true;c.last=performance.now();}lag.enable();
    await delay(duration*1000);
    lag.disable();const seconds=(performance.now()-started)/1000,used=process.cpuUsage(cpu),gaps=clients.flatMap(c=>c.gaps).sort((a,b)=>a-b);
    const result={rooms,players:rooms*4,seconds:Number(seconds.toFixed(1)),enemiesPerRoom:enemies,bossPerRoom:1,heavyTurretsPerRoom:4,cpuPercent:Math.round((used.user+used.system)/10000/seconds),rssMB:Math.round(process.memoryUsage().rss/1048576),loopP99Ms:Math.round(lag.percentile(99)/1e6),snapshotGapP99Ms:Math.round(gaps[Math.floor(gaps.length*.99)]||0),simulationRatio:Number(Math.min(...games.map((g,i)=>(g.elapsed-initialTimes[i])/seconds)).toFixed(3)),outgoingKBps:Math.round((clients.reduce((n,c)=>n+c.ws._socket.bytesRead,0)-initialBytes)/1024/seconds)};
    console.log(JSON.stringify(result));
  }finally{lag.disable();for(const timer of timers)clearInterval(timer);for(const c of clients)c.ws.terminate();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
(async()=>{const selected=process.argv[2];const cases=selected===undefined?scenarios:[scenarios[Number(selected)]];if(cases.some(c=>!c))throw Error('Choose scenario 0..6');for(const scenario of cases)await run(scenario);})().catch(error=>{console.error(error.message);process.exitCode=1;});
