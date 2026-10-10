// Produces the short launcher news clip using the real simulation and game sprites.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 640, height: 480, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false } });
  await window.loadURL('data:text/html,<html><body style="margin:0;background:%2318241f"><canvas id="clip" width="640" height="480"></canvas></body></html>');
  for (const file of ['core.js', 'content.js', 'simulation.js', 'render.js']) await window.webContents.executeJavaScript(fs.readFileSync(path.join(root, file), 'utf8')+'\n;undefined;');
  const result = await window.webContents.executeJavaScript(`(async()=>{
    const canvas=document.getElementById('clip'),c=canvas.getContext('2d'),art=QuarantineArt();
    const game=new GameSimulation.Simulation(()=>.5),p=game.addPlayer('clip','Боец');game.start();game.pending=0;game.enemies=[];game.pickups=[];game.intermission=1000;
    p.hp=10000;const e=game.spawn('walker');Object.assign(e,{x:1420,y:900,special:100,attack:0});
    const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:900000}),parts=[];
    const ended=new Promise(resolve=>{recorder.ondataavailable=event=>parts.push(event.data);recorder.onstop=async()=>{for(const track of stream.getTracks())track.stop();const bytes=new Uint8Array(await new Blob(parts,{type:'video/webm'}).arrayBuffer());let text='';for(let i=0;i<bytes.length;i++)text+=String.fromCharCode(bytes[i]);resolve(btoa(text));};});
    function frame(t){
      const dt=1/30;p.input={dx:t>2&&t<4?1:t>=4&&t<5.1?-1:0,dy:t>=5.1&&t<6.4?1:0,angle:Math.atan2(e.y-p.y,e.x-p.x),sprint:false};
      if(t>=5.1)e.frozen=1;if(t>=6.4&&e.hp>0&&Math.floor(t*8)%3===0)game.shoot(p,Math.floor(t*30));game.tick(dt);
      c.setTransform(1,0,0,1,0,0);c.fillStyle='#18241f';c.fillRect(0,0,640,480);
      c.strokeStyle='#304333';c.lineWidth=1;for(let x=0;x<640;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,480);c.stroke();}for(let y=0;y<480;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(640,y);c.stroke();}
      c.fillStyle='#29322c';c.fillRect(0,170,640,190);c.strokeStyle='#8c927255';c.setLineDash([26,20]);c.beginPath();c.moveTo(0,270);c.lineTo(640,270);c.stroke();c.setLineDash([]);
      c.save();c.translate(-880,-675);for(const enemy of game.enemies){art.enemy(c,enemy,t);c.strokeStyle='#d4dd9f55';c.beginPath();c.arc(enemy.x,enemy.y,enemy.r,0,Math.PI*2);c.stroke();}
      art.player(c,p,t,true,false);c.strokeStyle='#8bc3ce77';c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.stroke();
      for(const bullet of game.bullets){c.strokeStyle='#f1d58a';c.lineWidth=3;c.beginPath();c.moveTo(bullet.x,bullet.y);c.lineTo(bullet.x-bullet.vx*.015,bullet.y-bullet.vy*.015);c.stroke();}c.restore();
      c.fillStyle='#0b1210dd';c.fillRect(0,0,640,66);c.fillRect(0,397,640,83);c.fillStyle='#c9e77d';c.font='bold 18px Segoe UI';c.fillText('КАРАНТИН / КОНТАКТ БЕЗ ПЕРЕСЕЧЕНИЙ',24,40);
      c.fillStyle='#d6e0c6';c.font='bold 17px Segoe UI';c.fillText(t<2?'Мутант приближается':t<4?'Столкновение останавливает движение':t<5.1?'Можно отступить':t<6.4?'Можно обойти врага':'Выстрелы в упор попадают',24,430);
      c.fillStyle='#879d84';c.font='12px Consolas';c.fillText('ОБНОВЛЕНИЕ 6.0.1 · РЕАЛЬНАЯ СИМУЛЯЦИЯ ИГРЫ',24,455);
    }
    frame(0);recorder.start();let n=0;await new Promise(resolve=>{const timer=setInterval(()=>{frame(n++/30);if(n>=270){clearInterval(timer);resolve();}},1000/30);});recorder.stop();return ended;
  })()`);
  const output = path.join(root, 'desktop/media/collision-6.0.1.webm');
  fs.writeFileSync(output, Buffer.from(result, 'base64'));
  console.log('COLLISION_VIDEO', output, fs.statSync(output).size);
  window.destroy(); app.quit();
}).catch(error => { console.error(error); app.exit(1); });
