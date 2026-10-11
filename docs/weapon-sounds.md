# Weapon sound design — recording revision

The first procedural gun reports were too similar and harsh. All eight firearm profiles now use different edited CC0 recordings from The Free Firearm Sound Library; see weapon-audio-sources.md for authors, original filenames, licensing and reproduction. Flame jets and hammer swing/impact are designed separately with softer noise and no artificial ringing tone.

The edits reduce high-frequency sharpness, subsonic noise and excessive tails while preserving the original report. Each weapon has its own source, duration, pitch treatment and quiet playback level. The sources match weapon classes, not always the exact depicted models.

PCM is embedded in music.js, already included in Windows, macOS, web and launcher game/update packages. Samples decode once and variants are cached; there are no additional network requests, files to load or archive-format changes.

The effects bus remains at 0.5 gain, with limited peaks. Distant shots fade, darken and pan relative to the listener. At most 24 voices play simultaneously, with remote tails displaced first. Existing prediction deduplication, mute, suspension and match-exit cleanup remain unchanged. Weapon balance and networking are preserved.

Validation: 156 Node tests passed, including audio at 44.1/48 kHz, unclipped samples, eight unique recording sources, rapid-fire cache reuse, voice limits, quiet gain, mute/pause and positional audio. Native macOS Electron smoke launch and browser playback passed. The local preview offers Previous/New buttons and bursts for comparison.
