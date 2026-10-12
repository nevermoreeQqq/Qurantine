(function(root){
  'use strict';
  class Lifecycle {
    constructor(onPause=()=>{}){this.sdk=null;this.ready=false;this.loaded=false;this.wantGameplay=false;this.active=false;this.reasons=new Set();this.onPause=onPause;}
    get paused(){return this.reasons.size>0;}
    attach(sdk){
      this.sdk=sdk;
      sdk.on('game_api_pause',()=>{this.active=false;this.suspend('sdk',true);});
      sdk.on('game_api_resume',()=>{this.active=null;this.suspend('sdk',false);});
      this.flush();
    }
    suspend(reason,value){const was=this.paused;if(value)this.reasons.add(reason);else this.reasons.delete(reason);if(was!==this.paused)this.onPause(this.paused);this.flush();}
    setGameplay(value){this.wantGameplay=!!value;this.flush();}
    gameLoaded(){this.loaded=true;this.flush();}
    flush(){
      if(!this.sdk||!this.loaded)return;
      if(!this.ready){this.sdk.features.LoadingAPI.ready();this.ready=true;}
      const next=this.wantGameplay&&!this.paused;
      if(next!==this.active){this.sdk.features.GameplayAPI[next?'start':'stop']();this.active=next;}
    }
  }
  const SCHEMA=1,REVISION='quarantine-county-2';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const omitted=new Set(['random','flow','flowBlocked','flowQueue','blocked','flowCols','flowRows','flowTargetCell','events','players']);
  const unsafe=new Set(['__proto__','prototype','constructor']);
  function validJSON(value,depth=0){
    if(depth>24)return false;
    if(value===null||typeof value==='boolean'||typeof value==='string')return true;
    if(typeof value==='number')return Number.isFinite(value);
    if(Array.isArray(value))return value.length<=20000&&value.every(v=>validJSON(v,depth+1));
    if(!value||typeof value!=='object')return false;
    return Object.entries(value).every(([k,v])=>!unsafe.has(k)&&validJSON(v,depth+1));
  }
  const SaveCodec={
    create(sim){
      if(sim.state!=='playing'||sim.players.length!==1||sim.players[0].hp<=0)throw Error('Сохранить можно только живого бойца в одиночной операции.');
      const state={};
      for(const [key,value]of Object.entries(sim))if(!omitted.has(key))state[key]=value;
      const {input,commands,reserve,...player}=sim.players[0];
      return clone({schema:SCHEMA,revision:REVISION,state,player});
    },
    restore(data,engine){
      const {Simulation,WEAPONS,GRENADES,STATS,WORLD}=engine;
      if(!data||data.schema!==SCHEMA||data.revision!==REVISION||!validJSON(data)||data.state?.state!=='playing'||!Number.isFinite(data.player?.hp)||data.player.hp<=0||data.player.hp>100||!Number.isFinite(data.player.x)||!Number.isFinite(data.player.y)||!['easy','normal','hard'].includes(data.state.difficulty))throw Error('Сохранение повреждено или создано другой версией игры.');
      const sim=new Simulation(Math.random,{difficulty:data.state.difficulty});
      const player=sim.addPlayer('solo',data.player.name);
      for(const [key,value]of Object.entries(sim)){if(omitted.has(key))continue;const saved=data.state[key];if(saved===undefined||(typeof value==='number'&&typeof saved!=='number')||(typeof value==='boolean'&&typeof saved!=='boolean')||(Array.isArray(value)&&!Array.isArray(saved)))throw Error('Сохранение повреждено.');}
      if(!Object.hasOwn(WEAPONS,data.player.weapon)||!Object.hasOwn(GRENADES,data.player.nadeType)||!Array.isArray(data.player.owned)||data.player.owned.some(id=>!Object.hasOwn(WEAPONS,id))||data.player.x<0||data.player.y<0||data.player.x>WORLD.w||data.player.y>WORLD.h||data.state.enemies.some(e=>!e||!Object.hasOwn(STATS,e.type)||!Number.isFinite(e.x)||!Number.isFinite(e.y))||!data.player.clips||!data.player.ammo||!data.player.nades)throw Error('Сохранение повреждено.');
      for(const key of Object.keys(sim))if(!omitted.has(key)&&Object.hasOwn(data.state,key))sim[key]=clone(data.state[key]);
      for(const [key,value]of Object.entries(data.player))if(!['id','reserve','input','commands'].includes(key))player[key]=clone(value);
      player.id='solo';player.input={dx:0,dy:0,angle:player.angle,shoot:false,repair:false,sprint:false};
      player.commands=undefined;player.queued=0;player.budget=0;
      sim.players=[player];sim.events=[];sim.flowTimer=0;sim.flow=[];
      return sim;
    }
  };
  class Records {
    constructor(data,write){this.data={};this.write=write;for(const mode of ['easy','normal','hard']){const row=data?.[mode]||{};this.data[mode]={wave:Math.max(0,Number(row.wave)||0),kills:Math.max(0,Number(row.kills)||0)};}}
    update(world){const p=world.players?.find(p=>p.id==='solo');if(!p||world.state==='waiting')return;const old=this.data[world.difficulty];if(!old)return;const next={wave:Math.max(old.wave,world.wave||0),kills:Math.max(old.kills,p.kills||0)};if(next.wave!==old.wave||next.kills!==old.kills){this.data[world.difficulty]=next;this.write(this.data);}}
  }
  const api={Lifecycle,SaveCodec,Records};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.QuarantineWeb=api;
  const $=id=>document.getElementById(id);
  const storage={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}},remove(key){try{localStorage.removeItem(key);}catch{}}};
  const progressKey='quarantine-web-operation-v1';
  let records=new Records(null,value=>storage.set('quarantine-web-records-v1',value));
  const lifecycle=new Lifecycle(value=>bridge.onSuspend?.(value));
  let gameLoaded=false,game=null,initializing=false;
  const loadedScripts=new Set();
  const bridge=root.quarantinePlatform={
    soloOnly:true,
    get paused(){return lifecycle.paused;},
    setSuspended:(reason,value)=>lifecycle.suspend(reason,value),
    setGameplay:value=>lifecycle.setGameplay(value),
    setView(mode){const menu=mode==='menu';if(document.documentElement.classList.contains('in-menu')!==menu)document.documentElement.classList.toggle('in-menu',menu);},
    onSuspend:null,
    record(world){records.update(world);this.showRecords(world.difficulty);if(world.state==='over'){storage.remove(progressKey);this.refreshSave();}},
    showRecords(mode){const r=records.data[mode]||records.data.normal;const text=r.wave?'РЕКОРДЫ · ВОЛНА '+r.wave+' · УСТРАНЕНО '+r.kills:'КАЖДАЯ ВОЛНА — НОВЫЙ ШАНС ВЫЖИТЬ';if($('best-line').textContent!==text)$('best-line').textContent=text;},
    save(sim,notify=false){try{const data=SaveCodec.create(sim);if(!storage.set(progressKey,data))throw Error('Браузер запретил сохранение. Разреши хранение данных сайта.');this.refreshSave();if(notify)game.toast('Операция сохранена. Можно закрыть страницу.');return true;}catch(error){if(notify)game.toast(error.message);return false;}},
    discard(){storage.remove(progressKey);this.refreshSave();},
    refreshSave(){const data=storage.get(progressKey);$('continue-operation').hidden=!data;$('continue-operation').textContent='ПРОДОЛЖИТЬ · ВОЛНА '+(data?.state?.wave||1);},
    loaded(callbacks){game=callbacks;gameLoaded=true;this.showRecords(game.difficulty());this.refreshSave();if(lifecycle.sdk)finish();},
    restore(){return SaveCodec.restore(storage.get(progressKey),root.GameSimulation);}
  };
  document.documentElement.classList.add('yandex-game','in-menu');
  for(const selector of ['.server-row','.party-selector','.coop-lobby','#update-button','#launcher-button','#update-overlay','#network-status'])document.querySelector(selector)?.classList.add('web-hidden');
  const resume=document.createElement('button');resume.id='continue-operation';resume.className='start-button continue-operation';resume.hidden=true;resume.addEventListener('click',()=>{try{game.resume(bridge.restore());}catch(error){game.toast(error.message);}});$('start').after(resume);
  const save=document.createElement('button');save.id='save-operation';save.className='text-button';save.textContent='СОХРАНИТЬ ОПЕРАЦИЮ';save.addEventListener('click',()=>bridge.save(game.sim(),true));$('resume').after(save);
  const note=document.createElement('p');note.className='save-note';note.textContent='Сохранить текущую операцию: меню → «Сохранить операцию». Рекорды сохраняются автоматически. Новая операция заменяет сохранение.';document.querySelector('.intro-controls').before(note);
  const boot=document.createElement('div');boot.id='platform-loading';boot.className='platform-loading';const box=document.createElement('div');box.className='platform-loading-card';const title=document.createElement('strong');title.textContent='КАРАНТИН';const text=document.createElement('p');text.textContent='Подключение к Яндекс Играм…';const retry=document.createElement('button');retry.textContent='ПОВТОРИТЬ';retry.hidden=true;retry.addEventListener('click',initialize);box.append(title,text,retry);boot.append(box);document.body.append(boot);
  function finish(){if(!gameLoaded)return;const requested=lifecycle.sdk.environment.i18n.lang,supported=['ru'];bridge.language=supported.includes(requested)?requested:supported[0];document.documentElement.lang=bridge.language;boot.remove();lifecycle.gameLoaded();}
  async function initialize(){
    if(initializing)return;initializing=true;retry.hidden=true;text.textContent='Подключение к Яндекс Играм…';
    try{
      if(!root.YaGames){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/sdk.js';script.async=true;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Не удалось загрузить SDK Яндекс Игр. Проверь подключение и повтори попытку.'));};document.head.append(script);});}
      if(!lifecycle.sdk){
        const sdk=await root.YaGames.init();lifecycle.attach(sdk);
        records=new Records(storage.get('quarantine-web-records-v1'),value=>storage.set('quarantine-web-records-v1',value));
      }
      for(const entry of document.querySelectorAll('script[data-src]')){
        const src=entry.getAttribute('data-src');if(loadedScripts.has(src))continue;
        await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=()=>{loadedScripts.add(src);resolve();};script.onerror=()=>{script.remove();reject(Error('Не удалось загрузить игру. Проверь подключение и повтори попытку.'));};document.body.append(script);});
      }
      if(!gameLoaded)throw Error('Игра не запустилась. Повтори загрузку страницы.');
      finish();
    }catch(error){text.textContent=error.message||'Не удалось подключиться к Яндекс Играм.';retry.hidden=false;}
    finally{initializing=false;}
  }
  initialize();
})(typeof window!=='undefined'?window:globalThis);
