// Local preview only. The Yandex archive uses /sdk.js supplied by the platform.
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../release/web');
const port=Number(process.env.QUARANTINE_WEB_PORT||8182);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
let sdk;
http.createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/sdk.js'){
      // The official Yandex development adapter provides test SDK responses.
      // Serve it over HTTP on localhost so a self-signed certificate is unnecessary.
      if(!sdk){const response=await fetch('https://yastatic.net/s3/games-static/sdk-dev/yandex-dev-adapter.js');if(!response.ok)throw Error('SDK adapter HTTP '+response.status);sdk=await response.text();}
      res.setHeader('Content-Type','text/javascript');res.end(sdk);return;
    }
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
  }catch(error){res.writeHead(503);res.end('Preview unavailable: '+error.message);}
}).listen(port,'127.0.0.1',()=>console.log('Development SDK preview: http://localhost:'+port));
