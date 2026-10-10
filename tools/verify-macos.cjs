const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');

const arch=process.argv[2]||process.arch;
if(!['x64','arm64'].includes(arch)||process.platform!=='darwin')throw Error('Run on macOS with x64 or arm64');
const app=path.resolve(__dirname,'../release',arch==='arm64'?'mac-arm64':'mac','Quarantine.app');
const executable=path.join(app,'Contents/MacOS/Quarantine');
if(!fs.existsSync(executable))throw Error('Build the application first: '+executable);
function run(command,args,timeout=60000){
  const result=spawnSync(command,args,{encoding:'utf8',timeout});
  if(result.status!==0)throw Error([command,result.error?.message,result.stdout,result.stderr].filter(Boolean).join('\n'));
  return result.stdout;
}
run('codesign',['--verify','--deep','--strict',app]);
const actual=run('lipo',['-archs',executable]).trim();
if(actual!==(arch==='x64'?'x86_64':'arm64'))throw Error('Unexpected architecture: '+actual);
if(process.arch!==arch){
  console.log('Signature and '+actual+' verified. Native launch must be checked on a '+arch+' Mac.');
  process.exit(0);
}
const output=run(executable,['--smoke-test'],45000);
if(!output.includes('DESKTOP_SMOKE'))throw Error('Desktop smoke result is missing');
console.log(output.trim());
console.log('Native macOS '+arch+' application passed.');

// Development-tree launch does not reproduce the first launch of a downloaded DMG.
const version=require('../package.json').version;
const dmg=process.argv[3]?path.resolve(process.argv[3]):path.resolve(__dirname,'../release',`Quarantine-${version}-macOS-${arch}.dmg`);
const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'quarantine-dmg-'));
const mount=path.join(temp,'mounted'),fixture=path.join(temp,'downloaded');
fs.mkdirSync(mount);fs.mkdirSync(fixture);
let mounted=false;
try{
  run('hdiutil',['attach','-nobrowse','-readonly','-mountpoint',mount,dmg]);mounted=true;
  for(const name of ['Quarantine.app','Install-Quarantine.command','READ-ME-FIRST.txt']){
    if(!fs.existsSync(path.join(mount,name)))throw Error('DMG is missing '+name);
    run('ditto',[path.join(mount,name),path.join(fixture,name)]);
  }
  run('xattr',['-w','com.apple.quarantine','0081;00000000;QuarantineInstallTest;',path.join(fixture,'Quarantine.app')]);
  const installed=run('/bin/bash',[path.join(fixture,'Install-Quarantine.command'),'--test'],120000);
  if(!installed.includes('MACOS_INSTALL_OK'))throw Error('Downloaded-app installation test did not finish');
  console.log(installed.trim());
  console.log('Downloaded DMG installation and game entry passed.');
}finally{
  if(mounted)run('hdiutil',['detach',mount]);
  fs.rmSync(temp,{recursive:true,force:true});
}
