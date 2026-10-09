const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const FILES=['index.html','style.css','game.js','core.js','content.js','controls.js','music.js','render.js','simulation.js','terrain.js','netcode.js','server.js','package.json'];
const compare=(a,b)=>{const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){const d=aa[i]-bb[i];if(d)return d;}return 0;};
function readBundle(buffer,publicKey){
  if(buffer.length>8*1024*1024)throw Error('Файл обновления слишком большой');
  const archive=JSON.parse(buffer.toString());
  if(archive.format!==1||!/^\d+\.\d+\.\d+$/.test(archive.version)||!Number.isSafeInteger(archive.protocol))throw Error('Неподдерживаемый файл обновления');
  const payload=Buffer.from(archive.payload,'base64'),message=Buffer.concat([Buffer.from(`${archive.format}\n${archive.version}\n${archive.protocol}\n`),payload]);
  if(!crypto.verify(null,message,publicKey,Buffer.from(archive.signature,'base64')))throw Error('Подпись обновления неверна');
  const data=JSON.parse(zlib.brotliDecompressSync(payload,{maxOutputLength:20*1024*1024}).toString());
  if(!data.files||FILES.some(f=>typeof data.files[f]!=='string')||Object.keys(data.files).some(f=>!FILES.includes(f)))throw Error('Неверный состав обновления');
  const files=Object.fromEntries(FILES.map(f=>[f,Buffer.from(data.files[f],'base64')]));
  const pkg=JSON.parse(files['package.json']);if(pkg.version!==archive.version)throw Error('Версия содержимого отличается');
  if(Number(/const VERSION=(\d+)/.exec(files['content.js'].toString())?.[1])!==archive.protocol)throw Error('Неверный протокол версии');
  return{...archive,files,buffer};
}
function createUpdater({baseRoot,dataRoot,downloads,extraDirs=[],publicKey}){
  const archives=path.join(dataRoot,'archives'),runtimes=path.join(dataRoot,'versions'),configFile=path.join(dataRoot,'launcher.json');fs.mkdirSync(archives,{recursive:true});fs.mkdirSync(runtimes,{recursive:true});
  let config={source:'',active:null};try{config={...config,...JSON.parse(fs.readFileSync(configFile))};}catch{}
  const save=()=>fs.writeFileSync(configFile,JSON.stringify(config));
  const baseVersion=JSON.parse(fs.readFileSync(path.join(baseRoot,'package.json'))).version;
  // A newly installed application takes precedence over a previous launcher's rollback.
  if(config.baseVersion!==baseVersion&&config.active&&compare(config.active,baseVersion)<0)config.active=null;
  config.baseVersion=baseVersion;save();
  let current=baseVersion,installed=current;
  const bundles=new Map();
  function scan(){for(const dir of [path.join(baseRoot,'assets'),archives,downloads,...extraDirs]){if(!dir)continue;let names;try{names=fs.readdirSync(dir);}catch{continue;}for(const name of names){if(!/^((Quarantine-Update-\d+\.\d+\.\d+)|update(-\d+\.\d+\.\d+)?)\.qtu$/.test(name))continue;try{const file=path.join(dir,name),bundle=readBundle(fs.readFileSync(file),publicKey);bundles.set(bundle.version,{...bundle,file});}catch{}}}}
  scan();
  function activate(bundle){
    if(bundle.version===baseVersion){fs.writeFileSync(path.join(archives,`Quarantine-Update-${bundle.version}.qtu`),bundle.buffer);config.active=bundle.version;save();installed=bundle.version;return baseRoot;}
    const destination=path.resolve(runtimes,bundle.version);if(path.dirname(destination)!==path.resolve(runtimes))throw Error('Неверный путь версии');
    // The archive is verified before any executable game files are written.
    fs.mkdirSync(destination,{recursive:true});for(const [file,data]of Object.entries(bundle.files)){const target=path.resolve(destination,file);if(path.dirname(target)!==destination)throw Error('Неверный путь файла');fs.writeFileSync(target,data);}
    fs.writeFileSync(path.join(archives,`Quarantine-Update-${bundle.version}.qtu`),bundle.buffer);config.active=bundle.version;save();installed=bundle.version;return destination;
  }
  let runtimeRoot=baseRoot;
  if(config.active&&bundles.has(config.active)){try{runtimeRoot=activate(bundles.get(config.active));current=config.active;}catch{config.active=null;save();}}
  function setSource(value){const raw=String(value||'').trim();if(!raw){config.source='';save();return;}const url=new URL(raw.includes('://')?raw:'http://'+raw);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Нужен адрес http:// или https://');config.source=url.origin;save();}
  let remote=[];
  async function refresh(source){if(source!==undefined)setSource(source);scan();remote=[];let error='';if(config.source){try{const response=await fetch(config.source+'/updates/catalog.json',{signal:AbortSignal.timeout(4000)});if(!response.ok)throw Error('Сервер обновлений не отвечает');const raw=await response.json();remote=(Array.isArray(raw.versions)?raw.versions:[]).filter(v=>/^\d+\.\d+\.\d+$/.test(v.version)&&Number.isSafeInteger(v.protocol)).map(v=>({version:v.version,protocol:v.protocol,notes:String(v.notes||'').slice(0,500),remote:true}));}catch(e){error='Источник обновлений недоступен. Доступны сохранённые версии.';}}
    const list=new Map([...bundles].map(([version,b])=>[version,{version,protocol:b.protocol,local:true,notes:b.version.startsWith('6.')?'Ночь, адские мутанты, новая оборона и круговые меню.':b.version.startsWith('5.')?'Режимы сложности, турели, круговое строительство и новый арсенал.':'Предыдущая версия игры.'}]));for(const v of remote)list.set(v.version,{...list.get(v.version),...v});
    list.set(baseVersion,{version:baseVersion,protocol:Number(baseVersion.split('.')[0]),local:true,notes:'Встроенная версия приложения'});
    if(!list.has(current))list.set(current,{version:current,protocol:Number(current.split('.')[0]),local:true,notes:'Установленная версия'});
    const versions=[...list.values()].sort((a,b)=>compare(b.version,a.version));return{current,installed,latest:versions[0]?.version||current,available:compare(versions[0]?.version||current,current)>0,versions,source:config.source,error};
  }
  async function install(version,onProgress=()=>{},allowDowngrade=false){
    if(!/^\d+\.\d+\.\d+$/.test(String(version)))throw Error('Неверная версия');if(!allowDowngrade&&compare(version,current)<=0)throw Error('Последняя версия уже установлена');
    if(version===baseVersion){config.active=null;save();installed=version;onProgress(100);return{version,restart:true};}
    scan();let bundle=bundles.get(version);
    if(!bundle){if(!config.source||!remote.some(v=>v.version===version))throw Error('Версия недоступна. Укажи сервер хозяина или добавь файл обновления в Загрузки.');
      const response=await fetch(config.source+'/updates/'+version+'.qtu',{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Не удалось скачать обновление');const reader=response.body.getReader(),chunks=[];let size=0;const total=Number(response.headers.get('content-length'))||0;
      for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024){await reader.cancel();throw Error('Обновление слишком большое');}chunks.push(Buffer.from(value));onProgress(total?Math.min(95,Math.round(size/total*95)):50);}bundle=readBundle(Buffer.concat(chunks),publicKey);if(bundle.version!==version)throw Error('Сервер прислал другую версию');bundles.set(version,bundle);
    }
    onProgress(96);activate(bundle);onProgress(100);return{version,restart:true};
  }
  function importFile(file){const bundle=readBundle(fs.readFileSync(file),publicKey);fs.writeFileSync(path.join(archives,`Quarantine-Update-${bundle.version}.qtu`),bundle.buffer);bundles.set(bundle.version,bundle);return bundle.version;}
  async function handle(req,res,url){if(!url.pathname.startsWith('/updates/'))return false;if(req.method!=='GET'){res.writeHead(405);res.end();return true;}scan();
    if(url.pathname==='/updates/catalog.json'){const versions=[...bundles.values()].map(b=>({version:b.version,protocol:b.protocol,notes:b.version.startsWith('6.')?'Ночь, адские мутанты, новая оборона и круговые меню.':b.version.startsWith('5.')?'Арсенал, режимы, турели и строительство.':'Предыдущая версия.'})).sort((a,b)=>compare(b.version,a.version));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({versions}));return true;}
    const match=/^\/updates\/(\d+\.\d+\.\d+)\.qtu$/.exec(url.pathname),bundle=match&&bundles.get(match[1]);if(!bundle){res.writeHead(404);res.end();return true;}res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bundle.buffer.length,'Cache-Control':'no-cache'});res.end(bundle.buffer);return true;
  }
  return{runtimeRoot,refresh,install,setSource,importFile,handle,compare,current:()=>current};
}
module.exports={FILES,compare,readBundle,createUpdater};
