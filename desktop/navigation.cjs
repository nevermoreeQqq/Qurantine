const {fileURLToPath}=require('node:url');

function isTrustedNavigation(url,gameAddress,launcherFile){
  try{
    const parsed=new URL(url);
    return parsed.origin===gameAddress||parsed.protocol==='file:'&&fileURLToPath(parsed)===launcherFile;
  }catch{return false;}
}

module.exports={isTrustedNavigation};
