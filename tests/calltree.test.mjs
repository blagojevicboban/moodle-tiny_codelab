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
 * Tests of tiny_codelab/calltree: the call tree built from the stops of a Step run.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {CallTree, MAX_NODES, layoutTree, paramNames} from '../amd/src/calltree.js';

const PY = `def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(3))
`;

test('parameter names of Python and C-like definitions', () => {
    assert.deepEqual(paramNames(PY, 'fib'), ['n']);
    assert.deepEqual(paramNames('def f(self, a, b=2, *args, c: int = 1, **kw):\n    pass', 'f'), ['a', 'b', 'args', 'c', 'kw']);
    assert.deepEqual(paramNames('int sum(const int a[], int n) {\n return 0; }\nint main(void) { sum(x, 3); }', 'sum'),
        ['a', 'n']);
    assert.deepEqual(paramNames('long long f(std::map<int, int> &m, char *s)\n{\n}', 'f'), ['m', 's']);
    assert.deepEqual(paramNames('int main(void) {\n}', 'main'), []);
    // A call is not a definition.
    assert.deepEqual(paramNames('x = g(1, 2);', 'g'), []);
    assert.deepEqual(paramNames(PY, 'missing'), []);
});

/**
 * The stops of Step through fib(3) in Python: frames innermost first, as the timeline keeps them.
 *
 * @returns {Array<Object>}
 */
const fibStops = () => {
    const main = {func: '', line: 6, vars: {}};
    const fib = (n, line) => ({func: 'fib', line, vars: {n: String(n)}});
    const stops = [
        [[main]],
        [[fib(3, 2), main]],
        [[fib(2, 2), fib(3, 4), main]],
        [[fib(1, 2), fib(2, 4), fib(3, 4), main]],
        [[fib(2, 4), fib(3, 4), main], '1'],
        [[fib(0, 2), fib(2, 4), fib(3, 4), main]],
        [[fib(2, 4), fib(3, 4), main], '0'],
        [[fib(3, 4), main], '1'],
        [[fib(1, 2), fib(3, 4), main]],
        [[fib(3, 4), main], '1'],
        [[main], '2'],
    ];
    return stops.map(([stack, ret], i) => ({stack, step: i + 1, ret}));
};

test('builds the tree of fib(3) with arguments, values and repeated calls', () => {
    const tree = new CallTree(() => PY);
    fibStops().forEach((stop) => tree.add(stop));
    tree.finish();
    assert.equal(tree.hasCalls, true);
    const end = tree.at(Infinity);
    assert.equal(end.root.label, '');
    const top = end.root.children[0];
    assert.equal(top.label, 'fib(3)');
    assert.equal(top.value, '2');
    assert.deepEqual(top.children.map((c) => c.label), ['fib(2)', 'fib(1)']);
    assert.deepEqual(top.children[0].children.map((c) => [c.label, c.value]), [['fib(1)', '1'], ['fib(0)', '0']]);
    assert.equal(end.count, 5);
    // fib(1) twice.
    assert.equal(end.repeated, 1);
    assert.equal(end.depth, 3);
    assert.equal(end.current, null);
});

test('the tree follows step back', () => {
    const tree = new CallTree(() => PY);
    fibStops().forEach((stop) => tree.add(stop));
    const at4 = tree.at(4);
    assert.equal(at4.current.label, 'fib(1)');
    assert.equal(at4.count, 3);
    assert.equal(at4.waiting.size, 3);
    // Before its return, a call shows no value.
    assert.equal(at4.root.children[0].children[0].value, null);
    const at5 = tree.at(5);
    assert.equal(at5.current.label, 'fib(2)');
    assert.equal(at5.root.children[0].children[0].children[0].value, '1');
    assert.equal(tree.at(1).count, 0);
});

test('C under gdb: main is the root, no values', () => {
    const code = 'int f(int x) {\n  return x * 2;\n}\nint main() {\n  int y = f(4);\n}\n';
    const tree = new CallTree(() => code);
    const main = (y) => ({func: 'main', line: 5, vars: {y}});
    tree.add({stack: [main('0')], step: 1});
    tree.add({stack: [{func: 'f', line: 2, vars: {x: '4'}}, main('0')], step: 2});
    tree.add({stack: [main('8')], step: 3});
    tree.finish();
    const end = tree.at(Infinity);
    assert.equal(end.root.label, 'main()');
    assert.equal(end.root.children[0].label, 'f(4)');
    assert.equal(end.root.children[0].value, null);
    assert.equal(end.root.children[0].done, true);
});

test('no calls: no tree; many calls: only the first ones are drawn', () => {
    const tree = new CallTree(() => 'def g(i):\n    pass');
    tree.add({stack: [{func: '', line: 1, vars: {}}], step: 1});
    assert.equal(tree.hasCalls, false);
    let step = 2;
    for (let i = 0; i < MAX_NODES + 20; i++) {
        tree.add({stack: [{func: 'g', line: 2, vars: {i: String(i)}}, {func: '', line: 1, vars: {}}], step: step++});
        tree.add({stack: [{func: '', line: 1, vars: {}}], step: step++});
    }
    const end = tree.at(Infinity);
    assert.equal(end.count, MAX_NODES + 20);
    assert.equal(end.hidden, 21);
    assert.equal(end.root.children.length, MAX_NODES - 1);
});

test('layout centres a call above its calls', () => {
    const leaf = (label) => ({label, children: []});
    const root = {label: 'r', children: [leaf('a'), leaf('b')]};
    const {nodes, width} = layoutTree(root, 40);
    assert.equal(width, 80);
    assert.equal(nodes[0].x, 40);
});
