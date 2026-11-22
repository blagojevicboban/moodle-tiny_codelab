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
 * Small Chrome DevTools Protocol helper for the demo video: headless Edge, a fake mouse cursor, typing and screencast.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const BASE = process.env.MOODLE || 'http://localhost/moodle';
export const W = 1600;
export const H = 900;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const launch = async(w = W, h = H) => {
    const edge = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const port = 9300 + Math.floor(Math.random() * 500);
    const profile = mkdtempSync(join(tmpdir(), 'edge-'));
    // HOSTMAP="MAP localhost [::1]" when WSL forwards the web server port on IPv6 only (happens after a WSL restart).
    const extra = process.env.HOSTMAP ? [`--host-resolver-rules=${process.env.HOSTMAP}`] : [];
    const proc = spawn(edge, [...extra, '--headless=new', '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1',
        `--window-size=${w},${h}`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        'about:blank'], {stdio: 'ignore'});
    let targets;
    for (let i = 0; i < 60; i++) {
        try {
            targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            if (targets.some((t) => t.type === 'page')) {
                break;
            }
        } catch { /* not up yet */ }
        await sleep(200);
    }
    const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && pending.has(d.id)) {
            pending.get(d.id)(d);
            pending.delete(d.id);
        } else if (d.method) {
            listeners.forEach((l) => l(d));
        }
    };
    const send = (method, params = {}) => new Promise((r) => {
        const i = ++id;
        pending.set(i, r);
        ws.send(JSON.stringify({id: i, method, params}));
    });
    const b = {send, proc, on: (fn) => listeners.push(fn)};
    if (w !== W || h !== H) {
        await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: false});
    }
    b.eval = async(expression) => {
        const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
        if (r.result?.exceptionDetails) {
            throw new Error(`${expression.slice(0, 80)}: ${r.result.exceptionDetails.exception?.description}`);
        }
        return r.result?.result?.value;
    };
    b.waitFor = async(expression, ms = Number(process.env.WAIT || 90000)) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            try {
                // An evaluation that starts during a navigation can hang, so give each try a short deadline.
                const v = await Promise.race([b.eval(expression), sleep(1500).then(() => null)]);
                if (v) {
                    return v;
                }
            } catch { /* page still loading */ }
            await sleep(200);
        }
        throw new Error(`timeout: ${expression}`);
    };
    b.goto = async(url, ready = 'document.readyState === "complete"') => {
        await send('Page.navigate', {url});
        await sleep(500);
        await b.waitFor(ready);
        await b.installCursor();
    };
    // A visible arrow cursor (headless screencasts do not show the real one), kept across re-renders.
    b.cursor = {x: W / 2, y: H / 2};
    // Wall-clock times (s) of the clicks, for the click sounds of the video.
    b.clicks = [];
    b.installCursor = () => b.eval(`(() => {
        if (document.getElementById('demo-cursor')) return true;
        const c = document.createElement('div');
        c.id = 'demo-cursor';
        c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 17 L13 25 L16.5 23.5 L13 15.5 L20 15.5 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        c.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;' +
            'transform:translate(${b.cursor.x}px,${b.cursor.y}px);transition:transform 0.6s cubic-bezier(.4,0,.2,1)';
        const r = document.createElement('div');
        r.id = 'demo-ripple';
        r.style.cssText = 'position:fixed;left:0;top:0;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;' +
            'background:rgba(124,42,232,.35);z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.3)';
        document.documentElement.append(r, c);
        return true;
    })()`);
    b.moveTo = async(x, y, ms = 600) => {
        b.cursor = {x, y};
        await b.eval(`(() => { const c = document.getElementById('demo-cursor');
            c.style.transition = 'transform ${ms}ms cubic-bezier(.4,0,.2,1)';
            c.style.transform = 'translate(${x}px,${y}px)'; return true; })()`);
        await sleep(ms + 80);
    };
    b.ripple = () => b.eval(`(() => { const r = document.getElementById('demo-ripple');
        r.style.left = '${b.cursor.x}px'; r.style.top = '${b.cursor.y}px';
        r.animate([{opacity: 1, transform: 'scale(.3)'}, {opacity: 0, transform: 'scale(1.6)'}], {duration: 450}); return true; })()`);
    // Centre of the first element matching the selector (optionally whose text contains `text`), scrolled into view.
    b.locate = async(selector, text = null, index = 0) => {
        const r = await b.eval(`(() => {
            const all = [...document.querySelectorAll(${JSON.stringify(selector)})]
                .filter((e) => ${text === null ? 'true' : `e.textContent.trim().includes(${JSON.stringify(text)})`})
                .filter((e) => e.getClientRects().length);
            const e = all[${index}];
            if (!e) return null;
            const box = e.getBoundingClientRect();
            if (box.top < 70 || box.bottom > ${H} - 40) {
                window.scrollBy({top: box.top - ${H} / 2 + box.height / 2, behavior: 'instant'});
            }
            const q = e.getBoundingClientRect();
            return {x: q.left + q.width / 2, y: q.top + q.height / 2};
        })()`);
        if (!r) {
            throw new Error(`not found: ${selector} ${text ?? ''}`);
        }
        return r;
    };
    // Move the cursor to the element and click it with real mouse events.
    b.click = async(selector, text = null, {index = 0, pause = 250} = {}) => {
        const p = await b.locate(selector, text, index);
        await b.moveTo(p.x, p.y);
        await b.ripple();
        b.clicks.push(Date.now() / 1000);
        for (const type of ['mousePressed', 'mouseReleased']) {
            await send('Input.dispatchMouseEvent', {type, x: p.x, y: p.y, button: 'left', clickCount: 1});
        }
        await sleep(pause);
    };
    b.type = async(text, delay = 90) => {
        for (const ch of text) {
            await send('Input.insertText', {text: ch});
            await sleep(delay);
        }
    };
    b.key = async(key, code = key, keyCode = 13) => {
        for (const type of ['keyDown', 'keyUp']) {
            await send('Input.dispatchKeyEvent', {type, key, code, windowsVirtualKeyCode: keyCode});
        }
    };
    b.scrollTo = (y) => b.eval(`window.scrollTo({top: ${y}, behavior: 'smooth'}); true`);
    b.close = () => {
        ws.close();
        // Edge has many child processes and starts again under another process id, so the tree of the first one is
        // not enough: end every Edge that uses this temporary profile.
        spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
        const dir = profile.replace(/'/g, "''");
        spawnSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | " +
            `Where-Object { $_.CommandLine -like '*${dir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`]);
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false});
    return b;
};

export const login = async(b) => {
    await b.goto(`${BASE}/login/index.php`, '!!document.querySelector("#username")');
    // Account from the environment: MOODLE_USER and MOODLE_PASS (never put a password in this file).
    const user = JSON.stringify(process.env.MOODLE_USER || '');
    const pass = JSON.stringify(process.env.MOODLE_PASS || '');
    await b.eval(`document.querySelector("#username").value=${user};document.querySelector("#password").value=${pass};` +
        'document.querySelector("#loginbtn").click();true');
    await sleep(2500);
};
