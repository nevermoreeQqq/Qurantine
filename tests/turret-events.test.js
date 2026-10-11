const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,TURRETS}=require('../simulation.js');

test('Event payloads cannot overwrite the sequence or event type',()=>{
  const g=new Simulation(()=>.5);
  g.event('turretShot',{id:'solo',type:'tank'});
  g.event('joined',{id:999});
  assert.deepEqual(g.events.map(e=>e.id),[1,2]);
  assert.equal(g.events[0].type,'turretShot');
  assert.equal(g.events[0].enemyType,'tank');
});

for(const owner of ['solo','1'])for(const type of Object.keys(TURRETS)){
  test(`${type} events are consumed once and firing stays bounded for owner ${owner}`,()=>{
    const g=new Simulation(()=>.5);
    g.addPlayer(owner);
    g.barriers=[{id:900,type,x:1240,y:875,w:52,h:52,hp:TURRETS[type].hp,fireTimer:0,owner}];
    const enemy=g.spawn('tank');Object.assign(enemy,{x:1340,y:901,hp:1e6});
    let lastEvent=0,consumed=0,emitted=0;
    const emit=g.event.bind(g);
    g.event=(event,data)=>{emit(event,data);if(event.startsWith('turret'))emitted++;};
    for(let frame=0;frame<600;frame++){
      g.tickTurrets(1/60);
      const events=g.snapshot(owner).events;
      for(const e of events){if(e.id<=lastEvent)continue;lastEvent=e.id;if(e.type.startsWith('turret'))consumed++;}
      const once=consumed;
      for(const e of events){if(e.id<=lastEvent)continue;lastEvent=e.id;if(e.type.startsWith('turret'))consumed++;}
      assert.equal(consumed,once,'rendering the same snapshot must not replay effects');
    }
    assert.equal(consumed,emitted);
    const barrels=type==='turretFlame'?1:TURRETS[type].barrels;
    assert.ok(emitted>0&&emitted<=Math.ceil(10/TURRETS[type].interval)*barrels);
    assert.equal(g.bullets.length,type==='turretFlame'?0:emitted);
  });
}
