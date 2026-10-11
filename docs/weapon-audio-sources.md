# Firearm audio sources

The Free Firearm Sound Library, recorded by Ben Jaszczak, Brian Nelson, Kevin Heras and Matthew Nanney. License: CC0 1.0.

Source and license declaration: https://opengameart.org/content/the-free-firearm-sound-library
Download: https://opengameart.org/sites/default/files/Prepared%20SFX%20Library.7z
License: https://creativecommons.org/publicdomain/zero/1.0/

| Game weapon | Original recording |
| --- | --- |
| Pistol | Walther PPQ / X_39P.wav |
| AK-47 | AK-47 / C_34P.wav |
| Vector SMG | Carl Gustav M45 / G_31P.wav |
| Sokol DMR | AR-15 / D_32P.wav |
| Heavy rifle | Tikka / W_24P.wav |
| Shotgun | Mossberg / N_26P.wav |
| Cerberus | Nova / O_17P.wav |
| Grom HMG | Mosin Nagant / M_21P.wav |

These are adapted sound designs for game weapon classes; the source weapon is not always the exact model depicted. Editing: isolate one report, mix to mono, remove subsonic noise, soften high frequencies, adjust pitch for the weapon class, mildly compress, shorten/fade tails and encode 24 kHz/16-bit PCM. Original WAV SHA-256 and crop offsets are retained alongside embedded samples in music.js.

Reproduction: install numpy and scipy in a development environment, extract the archive, then run tools/prepare-weapon-recordings.py with the extracted Prepared SFX Library directory and an output JSON path. That JSON supplies the recordings object embedded in music.js. No Python dependencies are needed by the game.

Flame and hammer use original designed effects and do not include third-party recordings.

## Уточнение чёткости

По отзыву о глухом звучании уменьшен бас до 400 Гц, усилены детали выше 1600 Гц и расширен пропускаемый диапазон до 5–6,4 кГц. Пиковый уровень PCM, громкость профилей и общий ограничитель сохранены. Огнемёт и молоток также получили больше деталей. Записи, тайминг и классы оружия прежние; звуки гранат сохранены.

## Короткие тактические выстрелы

Новая обработка сохраняет отдельные CC0-записи, сокращает хвосты до 0,15–0,45 с и добавляет авторский короткий хлопок и механические щелчки с разными тембрами и задержками для каждого оружия. PCM повышен до 24 кГц для чётких деталей; пики ограничены 0,72, громкости оружейных профилей сохранены. Звуки Counter-Strike не используются.

## Уточнение АК и дробовиков

Для АК, дробовика и «Цербера» выбраны другие исходные записи. У этих трёх убран добавленный шумовой хлопок и тональный металлический щелчок, сохранён основной записанный выстрел и тихая шумовая механика. АК суше; у дробовиков больше тела и мягче резкий верх. Остальные записи и звуки гранат не изменены.
