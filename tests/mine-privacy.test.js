const test=require('node:test'),assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {Simulation}=require('../simulation.js');
const {createGameServer}=require('../server.js');
test('Personal mine visibility is preserved over join, SSE and WebSocket without leaking witness IDs',async t=>{
  let game;const server=createGameServer({simulationFactory:()=>game=new Simulation()});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,clients=[];
  t.after(()=>{for(const ws of clients)ws.terminate();server.closeAllConnections();server.close();});
  const join=async data=>(await (await fetch(base+'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json());
  const host=await join({name:'Witness'}),guest=await join({name:'Unaware',room:host.room});const p=game.players[0],q=game.players[1];q.x=2500;q.y=1700;game.plantMine({x:p.x+80,y:p.y});const mine=game.mines[0];assert.ok(mine.revealedTo.includes(host.id));
  const getFrame=async token=>{const ws=new WebSocket(base.replace('http:','ws:')+'/api/socket?token='+token);clients.push(ws);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Snapshot timeout')),3000);ws.once('message',data=>{clearTimeout(timer);resolve(JSON.parse(data).snapshot);});ws.once('error',reject);});};
  const a=await getFrame(host.token),b=await getFrame(guest.token);assert.equal(a.mines.length,1);assert.equal(b.mines.length,0);assert.ok(!('revealedTo'in a.mines[0]));
  const abort=new AbortController();t.after(()=>abort.abort());const r=await fetch(base+'/api/events?token='+guest.token,{signal:abort.signal}),reader=r.body.getReader(),chunk=await reader.read();const s=JSON.parse(new TextDecoder().decode(chunk.value).split('data: ')[1].split('\n\n')[0]);assert.equal(s.mines.length,0);await reader.cancel();
  const late=await join({name:'Late arrival',room:host.room});assert.equal(late.snapshot.mines.length,0);
});
