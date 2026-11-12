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
 * How fast does a program grow? A Python program is run in the browser for several sizes n with an input made from a
 * template ({n}, {random}, {sorted}, {reversed}), the lines it runs are counted (not the time, so the result is the
 * same on every computer), drawn against n beside the curves n, n log n and n², and the curve that fits best is named
 * (it looks like O(n²)). The result can be kept, so a second version of the program is drawn beside it. As the
 * complexity chart of the algorithm plugins.
 *
 * @module     tiny_codelab/complexity
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';
import {countLines} from './python';

/** Sizes measured unless the reader chooses others. */
export const DEFAULT_SIZES = [10, 20, 50, 100, 200, 500];

/** Input template unless the reader writes another: n, then n numbers on one line. */
export const DEFAULT_TEMPLATE = '{n}\n{random}';

/** Most lines run for one size; a bigger n stops the measuring. */
export const MAX_LINES = 3000000;

/** Most sizes in one measuring, and the biggest size. */
const MAX_SIZES = 12;
const MAX_N = 100000;

/** Seed of the random numbers, so a measuring can be repeated. */
const SEED = 20261112;

/** Growth rates the measuring can name, from the slowest. */
export const GROWTHS = [
    {key: 'o1', f: () => 1},
    {key: 'ologn', f: (n) => Math.log2(Math.max(n, 2))},
    {key: 'on', f: (n) => n},
    {key: 'onlogn', f: (n) => n * Math.log2(Math.max(n, 2))},
    {key: 'on2', f: (n) => n * n},
    {key: 'on3', f: (n) => n * n * n},
];

/**
 * The sizes of a text such as "10 20 50, 100": whole numbers from 1, without repeats, sorted.
 *
 * @param {string} text
 * @returns {number[]}
 */
export const parseSizes = (text) => [...new Set(String(text).split(/[\s,;]+/).map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_N))].sort((a, b) => a - b).slice(0, MAX_SIZES);

/**
 * Random whole numbers from 1 to 1000 (always the same for a seed).
 *
 * @param {number} count
 * @param {number} seed
 * @returns {number[]}
 */
const randoms = (count, seed) => {
    // Park–Miller (the products stay below 2^53, so they are exact).
    let state = (seed % 2147483646) + 1;
    const out = [];
    for (let i = 0; i < count; i++) {
        state = (state * 48271) % 2147483647;
        out.push((state % 1000) + 1);
    }
    return out;
};

/**
 * The input of one size: {n} is n, {random} n random numbers 1–1000 separated by spaces, {sorted} the same sorted,
 * {reversed} sorted from the largest.
 *
 * @param {string} template
 * @param {number} n
 * @returns {string}
 */
export const makeInput = (template, n) => {
    const numbers = randoms(n, SEED + n);
    const sorted = [...numbers].sort((a, b) => a - b);
    return String(template)
        .replace(/\{n\}/g, String(n))
        .replace(/\{random\}/g, numbers.join(' '))
        .replace(/\{sorted\}/g, sorted.join(' '))
        .replace(/\{reversed\}/g, [...sorted].reverse().join(' '));
};

/**
 * The growth that fits the counts best: lines ≈ a·f(n) + b with the least squares. A faster growth wins only when its
 * error is less than half of the error of the slower one, so a straight line is not called n log n.
 *
 * @param {Array<{n: number, steps: ?number}>} points
 * @returns {?{key: string, a: number, b: number}} null with fewer than three sizes
 */
export const classify = (points) => {
    const pts = points.filter((p) => p.steps !== null);
    if (pts.length < 3) {
        return null;
    }
    const total = pts.reduce((s, p) => s + p.steps, 0) / pts.length;
    const variance = pts.reduce((s, p) => s + (p.steps - total) ** 2, 0) || 1;
    let best = null;
    GROWTHS.forEach((g) => {
        const xs = pts.map((p) => g.f(p.n));
        const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
        const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
        const a = sxx ? xs.reduce((s, x, i) => s + (x - mx) * (pts[i].steps - total), 0) / sxx : 0;
        if (g.key !== 'o1' && a <= 0) {
            return;
        }
        const b = total - a * mx;
        const err = (g.key === 'o1' ? variance : xs.reduce((s, x, i) => s + (pts[i].steps - a * x - b) ** 2, 0)) / variance;
        if (!best || err < best.err / 2) {
            best = {key: g.key, a: g.key === 'o1' ? 0 : a, b: g.key === 'o1' ? total : b, err};
        }
    });
    return best && {key: best.key, a: best.a, b: best.b};
};

