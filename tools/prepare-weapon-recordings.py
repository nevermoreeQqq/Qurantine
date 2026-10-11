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
    'pistol': ('Walther PPQ/X_39P.wav', .32, 6000, 1),
    'ak': ('AK-47/C_28P.wav', .38, 5900, 1),
    'smg': ('Carl Gustav M45/G_31P.wav', .22, 6400, 1.04),
    'dmr': ('AR-15/D_32P.wav', .42, 5600, .94),
    'rifle': ('Tikka/W_24P.wav', .62, 5200, .86),
    'shotgun': ('Mossberg/N_30P.wav', .55, 5400, 1),
    'superShotgun': ('Nova/O_21P.wav', .65, 5000, .88),
    'hmg': ('Mosin Nagant/M_21P.wav', .30, 5500, .9),
}
RATE = 16000

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
        rms = np.sqrt(np.mean(values[:int(RATE * .14)] ** 2))
        values *= .12 / max(rms, .00001)
        values = np.tanh(values * 1.3) / 1.3
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
