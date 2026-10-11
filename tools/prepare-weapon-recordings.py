"""Prepare CC0 firearm excerpts; development dependencies: numpy, scipy.

Usage: python tools/prepare-weapon-recordings.py EXTRACTED_LIBRARY OUTPUT_JSON
Source: https://opengameart.org/content/the-free-firearm-sound-library
Output is embedded in music.js so existing signed update packages stay compatible.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly

# Different original recordings, rather than one noise patch with varied pitch.
CONFIG = {
    'pistol': ('Walther PPQ/X_39P.wav', .20, 7800, 1),
    'ak': ('AK-47/C_28P.wav', .25, 8200, 1),
    'smg': ('Carl Gustav M45/G_31P.wav', .15, 8500, 1.04),
    'dmr': ('AR-15/D_32P.wav', .30, 7900, .94),
    'rifle': ('Tikka/W_24P.wav', .44, 7200, .86),
    'shotgun': ('Mossberg/N_30P.wav', .38, 7600, 1),
    'superShotgun': ('Nova/O_21P.wav', .45, 7000, .88),
    'hmg': ('Mosin Nagant/M_21P.wav', .24, 7800, .9),
}
RATE = 24000

def prepare(root):
    records = {}
    for key, (name, duration, cutoff, pitch) in CONFIG.items():
        path = root / name
        rate, raw = wavfile.read(path)
        values = raw.astype(np.float64)
        if raw.dtype.kind in 'iu':
            values /= max(abs(np.iinfo(raw.dtype).min), np.iinfo(raw.dtype).max)
        if values.ndim > 1:
            values = values.mean(axis=1)
        # Locate the muzzle report, excluding pre-roll and later distant activity.
        onset = np.flatnonzero(np.abs(values) > np.max(np.abs(values)) * .18)[0]
        start = max(0, onset - int(rate * .003))
        values = values[start:start + int(rate * duration * pitch)]
        values = sosfilt(butter(2, 80, 'highpass', fs=rate, output='sos'), values)
        values = sosfilt(butter(4, cutoff, 'lowpass', fs=rate, output='sos'), values)
        # Reduce the low thump and reveal the report/mechanism without raising peak loudness.
        low = sosfilt(butter(2, 400, 'lowpass', fs=rate, output='sos'), values)
        mid = sosfilt(butter(2, 1600, 'lowpass', fs=rate, output='sos'), values) - low
        high = values - low - mid
        values = low * .72 + mid + high * 1.5
        values = resample_poly(values, RATE, rate)
        values = np.interp(np.arange(round(duration * RATE)) * pitch, np.arange(len(values)), values, right=0)
        # Close, dry competitive-shooter report: strong onset, short tail, distinct mechanism.
        design = {
            'pistol': (.038, .027, .10, 2600), 'ak': (.052, .044, .11, 1850),
            'smg': (.026, .020, .065, 3300), 'dmr': (.065, .051, .10, 2400),
            'rifle': (.110, .075, .13, 1250), 'shotgun': (.072, .062, .15, 1650),
            'superShotgun': (.090, .080, .16, 1100), 'hmg': (.055, .040, .13, 1500),
        }
        decay, mechanical_time, mechanical_gain, metal_hz = design[key]
        t = np.arange(len(values)) / RATE
        values *= np.exp(-np.maximum(0, t - .008) / decay)
        rms = np.sqrt(np.mean(values[:int(RATE * .035)] ** 2))
        values *= .19 / max(rms, .00001)
        rng = np.random.default_rng(list(CONFIG).index(key) + 607)
        # An original short broadband crack adds definition without copying game assets.
        crack = sosfilt(butter(2, [1700, 7900], 'bandpass', fs=RATE, output='sos'), rng.normal(size=len(t)))
        values += crack * np.exp(-t / .0045) * (.085 if key == 'smg' else .12)
        for delay, scale in [(mechanical_time, 1), (mechanical_time + .019, .35)]:
            q = np.maximum(0, t - delay)
            grit = sosfilt(butter(2, [900, 6500], 'bandpass', fs=RATE, output='sos'), rng.normal(size=len(t)))
            mechanism = (grit * .65 + np.sin(2*np.pi*metal_hz*q) * .35)
            values += mechanism * np.exp(-q / .004) * np.minimum(1, q / .0006) * (t >= delay) * mechanical_gain * scale
        values = np.tanh(values * 1.1) / 1.1
        peak = np.max(np.abs(values))
        if peak > .72:
            values *= .72 / peak
        values *= np.minimum(1, np.arange(len(values)) / (RATE * .001))
        values *= np.minimum(1, np.arange(len(values) - 1, -1, -1) / (RATE * .07))
        pcm = np.rint(values * 32767).astype('<i2').tobytes()
        records[key] = {'rate': RATE, 'pcm': base64.b64encode(pcm).decode(), 'source': name,
                        'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'startSeconds': round(start / rate, 6)}
    return records

if __name__ == '__main__':
    Path(sys.argv[2]).write_text(json.dumps(prepare(Path(sys.argv[1])), separators=(',', ':')))
