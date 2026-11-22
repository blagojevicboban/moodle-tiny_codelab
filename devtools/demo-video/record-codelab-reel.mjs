// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Records the English Demo Reel (MP4) + Hero GIF of CodeLab from the section "Features one by one" of the English demo
 * course on https://codelab.tsp.edu.rs (the page ids are looked up after the login, since every demo reset changes them).
 * Matches the 132.05 s Tunetank MP3 duration.
 * Usage: node devtools/demo-video/record-codelab-reel.mjs [out.mp4] [out.gif]
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {H, W, launch, sleep} from './cdp.mjs';

const BASE = process.env.MOODLE || 'https://codelab.tsp.edu.rs';
const here = dirname(fileURLToPath(import.meta.url));
const outMp4 = process.argv[2] || join(here, 'codelab-reel.mp4');
const outGif = process.argv[3] || join(here, 'codelab-hero.gif');
const framesDir = join(here, 'frames-codelab');
rmSync(framesDir, {recursive: true, force: true});
mkdirSync(framesDir);

const card = (name) => pathToFileURL(join(here, 'cards', 'codelab-card.html')).href + '#' + name;
const ffmpeg = execFileSync('python', ['-c', 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())']).toString().trim();

const b = await launch(W, H);
const frames = [];
let recording = false;
let segment = 0;
let gifRange = {start: null, end: null};

const setRecording = (on) => {
    if (on && !recording) {
        segment++;
    }
    recording = on;
};

b.on((m) => {
    if (m.method === 'Page.screencastFrame') {
        b.send('Page.screencastFrameAck', {sessionId: m.params.sessionId});
        if (recording) {
            const file = join(framesDir, `f${String(frames.length).padStart(5, '0')}.jpg`);
            writeFileSync(file, Buffer.from(m.params.data, 'base64'));
            frames.push({file, t: m.params.metadata.timestamp, segment});
        }
    }
});

// High-contrast, eye-catching bottom caption with optional role badge (ADMIN / TEACHER / STUDENT / INTEGRATION).
const caption = (text, role = '') => b.eval(`(() => {
    let c = document.getElementById('demo-caption');
    if (!c) {
        c = document.createElement('div');
        c.id = 'demo-caption';
        c.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;' +
            'display:flex;align-items:center;gap:14px;background:rgba(15,23,42,.95);color:#fff;' +
            'border:2.5px solid #38bdf8;font:700 27px/1.25 "Segoe UI",Roboto,Arial,sans-serif;padding:13px 28px;' +
            'border-radius:16px;box-shadow:0 14px 38px rgba(0,0,0,.48);max-width:1500px;white-space:nowrap;transition:opacity .25s';
        document.documentElement.append(c);
    }
    c.style.opacity = ${text ? 1 : 0};
    if (${JSON.stringify(text)}) {
        const badgeColors = {
            ADMIN: '#f59e0b', TEACHER: '#10b981', STUDENT: '#38bdf8', INTEGRATION: '#a855f7'
        };
        const r = ${JSON.stringify(role)};
        const badge = r ? '<span style="background:' + (badgeColors[r] || '#38bdf8') +
            ';color:#0f172a;font-size:17px;font-weight:800;letter-spacing:1px;padding:4px 12px;border-radius:8px;">' + r + '</span>' : '';
        c.innerHTML = badge + '<span>' + ${JSON.stringify(text)} + '</span>';
    }
    return true;
})()`);

const startCast = () => b.send('Page.startScreencast', {format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1});

const hold = async(ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        await b.eval(`(() => { let t = document.getElementById('demo-tick');
            if (!t) { t = document.createElement('div'); t.id = 'demo-tick';
                t.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:2147483647;pointer-events:none';
                document.documentElement.append(t); }
            t.style.background = t.style.background === 'rgb(254, 254, 254)' ? 'rgb(253, 253, 253)' : 'rgb(254, 254, 254)';
            return true; })()`).catch(() => null);
        await sleep(100);
    }
};

const hideCursor = () => b.eval(`(() => { const c = document.getElementById('demo-cursor'); if (c) c.style.display = 'none'; return true; })()`);

const stripChrome = async(selector = '.filter_codelab-viewer') => {
    await b.eval(`(() => {
        const st = document.createElement('style');
        st.textContent = \`
            nav.navbar, #page-header, .drawer, .drawer-toggler, footer, .activity-navigation,
            [data-region="drawer-toggle"], .secondary-navigation { display: none !important; }
            #page.drawers, #page-wrapper, #page-content, #region-main, [role="main"] {
                margin: 0 !important; padding: 0 !important; max-width: 100% !important; background: #f8fafc !important;
            }
            #region-main > div { max-width: 1340px !important; margin: 10px auto 125px auto !important; }
        \`;
        document.head.append(st);
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) el.scrollIntoView({block: 'start'});
        window.scrollBy(0, -12);
        return true;
    })()`);
    await sleep(300);
    b.cursor = {x: 800, y: 420};
    await b.installCursor();
};

