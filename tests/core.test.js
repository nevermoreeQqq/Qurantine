const test = require('node:test');
const assert = require('node:assert/strict');
const {circleRect,segmentCircle,segmentRect,blastDamage} = require('../core.js');
test('Fast bullets hit an enemy even when they cross it in one frame', () => {
  assert.equal(segmentCircle(0,0,200,0,100,0,20),.4);
  assert.equal(segmentCircle(0,30,200,30,100,0,20),null);
  assert.equal(segmentCircle(100,0,200,0,100,0,20),0);
});
test('Walls intercept shots before enemies behind them', () => {
  const wall={x:50,y:-20,w:15,h:40};
  assert.ok(segmentRect(0,0,200,0,wall)<segmentCircle(0,0,200,0,120,0,15));
  assert.equal(segmentRect(0,30,200,30,wall),null);
  assert.equal(segmentRect(55,-40,55,40,wall),.25);
});
test('Character collision respects the edges and corners of obstacles', () => {
  const wall={x:100,y:100,w:50,h:50};
  assert.equal(circleRect(90,120,11,wall),true);
  assert.equal(circleRect(89,120,11,wall),false);
  assert.equal(circleRect(92,92,10,wall),false);
  assert.equal(circleRect(95,95,10,wall),true);
});
test('Grenade damage falls off and stops at blast radius', () => {
  assert.equal(blastDamage(0),180);
  assert.equal(blastDamage(95),90);
  assert.equal(blastDamage(190),0);
  assert.equal(blastDamage(500),0);
  assert.equal(blastDamage(0,145,52),52);
});
