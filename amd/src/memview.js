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
 * values of gdb ({1, 2, 3}, {x = 1, y = 2}, std::vector ... = {...}) are read here. A list of lists of values (a
 * matrix, a DP table) is one table with a heat map and the index variables of its rows and columns (t[i][j]); rows
 * that are one and the same list (Python [[0] * 3] * 3) stay arrows, with a warning.
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

/** A C# object of netcoredbg shown by its type only (runner 0.25): {Teacher}, {System.Collections.Generic.List<int>}. */
const TYPE_ONLY = /^\{[A-Z][\w.]*(?:<[^{}]*>)?(?:\[[\d, ]*\])?\}$/;

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
    // A C# object shown by its type only ({Teacher}, {Node}, {int[40]} past the shown depth) is a plain value too.
    return TYPE_ONLY.test(value) ? null : parseBraces(value);
};

/**
 * A trimmed value of gdb with braces as an object, or null (see parseValue).
 *
 * @param {string} value
 * @returns {?Object}
 */
const parseBraces = (value) => {
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
 * Summarize unfreed heap blocks reported at the end of a C/C++ Step run.
 *
 * @param {Array<{addr: string, size: number}>} leaks
 * @returns {{count: number, bytes: number, addrs: Set<string>}}
 */
export const summarizeLeaks = (leaks) => {
    const list = Array.isArray(leaks) ? leaks.filter((l) => l && l.addr && l.size > 0) : [];
    return {
        count: list.length,
        bytes: list.reduce((sum, l) => sum + Number(l.size), 0),
        addrs: new Set(list.map((l) => `@${String(l.addr).toLowerCase()}`)),
    };
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

/** A pointer value of gdb (not a string, not a function). */
const POINTER = /^0x[0-9a-f]+$/;

/**
 * C and C++ pointers (runner 0.6.0): a pointer into a variable becomes an arrow to it (to an array with the pointer's
 * name under its cell, or the text &name for a plain variable), a pointer to an object on the heap an arrow to that
 * object, followed through its pointer fields (a linked list), and NULL is written as such.
 *
 * @param {Array<{addrs?: Object<string, number[]>}>} stack frames with the addresses of their variables
 * @param {Array<{rows: Array<{name: string, ref: Object}>}>} frames rows built from the values
 * @param {Object<string, Object>} all heap objects (changed here)
 * @param {?Object<string, string>} targets values of the objects that pointers point to, by address
 * @returns {Object<string, Object<number, string[]>>} pointer names by object and cell
 */
const linkPointers = (stack, frames, all, targets) => {
    const ranges = [];
    stack.forEach((frame, f) => Object.entries(frame.addrs || {}).forEach(([name, [addr, size, elem]]) => {
        ranges.push({name, addr, size, elem, ref: frames[f].rows.find((row) => row.name === name)?.ref});
    }));
    const pointed = {};
    const linked = new Set();
    let resolve = null;
    const link = (node) => {
        if (!node || linked.has(node)) {
            return;
        }
        linked.add(node);
        node.items = (node.items || []).map((item) => {
            if (Array.isArray(item)) {
                if ('node' in item[1]) {
                    link(item[1].node);
                    return item;
                }
                return [item[0], resolve(item[1].v, refText(item[0])) || item[1]];
            }
            if ('node' in item) {
                link(item.node);
                return item;
            }
            return resolve(item.v, '') || item;
        });
    };
    resolve = (text, name) => {
        const hex = String(text).trim();
        if (!POINTER.test(hex)) {
            return null;
        }
        if (hex === '0x0') {
            return {v: 'NULL'};
        }
        const addr = Number.parseInt(hex, 16);
        const range = ranges.find((r) => addr >= r.addr && addr < r.addr + r.size);
        if (range) {
            if (!range.ref || !('r' in range.ref)) {
                return {v: `&${range.name}`};
            }
            const node = all[range.ref.r];
            if (name && range.elem > 0 && node?.k === 'list') {
                const cell = ((pointed[range.ref.r] ||= {})[Math.floor((addr - range.addr) / range.elem)] ||= []);
                if (!cell.includes(name)) {
                    cell.push(name);
                }
            }
            return {r: range.ref.r};
        }
        if (!targets || !(hex in targets)) {
            return null;
        }
        const id = `@${hex}`;
        if (!all[id]) {
            all[id] = parseValue(targets[hex]) || {t: '*', k: 'list', n: 1, items: [{v: String(targets[hex])}]};
            link(all[id]);
        }
        return {r: id};
    };
    frames.forEach((frame) => frame.rows.forEach((row) => {
        if ('r' in row.ref) {
            link(all[row.ref.r]);
        } else {
            row.ref = resolve(row.ref.v, row.name) || row.ref;
        }
    }));
    return pointed;
};

/**
 * The rows of a matrix: a list or tuple whose items are all lists or tuples of plain values (numbers, texts), each
 * row a heap object (Python) or drawn in place (C, C++). Null for anything else.
 *
 * @param {?Object} node
 * @param {Object<string, Object>} all heap objects by id
 * @returns {?Array<{id: ?string, node: Object}>}
 */
export const matrixRows = (node, all) => {
    if (!node || !['list', 'tuple'].includes(node.k) || !node.items.length) {
        return null;
    }
    const rows = node.items.map((item) => {
        if (item && 'node' in item) {
            return {id: null, node: item.node};
        }
        return item && 'r' in item && all[item.r] ? {id: item.r, node: all[item.r]} : null;
    });
    const plain = (row) => row && ['list', 'tuple'].includes(row.node.k) && row.node.items.length > 0
        && row.node.items.every((cell) => 'v' in cell);
    return rows.every(plain) ? rows : null;
};

/**
 * The rows of a list that point to one and the same list (Python [[0] * 3] * 3): groups of their indexes.
 *
 * @param {Array<{id: ?string}>} rows
 * @returns {number[][]} groups of two or more rows, empty when every row is its own list
 */
export const sharedRows = (rows) => {
    const groups = new Map();
    rows.forEach((row, i) => {
        if (row.id !== null) {
            groups.set(row.id, [...(groups.get(row.id) || []), i]);
        }
    });
    return [...groups.values()].filter((group) => group.length > 1);
};

/**
 * The shade of a number of a matrix between the smallest and the largest (0 to 4), for the heat map.
 *
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export const heat = (x, lo, hi) => (hi > lo ? Math.min(4, Math.floor(((x - lo) / (hi - lo)) * 5)) : 0);

/**
 * A matrix as a grid of texts with what the view draws: its shades, the index variables of its rows and columns.
 *
 * @param {Array<{id: ?string, node: Object}>} rows
 * @param {Array<{name: string, ref: Object}>} ints the integer variables of the frame
 * @param {?{rows: Set<string>, cols: Set<string>}} names names used as t[row][col] in the program; null: every integer
 * @returns {{rowIds: Array<?string>, cells: string[][], cols: number, shades: ?number[][],
 *     rowMarkers: Object<number, string[]>, colMarkers: Object<number, string[]>}}
 */
export const matrixView = (rows, ints, names) => {
    const cells = rows.map((row) => row.node.items.map(refText));
    const cols = Math.max(...cells.map((row) => row.length));
    const flat = cells.flat();
    let shades = null;
    if (flat.every(isNumber)) {
        const nums = flat.map(Number);
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        shades = cells.map((row) => row.map((text) => heat(Number(text), lo, hi)));
    }
    const markers = (allowed, size) => {
        const found = {};
        ints.filter((int) => !names || allowed.has(int.name)).forEach((int) => {
            const index = Number(refText(int.ref));
            if (index >= 0 && index < size) {
                (found[index] ||= []).push(int.name);
            }
        });
        return found;
    };
    return {rowIds: rows.map((row) => row.id), cells, cols, shades,
        rowMarkers: markers(names?.rows, cells.length), colMarkers: markers(names?.cols, cols)};
};

/**
 * The view of one stop: the frames with their references, the heap objects in the order they are first reached,
 * the index variables of each list and the cells changed since the stop before.
 *
 * @param {Array<{func: string, line: number, vars: Object<string, string>, refs?: Object<string, Object>}>} stack
 *     frames, innermost first; refs and heap come from Python, otherwise the values of vars are read (C, C++)
 * @param {?Object<string, Object>} heap
 * @param {?{stack: Array, heap: ?Object}} [before] the stop before, for the changed cells
 * @param {?Set<string>} [indexNames] names used as an index in the program (in [...]); null: every integer
 * @param {?Object<string, string>} [targets] C and C++: values of the objects pointers point to, by address (runner)
 * @param {?{rows: Set<string>, cols: Set<string>}} [matrixNames] names used as t[row][col] (matrixIndexNames)
 * @returns {{frames: Array<{func: string, rows: Array<{name: string, ref: Object}>}>, heap: Object<string, Object>,
 *     order: string[], markers: Object<string, Object<number, string[]>>, changed: Object<string, Set<number>>,
 *     matrices: Object<string, Object>, shared: Object<string, number[][]>}}
 */
export const buildView = (stack, heap, before = null, indexNames = null, targets = null, matrixNames = null) => {
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
    // C and C++ with the addresses of the runner: arrows of the pointers.
    const pointed = (stack || []).some((frame) => frame.addrs) || targets
        ? linkPointers(stack || [], frames, all, targets) : {};
    frames.forEach((frame) => frame.rows.forEach((row) => visit(row.ref)));

    // Index variables: integers of a frame that are a valid index of a list the same frame points to.
    const markers = {};
    // Matrices (lists of lists of values) are drawn as one table; rows that are one list stay arrows, with a warning.
    const matrices = {};
    const shared = {};
    frames.forEach((frame) => {
        const integers = frame.rows.filter((row) => /^-?\d+$/.test(refText(row.ref).trim()));
        const ints = integers.filter((row) => !indexNames || indexNames.has(row.name));
        frame.rows.forEach((row) => {
            const node = 'r' in row.ref ? all[row.ref.r] : null;
            const rows = node ? matrixRows(node, all) : null;
            if (rows && !matrices[row.ref.r] && !shared[row.ref.r]) {
                const same = sharedRows(rows);
                if (same.length) {
                    shared[row.ref.r] = same;
                } else {
                    matrices[row.ref.r] = matrixView(rows, integers, matrixNames);
                }
            }
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
    // Pointers into an array: their names under the cell they point to.
    Object.entries(pointed).forEach(([id, cells]) => Object.entries(cells).forEach(([index, names]) => {
        const cell = ((markers[id] ||= {})[index] ||= []);
        names.forEach((name) => cell.includes(name) || cell.push(name));
    }));

    // Changed cells: the same object (Python: same id; C: same frame and variable, or address) at the stop before.
    const changed = {};
    if (before) {
        const old = before.heap && !before.stack?.some((f) => !f.refs) ? before.heap
            : buildView(before.stack, before.heap, null, null, before.targets).heap;
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
        // The cells of a matrix changed since the stop before ("row,column"), new rows and columns included.
        Object.entries(matrices).forEach(([id, matrix]) => {
            const was = old[id] ? matrixRows(old[id], old) : null;
            if (!was) {
                return;
            }
            const cells = new Set();
            matrix.cells.forEach((row, r) => row.forEach((text, c) => {
                const item = was[r]?.node.items[c];
                if (!item || refText(item) !== text) {
                    cells.add(`${r},${c}`);
                }
            }));
            matrix.changed = cells;
        });
    }
    return {frames, heap: all, order, markers, changed, matrices, shared};
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
 * The names a program uses as the row and the column of a matrix: t[i][j] and t[i + 1][j - 1] give rows i, columns j.
 *
 * @param {string} code
 * @returns {{rows: Set<string>, cols: Set<string>}}
 */
export const matrixIndexNames = (code) => {
    const rows = new Set();
    const cols = new Set();
    const names = (text, set) => [...text.matchAll(/[A-Za-z_]\w*/g)].forEach(([name]) => set.add(name));
    for (const [, row, col] of String(code || '').matchAll(/\w\s*\[([^[\]]*)\]\s*\[([^[\]]*)\]/g)) {
        names(row, rows);
        names(col, cols);
    }
    return {rows, cols};
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
 * An SVG element with attributes.
 *
 * @param {string} tag
 * @param {Object<string, string|number>} [attrs]
 * @returns {SVGElement}
 */
const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([name, value]) => e.setAttribute(name, String(value)));
    return e;
};

export class MemoryView {
    /**
     * The view in an element.
     *
     * @param {HTMLElement} root
     * @param {Object<string, string>} strings memory, memframe, mainprogram, memref, memmore, memshared
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
        // It scrolls sideways when the objects do not fit: reachable by the keyboard, with a name.
        box.tabIndex = 0;
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', this.s.memory);
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
        // Rows of a matrix are drawn in its table.
        const inMatrix = new Set(Object.values(view.matrices || {}).flatMap((m) => m.rowIds.filter((id) => id !== null)));
        view.order.filter((id) => !inMatrix.has(id) || view.matrices?.[id])
            .forEach((id) => right.append(this.object(id, view.heap[id])));
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
        } else if (id !== null && this.view.matrices?.[id]) {
            wrap.append(this.matrix(this.view.matrices[id]));
        } else {
            wrap.append(this.cells(id, node, changed));
        }
        if (more > 0) {
            wrap.append(el('div', 'tiny_codelab-mem-more', this.s.memmore.replace('{$a}', String(more))));
        }
        // Above the cells: the arrows of the rows leave them downwards.
        ((id !== null && this.view.shared?.[id]) || []).forEach((group) => wrap.firstChild.after(el('div',
            'tiny_codelab-mem-shared', this.s.memshared.replace('{$a}', group.join(', ')))));
        return wrap;
    }

    /**
     * A matrix as one table: column indexes above, row indexes on the left, the numbers shaded from the smallest to
     * the largest, the index variables of the rows on the right and of the columns below, their cell outlined.
     *
     * @param {Object} m a matrix of buildView
     * @returns {HTMLTableElement}
     */
    matrix(m) {
        // The class table-reboot: without the borders Moodle gives every table in the content.
        const table = el('table', 'tiny_codelab-mem-matrix table-reboot');
        const head = table.createTHead().insertRow();
        head.append(el('th', 'tiny_codelab-mem-index'));
        for (let c = 0; c < m.cols; c++) {
            const th = el('th', 'tiny_codelab-mem-index', String(c));
            th.scope = 'col';
            head.append(th);
        }
        const body = table.createTBody();
        m.cells.forEach((row, r) => body.append(this.matrixRow(m, row, r)));
        if (Object.keys(m.colMarkers).length) {
            const foot = table.createTFoot().insertRow();
            foot.insertCell();
            for (let c = 0; c < m.cols; c++) {
                foot.append(el('td', 'tiny_codelab-mem-marker', m.colMarkers[c] ? `\u25B2 ${m.colMarkers[c].join(', ')}` : ''));
            }
        }
        return table;
    }

    /**
     * One row of a matrix.
     *
     * @param {Object} m a matrix of buildView
     * @param {string[]} row the texts of the row
     * @param {number} r its index
     * @returns {HTMLTableRowElement}
     */
    matrixRow(m, row, r) {
        const tr = document.createElement('tr');
        if (m.rowIds[r] !== null) {
            // The target of the arrows of variables that point to this row (row = t[1]).
            tr.dataset.id = m.rowIds[r];
        }
        const th = el('th', 'tiny_codelab-mem-index', String(r));
        th.scope = 'row';
        tr.append(th);
        for (let c = 0; c < m.cols; c++) {
            if (c >= row.length) {
                tr.append(el('td', 'tiny_codelab-mem-empty'));
                continue;
            }
            const classes = ['tiny_codelab-mem-heat-' + (m.shades ? m.shades[r][c] : 0)];
            if (m.changed?.has(`${r},${c}`)) {
                classes.push('tiny_codelab-mem-changed');
            }
            if (m.rowMarkers[r] && m.colMarkers[c]) {
                classes.push('tiny_codelab-mem-current');
            }
            tr.append(el('td', classes.join(' '), row[c]));
        }
        if (Object.keys(m.rowMarkers).length) {
            tr.append(el('td', 'tiny_codelab-mem-marker', m.rowMarkers[r] ? `\u25C0 ${m.rowMarkers[r].join(', ')}` : ''));
        }
        return tr;
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
        const head = svgEl('marker', {id: 'tiny_codelab-mem-head', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7,
            markerHeight: 7, orient: 'auto'});
        head.append(svgEl('path', {d: 'M0,0 L8,4 L0,8 z'}));
        const defs = svgEl('defs');
        defs.append(head);
        const lines = [defs];
        this.box.querySelectorAll('.tiny_codelab-mem-ptr').forEach((dot) => {
            const target = this.box.querySelector(`[data-id="${CSS.escape(dot.dataset.target)}"]`);
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
            lines.push(svgEl('path', {d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`,
                'marker-end': 'url(#tiny_codelab-mem-head)'}), svgEl('circle', {cx: x1, cy: y1, r: 3}));
        });
        this.svg.setAttribute('width', String(this.box.scrollWidth));
        this.svg.setAttribute('height', String(this.box.scrollHeight));
        this.svg.replaceChildren(...lines);
    }

    /**
     * Stop following the size.
     */
    dispose() {
        this.observer?.disconnect();
    }
}
