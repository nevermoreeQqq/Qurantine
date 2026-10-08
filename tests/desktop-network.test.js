const test=require('node:test');
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {VERSION}=require('../content.js');
const {createGameServer}=require('../server.js');

test('Desktop clients on a different local port can join remotely over HTTP and WebSocket',async t=>{
  const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,origin='http://localhost:5174';
  t.after(()=>{server.closeAllConnections();server.close();});
  const preflight=await fetch(base+'/api/join',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-session'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  const join=await fetch(base+'/api/join',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({version:VERSION,name:'Desktop guest'})});
  assert.equal(join.status,200);assert.equal(join.headers.get('Access-Control-Allow-Origin'),origin);
  const player=await join.json(),ws=new WebSocket(base.replace('http:','ws:')+'/api/socket?token='+player.token,{origin});
  t.after(()=>ws.terminate());
  const snapshot=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No desktop snapshot')),3000);ws.once('message',data=>{clearTimeout(timeout);resolve(JSON.parse(data));});ws.once('error',reject);});
  assert.equal(snapshot.type,'snapshot');assert.equal(snapshot.snapshot.players[0].name,'Desktop guest');
  const denied=await fetch(base+'/api/info',{headers:{Origin:'http://untrusted.invalid'}});assert.equal(denied.status,403);
});

test('Server advertises its active port, serves desktop assets and rejects incompatible versions',async t=>{
  const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;t.after(()=>{server.closeAllConnections();server.close();});
  const info=await (await fetch(base+'/api/info')).json();assert.equal(info.version,VERSION);
  for(const address of info.addresses)assert.equal(new URL(address).port,String(server.address().port));
  for(const file of ['content.js','controls.js','music.js','render.js']){const r=await fetch(base+'/'+file);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);assert.ok((await r.text()).length>500);}
  const incompatible=await fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:VERSION-1})});
  assert.equal(incompatible.status,409);assert.match((await incompatible.json()).error,/Обновите приложение/);
});
