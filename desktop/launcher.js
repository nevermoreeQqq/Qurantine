'use strict';
const $ = id => document.getElementById(id);
const desktop = window.quarantineDesktop;
const api = desktop || {
  checkUpdates: async () => { const info = await (await fetch('/api/info')).json(); return { current: info.appVersion, latest: info.appVersion, available: false, versions: [{ version: info.appVersion, local: true, notes: 'Установленная версия игры' }], news: [] }; },
  play: () => { location.href = '/'; },
  settings: async () => ({ memoryMB: 2048, maxMemoryMB: 8192, totalMemoryMB: 8192, launcherMusic: true, launcherVolume: 35, gameMusic: true, gameEffects: true, gameMusicVolume: 32 }),
  saveSettings: async value => value,
  progress: () => {},
  installVersion: async () => { throw Error('Скачивание версий доступно в приложении.'); }
};
let state, settings, busy = false, checking = false, musicPlaying = false, versionsSignature = '', newsSignature = '';
const music = LauncherMusic();
const message = text => { $('status').textContent = text; };
function showPage(page) {
  for (const name of ['home', 'versions', 'news']) $('page-' + name).hidden = name !== page;
  document.querySelectorAll('[data-page]').forEach(button => { const active = button.dataset.page === page; button.classList.toggle('active', active); button.setAttribute('aria-current', active ? 'page' : 'false'); });
  if (page !== 'home') $('collision-video').pause();
}
function plainNotes(value) {
  return String(value || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/[*\x60]/g, '').trim();
}
function renderVersions() {
  const signature = JSON.stringify([state.versions, state.current, state.latest, busy]);
  if (signature === versionsSignature) return;
  versionsSignature = signature; $('version-count').textContent = state.versions.length; $('versions').replaceChildren();
  for (const entry of state.versions) {
    const card = document.createElement('article'), top = document.createElement('div'), number = document.createElement('b'), tag = document.createElement('span'), desc = document.createElement('p'), button = document.createElement('button');
    card.className = 'version-card' + (entry.version === state.latest ? ' latest' : '');
    top.className = 'version-top'; number.textContent = entry.version; tag.className = 'label';
    tag.textContent = entry.version === state.current ? 'АКТИВНАЯ' : entry.version === state.latest ? 'НОВАЯ ВЕРСИЯ' : entry.local ? 'СОХРАНЕНА' : 'GITHUB';
    desc.textContent = plainNotes(entry.notes).slice(0, 320); button.className = 'secondary'; button.disabled = busy;
    button.textContent = entry.version === state.current ? 'Играть →' : entry.local ? 'Выбрать версию' : 'Скачать игру';
    button.addEventListener('click', () => entry.version === state.current ? play() : install(entry.version));
    top.append(number, tag); card.append(top, desc, button); $('versions').append(card);
  }
}
function renderNews() {
  const news = (state.news || []).filter(entry => entry.version !== '6.0.1');
  const signature = JSON.stringify(news); if (signature === newsSignature) return;
  newsSignature = signature; $('release-news').replaceChildren();
  for (const entry of news.slice(0, 20)) {
    const card = document.createElement('article'), tag = document.createElement('span'), title = document.createElement('h3'), text = document.createElement('p');
    card.className = 'news-entry'; tag.className = 'news-type';
    const date = new Date(entry.date); tag.textContent = entry.version + (Number.isNaN(date.getTime()) ? '' : ' · ' + date.toLocaleDateString('ru-RU'));
    title.textContent = entry.title; text.textContent = plainNotes(entry.notes);
    card.append(tag, title, text); $('release-news').append(card);
    if(entry.video&&desktop){const button=document.createElement('button');button.className='text-button';button.textContent='Смотреть изменения →';button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Загружаем видео…';try{const source=await api.newsVideo(entry.version),video=document.createElement('video');video.className='news-video';video.controls=true;video.muted=true;video.playsInline=true;video.src=source;card.append(video);button.remove();video.play().catch(()=>{});}catch(error){button.disabled=false;button.textContent='Повторить загрузку видео';message(error.message);}});card.append(button);}
  }
}
async function check(force = false) {
  if (busy || checking) return;
  checking = true; $('refresh').disabled = true;
  try {
    state = await api.checkUpdates(force ? { force: true } : undefined);
    $('current-version').textContent = 'Версия ' + state.current;
    $('latest').textContent = state.available ? 'Обновить игру до ' + state.latest + ' ↓' : state.error ? 'Сохранённая версия доступна' : 'Установлена последняя версия ✓';
    $('latest').disabled = !state.available || busy; $('latest').classList.toggle('available', state.available);
    document.querySelector('.connection').classList.toggle('offline', !!state.error);
    renderVersions(); renderNews();
    message(state.error || (state.available ? 'Доступна новая версия ' + state.latest + '. Скачай её перед началом игры.' : 'Игра готова. Новые версии появятся здесь из GitHub Releases.'));
  } catch (error) { message(error.message); }
  finally { checking = false; $('refresh').disabled = busy; }
}
async function play() {
  if (busy) return;
  music.stop(); $('collision-video').pause();
  try { await api.play(); } catch (error) { message(error.message); }
}
async function install(version) {
  if (busy) return;
  busy = true; $('play').disabled = $('latest').disabled = $('refresh').disabled = true;
  $('progress').hidden = false; $('progress').value = 0; renderVersions();
  message('Скачиваем игру ' + version + ' из GitHub…');
  try { await api.installVersion(version); message('Игра установлена. Перезапускаем приложение…'); }
  catch (error) { busy = false; $('progress').hidden = true; $('play').disabled = false; await check(); message('Не удалось установить: ' + error.message); }
}
function fillSettings() {
  $('memory').value = settings.memoryMB;
  for (const option of $('memory').options) option.disabled = Number(option.value) > settings.maxMemoryMB;
  $('memory-detail').textContent = 'На компьютере ' + (settings.totalMemoryMB / 1024).toFixed(1) + ' ГБ оперативной памяти';
  $('launcher-music').checked = settings.launcherMusic; $('launcher-volume').value = settings.launcherVolume;
  $('game-music').checked = settings.gameMusic; $('game-effects').checked = settings.gameEffects; $('game-volume').value = settings.gameMusicVolume;
  updateVolumeLabels();
}
function updateVolumeLabels() { $('launcher-volume-value').textContent = $('launcher-volume').value + '%'; $('game-volume-value').textContent = $('game-volume').value + '%'; }
function musicLabel() {
  $('music-toggle').classList.toggle('playing', musicPlaying && settings?.launcherMusic);
  $('music-label').textContent = musicPlaying && settings?.launcherMusic ? 'Сигнал периметра · выключить' : 'Сигнал периметра · включить';
}
async function startMusic() {
  if (!settings?.launcherMusic) return;
  music.configure(true, settings.launcherVolume / 100);
  musicPlaying = await music.start(); musicLabel();
}
function restoreMusic(){music.configure(settings.launcherMusic,settings.launcherVolume/100);if(settings.launcherMusic)startMusic();else{musicPlaying=false;musicLabel();}}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); showPage('home'); });
$('watch-collision').addEventListener('click', () => { showPage('home'); $('collision-video').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('collision-video').play().catch(() => {}); });
$('play').addEventListener('click', play);
$('latest').addEventListener('click', () => state?.available && install(state.latest));
$('refresh').addEventListener('click', () => check(true));
$('open-settings').addEventListener('click', () => { if (settings) { fillSettings(); $('settings-status').textContent = ''; $('settings-dialog').showModal(); } });
$('close-settings').addEventListener('click', () => { $('settings-dialog').close(); if(settings)restoreMusic(); });
$('settings-dialog').addEventListener('cancel', () => { if(settings)restoreMusic(); });
$('launcher-volume').addEventListener('input', () => { updateVolumeLabels(); music.configure($('launcher-music').checked, Number($('launcher-volume').value) / 100); });
$('game-volume').addEventListener('input', updateVolumeLabels);
$('launcher-music').addEventListener('change', async () => { music.configure($('launcher-music').checked, Number($('launcher-volume').value) / 100); musicPlaying = $('launcher-music').checked && await music.start(); });
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault(); const oldMemory = settings.memoryMB;
  try {
    settings = await api.saveSettings({ memoryMB: Number($('memory').value), launcherMusic: $('launcher-music').checked, launcherVolume: Number($('launcher-volume').value), gameMusic: $('game-music').checked, gameEffects: $('game-effects').checked, gameMusicVolume: Number($('game-volume').value) });
    fillSettings(); music.configure(settings.launcherMusic, settings.launcherVolume / 100);
    if (settings.launcherMusic) await startMusic(); else { musicPlaying = false; musicLabel(); }
    $('settings-status').textContent = oldMemory !== settings.memoryMB ? 'Сохранено. Память — после перезапуска.' : 'Настройки сохранены.';
  } catch (error) { $('settings-status').textContent = error.message; }
});
$('music-toggle').addEventListener('click', async () => {
  if (!settings) return;
  const enabled = !musicPlaying;
  try { settings = await api.saveSettings({ launcherMusic: enabled }); music.configure(enabled, settings.launcherVolume / 100); if (enabled) await startMusic(); else { musicPlaying = false; musicLabel(); } }
  catch (error) { message(error.message); }
});
api.progress(value => { $('progress').value = value; message(value >= 96 ? 'Проверяем файлы и устанавливаем игру… ' + value + '%' : 'Скачивание игры: ' + value + '%'); });
api.settings().then(value => { settings = value; music.configure(settings.launcherMusic, settings.launcherVolume / 100); musicLabel(); }).catch(error => message(error.message));
document.addEventListener('pointerdown', event => {if(!event.target.closest('#music-toggle,#play'))startMusic();}, { once: true });
window.addEventListener('beforeunload', () => music.stop());
check();
setInterval(() => { if (!document.hidden) check(); }, 5 * 60 * 1000);
