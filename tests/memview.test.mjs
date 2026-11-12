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
 * Tests of tiny_codelab/memview: values of gdb, the view of a stop (objects, index variables, changed cells).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseValue, buildView, refText, indexNames} from '../amd/src/memview.js';

test('gdb values: arrays, repeats, structs, vectors, strings and plain values', () => {
    assert.equal(parseValue('5'), null);
    assert.equal(parseValue('0x7ffd1234 "abc"'), null);
    const a = parseValue('{5, 3, 0 <repeats 3 times>, 1}');
    assert.equal(a.k, 'list');
    assert.deepEqual(a.items.map(refText), ['5', '3', '0', '0', '0', '1']);
    const m = parseValue('{{1, 2}, {3, 4}}');
    assert.equal(m.items.length, 2);
    assert.deepEqual(m.items[1].node.items.map(refText), ['3', '4']);
    const p = parseValue('{x = 1, name = "a, b", pos = {2, 3}}');
    assert.equal(p.k, 'object');
    assert.deepEqual(p.items.map((i) => refText(i[0])), ['x', 'name', 'pos']);
    assert.equal(refText(p.items[1][1]), '"a, b"');
    assert.equal(p.items[2][1].node.k, 'list');
    const v = parseValue('std::vector of length 3, capacity 4 = {7, 8, 9}');
    assert.equal(v.t, 'std::vector');
    assert.equal(v.n, 3);
    assert.deepEqual(v.items.map(refText), ['7', '8', '9']);
    assert.equal(parseValue('std::vector of length 0, capacity 0'), null);
    assert.equal(parseValue("{'a', 'b', '}'}").items.length, 3);
});

test('C: arrays of a frame become objects, ints that are a valid index are markers, changes are found', () => {
    const before = {stack: [{func: 'main', line: 3, vars: {a: '{4, 2, 9}', i: '0', j: '1'}}], heap: null};
    const stack = [{func: 'main', line: 4, vars: {a: '{2, 4, 9}', i: '0', j: '5', n: '3'}}];
    const view = buildView(stack, null, before);
    assert.equal(view.order.length, 1);
    const id = view.order[0];
    assert.deepEqual(view.markers[id], {0: ['i']});
    assert.deepEqual([...view.changed[id]], [0, 1]);
    assert.equal(refText(view.frames[0].rows.find((r) => r.name === 'n').ref), '3');
});

test('Python: shared objects keep one id, nested ones are reached once, plain frames give no objects', () => {
    const heap = {
        10: {t: 'list', k: 'list', n: 2, items: [{r: '11'}, {v: '3'}]},
        11: {t: 'dict', k: 'dict', n: 1, items: [[{v: "'k'"}, {v: '1'}]]},
    };
    const stack = [
        {func: 'f', line: 2, vars: {}, refs: {xs: {r: '10'}, i: {v: '1'}}},
        {func: '', line: 9, vars: {}, refs: {data: {r: '10'}, d: {r: '11'}}},
    ];
    const view = buildView(stack, heap, {stack, heap: {...heap, 10: {...heap[10], items: [{r: '11'}, {v: '2'}]}}});
    assert.deepEqual(view.order, ['10', '11']);
    assert.deepEqual(view.markers['10'], {1: ['i']});
    assert.deepEqual([...view.changed['10']], [1]);
    assert.equal(buildView([{func: '', line: 1, vars: {}, refs: {x: {v: '1'}}}], {}).order.length, 0);
});

test('index names: only the names used in [...]', () => {
    const names = indexNames('for (i = 0; i < n; i++) { t = a[i]; a[j + 1] = m[row][col]; }');
    assert.deepEqual([...names].sort(), ['col', 'i', 'j', 'row']);
    const stack = [{func: 'main', line: 1, vars: {a: '{1, 2, 3}', i: '1', t: '2', m: '{{1, 2}, {3, 4}}'}}];
    const view = buildView(stack, null, null, names);
    const a = view.order.find((id) => id.endsWith(':a'));
    const m = view.order.find((id) => id.endsWith(':m'));
    assert.deepEqual(view.markers[a], {1: ['i']});
    assert.equal(view.markers[m], undefined, 'no markers on the rows of a matrix');
});
