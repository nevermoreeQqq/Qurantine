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
