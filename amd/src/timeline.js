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
 * The record of a Step run: one snapshot per stop (line, call stack with the variables, length of the output), so the
 * reader can go back and move along the run with a slider, also after the program ended. Neither Python in the browser
 * nor gdb runs backwards: going back only shows a snapshot.
 *
 * @module     tiny_codelab/timeline
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Most snapshots kept; when full, every second one of the older half is dropped. */
export const MAX_SNAPSHOTS = 20000;

/**
 * @typedef {Object} Snapshot
 * @property {number} line line in the editor
 * @property {Array<{func: string, line: number, vars: Object<string, string>}>} stack frames, innermost first
 * @property {number} out length of the console text at this stop
 * @property {number} step number of the stop in the run (1 for the first), kept when snapshots are dropped
 */

export class Timeline {
    /**
     * An empty record.
     *
     * @param {number} [max] most snapshots kept
     */
    constructor(max = MAX_SNAPSHOTS) {
        this.max = Math.max(4, max);
        this.clear();
    }

    /**
     * Forget the run.
     */
    clear() {
        /** @type {Snapshot[]} */
        this.items = [];
        this.count = 0;
        this.thinned = false;
    }

    /**
     * Snapshots kept.
     *
     * @returns {number}
     */
    get length() {
        return this.items.length;
    }

    /**
     * Add a stop. The stack is copied, so later changes of the caller do not change the record.
     *
     * @param {{line: number, stack: Array, out: number}} stop
     * @returns {number} index of the new snapshot
     */
    record({line, stack, out}) {
        this.count++;
        this.items.push({
            line,
            stack: (stack || []).map((f) => ({func: f.func, line: f.line, vars: {...(f.vars || {})}})),
            out: out || 0,
            step: this.count,
        });
        if (this.items.length > this.max) {
            const half = Math.floor(this.items.length / 2);
            const older = this.items.slice(0, half).filter((_, i) => i % 2 === 0);
            this.items = older.concat(this.items.slice(half));
            this.thinned = true;
        }
        return this.items.length - 1;
    }

    /**
     * A snapshot.
     *
     * @param {number} index
     * @returns {?Snapshot}
     */
    get(index) {
        return this.items[index] || null;
    }

    /**
     * The variables of the innermost frame of a snapshot.
     *
     * @param {number} index
     * @returns {Object<string, string>}
     */
    varsAt(index) {
        return this.items[index]?.stack[0]?.vars || {};
    }

    /**
     * The index the slider gets for a step (the nearest kept snapshot at or before it).
     *
     * @param {number} index wanted index, clamped to the record
     * @returns {number} -1 when empty
     */
    clamp(index) {
        if (!this.items.length) {
            return -1;
        }
        return Math.min(this.items.length - 1, Math.max(0, Math.round(index)));
    }
}

/**
 * The console text as it was at a stop: the first `length` characters of the nodes of an output element, copied with
 * their classes (errors stay red); input fields and buttons are left out.
 *
 * @param {HTMLElement} output the live output element
 * @param {number} length characters to keep
 * @returns {HTMLElement} a copy, cut to the length
 */
export const outputUpTo = (output, length) => {
    const copy = output.cloneNode(false);
    let left = length;
    for (const node of output.childNodes) {
        if (left <= 0) {
            break;
        }
        if (node.nodeType === 1 && (node.tagName === 'FORM' || node.tagName === 'BUTTON')) {
            continue;
        }
        const text = node.textContent;
        const part = node.cloneNode(node.nodeType !== 1);
        if (node.nodeType === 1) {
            part.textContent = text.slice(0, left);
        } else if (text.length > left) {
            part.textContent = text.slice(0, left);
        }
        copy.append(part);
        left -= Math.min(left, text.length);
    }
    return copy;
};

/**
 * The text length of an output element, without input fields and buttons (as counted by outputUpTo).
 *
 * @param {HTMLElement} output
 * @returns {number}
 */
export const outputLength = (output) => {
    let length = 0;
    for (const node of output.childNodes) {
        if (node.nodeType === 1 && (node.tagName === 'FORM' || node.tagName === 'BUTTON')) {
            continue;
        }
        length += node.textContent.length;
    }
    return length;
};
