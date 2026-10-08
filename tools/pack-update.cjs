const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {FILES}=require('../desktop/updater.cjs');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const source=path.resolve(arg('--source',path.join(__dirname,'..'))),pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json'))),version=pkg.version;
const keyDir=path.join(os.homedir(),'.quarantine-dev'),privateFile=path.join(keyDir,'signing-key.pem'),publicFile=path.join(__dirname,'../update-public.pem');fs.mkdirSync(keyDir,{recursive:true});
if(!fs.existsSync(privateFile)){const key=crypto.generateKeyPairSync('ed25519');fs.writeFileSync(privateFile,key.privateKey.export({type:'pkcs8',format:'pem'}));fs.writeFileSync(publicFile,key.publicKey.export({type:'spki',format:'pem'}));}
const privateKey=fs.readFileSync(privateFile);if(!fs.existsSync(publicFile))fs.writeFileSync(publicFile,crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'}));
const files=Object.fromEntries(FILES.map(f=>[f,fs.readFileSync(path.join(source,f)).toString('base64')]));
const protocol=Number(/const VERSION=(\d+)/.exec(fs.readFileSync(path.join(source,'content.js'),'utf8'))[1]);
const payload=zlib.brotliCompressSync(Buffer.from(JSON.stringify({files})),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:7}});
const format=1,message=Buffer.concat([Buffer.from(`${format}\n${version}\n${protocol}\n`),payload]);
const archive={format,version,protocol,payload:payload.toString('base64'),signature:crypto.sign(null,message,privateKey).toString('base64')};
const output=path.resolve(arg('--output',path.join(__dirname,`../release/Quarantine-Update-${version}.qtu`)));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(archive));console.log('Обновление '+version+' → '+output+' ('+fs.statSync(output).size+' байт)');
