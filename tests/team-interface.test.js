const test=require('node:test'),assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {createGameServer}=require('../server.js');
const {Simulation,BOSSES,MODES}=require('../simulation.js');
async function setup(t,options={}){
  const server=createGameServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body={},token)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-session':token}:{})},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
  const join=async(body={})=>(await post('/api/join',body)).data;
  return{base,post,join};
}
function nextPacket(ws,predicate){return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{ws.off('message',read);reject(Error('Missing packet'));},4000);
  const read=raw=>{const packet=JSON.parse(raw);if(predicate(packet)){clearTimeout(timer);ws.off('message',read);resolve(packet);}};ws.on('message',read);
});}
test('Only the current host chooses lobby difficulty; roster survives changes and combat locks it',async t=>{
  let game;const {post,join}=await setup(t,{simulationFactory:options=>game=new Simulation(Math.random,options)});
  const host=await join({name:'Host',difficulty:'easy'}),guest=await join({name:'Guest',room:host.room,difficulty:'hard'});
  assert.equal(guest.snapshot.difficulty,'easy');assert.ok(guest.snapshot.features.includes('team-chat'));assert.ok(guest.snapshot.features.includes('lobby-difficulty'));const roster=game.players.map(p=>p.id);
  assert.equal((await post('/api/action',{type:'difficulty',item:'hard'},guest.token)).status,403);
  assert.equal((await post('/api/action',{type:'difficulty',item:'invalid'},host.token)).status,400);
  assert.equal((await post('/api/action',{type:'difficulty',item:'hard'},host.token)).data.ok,true);
  assert.equal(game.difficulty,'hard');assert.deepEqual(game.players.map(p=>p.id),roster);
  assert.deepEqual(game.bossPool,BOSSES.filter(b=>MODES.hard.bosses.includes(b.ability)));
  await post('/api/leave',{},host.token);
  assert.equal((await post('/api/action',{type:'difficulty',item:'normal'},guest.token)).data.ok,true);
  await post('/api/action',{type:'launch'},guest.token);
  assert.equal((await post('/api/action',{type:'difficulty',item:'easy'},guest.token)).status,409);
  assert.equal(game.difficulty,'normal');
});
test('Team chat is authenticated, stays inside its room, sanitizes and limits messages, and reaches late joiners',async t=>{
  const {post,join}=await setup(t);const host=await join({name:'Alpha'}),other=await join({name:'Other team'});
  assert.equal((await post('/api/action',{type:'chat',item:'Unauthorized'},'bad')).status,401);
  assert.equal((await post('/api/action',{type:'chat',item:{}},host.token)).status,400);
  assert.equal((await post('/api/action',{type:'chat',item:' \n\u0000 '},host.token)).status,400);
  const literal='<img src=x onerror=alert(1)> Привет';
  assert.equal((await post('/api/action',{type:'chat',item:literal},host.token)).data.ok,true);
  assert.equal((await post('/api/action',{type:'chat',item:'Flood'},host.token)).status,429);
  const guest=await join({name:'Bravo',room:host.room});
  assert.equal(guest.snapshot.chat[0].text,literal);assert.equal(guest.snapshot.chat[0].name,'Alpha');
  const outsider=await join({room:other.room});assert.deepEqual(outsider.snapshot.chat,[]);
  const long='🛡'.repeat(300);assert.equal((await post('/api/action',{type:'chat',item:long},guest.token)).data.ok,true);
  const late=await join({room:host.room});assert.equal(Array.from(late.snapshot.chat[1].text).length,240);
});
test('WebSocket peers receive chat acknowledgements and shared messages before launch',async t=>{
  const {base,join}=await setup(t);const host=await join({name:'Host'}),guest=await join({name:'Guest',room:host.room});
  const connect=async player=>{const ws=new WebSocket(base.replace('http:','ws:')+'/api/socket?token='+player.token);t.after(()=>ws.terminate());await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});return ws;};
  const a=await connect(host),b=await connect(guest);
  const receipt=nextPacket(a,p=>p.type==='result'&&p.action==='chat');
  const delivered=nextPacket(b,p=>p.type==='snapshot'&&p.snapshot.chat?.some(m=>m.text==='Готов к бою'));
  a.send(JSON.stringify({type:'action',action:'chat',item:'Готов к бою'}));
  assert.equal((await receipt).ok,true);const state=(await delivered).snapshot;
  assert.equal(state.state,'waiting');assert.equal(state.chat[0].playerId,host.id);
  const change=nextPacket(b,p=>p.type==='snapshot'&&p.snapshot.difficulty==='hard');
  a.send(JSON.stringify({type:'action',action:'difficulty',item:'hard'}));assert.equal((await change).snapshot.difficulty,'hard');
});
test('Chat history remains bounded and ordered after many messages',async t=>{
  let now=Date.now();t.mock.method(Date,'now',()=>now);
  const {post,join}=await setup(t);const host=await join({name:'Host'});
  for(let i=1;i<=45;i++){now+=800;assert.equal((await post('/api/action',{type:'chat',item:'Message '+i},host.token)).data.ok,true);}
  const guest=await join({room:host.room});assert.equal(guest.snapshot.chat.length,40);
  assert.equal(guest.snapshot.chat[0].text,'Message 6');assert.equal(guest.snapshot.chat.at(-1).text,'Message 45');
  assert.equal(new Set(guest.snapshot.chat.map(m=>m.id)).size,40);
});
