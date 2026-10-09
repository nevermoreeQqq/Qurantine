'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'release/web');
const files=['style.css','game.js','core.js','content.js','controls.js','music.js','render.js','simulation.js','terrain.js','netcode.js','web/platform.js','web/platform.css'];
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function zip(entries){
  const parts=[],directory=[];let offset=0;
  for(const [name,bytes]of entries){const filename=Buffer.from(name),compressed=zlib.deflateRawSync(bytes),crc=crc32(bytes),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
    parts.push(header,filename,compressed);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);directory.push(central,filename);offset+=header.length+filename.length+compressed.length;
  }
  const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...parts,central,end]);
}
function build(destination=output){
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  if(!html.includes('<script src="core.js"></script>'))throw Error('Missing engine entry point');
  html=html.replace('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="web/platform.css">');
  html=html.replace('<script src="core.js"></script>','<script src="web/platform.js"></script>\n  <script src="core.js"></script>');
  const entries=[['index.html',Buffer.from(html)],...files.map(name=>[name,fs.readFileSync(path.join(root,name))])];
  const size=entries.reduce((sum,[,bytes])=>sum+bytes.length,0);if(size>100*1024*1024)throw Error('Web build exceeds 100 MB');
  fs.mkdirSync(destination,{recursive:true});for(const [name,bytes]of entries){const target=path.join(destination,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
  const archive=path.join(path.dirname(destination),'Quarantine-6.0.1-YandexGames.zip');fs.writeFileSync(archive,zip(entries));
  return{directory:destination,archive,files:entries.length,uncompressedBytes:size,compressedBytes:fs.statSync(archive).size};
}
if(require.main===module)console.log(JSON.stringify(build(),null,2));
module.exports={build,zip,crc32};
