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

"""Puts a music file (e.g. a Pixabay track) under the demo video, with fades and the soft click sounds.

Usage: python devtools/demo-video/use-music.py <video.mp4> <music.mp3> [offset seconds] [gain dB]
The offset is where in the music the video starts (pick it so that a build-up lands on a scene change).
Writes <video>-<first word of the music file name>.mp4 next to the video. Click times come from <video>.clicks.json written by record.mjs.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 44100
video, music = Path(sys.argv[1]), Path(sys.argv[2])
offset = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
gain_db = float(sys.argv[4]) if len(sys.argv) > 4 else -5.0
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

probe = subprocess.run([ffmpeg, '-i', str(video)], capture_output=True, text=True).stderr
h, m, s = probe.split('Duration: ')[1].split(',')[0].split(':')
length = int(h) * 3600 + int(m) * 60 + float(s)
raw = subprocess.run([ffmpeg, '-loglevel', 'error', '-ss', str(offset), '-t', str(length), '-i', str(music),
                      '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
mix = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
n = int(length * SR)
mix = np.vstack([mix, np.zeros((max(0, n - len(mix)), 2))])[:n] * 10 ** (gain_db / 20)

# Fades: 1 s in, 3 s out.
fade = np.ones(n)
fade[:SR] = np.linspace(0, 1, SR)
fade[n - 3 * SR:] = np.linspace(1, 0, 3 * SR) ** 1.5
mix *= fade[:, None]

# Soft clicks.
clicks_file = video.with_suffix('.clicks.json')
rng = np.random.default_rng(3)
for c in json.loads(clicks_file.read_text()) if clicks_file.exists() else []:
    k = np.arange(int(0.03 * SR)) / SR
    tick = (np.sin(2 * np.pi * 1800 * k) * 0.6 + np.diff(rng.standard_normal(len(k)), prepend=0) * 0.25) * np.exp(-k * 260)
    i = int(c * SR)
    mix[i:i + len(k)] += (tick * 0.12)[:n - i, None]

mix = np.clip(mix, -0.89, 0.89)
tag = music.stem.split('-')[0]
wav = video.with_name(f'{video.stem}-{tag}.wav')
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
out = video.with_name(f'{video.stem}-{tag}.mp4')
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(video), '-i', str(wav), '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
print(f'music {offset:.1f}-{offset + length:.1f} s of {music.name}, {gain_db} dB -> {out}')
