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
 * The memory view of a Step run: the frames with their variables on the left, the objects they point to on the right,
 * with arrows. Lists and arrays are rows of cells (numbers also as bars), the cells changed since the step before are
 * marked, and integer variables that are a valid index are shown under their cell (i, j, lo, hi). Python in the
 * browser sends the objects with their identity (two names of one list point to the same box); for C and C++ the
 * values of gdb ({1, 2, 3}, {x = 1, y = 2}, std::vector ... = {...}) are read here, arrays of arrays as a grid.
 *
 * Model: a reference is {v: text} (a plain value), {r: id} (an object of the heap) or {node} (an object drawn in its
 * place, C only); a heap object is {t: type, k: list|tuple|set|dict|object|other, n: length, items}, where items of a
 * list, tuple or set are references and items of a dict or object are [key reference, value reference].
 *
 * @module     tiny_codelab/memview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Most cells of a list read from a gdb value (gdb itself stops at 200 elements). */
const MAX_CELLS = 200;

/**
 * Split the inside of a {...} value at the commas of its own level (not in nested braces or in quotes).
 *
 * @param {string} text
 * @returns {string[]}
 */
const splitTop = (text) => {
    const parts = [];
    let depth = 0;
    let quote = '';
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            if (c === '\\') {
                i++;
            } else if (c === quote) {
                quote = '';
            }
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
        } else if (c === ',' && depth === 0) {
            parts.push(text.slice(start, i).trim());
            start = i + 1;
        }
    }
    const last = text.slice(start).trim();
    if (last !== '' || parts.length) {
        parts.push(last);
    }
    return parts;
};

/**
 * The index of the brace that closes the one at start, or -1.
 *
 * @param {string} text
 * @param {number} start index of {
 * @returns {number}
 */
const closing = (text, start) => {
    let depth = 0;
    let quote = '';
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            if (c === '\\') {
                i++;
            } else if (c === quote) {
                quote = '';
            }
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '{') {
            depth++;
        } else if (c === '}' && --depth === 0) {
            return i;
        }
    }
    return -1;
};

/**
 * A value of gdb as an object drawn in place, or null for a plain value (a number, a pointer, a string).
 *
 * @param {string} text e.g. {1, 2, 0 <repeats 8 times>}, {x = 1, y = 2}, std::vector of length 2, capacity 2 = {3, 4}
 * @returns {?Object} heap object (items are references, nested ones {node})
 */
export const parseValue = (text) => {
    const value = String(text ?? '').trim();
    let open = value.indexOf('{');
    if (open < 0) {
        return null;
    }
    // A pretty printer before the braces (std::vector of length 3, capacity 4 = {...}): its type name.
    const prefix = value.slice(0, open).trim();
    if (prefix !== '' && !prefix.endsWith('=')) {
        return null;
    }
    const end = closing(value, open);
    if (end < 0 || value.slice(end + 1).trim() !== '') {
        return null;
    }
    const type = (/^(std::[\w:]+)/.exec(prefix) || [null, ''])[1].replace(/^std::(__\w+::)?/, 'std::');
    const parts = splitTop(value.slice(open + 1, end));
    const fields = parts.length > 0 && parts.every((p) => /^[A-Za-z_]\w*\s=\s/.test(p) || p === '...');
    const ref = (part) => {
        const nested = parseValue(part);
        return nested ? {node: nested} : {v: part};
    };
    if (fields) {
        const items = parts.filter((p) => p !== '...').map((p) => {
            const at = p.indexOf(' = ');
            return [{v: p.slice(0, at)}, ref(p.slice(at + 3))];
        });
        return {t: type || 'struct', k: 'object', n: items.length, items};
    }
    const items = [];
    let more = false;
    for (const part of parts) {
        const repeat = /^(.*\S)\s<repeats (\d+) times>$/s.exec(part);
        if (part === '...') {
            more = true;
        } else if (repeat) {
            for (let i = 0; i < Number(repeat[2]) && items.length < MAX_CELLS; i++) {
                items.push(ref(repeat[1]));
            }
        } else if (items.length < MAX_CELLS) {
            items.push(ref(part));
        }
    }
    open = /length (\d+)/.exec(prefix);
    const n = open ? Number(open[1]) : items.length + (more ? 1 : 0);
    return {t: type || 'array', k: 'list', n, items};
};

