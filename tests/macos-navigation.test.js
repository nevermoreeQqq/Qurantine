const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {isTrustedNavigation}=require('../desktop/navigation.cjs');
const address='http://localhost:5173';
const launcher=path.join(os.tmpdir(),'Карантин Mac','launcher #1.html');

test('Launcher IPC accepts absolute macOS paths with Cyrillic, spaces and escaped characters',()=>{
  assert.equal(isTrustedNavigation(pathToFileURL(launcher).href,address,launcher),true);
  assert.equal(isTrustedNavigation(address+'/?desktop=1',address,launcher),true);
});

test('Launcher IPC rejects unrelated local files, remote origins and invalid URLs',()=>{
  for(const url of [pathToFileURL(launcher+'.other').href,'https://example.com/','http://localhost:5174/','file://example.com/launcher.html','data:text/html,hello','not a URL'])
    assert.equal(isTrustedNavigation(url,address,launcher),false,url);
});