/**
 * Measure a program for the sizes; a size that fails or runs too long ends the measuring (the rest stay empty).
 *
 * @param {function(string): Promise<{status: string, steps: number, message: string}>} count runs the program
 * @param {string} template
 * @param {number[]} sizes
 * @param {function(number): void} [progress] called before each size
 * @returns {Promise<{points: Array<{n: number, steps: ?number}>, problem: ?{n: number, status: string, message: string}}>}
 */
export const measure = async(count, template, sizes, progress = () => undefined) => {
    const points = [];
    let problem = null;
    for (const n of sizes) {
        if (problem) {
            points.push({n, steps: null});
            continue;
        }
        progress(n);
        const result = await count(makeInput(template, n));
        if (result.status === 'ok') {
            points.push({n, steps: result.steps});
        } else {
            points.push({n, steps: null});
            problem = {n, status: result.status, message: result.message || ''};
        }
    }
    return {points, problem};
};

// ---- Drawing -----------------------------------------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, text = null) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    if (text !== null) {
        e.textContent = text;
    }
    return e;
};

/** Colours of the program and of the kept one (validated categorical pair). */
const COLORS = ['#2a78d6', '#eb6834'];

/** Reference curves drawn behind the measured ones. */
const REFERENCES = ['on', 'onlogn', 'on2'];

const fmt = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));

/**
 * Draw the counts of one or two programs against n, with the reference curves through the first point of the first.
 *
 * @param {Array<{label: string, points: Array}>} series
 * @param {Object<string, string>} s strings
 * @returns {SVGElement}
 */
