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
