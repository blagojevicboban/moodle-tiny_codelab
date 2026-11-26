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
import {parseValue, buildView, refText, indexNames, matrixIndexNames, heat, sharedRows} from '../amd/src/memview.js';

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
    // C# (netcoredbg, runner 0.25): an object by its type only is a plain value, its fields an object.
    assert.equal(parseValue('{Teacher}'), null);
    assert.equal(parseValue('{System.Collections.Generic.List<int>}'), null);
    const node = parseValue('{Value = 1, Next = {Node}}');
    assert.equal(node.k, 'object');
    assert.equal(refText(node.items[1][1]), '{Node}');
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

test('C pointers of the runner: into an array, to a variable, a linked list on the heap and NULL', () => {
    // As runner 0.6.0 sends them: the addresses [address, size, element size] and the targets outside the variables.
    const stack = [{func: 'main', line: 17, vars: {a: '{5, 6, 7, 8}', x: '3', p: '0x1008', q: '0x1010', head: '0x9000',
        none: '0x0', s: '0x2000 "hi"'},
    addrs: {a: [0x1000, 16, 4], x: [0x1010, 4, 0], p: [0x1018, 8, 0], q: [0x1020, 8, 0], head: [0x1028, 8, 0]}}];
    const targets = {'0x9000': '{data = 3, next = 0x9020}', '0x9020': '{data = 2, next = 0x0}'};
    // No name is used in [...]: only the pointer marks a cell.
    const view = buildView(stack, null, null, new Set(), targets);
    const rows = Object.fromEntries(view.frames[0].rows.map((row) => [row.name, row.ref]));
    const a = rows.a.r;
    assert.equal(rows.p.r, a, 'p points to the array');
    assert.deepEqual(view.markers[a], {2: ['p']}, 'p under a[2]');
    assert.equal(rows.q.v, '&x');
    assert.equal(rows.none.v, 'NULL');
    assert.equal(rows.s.v, '0x2000 "hi"', 'a string stays text');
    assert.equal(rows.head.r, '@0x9000');
    const first = view.heap['@0x9000'];
    assert.equal(first.k, 'object');
    assert.deepEqual(first.items[1][1], {r: '@0x9020'});
    assert.equal(refText(view.heap['@0x9020'].items[1][1]), 'NULL');
    assert.deepEqual(view.order, [a, '@0x9000', '@0x9020']);
    // Without the data of the runner (older runner) a pointer stays its value.
    assert.equal(buildView([{func: 'main', line: 1, vars: {p: '0x1008'}}], null).frames[0].rows[0].ref.v, '0x1008');
});

test('matrix: C table with heat map, row and column index variables, changed cells', () => {
    const names = matrixIndexNames('for (i = 1; i < 4; i++) for (j = 1; j < 4; j++) t[i][j] = t[i - 1][j] + t[i][j - 1];');
    assert.deepEqual([...names.rows], ['i']);
    assert.deepEqual([...names.cols], ['j']);
    const before = {stack: [{func: 'main', line: 5, vars: {t: '{{1, 2}, {3, 0}}', i: '1', j: '1'}}], heap: null};
    const stack = [{func: 'main', line: 6, vars: {t: '{{1, 2}, {3, 5}}', i: '1', j: '0', n: '7'}}];
    const view = buildView(stack, null, before, indexNames('t[i][j]'), null, names);
    const id = view.order[0];
    const m = view.matrices[id];
    assert.deepEqual(m.cells, [['1', '2'], ['3', '5']]);
    assert.equal(m.cols, 2);
    assert.deepEqual(m.shades, [[0, 1], [2, 4]]);
    assert.deepEqual(m.rowMarkers, {1: ['i']});
    assert.deepEqual(m.colMarkers, {0: ['j']});
    assert.deepEqual([...m.changed], ['1,1']);
    // Texts (a grid of characters) are a matrix without shades.
    const grid = buildView([{func: 'main', line: 1, vars: {g: "{{35 '#', 46 '.'}, {46 '.', 35 '#'}}"}}], null);
    assert.equal(Object.values(grid.matrices)[0].shades, null);
    // A plain array and an array of structs are no matrix.
    const plain = buildView([{func: 'main', line: 1, vars: {a: '{1, 2}', p: '{{x = 1}, {x = 2}}'}}], null);
    assert.deepEqual(plain.matrices, {});
});

test('matrix: Python rows keep their ids, a row of one list repeated is not a matrix', () => {
    const heap = {
        1: {t: 'list', k: 'list', n: 2, items: [{r: '2'}, {r: '3'}]},
        2: {t: 'list', k: 'list', n: 3, items: [{v: '0'}, {v: '1'}, {v: '2'}]},
        3: {t: 'list', k: 'list', n: 2, items: [{v: '3'}, {v: '4'}]},
        4: {t: 'list', k: 'list', n: 3, items: [{r: '5'}, {r: '5'}, {r: '5'}]},
        5: {t: 'list', k: 'list', n: 2, items: [{v: '0'}, {v: '0'}]},
    };
    const stack = [{func: '', line: 3, vars: {}, refs: {dp: {r: '1'}, row: {r: '3'}, bad: {r: '4'}, i: {v: '1'}}}];
    const view = buildView(stack, heap, null, null, null, null);
    const m = view.matrices['1'];
    assert.deepEqual(m.rowIds, ['2', '3']);
    assert.equal(m.cols, 3, 'a short row leaves empty cells');
    assert.deepEqual(m.rowMarkers, {1: ['i']});
    assert.equal(view.matrices['4'], undefined);
    assert.deepEqual(view.shared['4'], [[0, 1, 2]]);
    assert.deepEqual(sharedRows([{id: '2'}, {id: '3'}]), []);
});

test('heat: five shades between the smallest and the largest number', () => {
    assert.equal(heat(5, 5, 5), 0);
    assert.equal(heat(0, 0, 10), 0);
    assert.equal(heat(10, 0, 10), 4);
    assert.equal(heat(5, 0, 10), 2);
});
