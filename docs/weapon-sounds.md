# Weapon sound design

Ten original sound profiles follow the weapons: dry pistol report; sharp AK crack; short SMG snap; longer DMR report; deep heavy rifle boom; broad shotgun blast; heavier Cerberus blast; low belt-fed machine-gun rhythm; overlapping flame jets; and hammer swing/impact. These are authored synthesized effects inspired by weapon acoustics, not recordings of the named real-world models.

Muzzle transient, pressure body, outdoor reflections and action clack have separate envelopes. Three cached variants and small pitch variation avoid identical repeated samples. The effects bus is deliberately quiet (0.5 gain) with compressed peaks; distant shots lose volume and high frequencies and pan relative to the listener. Turrets reuse the matching weapon profile at reduced strength.

Solo events and predicted local co-op shots use the same playback path. Confirmed local co-op shots retain the existing deduplication. Muting, platform suspension and leaving a match stop weapon tails. At most 24 voices play at once, with remote tails displaced first.

The module ships inside music.js, already included in Windows, macOS, web and launcher game/update packages; no extra asset requests or changes to archive formats. Weapon balance and network protocols are unchanged.

Validation: 155 Node tests passed, including every weapon at 44.1/48 kHz, cache reuse during 200 rapid shots, voice limiting, mute/pause, distance/pan and stereo fallback. macOS Electron smoke launch and browser playback completed without audio errors.
