const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const DEFAULTS = { memoryMB: 2048, launcherMusic: true, launcherEffects: true, launcherVolume: 35, gameMusic: true, gameEffects: true, gameMusicVolume: 32 };
function normalize(value = {}, totalMemory = os.totalmem()) {
  const budget = totalMemory / 1024 / 1024 * .75;
  const maxMemoryMB = [512, 1024, 2048, 4096, 8192].filter(size => size <= budget).at(-1) || 512;
  const settings = { ...DEFAULTS };
  for (const name of ['launcherMusic', 'launcherEffects', 'gameMusic', 'gameEffects']) if (typeof value[name] === 'boolean') settings[name] = value[name];
  for (const name of ['launcherVolume', 'gameMusicVolume']) if (Number.isFinite(value[name])) settings[name] = Math.round(Math.max(0, Math.min(100, value[name])));
  if ([512, 1024, 2048, 4096, 8192].includes(value.memoryMB)) settings.memoryMB = value.memoryMB;
  settings.memoryMB = Math.min(settings.memoryMB, maxMemoryMB);
  return { ...settings, maxMemoryMB, totalMemoryMB: Math.round(totalMemory / 1024 / 1024) };
}
function createSettings(dataRoot) {
  const file = path.join(dataRoot, 'launcher-settings.json');
  let value = {};
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  let settings = normalize(value);
  return {
    get: () => ({ ...settings }),
    save(value) {
      const next = normalize({ ...settings, ...value });
      fs.mkdirSync(dataRoot, { recursive: true });
      const temp = file + '.tmp';
      fs.writeFileSync(temp, JSON.stringify(next, null, 2));
      fs.renameSync(temp, file);
      settings = next;
      return { ...settings };
    }
  };
}
module.exports = { DEFAULTS, normalize, createSettings };
