'use strict';
const $ = id => document.getElementById(id);
const desktop = window.quarantineDesktop;
const api = desktop || {
  checkUpdates: async () => { const info = await (await fetch('/api/info')).json(); return { current: info.appVersion, latest: info.appVersion, available: false, versions: [{ version: info.appVersion, local: true, notes: 'Установленная версия игры' }], news: [] }; },
  play: () => { location.href = '/'; },
  settings: async () => ({ memoryMB: 2048, maxMemoryMB: 8192, totalMemoryMB: 8192, launcherMusic: true, launcherVolume: 35, gameMusic: true, gameEffects: true, gameMusicVolume: 32, launcherEffects: true }),
  saveSettings: async value => {const saved={...(JSON.parse(localStorage.getItem('quarantine-launcher-preview-settings')||'{}')),...value};localStorage.setItem('quarantine-launcher-preview-settings',JSON.stringify(saved));return {...await api.settings(),...saved};},
  progress: () => {},
  installVersion: async () => { throw Error('Скачивание версий доступно в приложении.'); }
};
let state, settings, busy = false, checking = false, musicPlaying = false, versionsSignature = '', newsSignature = '';
const music = LauncherMusic();
const NEWS_KEY = 'quarantine-launcher-news-v1';
const BUILTIN_NEWS = [
  {version:'1.0.0',title:'Первые волны',notes:'Начало Карантина: выживание на 2D-карте, стрельба по мутантам и волны противников. Боеприпасы и гранаты нужно искать на земле.'},
  {version:'2.0.0',title:'Отряд и оборона',notes:'Кооператив, золото за мутантов и магазин снаряжения. В арсенале появляются винтовка, пистолет, дробовик и огнемёт. Доски и двери помогают укрепить позицию, а каждая пятая волна приводит босса.'},
  {version:'3.0.0',title:'Арсенал и мутации',notes:'Настольное приложение, переназначение управления и отдельные типы боеприпасов. Бронежилеты, молоток для ремонта и улучшения укреплений, гранаты Тесла. Бронированные мутанты, роботы, паразиты и боссы с особыми способностями.'},
  {version:'4.0.0',title:'Деньги, дроп и новые угрозы',notes:'Монеты и купюры с противников, исчезающий неподобранный дроп. Мутанты-лекари и боссы: некромант, минёр и паук с коконами. Более понятный магазин, читаемый боезапас, броня и золото союзников.'},
  {version:'5.0.0',title:'Снаряжение для всего отряда',notes:'Кооператив до четырёх игроков и три уровня сложности. Бесконечный запас пистолета, пулемёт «Гром», турели и строительство с молотком. Круг выбора постройки, улучшенные гранаты, передышки и голосование за тайм-аут.'},
  {version:'6.0.0',title:'Ночная смена',notes:'Ночь, фонарики, ПНВ и новые адские мутанты. Круговые меню оружия и гранат, огнемётная турель, броня и улучшения обороны. Гроб после гибели, наблюдение за союзниками и бесконечные тайм-ауты с досрочным продолжением.'},
  {version:'6.0.1',title:'Контакт без пересечений',notes:'Мутанты останавливаются у персонажа, выстрелы в упор попадают в цель. Столкновения учитываются при рывках и в предсказании движения кооператива.'},
  {version:'6.0.2',title:'Интерфейс «Графит»',notes:'Чёрное минималистичное меню и новый боевой интерфейс. Здоровье, боезапас и кошелёк внизу; карта, гранаты и инструменты доступны через «Подробнее».'},
  {version:'6.0.3',title:'Новый лаунчер',notes:'Обзор, версии игры, настройки памяти и звука. Музыка и новости с видео о коллизиях. Каталог обновлений через GitHub Releases и проверка пакетов игры.'},
  {version:'6.0.4',title:'Исправление запуска на Mac',notes:'Исправлена установка скачанного приложения на Mac. Добавлен установщик в DMG и проверка первого запуска; в сборки включены модули платформы. Сохранены новый лаунчер и интерфейс «Графит».'}
];
const compareNews = (a,b) => {const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];};
const validNews = entry => entry && /^\d+\.\d+\.\d+$/.test(entry.version) && typeof entry.title==='string' && typeof entry.notes==='string';
let archivedNews = new Map(BUILTIN_NEWS.map(entry=>[entry.version,{...entry}]));
try {const saved=JSON.parse(localStorage.getItem(NEWS_KEY)||'[]');if(Array.isArray(saved))for(const entry of saved)if(validNews(entry))archivedNews.set(entry.version,entry);}catch{}
function archiveNews(entries) {
  for(const entry of entries||[])if(validNews(entry)){
    const previous=archivedNews.get(entry.version)||{};
    archivedNews.set(entry.version,{version:entry.version,title:entry.title||previous.title,notes:entry.notes.trim()?entry.notes:previous.notes||'',date:entry.date,video:entry.video});
  }
  // Missing remote releases never remove saved news or the built-in history.
  try {localStorage.setItem(NEWS_KEY,JSON.stringify([...archivedNews.values()]));}catch{}
}

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
    desc.textContent = plainNotes(archivedNews.get(entry.version)?.notes || entry.notes).slice(0, 320); button.className = 'secondary'; button.disabled = busy;
    button.textContent = entry.version === state.current ? 'Играть →' : entry.local ? 'Выбрать версию' : 'Скачать игру';
    button.addEventListener('click', () => entry.version === state.current ? play() : install(entry.version));
    top.append(number, tag); card.append(top, desc, button); $('versions').append(card);
  }
}
function renderNews() {
  archiveNews(state.news);
  const news=[...archivedNews.values()].filter(entry=>/^[1-9]\d*\.0\.0$/.test(entry.version)).sort(compareNews);
  const signature=JSON.stringify(news);if(signature!==newsSignature){
    newsSignature=signature;$('release-news').replaceChildren();
    for(const entry of news){
      const card=document.createElement('article'),tag=document.createElement('span'),title=document.createElement('h3'),text=document.createElement('p');
      card.className='news-entry';card.dataset.version=entry.version;tag.className='news-type';
      const date=new Date(entry.date);tag.textContent='ВЕРСИЯ '+entry.version+(Number.isNaN(date.getTime())?'':' · '+date.toLocaleDateString('ru-RU'));
      title.textContent=entry.title;text.textContent=plainNotes(entry.notes);card.append(tag,title,text);$('release-news').append(card);
      if(entry.video&&desktop){const button=document.createElement('button');button.className='text-button';button.textContent='Смотреть изменения ↗';button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Загружаем видео…';try{const source=await api.newsVideo(entry.version),video=document.createElement('video');video.className='news-video';video.controls=true;video.muted=true;video.playsInline=true;video.src=source;card.append(video);button.remove();video.play().catch(()=>{});}catch(error){button.disabled=false;button.textContent='Повторить загрузку видео';message(error.message);}});card.append(button);}
    }
  }
  const latest=[...archivedNews.values()].sort(compareNews)[0];
  if(latest){
    $('latest-summary-version').textContent='ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ · '+latest.version;
    $('latest-summary-title').textContent=latest.title;$('latest-summary-notes').textContent=plainNotes(latest.notes);
    $('latest-news-version').textContent='ПОСЛЕДНИЙ ВЫПУСК · '+latest.version;$('latest-news-title').textContent=latest.title;$('latest-news-notes').textContent=plainNotes(latest.notes);
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
  $('launcher-effects').checked = settings.launcherEffects !== false; $('game-music').checked = settings.gameMusic; $('game-effects').checked = settings.gameEffects; $('game-volume').value = settings.gameMusicVolume;
  updateVolumeLabels();
}
function updateVolumeLabels() { $('launcher-volume-value').textContent = $('launcher-volume').value + '%'; $('game-volume-value').textContent = $('game-volume').value + '%'; }
function musicLabel() {
  $('music-toggle').classList.toggle('playing', musicPlaying && settings?.launcherMusic);
  $('music-label').textContent = musicPlaying && settings?.launcherMusic ? music.track().name + ' · выключить' : music.track().name + ' · включить';
}
async function startMusic() {
  if (!settings?.launcherMusic) return;
  music.configure(true, settings.launcherVolume / 100);
  musicPlaying = await music.start(); musicLabel();
}
function restoreMusic(){music.effects(settings.launcherEffects !== false);music.configure(settings.launcherMusic,settings.launcherVolume/100);if(settings.launcherMusic)startMusic();else{musicPlaying=false;musicLabel();}}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); showPage('home'); });
$('latest-summary-more').addEventListener('click',()=>{showPage('news');$('latest-news').scrollIntoView({behavior:'smooth',block:'start'});});
$('next-track').addEventListener('click',()=>{music.nextTrack();musicLabel();});
music.onTrackChange(musicLabel);
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
    settings = await api.saveSettings({ memoryMB: Number($('memory').value), launcherMusic: $('launcher-music').checked, launcherVolume: Number($('launcher-volume').value), launcherEffects: $('launcher-effects').checked, gameMusic: $('game-music').checked, gameEffects: $('game-effects').checked, gameMusicVolume: Number($('game-volume').value) });
    fillSettings(); music.effects(settings.launcherEffects !== false); music.configure(settings.launcherMusic, settings.launcherVolume / 100);
    if (settings.launcherMusic) await startMusic(); else { musicPlaying = false; musicLabel(); }
    $('settings-dialog').close();message(oldMemory !== settings.memoryMB ? 'Настройки сохранены. Лимит памяти применится после перезапуска.' : 'Настройки сохранены.');
  } catch (error) { $('settings-status').textContent = error.message; }
});
$('music-toggle').addEventListener('click', async () => {
  if (!settings) return;
  const enabled = !musicPlaying;
  try { settings = await api.saveSettings({ launcherMusic: enabled }); music.configure(enabled, settings.launcherVolume / 100); if (enabled) await startMusic(); else { musicPlaying = false; musicLabel(); } }
  catch (error) { message(error.message); }
});
api.progress(value => { $('progress').value = value; message(value >= 96 ? 'Проверяем файлы и устанавливаем игру… ' + value + '%' : 'Скачивание игры: ' + value + '%'); });
api.settings().then(value => { settings = value; music.effects(settings.launcherEffects !== false); music.configure(settings.launcherMusic, settings.launcherVolume / 100); musicLabel(); }).catch(error => message(error.message));
document.addEventListener('pointerdown', event => {if(!event.target.closest('#music-toggle,#play'))startMusic();}, { once: true });
document.querySelectorAll('.switch').forEach(input=>input.addEventListener('change',()=>{
  if(input.id==='launcher-effects')music.effects(input.checked);
  music.toggleSound(input.checked);
}));
document.addEventListener('click',event=>{if(event.target.closest('button')&&!event.target.closest('#play'))music.clickSound();});
window.addEventListener('beforeunload', () => music.stop());
check();
setInterval(() => { if (!document.hidden) check(); }, 5 * 60 * 1000);