/**
 * The text of a reference in a table or a cell.
 *
 * @param {Object} ref
 * @returns {string}
 */
export const refText = (ref) => (ref && 'v' in ref ? String(ref.v) : '');

/**
 * Whether a text is a number (for bars and indexes).
 *
 * @param {string} text
 * @returns {boolean}
 */
const isNumber = (text) => /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(String(text).trim());

/**
 * The view of one stop: the frames with their references, the heap objects in the order they are first reached,
 * the index variables of each list and the cells changed since the stop before.
 *
 * @param {Array<{func: string, line: number, vars: Object<string, string>, refs?: Object<string, Object>}>} stack
 *     frames, innermost first; refs and heap come from Python, otherwise the values of vars are read (C, C++)
 * @param {?Object<string, Object>} heap
 * @param {?{stack: Array, heap: ?Object}} [before] the stop before, for the changed cells
 * @param {?Set<string>} [indexNames] names used as an index in the program (in [...]); null: every integer
 * @returns {{frames: Array<{func: string, rows: Array<{name: string, ref: Object}>}>, heap: Object<string, Object>,
 *     order: string[], markers: Object<string, Object<number, string[]>>, changed: Object<string, Set<number>>}}
 */
export const buildView = (stack, heap, before = null, indexNames = null) => {
    const all = {...(heap || {})};
    const frames = (stack || []).map((frame, f) => {
        const rows = [];
        if (frame.refs) {
            Object.entries(frame.refs).forEach(([name, ref]) => rows.push({name, ref}));
        } else {
            Object.entries(frame.vars || {}).forEach(([name, value]) => {
                const node = parseValue(value);
                if (node) {
                    // Objects of gdb values have no identity: the variable of the frame names them.
                    const id = `${stack.length - f}:${frame.func}:${name}`;
                    all[id] = node;
                    rows.push({name, ref: {r: id}});
                } else {
                    rows.push({name, ref: {v: value}});
                }
            });
        }
        return {func: frame.func, rows};
    });
    const order = [];
    const visit = (ref) => {
        if (ref && 'r' in ref && all[ref.r] && !order.includes(ref.r)) {
            order.push(ref.r);
            (all[ref.r].items || []).forEach((item) => (Array.isArray(item) ? item.forEach(visit) : visit(item)));
        }
    };
    frames.forEach((frame) => frame.rows.forEach((row) => visit(row.ref)));

    // Index variables: integers of a frame that are a valid index of a list the same frame points to.
    const markers = {};
    frames.forEach((frame) => {
        const ints = frame.rows.filter((row) => /^-?\d+$/.test(refText(row.ref).trim())
            && (!indexNames || indexNames.has(row.name)));
        frame.rows.forEach((row) => {
            const node = 'r' in row.ref ? all[row.ref.r] : null;
            // A matrix (a list of lists only) gets no markers on its rows.
            if (!node || !['list', 'tuple'].includes(node.k) || node.items.every((item) => !('v' in item))) {
                return;
            }
            ints.forEach((int) => {
                const index = Number(refText(int.ref));
                if (index >= 0 && index < node.items.length) {
                    const cell = ((markers[row.ref.r] ||= {})[index] ||= []);
                    if (!cell.includes(int.name)) {
                        cell.push(int.name);
                    }
                }
            });
        });
    });

    // Changed cells: the same object (Python: same id; C: same frame and variable) at the stop before.
    const changed = {};
    if (before) {
        const old = before.heap && !before.stack?.some((f) => !f.refs) ? before.heap
            : buildView(before.stack, before.heap).heap;
        order.forEach((id) => {
            const now = all[id];
            const was = old[id];
            if (!was || was.k !== now.k) {
                return;
            }
            const set = new Set();
            const key = (item) => JSON.stringify(item);
            now.items.forEach((item, i) => {
                if (Array.isArray(item)) {
                    const same = was.items.find((w) => key(w[0]) === key(item[0]));
                    if (!same || key(same[1]) !== key(item[1])) {
                        set.add(i);
                    }
                } else if (i >= was.items.length || key(was.items[i]) !== key(item)) {
                    set.add(i);
                }
            });
            if (set.size) {
                changed[id] = set;
            }
        });
    }
    return {frames, heap: all, order, markers, changed};
};

