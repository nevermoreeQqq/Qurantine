/* Original procedural soundtrack: "Сигнал периметра", 84 BPM, D minor. */
window.LauncherMusic = function () {
  let context, master, timer, next = 0, step = 0, enabled = true, volume = .35;
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function voice(time, note, length, level, type = 'sine', cutoff = 700, pan = 0) {
    const osc = context.createOscillator(), envelope = context.createGain(), filter = context.createBiquadFilter(), stereo = context.createStereoPanner();
    osc.type = type; osc.frequency.value = hz(note);
    filter.type = 'lowpass'; filter.frequency.value = cutoff; stereo.pan.value = pan;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + Math.min(.35, length / 4));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + length);
    osc.connect(filter); filter.connect(envelope); envelope.connect(stereo); stereo.connect(master);
    osc.start(time); osc.stop(time + length + .02);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); envelope.disconnect(); stereo.disconnect(); };
  }
  function percussion(time, strong) {
    const kick = context.createOscillator(), envelope = context.createGain();
    kick.frequency.setValueAtTime(strong ? 98 : 62, time); kick.frequency.exponentialRampToValueAtTime(29, time + .18);
    envelope.gain.setValueAtTime(strong ? .2 : .075, time); envelope.gain.exponentialRampToValueAtTime(.0001, time + .38);
    kick.connect(envelope); envelope.connect(master); kick.start(time); kick.stop(time + .4);
    kick.onended = () => { kick.disconnect(); envelope.disconnect(); };
  }
  function schedule() {
    if (!context || !enabled) return;
    while (next < context.currentTime + .4) {
      const beat = step % 32, root = [38, 34, 41, 36][Math.floor(step / 32) % 4];
      if (beat === 0) {
        for (const [interval, pan] of [[0, -.35], [7, .3], [12, -.1]]) voice(next, root + interval, 10.8, .024, 'sawtooth', 380, pan);
        voice(next, root - 12, 10.8, .06, 'sine', 250);
      }
      if (beat % 4 === 0) { percussion(next, beat % 8 === 0); voice(next, root, .75, .055, 'triangle', 650); }
      if ([3, 11, 19, 27, 30].includes(beat)) voice(next, root + [24, 31, 27, 19][Math.floor(beat / 8)], 2.1, .035, 'sine', 1600, beat % 2 ? -.55 : .55);
      if (beat === 14 || beat === 22) voice(next, root + 36, .08, .011, 'triangle', 3000, .6);
      next += 60 / 84 / 2; step++;
    }
  }
  return {
    async start() {
      if (!enabled) return false;
      try {
        if (!context) {
          context = new (window.AudioContext || window.webkitAudioContext)(); master = context.createGain(); master.gain.value = volume;
          const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -18; compressor.ratio.value = 3;
          master.connect(compressor); compressor.connect(context.destination);
        }
        await context.resume(); if (context.state !== 'running') return false;
        if (!timer) { next = context.currentTime + .08; timer = setInterval(schedule, 100); schedule(); }
        return true;
      } catch { return false; }
    },
    configure(value, level) {
      enabled = !!value; volume = Math.max(0, Math.min(1, level));
      if (context) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .12);
      if (!enabled) { clearInterval(timer); timer = null; if (context) context.suspend().catch(() => {}); }
    },
    stop() { clearInterval(timer); timer = null; context?.close().catch(() => {}); }
  };
};
