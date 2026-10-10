const { MAX_ARCHIVE, VERSION, digest } = require('./game-package.cjs');
const REPOSITORY = 'nevermoreeQqq/Qurantine';
const API_ROOT = `https://api.github.com/repos/${REPOSITORY}`;
function createGitHubReleases({ fetchImpl = fetch, token = '', now = Date.now } = {}) {
  let cached, checked = 0, pending, failure;
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Quarantine-Launcher/1.0' };
  if (token) headers.Authorization = `Bearer ${token}`;
  async function catalog({ force = false } = {}) {
    if (cached && !force && now() - checked < 5 * 60 * 1000) return cached;
    if (failure && !force && now() - checked < 60 * 1000) throw failure;
    if (pending) return pending;
    pending = (async () => {
      const releases = [];
      for (let page = 1; page <= 10; page++) {
        const response = await fetchImpl(`${API_ROOT}/releases?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) {
          if (response.status === 404) throw Error('Репозиторий GitHub пока закрыт или недоступен. Установленная игра готова к запуску.');
          if (response.status === 403 || response.status === 429) throw Error('GitHub временно ограничил запросы. Повторите проверку позже.');
          throw Error('GitHub недоступен. Можно играть в установленную версию.');
        }
        const batch = await response.json();
        if (!Array.isArray(batch)) throw Error('Неверный ответ GitHub');
        releases.push(...batch);
        if (batch.length < 100) break;
      }
      const versions = [], news = [];
      for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const version = String(release.tag_name || '').replace(/^v/, '');
        if (!VERSION.test(version)) continue;
        const assets = Array.isArray(release.assets) ? release.assets : [];
        const asset = assets.find(a => a.name === `Quarantine-Game-${version}.qtg`) || assets.find(a => a.name === `Quarantine-Update-${version}.qtu`);
        const notes = String(release.body || 'Обновление игры').slice(0, 12000);
        const video=assets.find(a=>a.name===`Quarantine-News-${version}.webm`&&a.state==='uploaded'&&Number.isSafeInteger(a.id)&&a.size<=20*1024*1024&&/^sha256:[a-f0-9]{64}$/.test(a.digest||''));
        news.push({ version, title: String(release.name || `Обновление ${version}`).slice(0, 150), notes, date: release.published_at || '', downloadable: !!asset, ...(video?{video:{assetId:video.id,size:video.size,digest:video.digest}}:{}) });
        if (!asset || asset.state !== 'uploaded' || !Number.isSafeInteger(asset.id) || asset.size > MAX_ARCHIVE) continue;
        // New packages are accepted only with the digest supplied by GitHub itself.
        if (asset.name.endsWith('.qtg') && !/^sha256:[a-f0-9]{64}$/.test(asset.digest || '')) continue;
        versions.push({ version, protocol: Number(version.split('.')[0]), notes, date: release.published_at || '', remote: true, assetId: asset.id, format: asset.name.endsWith('.qtg') ? 2 : 1, digest: asset.digest || '', size: asset.size });
      }
      cached = { versions, news, repository: REPOSITORY };
      failure = null;
      checked = now();
      return cached;
    })();
    try { return await pending; } catch (error) { failure = error; checked = now(); throw error; } finally { pending = null; }
  }
  async function download(version, onProgress = () => {}) {
    const state = await catalog();
    const entry = state.versions.find(v => v.version === version);
    if (!entry) throw Error('В GitHub Release нет пакета этой версии игры');
    const response = await fetchImpl(`${API_ROOT}/releases/assets/${entry.assetId}`, { headers: { ...headers, Accept: 'application/octet-stream' }, signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw Error('Не удалось скачать игру из GitHub');
    const reader = response.body.getReader(), chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_ARCHIVE) { await reader.cancel(); throw Error('Пакет игры слишком большой'); }
      chunks.push(Buffer.from(value));
      onProgress(entry.size ? Math.min(95, Math.round(size / entry.size * 95)) : 50);
    }
    const buffer = Buffer.concat(chunks);
    if (entry.digest && digest(buffer) !== entry.digest.replace(/^sha256:/, '')) throw Error('Контрольная сумма GitHub не совпадает');
    return { buffer, ...entry };
  }
  async function downloadNews(version){
    const entry=(await catalog()).news.find(n=>n.version===version)?.video;
    if(!entry)throw Error('Для этой новости видео пока не опубликовано');
    const response=await fetchImpl(`${API_ROOT}/releases/assets/${entry.assetId}`,{headers:{...headers,Accept:'application/octet-stream'},signal:AbortSignal.timeout(60000)});
    if(!response.ok||!response.body)throw Error('Не удалось загрузить видео');
    const reader=response.body.getReader(),chunks=[];let size=0;
    for(;;){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024){await reader.cancel();throw Error('Видео слишком большое');}chunks.push(Buffer.from(value));}
    const buffer=Buffer.concat(chunks);
    if(digest(buffer)!==entry.digest.replace(/^sha256:/,'')||buffer.subarray(0,4).toString('hex')!=='1a45dfa3')throw Error('Неверный файл видео');
    return{buffer,digest:entry.digest};
  }
  return { catalog, download, downloadNews, repository: REPOSITORY };
}
module.exports = { REPOSITORY, API_ROOT, createGitHubReleases };
