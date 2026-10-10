const build = require('../package.json').build;
module.exports = {
  ...build,
  nsis: { ...build.nsis, artifactName: 'Quarantine-Launcher-Setup.exe', shortcutName: 'Карантин — Лаунчер' },
  mac: { ...build.mac, artifactName: 'Quarantine-Launcher-macOS-${arch}.${ext}' },
  dmg: { ...build.dmg, title: 'Карантин — Лаунчер' }
};
