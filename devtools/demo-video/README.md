# Demo reel and hero GIF

These scripts record the English CodeLab demo reel (1920x1080 MP4) and the hero GIF straight from the live demo site
https://codelab.tsp.edu.rs. Nothing is filmed by hand: a headless Edge opens the pages, moves a drawn mouse cursor,
clicks, types, shows captions, and every frame is taken with the Chrome DevTools Protocol screencast. The same run gives
the same video, so after a release you only run it again.

The folder is export-ignored, so it is never part of the plugin ZIP.

## What you need

- Windows with Microsoft Edge (the scripts use `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; set
  `EDGE=<path>` for another place, Chrome works too).
- Node.js 22 or newer (the scripts use the built-in `WebSocket` and `fetch`).
- Python 3 with `numpy` and `imageio-ffmpeg` (it brings its own ffmpeg, no separate install):
  `pip install numpy imageio-ffmpeg`.
- About 2 GB free disk space for the frames while it runs.

## Record

Run from the repository root:

```bash
node devtools/demo-video/record-codelab-reel.mjs
```

It takes about two and a half minutes. Output in `devtools/demo-video/`:

| File | What |
|---|---|
| `codelab-reel.mp4` | 1920x1080, 30 fps, H.264, no sound |
| `codelab-hero.gif` | 960 px wide, 12 fps, the middle part of the reel sped up (for README and listing) |
| `codelab-reel.clicks.json` | times of the clicks in seconds, for the click sounds |
| `frames-codelab/` | the raw frames; delete after you are happy with the result |

Other output paths: `node devtools/demo-video/record-codelab-reel.mjs out/reel.mp4 out/hero.gif`.
Another Moodle (for example your local one with the same demo course): `MOODLE=http://localhost/moodle node ...`.

If a scene fails, the script stops and saves a screenshot of that moment as `error-codelab.png`.

## Add the music

The reel is timed to the 132.05 s track "Inspiring Cinematic Music" by Tunetank from Pixabay (free under the Pixabay
Content License). The MP3 is not in the repository, since that license does not allow sharing the file on its own:
download it from Pixabay yourself and keep the original file name.

```bash
python devtools/demo-video/use-music.py devtools/demo-video/codelab-reel.mp4 <path>/tunetank-inspiring-cinematic-music-409347.mp3
```

That writes `codelab-reel-tunetank.mp4`: the music with fade-in and fade-out plus soft click sounds at the times in
`codelab-reel.clicks.json`. Optional arguments: the offset in the music where the video starts (seconds) and the gain
in dB (default -5): `... music.mp3 0 -3`.

Without any downloaded music, `add-sound.py` synthesises an original soundtrack (a rock version of a traditional
Serbian folk tune) and the clicks: `python devtools/demo-video/add-sound.py devtools/demo-video/codelab-reel.mp4`
gives `codelab-reel-music.mp4`. It was written for the longer Algorithm reel, so check the ending.

## The scenes

`record-codelab-reel.mjs` is one scene after another. Each scene goes to a page, calls `caption(text, role)` (role badge
ADMIN, TEACHER, STUDENT or INTEGRATION), does the clicks and typing, then `hold(ms)` keeps the picture. Recording is
switched off with `setRecording(false)` while a page loads, so loading never shows in the video.

1. Intro card and the runner options card (`cards/codelab-card.html#intro`, `#runners`, `#admin`, `#outro`)
2. Login as `teacher` / `Demo-2026` (the public demo account) and the section "Features one by one" of the course
   "CodeLab: demo (English)"
3. Admin page with the servers (page 15), the quiz and question editing (the quiz of the section, page 14)
4. Class view (13), interactive input (2), languages (3), debugger (5), step back and timeline (6), memory view (7),
   complexity (8), flowchart bridge (9), SQL (10), then the auto-graded quiz again
5. Outro card, held as long as needed so that the reel ends exactly with the music (`TARGET_SEC`, default 132.05)

Every demo reset restores the course with new ids, so the script never uses fixed ids: right after the login,
`findDemoIds()` finds the course, the section and the pages by name, and `ids.pages[n]` is the page whose name starts
with `n.` ("2. Run and input while the program runs"). Keep that numbering when you add pages to the demo course, and
add new pages at the end so the numbers of the others do not change.

Code inside `b.eval()` runs in the page from a template literal, which drops single backslashes: write a regex
there with doubled ones (`/^\\s*(\\d+)\\./`).

Helpers you will use when you change scenes:

- `preparePage(id)`: opens a page, waits until the CodeLab editor is ready, hides the Moodle navigation so the viewer
  fills the frame.
- `realClickBtn(label, idx)`: moves the cursor to the button with that text in the idx-th viewer on the page and clicks.
- `b.moveTo(x, y, steps)`, `b.click(selector, text)`, `b.type(text)`, `b.waitFor(jsExpression, ms)`, `scrollDown(px)`:
  from `cdp.mjs`.
- `gifRange.start = frames.length` and `gifRange.end = frames.length` mark which part goes into the GIF. GIF speed and
  size: `setpts=0.45*PTS`, `fps=12` and `scale=960:-1` in the second ffmpeg call.

Captions and cards are English. Keep them short (one line at 1920 px), plain text, no emoji.

## When a new feature comes

1. Make or update a demo page for it on the demo site (codelab-demo repository, the demo course backup).
2. Add a scene in `record-codelab-reel.mjs` next to the related one, about 6 to 10 s.
3. The total must stay under the music length: the script prints `Recorded N s of scenes`. Shorten other holds if N
   gets close to 128 s, since the outro needs at least 4 s.

Now (November 2026, tiny_codelab 1.20) the scenes take about 102 s, so the outro card stays on screen for 30 s. There
is room for three or four scenes of the newer features that the reel does not show yet: turtle graphics, the call
tree, the template library and the AI hints.
4. Record, add the music, watch the whole video once, then send the MP4 and GIF (or upload them to the release) and
   tell Boban, who puts them on the Marketplace listing and YouTube.

## Browser processes

Edge starts many child processes. `cdp.mjs` `close()` ends every Edge process that uses the temporary profile of the
run, and the script calls it in `finally`. If you stop a run with Ctrl+C, end the leftovers in PowerShell (this touches
only test browsers, never your own Edge):

```powershell
$t = [IO.Path]::GetTempPath().TrimEnd('\'); Get-CimInstance Win32_Process -Filter "name='msedge.exe'" |
  Where-Object { $_.CommandLine -match [regex]::Escape($t) + '\edge-' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
```