const preparePage = async(id) => {
    await b.goto(`${BASE}/mod/page/view.php?id=${id}&lang=en`, '!!document.querySelector(".filter_codelab-viewer")');
    await b.waitFor('!!document.querySelector(".filter_codelab-viewer .tiny_codelab-frame")?.contentWindow?.monaco?.editor?.getEditors()?.length', 20000).catch(() => null);
    await sleep(300);
    await stripChrome('.filter_codelab-viewer');
};

const realClickBtn = async(label, idx = 0) => {
    const pos = await b.eval(`(() => {
        const v = document.querySelectorAll('.filter_codelab-viewer')[${idx}];
        const btn = v && [...v.querySelectorAll('button')].find((e) => e.textContent.trim() === ${JSON.stringify(label)});
        if (!btn) return null;
        btn.scrollIntoView({block: 'nearest'});
        const r = btn.getBoundingClientRect();
        return {x: r.left + r.width / 2, y: r.top + r.height / 2};
    })()`);
    if (pos) {
        await b.moveTo(pos.x, pos.y, 7);
        await b.click('.filter_codelab-viewer button', label);
    }
};

// Ids of the demo pages: every demo reset restores the course with new ids, so they are looked up by name. The page
// numbers are the numbers at the start of the page names in the section "Features one by one" ("2. Run and input ...").
const findDemoIds = () => b.eval(`(async() => {
    const get = async(url) => new DOMParser().parseFromString(await (await fetch(url)).text(), 'text/html');
    const index = await get(${JSON.stringify(BASE)} + '/course/index.php?lang=en');
    const course = [...index.querySelectorAll('a[href*="course/view.php?id="]')]
        .find((a) => a.textContent.includes('CodeLab: demo (English)'));
    if (!course) throw new Error('No course "CodeLab: demo (English)"');
    const view = await get(course.href + '&lang=en');
    const section = [...view.querySelectorAll('a[href*="course/section.php?id="]')]
        .find((a) => a.textContent.trim().startsWith('Features one by one'));
    if (!section) throw new Error('No section "Features one by one"');
    const page = await get(section.href + '&lang=en');
    const ids = {section: new URL(section.href).searchParams.get('id'), pages: {}, quiz: null};
    for (const a of page.querySelectorAll('a[href*="/mod/"][href*="view.php?id="]')) {
        const id = new URL(a.href).searchParams.get('id');
        // A template literal drops single backslashes, so the regex is written with doubled ones.
        const n = /^\\s*(\\d+)\\./.exec(a.textContent);
        if (a.href.includes('/mod/page/') && n) ids.pages[n[1]] = id;
        if (a.href.includes('/mod/quiz/') && !ids.quiz) ids.quiz = id;
    }
    if (!ids.quiz || Object.keys(ids.pages).length < 15) throw new Error('Pages not found: ' + JSON.stringify(ids));
    return ids;
})()`);

const scrollDown = (px) => b.eval(`window.scrollBy({top: ${px}, behavior: 'smooth'}); true`);

