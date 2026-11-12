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
 * Tests of tiny_codelab/timeline: the record of a Step run.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Timeline, outputUpTo, outputLength} from '../amd/src/timeline.js';

test('records stops and copies the stack', () => {
    const t = new Timeline();
    const vars = {i: '0'};
    t.record({line: 2, stack: [{func: 'main', line: 2, vars}], out: 0});
    vars.i = '1';
    t.record({line: 3, stack: [{func: 'main', line: 3, vars}], out: 4});
    assert.equal(t.length, 2);
    assert.deepEqual(t.varsAt(0), {i: '0'});
    assert.deepEqual(t.varsAt(1), {i: '1'});
    assert.equal(t.get(1).out, 4);
    assert.equal(t.get(1).step, 2);
    assert.deepEqual(t.varsAt(-1), {});
    assert.equal(t.get(5), null);
});

test('thins the older half when full, keeps the step numbers and the newest stops', () => {
    const t = new Timeline(10);
    for (let i = 1; i <= 25; i++) {
        t.record({line: i, stack: [], out: i});
    }
    assert.ok(t.length <= 10);
    assert.ok(t.thinned);
    assert.equal(t.get(t.length - 1).step, 25);
    const steps = t.items.map((x) => x.step);
    assert.deepEqual([...steps].sort((a, b) => a - b), steps, 'in order');
    assert.equal(steps[0], 1, 'the first stop stays');
});

test('clamp', () => {
    const t = new Timeline();
    assert.equal(t.clamp(3), -1);
    t.record({line: 1, stack: [], out: 0});
    t.record({line: 2, stack: [], out: 0});
    assert.equal(t.clamp(-4), 0);
    assert.equal(t.clamp(9), 1);
});

/**
 * A minimal DOM node for outputUpTo (Node has no DOM).
 *
 * @param {number} nodeType
 * @param {string} tagName
 * @param {string} text
 * @returns {Object}
 */
const node = (nodeType, tagName, text = '') => ({
    nodeType, tagName, textContent: text, childNodes: [],
    cloneNode() {
        const c = node(nodeType, tagName, text);
        return c;
    },
    append(...kids) {
        this.childNodes.push(...kids);
    },
});

test('outputUpTo cuts the console text and leaves out the input line', () => {
    const out = node(1, 'PRE');
    out.append(node(3, undefined, 'Hello\n'), node(1, 'SPAN', 'Error!\n'), node(1, 'FORM', 'x'), node(3, undefined, 'tail'));
    assert.equal(outputLength(out), 6 + 7 + 4);
    const cut = outputUpTo(out, 8);
    assert.deepEqual(cut.childNodes.map((n) => n.textContent), ['Hello\n', 'Er']);
    assert.equal(cut.childNodes[1].tagName, 'SPAN');
    assert.deepEqual(outputUpTo(out, 100).childNodes.map((n) => n.textContent), ['Hello\n', 'Error!\n', 'tail']);
    assert.equal(outputUpTo(out, 0).childNodes.length, 0);
});
