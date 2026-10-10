const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), zlib = require('node:zlib');
const { createGitHubReleases, API_ROOT, REPOSITORY } = require('../desktop/github-releases.cjs');
const { packGame, readGame, digest } = require('../desktop/game-package.cjs');
const { createUpdater } = require('../desktop/updater.cjs');
const { normalize, createSettings } = require('../desktop/settings.cjs');
const root = path.join(__dirname, '..');
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'quarantine-github-'));
  t.after(() => { if (!path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw Error('Unsafe cleanup'); fs.rmSync(temp, { recursive: true, force: true }); });
  return temp;
}
function release(version = '6.0.2', overrides = {}) {
  return { tag_name: 'v' + version, name: 'Update ' + version, body: 'New collisions', published_at: '2026-10-10T00:00:00Z', assets: [{ id: 42, name: `Quarantine-Game-${version}.qtg`, digest: 'sha256:' + 'a'.repeat(64), size: 100, state: 'uploaded' }], ...overrides };
}
function gamePackage(version = '6.0.2', edit = () => {}) {
  const archive = JSON.parse(packGame(root).buffer);
  const data = JSON.parse(zlib.brotliDecompressSync(Buffer.from(archive.payload, 'base64')));
  const pkg = JSON.parse(Buffer.from(data.files['package.json'], 'base64'));
  pkg.version = version; data.files['package.json'] = Buffer.from(JSON.stringify(pkg)).toString('base64');
  edit(data.files); archive.version = version; archive.payload = zlib.brotliCompressSync(Buffer.from(JSON.stringify(data))).toString('base64');
  const buffer = Buffer.from(JSON.stringify(archive));
  return { buffer, sha256: digest(buffer) };
}
function args(temp, releaseSource) {
  return { baseRoot: root, dataRoot: path.join(temp, 'updates'), publicKey: fs.readFileSync(path.join(root, 'update-public.pem')), releaseSource };
}
test('GitHub catalog uses the fixed repository, ignores drafts, prereleases, installers and packages without a GitHub digest', async () => {
  const calls = [];
  const client = createGitHubReleases({ fetchImpl: async (url, options) => {
    calls.push([url, options]);
    return Response.json([release(), release('6.0.3', { draft: true }), release('6.0.4', { prerelease: true }), release('6.0.5', { assets: [{ id: 99, name: 'Quarantine-Setup-6.0.5.exe' }] }), release('6.0.6', { assets: [{ id: 44, name: 'Quarantine-Game-6.0.6.qtg', size: 2, state: 'uploaded' }] }), release('launcher-v1.0.0')]);
  } });
  const state = await client.catalog();
  assert.equal(state.repository, REPOSITORY); assert.deepEqual(state.versions.map(v => v.version), ['6.0.2']);
  assert.equal(state.news.length, 3); assert.equal(calls[0][0], API_ROOT + '/releases?per_page=100&page=1');
  assert.equal(calls[0][1].headers.Authorization, undefined);
});
test('Repeated game update checks share a request and cache GitHub results; manual refresh fetches again', async () => {
  let calls = 0;
  const client = createGitHubReleases({ fetchImpl: async () => { calls++; return Response.json([release()]); } });
  await Promise.all([client.catalog(), client.catalog()]); await client.catalog(); assert.equal(calls, 1);
  await client.catalog({ force: true }); assert.equal(calls, 2);
});
test('Private repositories fail clearly, back off automatic requests, and can be checked again manually', async () => {
  let calls = 0;
  const client = createGitHubReleases({ fetchImpl: async () => { calls++; return new Response(null, { status: 404 }); } });
  await assert.rejects(client.catalog(), /закрыт/); await assert.rejects(client.catalog(), /закрыт/); assert.equal(calls, 1);
  await assert.rejects(client.catalog({ force: true }), /закрыт/); assert.equal(calls, 2);
});
test('GitHub release pagination includes older versions rather than only the latest release', async () => {
  const calls = [];
  const client = createGitHubReleases({ fetchImpl: async url => { calls.push(url); return Response.json(url.endsWith('page=1') ? Array.from({ length: 100 }, () => release()) : [release('5.0.0')]); } });
  const state = await client.catalog(); assert.equal(calls.length, 2); assert.ok(state.versions.some(v => v.version === '5.0.0'));
});
test('Game download uses the GitHub asset endpoint and rejects corrupted bytes before installation', async () => {
  const bytes = Buffer.from('game-package'), hashes = digest(bytes), calls = [];
  const r = release(); r.assets[0].digest = 'sha256:' + hashes; r.assets[0].size = bytes.length;
  let corrupt = false;
  const client = createGitHubReleases({ fetchImpl: async (url, options) => { calls.push([url, options]); return url.includes('/releases?') ? Response.json([r]) : new Response(corrupt ? 'bad' : bytes); } });
  const progress = [], downloaded = await client.download('6.0.2', n => progress.push(n));
  assert.deepEqual(downloaded.buffer, bytes); assert.equal(calls[1][0], API_ROOT + '/releases/assets/42'); assert.equal(calls[1][1].headers.Accept, 'application/octet-stream'); assert.ok(progress.length);
  corrupt = true; await assert.rejects(client.download('6.0.2'), /сумма/);
});
test('Game packages include game assets and platform modules, and exclude the permanent launcher and credentials', () => {
  const packed = packGame(root), archive = readGame(packed.buffer, packed.sha256);
  assert.ok(archive.files['web/platform.js']); assert.ok(archive.files['assets/icon.png']); assert.ok(archive.files['simulation.js']);
  assert.ok(Object.keys(archive.files).every(name => !name.startsWith('desktop/') && !name.includes('signing-key')));
  assert.throws(() => readGame(packed.buffer, ''), /сумма/); assert.throws(() => readGame(Buffer.from('bad'), packed.sha256), /сумма/);
});
test('Future news clips are discovered through GitHub Releases and verified before playback', async () => {
  const bytes = Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.from('test-webm')]);
  const item = release(); item.assets.push({ id: 43, name: 'Quarantine-News-6.0.2.webm', size: bytes.length, digest: 'sha256:' + digest(bytes), state: 'uploaded' });
  let corrupt = false;
  const client = createGitHubReleases({ fetchImpl: async url => url.includes('/releases?') ? Response.json([item]) : new Response(corrupt ? 'HTML error page' : bytes) });
  assert.equal((await client.catalog()).news[0].video.assetId, 43);
  assert.deepEqual((await client.downloadNews('6.0.2')).buffer, bytes);
  corrupt = true; await assert.rejects(client.downloadNews('6.0.2'), /видео/);
});
test('Even with a matching digest, game packages cannot write outside the game folder or replace the launcher', () => {
  for (const name of ['../escape.js', 'desktop/main.cjs', 'assets/../../escape.png', 'assets\\escape.png']) {
    const archive = gamePackage('6.0.2', files => { files[name] = 'AA=='; });
    assert.throws(() => readGame(archive.buffer, archive.sha256), /состав/);
  }
});
test('A GitHub game installs, survives restart, repairs damaged runtime files, rolls back and updates without changing launcher files', async t => {
  const temp = fixture(t), archive = gamePackage(), before = fs.readFileSync(path.join(root, 'desktop/main.cjs'));
  const releaseSource = { repository: REPOSITORY, catalog: async () => ({ versions: [{ version: '6.0.2', protocol: 6, notes: 'Collision fixes', remote: true }], news: [] }), download: async () => ({ buffer: archive.buffer, format: 2, digest: 'sha256:' + archive.sha256 }) };
  const config = args(temp, releaseSource), updater = createUpdater(config);
  const state = await updater.refresh('http://old-peer-address:5173'); assert.equal(state.source, 'github'); assert.equal(state.latest, '6.0.2');
  await updater.install('6.0.2');
  const reopened = createUpdater(config); assert.equal(reopened.current(), '6.0.2'); assert.ok(fs.existsSync(path.join(reopened.runtimeRoot, 'web/platform.js')));
  fs.writeFileSync(path.join(reopened.runtimeRoot, 'game.js'), 'damaged');
  const repaired = createUpdater(config); assert.notEqual(fs.readFileSync(path.join(repaired.runtimeRoot, 'game.js'), 'utf8'), 'damaged');
  const baseVersion = require('../package.json').version; await repaired.install(baseVersion, () => {}, true); assert.equal(createUpdater(config).current(), baseVersion);
  const rolledBack = createUpdater(config); await rolledBack.install('6.0.2'); assert.equal(createUpdater(config).current(), '6.0.2');
  assert.deepEqual(fs.readFileSync(path.join(root, 'desktop/main.cjs')), before);
});
test('A corrupt GitHub download never changes the active version and untrusted local packages are not auto-imported', async t => {
  const temp = fixture(t), archive = gamePackage();
  const source = { repository: REPOSITORY, catalog: async () => ({ versions: [{ version: '6.0.2', protocol: 6 }], news: [] }), download: async () => ({ buffer: Buffer.from('bad'), format: 2, digest: archive.sha256 }) };
  const config = args(temp, source), updater = createUpdater(config);
  await assert.rejects(updater.install('6.0.2'), /сумма/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(config.dataRoot, 'launcher.json'))).active, null);
  fs.writeFileSync(path.join(config.dataRoot, 'archives/Quarantine-Game-6.0.2.qtg'), archive.buffer);
  const offline = createUpdater({ ...config, releaseSource: undefined }); assert.ok(!(await offline.refresh()).versions.some(v => v.version === '6.0.2'));
});
test('GitHub being offline leaves the bundled version playable and local versions selectable', async t => {
  const config = args(fixture(t), { repository: REPOSITORY, catalog: async () => { throw Error('Offline'); } });
  const updater = createUpdater(config), state = await updater.refresh();
  assert.equal(state.current, require('../package.json').version); assert.ok(state.versions.some(v => v.version === state.current && v.local)); assert.equal(state.error, 'Offline'); assert.equal(updater.runtimeRoot, root);
});
test('Launcher settings persist, validate input and cap JavaScript memory at a supported size for the computer', t => {
  const directory = fixture(t), settings = createSettings(directory);
  settings.save({ memoryMB: 512, launcherMusic: false, gameEffects: false, launcherVolume: 180, gameMusicVolume: -4 });
  assert.equal(settings.get().launcherVolume, 100); assert.equal(settings.get().gameMusicVolume, 0); assert.equal(settings.get().memoryMB, 512);
  assert.equal(createSettings(directory).get().gameEffects, false); assert.equal(createSettings(directory).get().launcherMusic, false);
  const small = normalize({ memoryMB: 8192 }, 2 * 1024 ** 3); assert.equal(small.memoryMB, 1024); assert.equal(small.maxMemoryMB, 1024);
  assert.equal(normalize({ memoryMB: '--bad', gameEffects: 'false' }).gameEffects, true);
});