try {
    await startCast();

    // 0. WOW Intro card (~4.2s)
    await b.goto(card('intro'));
    await hideCursor();
    setRecording(true);
    await hold(4200);

    // 1. Execution Options card: In-Browser · Jobe / CodeRunner · Hosted Paid Runner (~5.8s)
    setRecording(false);
    await b.goto(card('runners'));
    await hideCursor();
    setRecording(true);
    await hold(5800);

    // 2. Site Access & Login as Teacher on codelab.tsp.edu.rs -> section "Features one by one" (~7.5s)
    setRecording(false);
    // Moodle moves the focus to the password field once its JavaScript runs and the username is not empty:
    // wait until all of Moodle's JavaScript has run, so typing is not split between the two fields.
    await b.goto(`${BASE}/login/index.php?lang=en`,
        '!!document.querySelector("#username") && window.M?.util?.pending_js?.length === 0');
    await sleep(500);
    b.cursor = {x: 800, y: 400};
    await b.installCursor();
    setRecording(true);
    await caption('Sign in at codelab.tsp.edu.rs as Teacher or Student', 'TEACHER');
    await b.click('#username');
    await b.type('teacher');
    await b.click('#password');
    await b.type('Demo-2026');
    await b.click('#loginbtn');
    await b.waitFor('!!document.querySelector(".usermenu, #user-menu-toggle")', 15000);
    setRecording(false);
    const ids = await findDemoIds();
    await b.goto(`${BASE}/course/section.php?id=${ids.section}&lang=en`);
    await b.installCursor();
    setRecording(true);
    await caption('Course section "Features one by one: how students and teachers use them"', 'TEACHER');
    await hold(2200);

    // 3. Admin Settings & Servers (~8.5s)
    setRecording(false);
    await b.goto(card('admin'));
    await hideCursor();
    setRecording(true);
    await hold(4200);

    setRecording(false);
    await b.goto(`${BASE}/mod/page/view.php?id=${ids.pages[15]}&lang=en`, '!!document.querySelector("#region-main")');
    await sleep(500);
    await stripChrome('#region-main');
    setRecording(true);
    await caption('Servers: free Jobe, CodeRunner compatible, Hosted Paid Runner, or in-browser', 'ADMIN');
    await hold(1200);
    await scrollDown(200);
    await hold(2600);

    // 4. Teacher: Quiz Question Setup (quiz question edit or page 14) (~7.5s)
    setRecording(false);
    await b.goto(`${BASE}/mod/quiz/view.php?id=${ids.quiz}&lang=en`, '!!document.querySelector("button, input[type=submit]")');
    await b.eval(`(() => { const btn = [...document.querySelectorAll('button, input[type=submit]')].find(e => /preview|attempt/i.test(e.textContent || e.value)); if (btn) btn.click(); return true; })()`);
    await b.waitFor('!!document.querySelector(".que")', 20000);
    const editHref = await b.eval(`[...document.querySelectorAll('.que a[href*="editquestion"], .que a[href*="question.php"]')][0]?.href || ''`);
    if (editHref) {
        await b.goto(editHref);
        await sleep(700);
        await stripChrome('#id_generalheader, #region-main');
        setRecording(true);
        await caption('Teacher configures languages, test cases, hidden tests & Algorithm link', 'TEACHER');
        await hold(1400);
        await scrollDown(360);
        await hold(2200);
        await scrollDown(360);
        await hold(2000);
    } else {
        await preparePage(ids.pages[14]);
        setRecording(true);
        await caption('Teacher creates interactive pages & auto-graded coding questions', 'TEACHER');
        await hold(3500);
    }

    // 5. Teacher: Class Work View (page 13) (~6.5s)
    setRecording(false);
    await preparePage(ids.pages[13]);
    setRecording(true);
    await caption('Teacher opens Class view to inspect student code & results in real time', 'TEACHER');
    await hold(1000);
    await realClickBtn('Class');
    await hold(3800);

    // 6. Student: Run & Interactive Input (page 2) (~8.0s)
    setRecording(false);
    await preparePage(ids.pages[2]);
    setRecording(true);
    await caption('Student runs code and types live input while the program executes', 'STUDENT');
    await hold(700);
    await realClickBtn('Run');
    await hold(4200);

    // 7. Student: Eight Languages (page 3) (~7.0s)
    setRecording(false);
    await preparePage(ids.pages[3]);
    setRecording(true);
    await caption('8+ languages in one Moodle course — Python, C, C++, Java, C#, JS, Pascal, PHP', 'STUDENT');
    await hold(700);
    await realClickBtn('Run');
    await hold(2000);
    await scrollDown(260);
    await hold(2600);

    // Start Hero GIF capture here (Debugger + Step Back + Memory + Complexity + Flowchart + SQL)
    gifRange.start = frames.length;

    // 8. Student: Debugger & Step Back / Timeline (pages 5 and 6) (~11.5s)
    setRecording(false);
    await preparePage(ids.pages[5]);
    setRecording(true);
    await caption('Built-in Debugger — breakpoints, call stack, variables & trace table', 'STUDENT');
    await hold(600);
    await realClickBtn('Step');
    await hold(1100);
    await realClickBtn('Step');
    await hold(1000);
    await realClickBtn('Step');
    await hold(1400);

    setRecording(false);
    await preparePage(ids.pages[6]);
    setRecording(true);
    await caption('Step Back & Timeline — rewind execution to any earlier step', 'STUDENT');
    await hold(600);
    await realClickBtn('Step');
    await hold(900);
    await realClickBtn('Step');
    await hold(900);
    await realClickBtn('Step');
    await hold(1400);

    // 9. Student: Memory View (page 7) (~9.5s)
    setRecording(false);
    await preparePage(ids.pages[7]);
    setRecording(true);
    await caption('Memory View — references, pointers, lists & objects drawn live', 'STUDENT');
    await hold(600);
    await realClickBtn('Step');
    await hold(1200);
    await scrollDown(220);
    for (let s = 0; s < 3; s++) {
        await realClickBtn('Step');
        await hold(950);
    }
    await hold(1500);

    // 10. Student: Complexity Growth Chart (page 8) (~8.5s)
    setRecording(false);
    await preparePage(ids.pages[8]);
    setRecording(true);
    await caption('Empirical Complexity — benchmark & plot O(n²) vs O(n log n)', 'STUDENT');
    await hold(600);
    await realClickBtn('Complexity');
    await hold(1800);
    await scrollDown(220);
    await hold(3600);

    // 11. CodeLab <-> Algorithm Plugin Integration: Flowchart button (page 9) (~11.5s)
    setRecording(false);
    await preparePage(ids.pages[9]);
    setRecording(true);
    await caption('CodeLab ↔ Algorithm Integration — click Flowchart to visualize code!', 'INTEGRATION');
    await hold(800);
    await realClickBtn('Flowchart');
    await hold(2200);
    await scrollDown(250);
    await hold(4500);

    // 12. Student: SQL with Hidden Tables (page 10) (~7.5s)
    setRecording(false);
    await preparePage(ids.pages[10]);
    setRecording(true);
    await caption('SQL (MySQL) with hidden setup tables — run queries & inspect results', 'STUDENT');
    await hold(700);
    await realClickBtn('Run');
    await hold(1800);
    await scrollDown(200);
    await hold(2600);

    gifRange.end = frames.length;

    // 13. Student: Auto-Graded Quiz Preview (quiz) (~8.5s)
    setRecording(false);
    await b.goto(`${BASE}/mod/quiz/view.php?id=${ids.quiz}&lang=en`, '!!document.querySelector("button, input[type=submit]")');
    await b.eval(`(() => { const btn = [...document.querySelectorAll('button, input[type=submit]')].find(e => /preview|attempt/i.test(e.textContent || e.value)); if (btn) btn.click(); return true; })()`);
    await b.waitFor('!!document.querySelector(".que")', 20000);
    await sleep(600);
    await stripChrome('.que');
    setRecording(true);
    await caption('Auto-graded Moodle quizzes — instant test results & hidden test cases', 'STUDENT');
    await hold(2200);
    await scrollDown(220);
    await hold(3500);

    // 14. Outro card — pad to match the 132.05 s MP3 duration
    setRecording(false);
    await b.goto(card('outro'));
    await hideCursor();
    const elapsedSec = frames.reduce((acc, f, i) => acc + (frames[i + 1]?.segment === f.segment ? frames[i + 1].t - f.t : 0.1), 0);
    const targetSec = Number(process.env.TARGET_SEC || 132.05);
    const outroMs = Math.max(4000, Math.round((targetSec - elapsedSec) * 1000));
    console.log(`Recorded ${elapsedSec.toFixed(1)}s of scenes; holding outro for ${(outroMs / 1000).toFixed(1)}s`);
    setRecording(true);
    await hold(outroMs);

    setRecording(false);
    await b.send('Page.stopScreencast');
} catch (e) {
    const s = await b.send('Page.captureScreenshot', {format: 'png'});
    writeFileSync(join(here, 'error-codelab.png'), Buffer.from(s.result.data, 'base64'));
    throw e;
} finally {
    b.close();
}

