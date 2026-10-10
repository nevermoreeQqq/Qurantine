const test=require('node:test');
const assert=require('node:assert/strict');
const {Bindings,LABELS,matchesBinding}=require('../controls.js');
test('Shop, details and settings bindings preserve customized keys when upgrading saved controls',()=>{
  const bindings=new Bindings({grenade:'KeyH',fire:'F1',shop:'KeyB'});
  assert.equal(bindings.map.grenade,'KeyH');assert.equal(bindings.map.fire,'F1');
  assert.equal(new Set(Object.values(bindings.map)).size,Object.keys(bindings.map).length);
  assert.ok(bindings.map.hudDetails);assert.ok(bindings.map.settings);
  bindings.bind('hudDetails','KeyB');assert.equal(bindings.action('KeyB'),'hudDetails');
  const restored=new Bindings(JSON.parse(JSON.stringify(bindings.map)));
  assert.equal(restored.action('KeyB'),'hudDetails');assert.equal(restored.map.shop,bindings.map.shop);
});
test('Binding search accepts names, multiple words, key codes and rebinding without matching stale keys',()=>{
  assert.ok(matchesBinding(LABELS.grenade,'KeyG',' БРОСИТЬ гранату '));
  assert.ok(matchesBinding(LABELS.turretHeavy,'KeyK','тяжелую турель'));
  assert.ok(matchesBinding(LABELS.fire,'Mouse0','лкм'));
  assert.ok(matchesBinding(LABELS.hudDetails,'KeyH','подробнее H'));
  assert.ok(matchesBinding(LABELS.settings,'F1','F1'));
  assert.equal(matchesBinding(LABELS.reload,'KeyR','турель'),false);
  const bindings=new Bindings();bindings.bind('grenade','KeyH');
  assert.ok(matchesBinding(LABELS.grenade,bindings.map.grenade,'KeyH'));
  assert.equal(matchesBinding(LABELS.grenade,bindings.map.grenade,'KeyG'),false);
  assert.ok(matchesBinding(LABELS.reload,'KeyR',''));
});
