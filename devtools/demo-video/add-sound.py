# This file is part of Moodle - http://moodle.org/
#
# Moodle is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Moodle is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
#
# @copyright  2026 Boban Blagojević
# @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later

"""Adds an original, generated soundtrack (and soft click sounds) to the demo video.

Usage: python devtools/demo-video/add-sound.py devtools/demo-video/codelab-reel.mp4
Writes <name>-music.mp4 (and <name>-soundtrack.wav) next to it. Everything is synthesised here, no third-party audio:
the Serbian folk tune "Ajde Jano" (traditional; 7/8 = 3+2+2, G minor, from a guitar tab) as a rock instrumental:
a power-chord riff on double-tracked rhythm guitars, bass, rock drums with crashes and fills, and an electric lead
guitar (modelled strings through compressor, overdrive and cabinet) playing the tune, the second time an octave higher
with a twin guitar a sixth below, ending on a ringing G chord.
Click times come from <name>.clicks.json written by record.mjs.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 44100
EIGHTH = 0.21              # 7/8, driving rock tempo
BAR = 7 * EIGHTH
START = 3.2                # the tune starts near the end of the intro card
OUTRO_LEN = 5.2

video = Path(sys.argv[1])
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
probe = subprocess.run([ffmpeg, '-i', str(video)], capture_output=True, text=True).stderr
h, m, s = probe.split('Duration: ')[1].split(',')[0].split(':')
length = int(h) * 3600 + int(m) * 60 + float(s)
clicks_file = video.with_suffix('.clicks.json')
clicks = json.loads(clicks_file.read_text()) if clicks_file.exists() else []

n = int((length + 4) * SR)
dry = np.zeros((n, 2))       # goes through the reverb partly
fx = np.zeros((n, 2))        # reverb send
rng = np.random.default_rng(11)


def hz(midi):
    return 440.0 * 2 ** ((np.asarray(midi) - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0, send=0.3):
    i = int(start * SR)
    if i >= n or i < 0:
        return
    sig = sig[:n - i] * gain
    lr = np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
    dry[i:i + len(sig)] += sig[:, None] * lr
    fx[i:i + len(sig)] += sig[:, None] * lr * send


def env(dur, attack, release):
    k = np.arange(int(dur * SR)) / SR
    return np.minimum(1, k / max(attack, 1e-4)) * np.clip((dur - k) / max(release, 1e-4), 0, 1)


def osc(freq, harmonics):
    """Band-limited oscillator; freq is an array (per sample), harmonics [(k, amplitude)]."""
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return sum(a * np.sin(k * phase) for k, a in harmonics)


# Ajde Jano from the guitar tab (G minor, 7/8 = 3+2+2), written pitch: (MIDI note or None for a rest, eighths).
# Bb4 = 70. Verse (bars 1-4), chorus (bars 5-9) played twice.
VERSE = [(70, 2), (69, 1), (67, 1), (69, 1), (67, 2),
         (70, 2), (69, 1), (69, 2), (67, 2),
         (69, 2), (67, 1), (65, 10), (None, 1)]
CHORUS = [(70, 2), (72, 1), (74, 2), (74, 2),
          (72, 2), (70, 1), (70, 1), (69, 1), (67, 2),
          (72, 2), (70, 1), (70, 1), (69, 1), (67, 2),
          (70, 3), (70, 1), (69, 1), (67, 2),
          (67, 6), (None, 1)]
TUNE = VERSE + CHORUS + CHORUS
# Chords per bar: [(bass root, organ voicing, eighths)].
GM, F, BB, CM, EB, D = ([43, [55, 58, 62]], [41, [53, 57, 60]], [46, [53, 58, 62]], [48, [55, 60, 63]],
                        [39, [55, 58, 63]], [38, [54, 57, 62]])
BARS = ([[GM + [7]], [GM + [7]], [F + [7]], [F + [7]]] +
        2 * [[BB + [7]], [F + [7]], [CM + [7]], [EB + [3], D + [4]], [GM + [7]]])
G_MINOR = [55, 57, 58, 60, 62, 63, 65]          # G A Bb C D Eb F


def third_above(note):
    pc = [p % 12 for p in G_MINOR]
    i = pc.index(note % 12)
    up = G_MINOR[(i + 2) % 7] % 12
    return note + ((up - note % 12) % 12)


def string(note, dur, decay=0.9993):
    """Karplus-Strong plucked string at `note`, `dur` seconds; returns (signal, tuning ratio for the resampler)."""
    f = float(hz(note))
    period = int(SR / f)
    total = int(dur * SR) + period + 2
    y = np.zeros(total)
    burst = rng.standard_normal(period + 1)
    burst = burst - np.roll(burst, int(period * 0.18))               # pick position (near the bridge)
    burst = np.convolve(burst, [0.25, 0.5, 0.25], mode='same')         # pick softness
    y[:period + 1] = burst / np.abs(burst).max()
    for s in range(period + 1, total, period):
        e = min(s + period, total)
        y[s:e] = decay * 0.5 * (y[s - period:e - period] + y[s - period - 1:e - period - 1])
    return y, f / (SR / (period + 0.5))


def moving_average(x, width):
    c = np.cumsum(np.concatenate([[0], x]))
    out = (c[width:] - c[:-width]) / width
    return np.concatenate([np.full(width - 1, out[0]), out])


def amp(x):
    """Electric guitar chain: compressor (sustain), asymmetric tube-like overdrive, 4x12 cabinet EQ."""
    level = np.sqrt(moving_average(x * x, int(0.02 * SR))) + 1e-4
    x = x / (level ** 0.65)
    x = x / (np.abs(x).max() + 1e-9)
    x = np.tanh(5.0 * x + 0.25) - np.tanh(0.25)
    spec = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    cab = 1 / np.sqrt(1 + (fr / 4200) ** 8)                            # speaker roll-off
    cab *= 1 / np.sqrt(1 + (90 / np.maximum(fr, 1)) ** 4)             # tight low end
    cab *= 1 + 0.8 * np.exp(-((fr - 1600) / 700) ** 2)                 # mid push
    cab *= 1 - 0.35 * np.exp(-((fr - 450) / 200) ** 2)                 # less mud
    return np.fft.irfft(spec * cab, len(x))


def lead(notes, start, transpose, gain, pan, hold_last=None):
    """Electric lead guitar: plucked strings with bends and vibrato through the amp, then dotted-eighth echoes."""
    buf = np.zeros(n)
    when = start
    prev = None
    for idx, (note, d) in enumerate(notes):
        dur = d * EIGHTH
        if note is None:
            when += dur
            prev = None
            continue
        last = hold_last and idx == len(notes) - 2
        if last:
            dur = hold_last
        note += transpose
        kk = np.arange(int((dur + 0.12) * SR)) / SR
        bend_from = note - (1 if prev is None or prev == note else (0.7 if prev < note else -0.5))
        bend_time = 0.11 if prev is None or abs(prev - note) <= 2 else 0.05
        bend = bend_from + (note - bend_from) * np.minimum(1, kk / bend_time) ** 0.7
        vib = 0.32 * np.sin(2 * np.pi * 5.0 * kk) * np.clip((kk - 0.3) / 0.5, 0, 1)
        y, tune = string(note, (dur + 0.2) * 1.15, 0.9996 if last else 0.9992)
        pos = np.cumsum(tune * 2 ** ((bend + vib - note) / 12))
        g = np.interp(pos, np.arange(len(y)), y)
        g *= env(len(kk) / SR, 0.003, 2.5 if last else 0.06)          # fret-hand mute at the note end
        i = int(when * SR)
        buf[i:i + len(g)] += g[:n - i]
        prev = note
        when += d * EIGHTH
    buf = amp(buf)
    buf /= np.abs(buf).max() + 1e-9
    add(buf, 0, gain, pan, 0.3)
    for echo in range(1, 3):
        add(buf, echo * 1.5 * EIGHTH, gain * 0.25 ** echo, 0.6 if echo % 2 else -0.6, 0.5)
    return when


def kick(t, g=1.0):
    kk = np.arange(int(0.45 * SR)) / SR
    body = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-kk * 35)) / SR) * np.exp(-kk * 9)
    click = np.diff(rng.standard_normal(len(kk)), prepend=0) * np.exp(-kk * 400) * 0.3
    add(body + click, t, 0.42 * g, 0, 0.1)


def snare(t, g=1.0):
    kk = np.arange(int(0.3 * SR)) / SR
    noise = np.diff(rng.standard_normal(len(kk)), prepend=0) * np.exp(-kk * 16)
    body = np.sin(2 * np.pi * 190 * kk) * np.exp(-kk * 30)
    add(noise * 0.6 + body * 0.8, t, 0.2 * g, 0.05, 0.35)


def hat(t, g=1.0):
    kk = np.arange(int(0.06 * SR)) / SR
    h = np.diff(np.diff(rng.standard_normal(len(kk)), prepend=0), prepend=0) * np.exp(-kk * 80)
    add(h, t, 0.025 * g, 0.35, 0.15)


def crash(t, g=1.0):
    kk = np.arange(int(1.8 * SR)) / SR
    c = np.diff(np.diff(rng.standard_normal(len(kk)), prepend=0), prepend=0) * np.exp(-kk * 2.2)
    add(c, t, 0.05 * g, -0.4, 0.4)


def power_chord(buf, t, root, dur, muted, gain):
    """One pick stroke of a power chord (root, fifth, octave); palm-muted strokes are short and dull."""
    i = int(t * SR)
    for s, iv in enumerate((0, 7, 12)):
        y, _ = string(root + iv, dur + 0.05, 0.95 if muted else 0.9985)
        y = y[:int((dur + 0.05) * SR)] * env(dur + 0.05, 0.002, 0.03 if muted else 0.04)
        j = i + int((0.004 + rng.random() * 0.003) * s * SR)
        buf[j:j + len(y)] += y[:n - j] * gain * (0.55 if muted else 1.0)


def rhythm(sections, drums):
    """sections: list of bars, a bar is [(power chord root, eighths, 'ring' or 'chug')]. Returns the end time."""
    takes = [np.zeros(n), np.zeros(n)]          # double-tracked rhythm guitar, left and right
    t = 0.0
    for start, bars, style in sections:
        t = start
        for b, bar in enumerate(bars):
            t_bar = t
            for root, d, kind in bar:
                for e in range(d):
                    accent = e == 0 or kind == 'ring'
                    length_e = d * EIGHTH if kind == 'ring' and e == 0 else EIGHTH * (0.95 if accent else 0.6)
                    if kind == 'ring' and e > 0:
                        break
                    for take in takes:
                        power_chord(take, t + e * EIGHTH + rng.random() * 0.006, root, length_e, not accent, 1.0)
                # Bass: picked eighths on the root.
                for e in range(d):
                    kb = np.arange(int(EIGHTH * 0.9 * SR)) / SR
                    bass = np.tanh(1.8 * osc(np.full(len(kb), hz(root - 12)), [(1, 1), (2, .5), (3, .3), (4, .15)]))
                    add(bass * env(EIGHTH * 0.9, 0.004, 0.03), t + e * EIGHTH, 0.12, 0, 0.05)
                t += d * EIGHTH
            drums(t_bar, b, len(bars), style)
    for take, pan in zip(takes, (-0.85, 0.85)):
        out = amp(take)
        add(out / (np.abs(out).max() + 1e-9), 0, 0.12, pan, 0.12)
    return t


def drums(t_bar, b, count, style):
    if b == 0:
        crash(t_bar)
    for e in range(7):
        hat(t_bar + e * EIGHTH, 1.3 if e in (0, 3, 5) else 0.8)
    kick(t_bar)
    kick(t_bar + 5 * EIGHTH, 0.85)
    if style != 'verse':
        kick(t_bar + 2 * EIGHTH, 0.6)
    if b == count - 1 and style != 'end':
        for k, e in enumerate((3, 4, 5, 6)):                # fill into the next section
            snare(t_bar + e * EIGHTH, 0.6 + 0.15 * k)
    else:
        snare(t_bar + 3 * EIGHTH)
        if style != 'verse':
            snare(t_bar + 6 * EIGHTH, 0.7)


def tune_bars():
    """The chords of the tune (BARS) as rhythm-guitar bars: chugging 3+2+2."""
    out = []
    for bar in BARS:
        out.append([(root, d, 'chug') for root, _voicing, d in bar])
    return out


G, Fp, Bb, C, Eb, D = 43, 41, 46, 48, 39, 38
RIFF = [[(G, 3, 'chug'), (G, 2, 'chug'), (Fp, 2, 'ring')],
        [(G, 3, 'chug'), (Bb, 2, 'ring'), (C, 2, 'ring')],
        [(G, 3, 'chug'), (G, 2, 'chug'), (Fp, 2, 'ring')],
        [(Eb, 3, 'ring'), (D, 4, 'ring')]]
t_intro = 0.6
t_tune1 = t_intro + 4 * BAR
t_break = t_tune1 + 14 * BAR
t_tune2 = t_break + 2 * BAR
t_outro = t_tune2 + 14 * BAR
t_final = t_outro + 4 * BAR
rhythm([(t_intro, RIFF, 'riff'), (t_tune1, tune_bars(), 'tune'), (t_break, RIFF[2:], 'riff'),
        (t_tune2, tune_bars(), 'tune'), (t_outro, RIFF, 'riff')], drums)
# Final G5 chord, crash and the lead's high G ringing out.
ring = max(1.0, length - t_final)
for take, pan in ((np.zeros(n), -0.85), (np.zeros(n), 0.85)):
    power_chord(take, t_final, G, ring, False, 1.0)
    out = amp(take)
    add(out / (np.abs(out).max() + 1e-9), 0, 0.12, pan, 0.25)
crash(t_final, 1.4)
kick(t_final, 1.2)
kk = np.arange(int(ring * SR)) / SR
add(np.tanh(1.8 * osc(np.full(len(kk), hz(31)), [(1, 1), (2, .5), (3, .3)])) * env(ring, 0.005, ring * 0.8), t_final, 0.12, 0, 0.05)

# Lead: the tune at the written pitch, then an octave higher with a twin guitar a sixth below; a high G at the end.
lead(TUNE, t_tune1, 0, 0.11, -0.05)
lead(TUNE, t_tune2, 12, 0.10, -0.2)
lead([(third_above(nn) if nn else None, d) for nn, d in TUNE], t_tune2, 0, 0.065, 0.3)
lead([(79, 4), (None, 1)], t_final, 0, 0.1, -0.1, hold_last=ring)
print(f'riff {t_intro:.1f}, tune {t_tune1:.1f} and {t_tune2:.1f}, outro {t_outro:.1f}, final chord {t_final:.1f}, video {length:.1f} s')


# Soft clicks.
for c in clicks:
    kc = np.arange(int(0.03 * SR)) / SR
    tick = (np.sin(2 * np.pi * 1800 * kc) * 0.6 + np.diff(rng.standard_normal(len(kc)), prepend=0) * 0.25) * np.exp(-kc * 260)
    add(tick, c, 0.12, 0, 0.05)

# Room reverb: FFT convolution with a decaying stereo noise impulse response.
ir_len = int(1.2 * SR)
kr = np.arange(ir_len) / SR
size = 1 << int(np.ceil(np.log2(n + ir_len)))
wet = np.zeros_like(fx)
for ch in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-kr / 0.3) * np.minimum(1, kr / 0.02)
    ir = np.convolve(ir, np.ones(6) / 6, mode='same')
    wet[:, ch] = np.fft.irfft(np.fft.rfft(fx[:, ch], size) * np.fft.rfft(ir, size), size)[:n]
wet /= np.abs(wet).max() + 1e-9
dryn = dry / (np.abs(dry).max() + 1e-9)
mix = dryn * 0.85 + wet * 0.3

end = int(length * SR)
fade = np.ones(n)
fade[:int(0.8 * SR)] = np.linspace(0, 1, int(0.8 * SR))
fade[end - int(3.0 * SR):end] = np.linspace(1, 0, int(3.0 * SR)) ** 1.5
fade[end:] = 0
mix = mix * fade[:, None]
# Loudness for social media: set the average level, then a soft limiter for the peaks.
rms = np.sqrt(np.mean(mix[int(1 * SR):int((length - 3) * SR)] ** 2)) + 1e-9
mix = np.tanh(mix * 10 ** (-13 / 20) / rms) * 10 ** (-3.5 / 20)

wav = video.with_name(video.stem + '-soundtrack.wav')
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix[:end] * 32767).astype('<i2').tobytes())

out = video.with_name(video.stem + '-music.mp4')
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(video), '-i', str(wav), '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
print(f'{length:.1f} s, {len(clicks)} clicks -> {out}')
