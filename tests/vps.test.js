const test=require('node:test');
const assert=require('node:assert/strict');
const {createGameServer}=require('../server.js');

test('Public VPS address survives a reverse proxy and room cap still allows friends to join',async t=>{
  const server=createGameServer({publicAddress:'http://195.19.213.215',roomLimit:1});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const info=await (await fetch(base+'/api/info')).json();
  assert.deepEqual(info.addresses,['http://195.19.213.215']);
  const join=body=>fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const first=await join({name:'Host',maxPlayers:4});assert.equal(first.status,200);const room=(await first.json()).room;
  const full=await join({name:'Another host'});assert.equal(full.status,503);
  for(let i=0;i<3;i++){const friend=await join({name:'Friend '+i,room});assert.equal(friend.status,200);}
  const fifth=await join({name:'Fifth',room});assert.equal(fifth.status,409);
});

test('Invalid hosting settings are rejected before listening',()=>{
  for(const roomLimit of [0,31,NaN,1.5])assert.throws(()=>createGameServer({roomLimit}),/Лимит комнат/);
  for(const publicAddress of ['file:///tmp','https://user:password@example.com','https://example.com/private','https://example.com/?secret=1'])assert.throws(()=>createGameServer({publicAddress}));
});

test('Three independent rooms stay joinable at capacity and immediately release their last departed player',async t=>{
  const server=createGameServer({roomLimit:3});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const join=async body=>{const r=await fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
  const leave=async player=>assert.equal((await fetch(base+'/api/leave',{method:'POST',headers:{'X-Session':player.token}})).status,200);
  const hosts=[];for(let i=0;i<3;i++){const r=await join({name:'Host '+i,maxPlayers:4});assert.equal(r.status,200);hosts.push(r.data);}
  assert.equal(new Set(hosts.map(h=>h.room)).size,3);
  const info=await(await fetch(base+'/api/info')).json();assert.equal(info.roomLimit,3);assert.equal(info.roomsActive,3);
  const fourth=await join({name:'Fourth host'});assert.equal(fourth.status,503);assert.match(fourth.data.error,/\(3\)/);
  const friends=[];for(const host of hosts){const r=await join({name:'Friend',room:host.room});assert.equal(r.status,200);friends.push(r.data);assert.equal(r.data.snapshot.players.length,2);}
  await leave(hosts[0]);assert.equal((await join({name:'Still full'})).status,503);
  await leave(friends[0]);assert.equal((await(await fetch(base+'/api/info')).json()).roomsActive,2);
  const replacement=await join({name:'Replacement'});assert.equal(replacement.status,200);
  assert.equal((await join({name:'Stale invite',room:hosts[0].room})).status,404);
  assert.equal((await join({name:'Other room still works',room:hosts[1].room})).status,200);
});
