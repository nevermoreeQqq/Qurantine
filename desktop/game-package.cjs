const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const GAME_FILES = ['index.html', 'style.css', 'game.js', 'core.js', 'content.js', 'controls.js', 'music.js', 'render.js', 'simulation.js', 'terrain.js', 'netcode.js', 'server.js', 'package.json'];
const VERSION = /^\d+\.\d+\.\d+$/;
const MAX_ARCHIVE = 64 * 1024 * 1024;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function allowedFile(name) {
  return GAME_FILES.includes(name) || /^web\/[a-zA-Z0-9_-]+\.(js|css)$/.test(name) || /^assets\/[a-zA-Z0-9_/-]+\.(png|jpg|jpeg|webp|svg|ogg|mp3|wav|woff2)$/.test(name) && !name.split('/').includes('..');
}
function packGame(root) {
  const names = [...GAME_FILES];
  for (const folder of ['web', 'assets']) {
    function visit(relative) {
      for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
        const name = `${relative}/${entry.name}`;
        if (entry.isDirectory()) visit(name);
        else if (entry.isFile() && allowedFile(name)) names.push(name);
      }
    }
    if (fs.existsSync(path.join(root, folder))) visit(folder);
  }
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
  const protocol = Number(/const VERSION=(\d+)/.exec(fs.readFileSync(path.join(root, 'content.js'), 'utf8'))?.[1]);
  if (!VERSION.test(version) || !Number.isSafeInteger(protocol)) throw Error('Неверная версия игры');
  const files = Object.fromEntries(names.sort().map(name => [name, fs.readFileSync(path.join(root, name)).toString('base64')]));
  const payload = zlib.brotliCompressSync(Buffer.from(JSON.stringify({ files })), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 7 } });
  const buffer = Buffer.from(JSON.stringify({ format: 2, version, protocol, minimumLauncher: '1.0.0', payload: payload.toString('base64') }));
  if (buffer.length > MAX_ARCHIVE) throw Error('Пакет игры слишком большой');
  return { version, protocol, buffer, sha256: digest(buffer) };
}
function readGame(buffer, expectedDigest) {
  if (buffer.length > MAX_ARCHIVE) throw Error('Пакет игры слишком большой');
  const expected = String(expectedDigest || '').replace(/^sha256:/, '');
  if (!/^[a-f0-9]{64}$/.test(expected) || digest(buffer) !== expected) throw Error('Контрольная сумма GitHub не совпадает');
  const archive = JSON.parse(buffer.toString());
  if (archive.format !== 2 || !VERSION.test(archive.version) || !Number.isSafeInteger(archive.protocol) || archive.minimumLauncher !== '1.0.0') throw Error('Пакет требует другую версию лаунчера');
  const data = JSON.parse(zlib.brotliDecompressSync(Buffer.from(archive.payload, 'base64'), { maxOutputLength: 256 * 1024 * 1024 }).toString());
  if (!data.files || GAME_FILES.some(name => typeof data.files[name] !== 'string') || Object.entries(data.files).some(([name, value]) => !allowedFile(name) || typeof value !== 'string')) throw Error('Неверный состав пакета игры');
  const files = Object.fromEntries(Object.entries(data.files).map(([name, value]) => [name, Buffer.from(value, 'base64')]));
  if (JSON.parse(files['package.json']).version !== archive.version || Number(/const VERSION=(\d+)/.exec(files['content.js'].toString())?.[1]) !== archive.protocol) throw Error('Версия содержимого отличается');
  return { ...archive, files, buffer, sha256: expected };
}
module.exports = { GAME_FILES, MAX_ARCHIVE, VERSION, digest, allowedFile, packGame, readGame };
