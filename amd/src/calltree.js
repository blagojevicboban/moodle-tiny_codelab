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
 * The call tree of a Step run: every call of a function drawn as a node under the call that made it, with its
 * arguments and (Python) the value it returned. The running call is blue, the calls waiting for it light blue, and a
 * call made again with the same arguments (fib(2) in fib(5)) is amber, so repeated work is easy to see.
 *
 * The tree is built from the stops of the run (the call stacks of the timeline), so it works for Python in the browser
 * and for C and C++ under gdb alike, and it follows Step back: each call keeps the step where it started and the step
 * where it ended. Calls that ran without a stop inside (Step over, Continue) are not seen.
 *
 * @module     tiny_codelab/calltree
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Most calls drawn as nodes; later calls are only counted. */
export const MAX_NODES = 200;

/** Height of one level of the tree and of a node, in SVG units. */
const LEVEL = 56;
const NODE_H = 24;

/** Width of one character of a label, and the space around a node, in SVG units. */
const CHAR_W = 7.2;
const GAP = 10;

/** Longest argument value shown in a label. */
const MAX_ARG = 16;

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Split a parameter list at its top-level commas (not inside <>, (), [] or {}).
 *
 * @param {string} text
 * @returns {string[]}
 */
const splitTop = (text) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if ('<([{'.includes(c)) {
            depth++;
        } else if ('>)]}'.includes(c)) {
            depth = Math.max(0, depth - 1);
        } else if (c === ',' && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(text.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The parameter names of a function, read from the code of the editor: `def name(a, b=1)` in Python, the definition
 * `type name(int a, char *s) {` in C, C++, Java and C#. An empty list when the definition is not found.
 *
 * @param {string} code
 * @param {string} func name of the function
 * @returns {string[]}
 */
export const paramNames = (code, func) => {
    if (!code || !func || !/^[A-Za-z_]\w*$/.test(func)) {
        return [];
    }
    const name = escape(func);
    const python = new RegExp(`\\bdef\\s+${name}\\s*\\(([^)]*)\\)`).exec(code);
    if (python) {
        return splitTop(python[1]).map((p) => p.replace(/[=].*$/s, '').replace(/:.*$/s, '').replace(/^\*+/, '').trim())
            .filter((p) => /^[A-Za-z_]\w*$/.test(p) && p !== 'self');
    }
    const c = new RegExp(`\\b${name}\\s*\\(([^)]*)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?\\{`).exec(code);
    if (!c || /^\s*void\s*$/.test(c[1])) {
        return [];
    }
    return splitTop(c[1]).map((p) => {
        const words = p.replace(/[=].*$/s, '').replace(/\[[^\]]*\]/g, '').match(/[A-Za-z_]\w*/g) || [];
        return words.length > 1 ? words[words.length - 1] : '';
    }).filter(Boolean);
};

/**
 * A value as it is shown in a label: short.
 *
 * @param {*} value
 * @returns {string}
 */
const shortValue = (value) => {
    const text = value === undefined || value === null ? '?' : String(value);
    return text.length > MAX_ARG ? text.slice(0, MAX_ARG - 1) + '…' : text;
};

/**
 * The calls of a Step run, from its stops.
 */
export class CallTree {
    /**
     * @param {function(): string} [source] the code of the editor, for the parameter names
     */
    constructor(source = () => '') {
        this.source = source;
        this.reset();
    }

    /** No calls yet. */
    reset() {
        /**
         * Every call seen: its parent call (-1 for the main program), depth, the steps where it started and ended.
         * @type {Array<{func: string, label: string, key: string, parent: number, depth: number, start: number,
         *     end: ?number, value: ?string}>}
         */
        this.calls = [];
        // The calls of the last stop, outermost first.
        this.open = [];
        this.lastStep = 0;
        this.params = new Map();
    }

    /**
     * The label of a call: name and arguments, from the variables of its frame at its first stop.
     *
     * @param {{func: string, vars: Object<string, string>}} frame
     * @param {boolean} root the outermost frame (the main program)
     * @returns {string}
     */
    label(frame, root) {
        if (root) {
            return frame.func && frame.func !== '<module>' ? `${frame.func}()` : '';
        }
        if (!this.params.has(frame.func)) {
            this.params.set(frame.func, paramNames(this.source() || '', frame.func));
        }
        const args = this.params.get(frame.func).map((name) => shortValue(frame.vars?.[name]));
        return `${frame.func}(${args.join(', ')})`;
    }

    /**
     * Take a stop of the run: calls that are no longer on the stack ended, new frames are new calls.
     *
     * @param {{stack: Array<{func: string, vars: Object<string, string>}>, step: number, ret?: string}} snap
     */
    add({stack, step, ret}) {
        const frames = (stack || []).slice().reverse();
        let same = 0;
        while (same < this.open.length && same < frames.length && this.calls[this.open[same]].func === frames[same].func) {
            same++;
        }
        for (let j = this.open.length - 1; j >= same; j--) {
            const call = this.calls[this.open[j]];
            call.end = step;
            // The value returned belongs to the call that ended last (Python stops in the caller after a return).
            if (j === this.open.length - 1 && ret !== undefined && ret !== null) {
                call.value = String(ret);
            }
        }
        this.open.length = same;
        for (let j = same; j < frames.length; j++) {
            const label = this.label(frames[j], j === 0 && this.calls.length === 0);
            this.calls.push({func: frames[j].func, label, key: label.toLowerCase(),
                parent: j > 0 ? this.open[j - 1] : -1, depth: j, start: step, end: null, value: null});
            this.open.push(this.calls.length - 1);
        }
        this.lastStep = step;
    }

    /**
     * The program ended: every call still open ends after the last stop.
     */
    finish() {
        this.open.forEach((i) => {
            this.calls[i].end = this.lastStep + 1;
        });
        this.open = [];
    }

    /**
     * Whether the run called any function (only then the tree is shown).
     *
     * @returns {boolean}
     */
    get hasCalls() {
        return this.calls.length > 1 || (this.calls.length === 1 && this.calls[0].depth > 0);
    }

    /**
     * The tree as it was at a step: the calls started by then, which of them ended, the running one, and counts.
     *
     * @param {number} step a step of the run (Infinity: the end)
     * @returns {{root: ?Object, current: ?Object, waiting: Set<Object>, count: number, repeated: number, depth: number,
     *     hidden: number}}
     */
    at(step) {
        const nodes = new Map();
        const keys = new Map();
        let root = null;
        let current = null;
        let count = 0;
        let depth = 0;
        let hidden = 0;
        const waiting = new Set();
        this.calls.forEach((call, i) => {
            if (call.start > step) {
                return;
            }
            const done = call.end !== null && call.end <= step;
            if (call.parent >= 0) {
                count++;
                keys.set(call.key, (keys.get(call.key) || 0) + 1);
            }
            depth = Math.max(depth, call.depth);
            const parent = call.parent >= 0 ? nodes.get(call.parent) : null;
            if (nodes.size >= MAX_NODES || (call.parent >= 0 && !parent)) {
                hidden++;
                return;
            }
            const node = {label: call.label, key: call.key, value: done ? call.value : null, done, start: call.start,
                children: [], root: call.parent < 0};
            nodes.set(i, node);
            if (parent) {
                parent.children.push(node);
            } else if (!root) {
                root = node;
            }
            if (!done) {
                waiting.add(node);
                current = node;
            }
        });
        waiting.delete(current);
        let repeated = 0;
        keys.forEach((c) => {
            repeated += c - 1;
        });
        return {root, current, waiting, count, repeated, depth, hidden, keys};
    }
}

/**
 * Place the nodes of a tree: the leaves side by side, each call centred above its calls.
 *
 * @param {Object} root
 * @param {number} slot width of one node
 * @returns {{nodes: Array<{node: Object, x: number, y: number, parent: ?Object}>, width: number, height: number}}
 */
export const layoutTree = (root, slot) => {
    const nodes = [];
    let next = 0;
    let levels = 0;
    const place = (node, level, parent) => {
        levels = Math.max(levels, level + 1);
        const item = {node, x: 0, y: level * LEVEL + NODE_H / 2 + 4, parent};
        nodes.push(item);
        if (!node.children.length) {
            item.x = next * slot + slot / 2;
            next++;
        } else {
            const kids = node.children.map((c) => place(c, level + 1, item));
            item.x = (kids[0].x + kids[kids.length - 1].x) / 2;
        }
        return item;
    };
    if (root) {
        place(root, 0, null);
    }
    return {nodes, width: Math.max(next, 1) * slot, height: levels * LEVEL};
};

const svg = (tag, attrs, text) => {
    const e = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    if (text !== undefined) {
        e.textContent = text;
    }
    return e;
};

/**
 * Lengths of the labels and values of a tree.
 *
 * @param {Object} node
 * @param {string} main label of the main program
 * @returns {number[]}
 */
const labelLengths = (node, main) => {
    const out = [(node.label || main).length, node.value === null ? 0 : node.value.length + 2];
    node.children.forEach((c) => out.push(...labelLengths(c, main)));
    return out;
};

/**
 * Draw the tree of a step into an element.
 *
 * @param {HTMLElement} host emptied and filled
 * @param {ReturnType<CallTree['at']>} state
 * @param {Object<string, string>} s strings (calltreesummary, calltreemore, mainprogram)
 * @param {function(number): void} [go] called with the start step of a node that is clicked
 */
export const drawCallTree = (host, state, s, go) => {
    host.replaceChildren();
    if (!state.root) {
        return;
    }
    const main = s.mainprogram;
    const summary = document.createElement('p');
    summary.className = 'tiny_codelab-calltree-summary';
    let text = s.calltreesummary.replace('{$a->calls}', state.count).replace('{$a->repeated}', state.repeated)
        .replace('{$a->depth}', state.depth);
    if (state.hidden) {
        text += ' · ' + s.calltreemore.replace('{$a}', state.hidden);
    }
    summary.textContent = text;
    const longest = Math.max(4, ...labelLengths(state.root, main));
    const slot = Math.ceil(longest * CHAR_W + GAP * 2);
    const {nodes, width, height} = layoutTree(state.root, slot);
    const pic = svg('svg', {width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': text,
        'class': 'tiny_codelab-calltree-svg'});
    nodes.forEach((item) => {
        if (item.parent) {
            pic.append(svg('line', {x1: item.parent.x, y1: item.parent.y + NODE_H / 2, x2: item.x, y2: item.y - NODE_H / 2,
                'class': 'tiny_codelab-calltree-edge'}));
        }
    });
    let currentItem = null;
    nodes.forEach((item) => {
        const n = item.node;
        const classes = ['tiny_codelab-calltree-node'];
        if (n === state.current) {
            classes.push('tiny_codelab-calltree-current');
            currentItem = item;
        } else if (state.waiting.has(n)) {
            classes.push('tiny_codelab-calltree-waiting');
        } else if (n.done) {
            classes.push('tiny_codelab-calltree-done');
        }
        if (!n.root && (state.keys.get(n.key) || 0) > 1) {
            classes.push('tiny_codelab-calltree-repeated');
        }
        const label = n.label || main;
        const w = Math.max(label.length * CHAR_W + GAP, 30);
        const g = svg('g', {'class': classes.join(' ')});
        g.append(svg('rect', {x: item.x - w / 2, y: item.y - NODE_H / 2, width: w, height: NODE_H, rx: 6}));
        g.append(svg('text', {x: item.x, y: item.y + 4, 'text-anchor': 'middle'}, label));
        if (n.value !== null) {
            g.append(svg('text', {x: item.x, y: item.y + NODE_H / 2 + 13, 'text-anchor': 'middle',
                'class': 'tiny_codelab-calltree-value'}, `= ${n.value}`));
        }
        if (go) {
            g.addEventListener('click', () => go(n.start));
        }
        pic.append(g);
    });
    const scroller = document.createElement('div');
    scroller.className = 'tiny_codelab-calltree-scroll';
    // A scrolling region takes the keyboard focus, so the tree can be scrolled with the arrow keys.
    scroller.tabIndex = 0;
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', s.calltree);
    scroller.append(pic);
    host.append(summary, scroller);
    // Keep the running call in sight (once the panel is on the page and has a width).
    if (currentItem && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            if (scroller.clientWidth) {
                scroller.scrollLeft = Math.max(0, currentItem.x - scroller.clientWidth / 2);
            }
        });
    }
};