export const drawChart = (series, s) => {
    const W = 560;
    const H = 300;
    const m = {l: 56, r: 92, t: 22, b: 40};
    const all = series.flatMap((x) => x.points.filter((p) => p.steps !== null));
    const maxN = Math.max(...all.map((p) => p.n), 1);
    const maxS = Math.max(...all.map((p) => p.steps), 1);
    const x = (n) => m.l + (n / maxN) * (W - m.l - m.r);
    const y = (v) => H - m.b - (Math.min(v, maxS * 1.05) / (maxS * 1.05)) * (H - m.t - m.b);
    const root = svg('svg', {viewBox: `0 0 ${W} ${H}`, 'class': 'tiny_codelab-cx-chart', role: 'img', 'aria-label': s.cxchart});
    for (let i = 0; i <= 4; i++) {
        const v = (maxS * 1.05 * i) / 4;
        root.append(svg('line', {x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), 'class': 'tiny_codelab-cx-grid'}),
            svg('text', {x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', 'class': 'tiny_codelab-cx-tick'}, fmt(v)));
    }
    let lastTick = -Infinity;
    [...new Set(all.map((p) => p.n))].sort((a, b) => a - b).filter((n) => {
        const keep = x(n) - lastTick >= 26;
        lastTick = keep ? x(n) : lastTick;
        return keep;
    }).forEach((n) => root.append(svg('text', {x: x(n), y: H - m.b + 16, 'text-anchor': 'middle',
        'class': 'tiny_codelab-cx-tick'}, String(n))));
    root.append(svg('text', {x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'tiny_codelab-cx-axis'}, 'n'),
        svg('text', {x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', 'class': 'tiny_codelab-cx-axis',
            transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`}, s.cxsteps));
    const right = [];
    const first = series[0].points.filter((p) => p.steps !== null);
    if (first.length) {
        const top = maxS * 1.05;
        const clipId = `tiny_codelab-cx-clip${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const clip = svg('clipPath', {id: clipId});
        clip.append(svg('rect', {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b}));
        root.append(clip);
        const start = first[0];
        REFERENCES.forEach((key) => {
            const g = GROWTHS.find((x2) => x2.key === key);
            const c = start.steps / g.f(start.n);
            const pts = [];
            let end = null;
            for (let i = 0; i <= 80; i++) {
                const n = start.n + ((maxN - start.n) * i) / 80;
                const v = c * g.f(n);
                pts.push(`${x(n).toFixed(1)},${(H - m.b - (v / top) * (H - m.t - m.b)).toFixed(1)}`);
                if (v <= top) {
                    end = {n, v};
                }
            }
            root.append(svg('polyline', {points: pts.join(' '), 'class': 'tiny_codelab-cx-ref', 'clip-path': `url(#${clipId})`}));
            if (end && end.n >= maxN) {
                right.push({y: y(end.v) + 4, text: s[`cx${key}`], cls: 'tiny_codelab-cx-reflabel'});
            } else if (end) {
                root.append(svg('text', {x: x(end.n), y: m.t - 2, 'text-anchor': 'middle', 'class': 'tiny_codelab-cx-reflabel'},
                    s[`cx${key}`]));
            }
        });
    }
    series.forEach((line, k) => {
        const pts = line.points.filter((p) => p.steps !== null);
        if (!pts.length) {
            return;
        }
        root.append(svg('polyline', {points: pts.map((p) => `${x(p.n).toFixed(1)},${y(p.steps).toFixed(1)}`).join(' '),
            'class': 'tiny_codelab-cx-line', stroke: COLORS[k]}));
        pts.forEach((p) => {
            const dot = svg('circle', {cx: x(p.n), cy: y(p.steps), r: 4, fill: COLORS[k], 'class': 'tiny_codelab-cx-dot'});
            dot.append(svg('title', {}, `${line.label}: n = ${p.n}, ${s.cxsteps} = ${p.steps}`));
            root.append(dot);
        });
        const lp = pts[pts.length - 1];
        if (lp.n >= maxN) {
            right.push({y: y(lp.steps) + 4, text: line.label, cls: 'tiny_codelab-cx-label'});
        } else {
            root.append(svg('text', {x: x(lp.n) + 6, y: y(lp.steps) - 6, 'class': 'tiny_codelab-cx-label'}, line.label));
        }
    });
    right.sort((a, b) => a.y - b.y);
    right.forEach((l, i) => {
        l.y = Math.max(l.y, i ? right[i - 1].y + 13 : m.t);
    });
    const over = right.length ? right[right.length - 1].y - (H - m.b + 4) : 0;
    right.forEach((l) => root.append(svg('text', {x: x(maxN) + 8, y: l.y - Math.max(0, over), 'class': l.cls}, l.text)));
    return root;
};

// ---- The panel ---------------------------------------------------------------------------------------------------------

const KEYS = ['complexity', 'cxsizes', 'cxinput', 'cxinputhelp', 'cxmeasure', 'cxkeep', 'cxclose', 'cxmeasuring',
    'cxsteps', 'cxlooks', 'cxunknown', 'cxfailed', 'cxtoolong', 'cxerror', 'cxchart', 'cxcurrent', 'cxkept',
    'cxo1', 'cxologn', 'cxon', 'cxonlogn', 'cxon2', 'cxon3'];
let strings = null;

/**
 * Strings, loaded once.
 *
 * @returns {Promise<Object<string, string>>}
 */
export const loadComplexityStrings = async() => {
    if (!strings) {
        const values = await getStrings(KEYS.map((key) => ({key, component})));
        strings = Object.fromEntries(KEYS.map((key, i) => [key, values[i]]));
    }
    return strings;
};

/**
 * An element with a class and optional text.
 *
 * @param {string} tag
 * @param {string} className
 * @param {string} [text]
 * @returns {HTMLElement}
 */
const el = (tag, className, text) => {
    const e = document.createElement(tag);
    e.className = className;
    if (text !== undefined) {
        e.textContent = text;
    }
    return e;
};

/**
 * The table of the counts (a view of the chart for every reader).
 *
 * @param {Array<{label: string, points: Array}>} series
 * @param {Object<string, string>} s strings
 * @returns {HTMLTableElement}
 */
const countTable = (series, s) => {
    const table = el('table', 'tiny_codelab-vars-table tiny_codelab-cx-table');
    const head = table.createTHead().insertRow();
    ['n', ...series.map((x) => x.label)].forEach((text) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = text;
        head.append(th);
    });
    const body = table.createTBody();
    [...new Set(series.flatMap((x) => x.points.map((p) => p.n)))].sort((a, b) => a - b).forEach((n) => {
        const tr = body.insertRow();
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = String(n);
        tr.append(th);
        series.forEach((x) => {
            const p = x.points.find((q) => q.n === n);
            let text = '';
            if (p) {
                text = p.steps === null ? s.cxfailed : String(p.steps);
            }
            tr.insertCell().textContent = text;
        });
    });
    return table;
};

/**
 * The complexity panel of an editor: sizes, the input template, Measure, Keep for comparison, the chart and the table.
 *
 * @param {HTMLElement} container where the panel is shown (emptied)
 * @param {Object} options
 * @param {string} options.base address of the Pyodide files
 * @param {function(): string} options.code the program
 * @param {string} [options.template] input template to start with
 * @param {function(): void} [options.onClose]
 * @returns {Promise<void>}
 */
export const openComplexity = async(container, {base, code, template = DEFAULT_TEMPLATE, onClose = () => undefined}) => {
    const s = await loadComplexityStrings();
    container.replaceChildren();
    container.hidden = false;
    const id = `tiny_codelab_cx_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const title = el('div', 'tiny_codelab-vars-title', s.complexity);
    const form = el('div', 'tiny_codelab-cx-form d-flex flex-wrap align-items-end gap-2 mb-2');
    const sizesLabel = el('label', 'mb-0 small', s.cxsizes);
    sizesLabel.htmlFor = `${id}_sizes`;
    const sizes = el('input', 'form-control form-control-sm tiny_codelab-cx-sizes');
    sizes.id = `${id}_sizes`;
    sizes.value = DEFAULT_SIZES.join(' ');
    const sizesWrap = el('div', 'd-flex flex-column');
    sizesWrap.append(sizesLabel, sizes);
    const inputLabel = el('label', 'mb-0 small', s.cxinput);
    inputLabel.htmlFor = `${id}_input`;
    const input = el('textarea', 'form-control form-control-sm font-monospace tiny_codelab-cx-input');
    input.id = `${id}_input`;
    input.rows = 2;
    input.spellcheck = false;
    input.value = template;
    const help = el('div', 'form-text small', s.cxinputhelp);
    help.id = `${id}_help`;
    input.setAttribute('aria-describedby', help.id);
    const inputWrap = el('div', 'd-flex flex-column flex-grow-1');
    inputWrap.append(inputLabel, input, help);
    const measureButton = el('button', 'btn btn-primary btn-sm', s.cxmeasure);
    measureButton.type = 'button';
    measureButton.dataset.action = 'cxmeasure';
    const keepButton = el('button', 'btn btn-outline-secondary btn-sm', s.cxkeep);
    keepButton.type = 'button';
    keepButton.dataset.action = 'cxkeep';
    keepButton.disabled = true;
    const closeButton = el('button', 'btn btn-outline-secondary btn-sm', s.cxclose);
    closeButton.type = 'button';
    closeButton.dataset.action = 'cxclose';
    form.append(sizesWrap, inputWrap, measureButton, keepButton, closeButton);
    const status = el('div', 'tiny_codelab-cx-status small mb-1');
    status.setAttribute('role', 'status');
    const result = el('div', 'tiny_codelab-cx-result');
    container.append(title, form, status, result);

    let kept = null;
    let last = null;
    const show = () => {
        result.replaceChildren();
        const series = [{label: s.cxcurrent, points: last.points}];
        if (kept) {
            series.push({label: s.cxkept, points: kept});
        }
        if (series.some((x) => x.points.some((p) => p.steps !== null))) {
            result.append(drawChart(series, s), countTable(series, s));
        }
    };
    measureButton.addEventListener('click', async() => {
        const list = parseSizes(sizes.value);
        if (!list.length) {
            sizes.value = DEFAULT_SIZES.join(' ');
            return;
        }
        measureButton.disabled = true;
        keepButton.disabled = true;
        const program = code();
        try {
            last = await measure((stdin) => countLines(base, program, stdin, MAX_LINES), input.value, list,
                (n) => (status.textContent = s.cxmeasuring.replace('{$a}', String(n))));
            const growth = classify(last.points);
            let text = growth ? s.cxlooks.replace('{$a}', s[`cx${growth.key}`]) : s.cxunknown;
            if (last.problem) {
                const why = last.problem.status === 'toolong' ? s.cxtoolong : last.problem.message;
                text += ' ' + s.cxerror.replace('{$a->n}', String(last.problem.n)).replace('{$a->error}', why);
            }
            status.textContent = text;
            show();
            keepButton.disabled = !last.points.some((p) => p.steps !== null);
        } finally {
            measureButton.disabled = false;
        }
    });
    keepButton.addEventListener('click', () => {
        kept = last.points;
        keepButton.disabled = true;
        show();
    });
    closeButton.addEventListener('click', () => {
        container.replaceChildren();
        container.hidden = true;
        onClose();
    });
    measureButton.focus({preventScroll: true});
};