/**
 * The names a program uses inside [...] (a[i], a[j + 1], m[row][col]): only they are shown as index markers.
 *
 * @param {string} code
 * @returns {Set<string>}
 */
export const indexNames = (code) => {
    const names = new Set();
    for (const [, inside] of String(code || '').matchAll(/\[([^[\]]*)\]/g)) {
        for (const [name] of inside.matchAll(/[A-Za-z_]\w*/g)) {
            names.add(name);
        }
    }
    return names;
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

export class MemoryView {
    /**
     * The view in an element.
     *
     * @param {HTMLElement} root
     * @param {Object<string, string>} strings memory, memframe, mainprogram, memref, memmore
     */
    constructor(root, strings) {
        this.root = root;
        this.s = strings;
        this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.arrows()) : null;
    }

    /**
     * Draw a stop. Returns false (and draws nothing) when it has no object: the variables table is enough then.
     *
     * @param {ReturnType<typeof buildView>} view
     * @returns {boolean}
     */
    render(view) {
        this.root.replaceChildren();
        if (!view.order.length) {
            return false;
        }
        this.view = view;
        this.numbers = Object.fromEntries(view.order.map((id, i) => [id, i + 1]));
        const box = el('div', 'tiny_codelab-mem');
        const left = el('div', 'tiny_codelab-mem-frames');
        view.frames.forEach((frame) => {
            if (!frame.rows.length) {
                return;
            }
            const f = el('div', 'tiny_codelab-mem-frame');
            f.append(el('div', 'tiny_codelab-mem-title', frame.func ? `${frame.func}()` : this.s.mainprogram));
            const table = el('table', 'tiny_codelab-mem-table');
            frame.rows.forEach((row) => {
                const tr = table.insertRow();
                tr.insertCell().textContent = row.name;
                tr.insertCell().append(this.value(row.ref));
            });
            f.append(table);
            left.append(f);
        });
        const right = el('div', 'tiny_codelab-mem-objects');
        view.order.forEach((id) => right.append(this.object(id, view.heap[id])));
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'tiny_codelab-mem-arrows');
        svg.setAttribute('aria-hidden', 'true');
        box.append(left, right, svg);
        this.root.append(box);
        this.box = box;
        this.svg = svg;
        this.observer?.disconnect();
        this.observer?.observe(box);
        requestAnimationFrame(() => this.arrows());
        return true;
    }

    /**
     * A reference: its text, an object drawn in place, or a dot with an arrow to the object.
     *
     * @param {Object} ref
     * @returns {HTMLElement}
     */
    value(ref) {
        if (ref && 'node' in ref) {
            return this.object(null, ref.node);
        }
        if (ref && 'r' in ref && this.view.heap[ref.r]) {
            const dot = el('span', 'tiny_codelab-mem-ptr');
            dot.dataset.target = ref.r;
            const node = this.view.heap[ref.r];
            const label = this.s.memref.replace('{$a}', `${node.t} ${this.numbers[ref.r] ?? ''}`.trim());
            dot.setAttribute('role', 'img');
            dot.setAttribute('aria-label', label);
            dot.title = label;
            return dot;
        }
        return el('span', 'tiny_codelab-mem-value', refText(ref));
    }

    /**
     * A heap object (id) or an object drawn in place (id null).
     *
     * @param {?string} id
     * @param {Object} node
     * @returns {HTMLElement}
     */
    object(id, node) {
        const wrap = el('div', `tiny_codelab-mem-object tiny_codelab-mem-${node.k}`);
        if (id !== null) {
            wrap.dataset.id = id;
            wrap.append(el('div', 'tiny_codelab-mem-type', `${node.t} ${this.numbers[id]}`));
        }
        const changed = (id !== null && this.view.changed[id]) || new Set();
        const more = (node.n || 0) - node.items.length;
        if (node.k === 'dict' || node.k === 'object') {
            const table = el('table', 'tiny_codelab-mem-table');
            node.items.forEach((item, i) => {
                const tr = table.insertRow();
                if (changed.has(i)) {
                    tr.className = 'tiny_codelab-mem-changed';
                }
                tr.insertCell().append(this.value(item[0]));
                tr.insertCell().append(this.value(item[1]));
            });
            wrap.append(table);
        } else if (node.k === 'other') {
            wrap.append(this.value(node.items[0]));
        } else {
            wrap.append(this.cells(id, node, changed));
        }
        if (more > 0) {
            wrap.append(el('div', 'tiny_codelab-mem-more', this.s.memmore.replace('{$a}', String(more))));
        }
        return wrap;
    }

    /**
     * The cells of a list, tuple, set or array: index above, value (or bar) inside, index variables below.
     *
     * @param {?string} id
     * @param {Object} node
     * @param {Set<number>} changed
     * @returns {HTMLElement}
     */
    cells(id, node, changed) {
        const row = el('div', 'tiny_codelab-mem-cells');
        const texts = node.items.map(refText);
        const numeric = node.items.length > 1 && node.items.every((item) => 'v' in item && isNumber(item.v));
        const max = numeric ? Math.max(...texts.map((t) => Math.abs(Number(t))), 1) : 0;
        const markers = (id !== null && this.view.markers[id]) || {};
        node.items.forEach((item, i) => {
            const cell = el('div', 'tiny_codelab-mem-cell' + (changed.has(i) ? ' tiny_codelab-mem-changed' : ''));
            if (node.k !== 'set') {
                cell.append(el('div', 'tiny_codelab-mem-index', String(i)));
            }
            const inner = el('div', 'tiny_codelab-mem-content');
            if (numeric) {
                const bar = el('div', 'tiny_codelab-mem-bar');
                bar.style.height = `${Math.max(4, Math.round(Math.abs(Number(texts[i])) / max * 48))}px`;
                inner.append(bar);
            }
            inner.append(this.value(item));
            cell.append(inner);
            if (markers[i]) {
                cell.append(el('div', 'tiny_codelab-mem-marker', `▲ ${markers[i].join(', ')}`));
            }
            row.append(cell);
        });
        return row;
    }

    /**
     * Draw the arrows from the dots to their objects (again when the size changes).
     */
    arrows() {
        if (!this.box || !this.box.isConnected) {
            return;
        }
        const base = this.box.getBoundingClientRect();
        const lines = [];
        this.box.querySelectorAll('.tiny_codelab-mem-ptr').forEach((dot) => {
            const target = this.box.querySelector(`.tiny_codelab-mem-object[data-id="${CSS.escape(dot.dataset.target)}"]`);
            if (!target || !dot.offsetParent) {
                return;
            }
            const a = dot.getBoundingClientRect();
            const b = target.getBoundingClientRect();
            const x1 = a.left + a.width / 2 - base.left;
            const y1 = a.top + a.height / 2 - base.top;
            const toLeft = b.left - base.left >= x1;
            const x2 = (toLeft ? b.left : b.right) - base.left;
            const y2 = b.top + 12 - base.top;
            const bend = Math.max(24, Math.abs(x2 - x1) / 2) * (toLeft ? 1 : -1);
            lines.push(`<path d="M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}" ` +
                'marker-end="url(#tiny_codelab-mem-head)"/>' +
                `<circle cx="${x1}" cy="${y1}" r="3"/>`);
        });
        this.svg.setAttribute('width', String(this.box.scrollWidth));
        this.svg.setAttribute('height', String(this.box.scrollHeight));
        this.svg.innerHTML = '<defs><marker id="tiny_codelab-mem-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" ' +
            'markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>' + lines.join('');
    }

    /**
     * Stop following the size.
     */
    dispose() {
        this.observer?.disconnect();
    }
}
