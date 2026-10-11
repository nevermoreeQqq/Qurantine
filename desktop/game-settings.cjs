const fs=require('node:fs'),path=require('node:path');
const {Bindings,DEFAULTS}=require('../controls.js');
const KEYS=['quarantine-controls-v3','quarantine-interface-keys-v1','quarantine-audio-v3','quarantine-display-v1'];
function normalize(key,value){
  if(key==='quarantine-interface-keys-v1')return value===true;
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Неверные настройки');
  if(key==='quarantine-controls-v3'){
    const map=Object.fromEntries(Object.keys(DEFAULTS).filter(k=>typeof value[k]==='string'&&/^[A-Za-z0-9]+$/.test(value[k])&&value[k].length<40).map(k=>[k,value[k]]));
    return new Bindings(map).map;
  }
  if(key==='quarantine-audio-v3')return {music:value.music!==false,effects:value.effects!==false,volume:Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.32,effectsVolume:Number.isFinite(value.effectsVolume)?Math.max(0,Math.min(1,value.effectsVolume)):1};
  if(key==='quarantine-display-v1')return {fullscreen:value.fullscreen===true};
  throw Error('Неизвестные настройки');
}
function createGameSettings(dataRoot){
  const file=path.join(dataRoot,'game-settings.json');let values={};
  try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));for(const key of KEYS)if(Object.hasOwn(saved,key)){try{values[key]=normalize(key,saved[key]);}catch{}}}catch{}
  const get=()=>JSON.parse(JSON.stringify(values));
  return {get,save(key,value){const clean=normalize(key,value),next={...values,[key]:clean};fs.mkdirSync(dataRoot,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(next,null,2));fs.renameSync(file+'.tmp',file);values=next;return get();}};
}
module.exports={createGameSettings,normalize,KEYS};