const duration = (f, next) => (next && next.segment === f.segment ? next.t - f.t : 0.1);
const list = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${
    duration(f, frames[i + 1]).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`;
const listFile = join(framesDir, 'list.txt');
writeFileSync(listFile, list);

execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', 'fps=30,scale=1920:1080:flags=lanczos:in_range=pc:out_range=tv,format=yuv420p',
    '-r', '30', '-color_range', 'tv', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-movflags', '+faststart', outMp4
], {stdio: 'inherit'});

const gifFrames = frames.slice(gifRange.start, gifRange.end);
const gifList = gifFrames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${
    duration(f, gifFrames[i + 1]).toFixed(4)}`).join('\n') + `\nfile '${gifFrames.at(-1).file.replace(/\\/g, '/')}'\n`;
const gifListFile = join(framesDir, 'gif_list.txt');
writeFileSync(gifListFile, gifList);

execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', gifListFile,
    '-vf', 'setpts=0.45*PTS,fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop', '0', outGif
], {stdio: 'inherit'});

console.log(`${frames.length} frames -> ${outMp4}`);
console.log(`${gifFrames.length} gif frames -> ${outGif}`);

let at = 0;
const starts = frames.map((f, i) => {
    const s = at;
    at += duration(f, frames[i + 1]);
    return s;
});
const clicks = b.clicks.map((c) => {
    const i = frames.findLastIndex((f) => f.t <= c);
    return i >= 0 && frames[i + 1]?.segment === frames[i].segment ? starts[i] + (c - frames[i].t) : null;
}).filter((t) => t !== null);
writeFileSync(outMp4.replace(/\.mp4$/, '.clicks.json'), JSON.stringify(clicks.map((t) => +t.toFixed(3))));
console.log(`${clicks.length} clicks`);
