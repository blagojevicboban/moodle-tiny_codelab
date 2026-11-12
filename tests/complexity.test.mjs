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
 * Tests of tiny_codelab/complexity: sizes, inputs, the growth that fits and the measuring loop.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSizes, makeInput, classify, measure} from '../amd/src/complexity.js';

test('sizes: whole numbers, no repeats, sorted, limited', () => {
    assert.deepEqual(parseSizes('50 10, 20;10 x -3 0'), [10, 20, 50]);
    assert.deepEqual(parseSizes(''), []);
    assert.equal(parseSizes(Array.from({length: 30}, (_, i) => i + 1).join(' ')).length, 12);
});

test('inputs: n, random, sorted, reversed; the same each time', () => {
    const a = makeInput('{n}\n{random}', 5);
    assert.equal(a, makeInput('{n}\n{random}', 5));
    const [n, list] = a.split('\n');
    assert.equal(n, '5');
    const numbers = list.split(' ').map(Number);
    assert.equal(numbers.length, 5);
    assert.ok(numbers.every((x) => x >= 1 && x <= 1000));
    assert.deepEqual(makeInput('{sorted}', 5).split(' ').map(Number), [...numbers].sort((x, y) => x - y));
    assert.deepEqual(makeInput('{reversed}', 5).split(' ').map(Number), [...numbers].sort((x, y) => y - x));
});

test('the growth that fits', () => {
    const sizes = [10, 20, 50, 100, 200, 500];
    const of = (f) => sizes.map((n) => ({n, steps: Math.round(f(n))}));
    assert.equal(classify(of((n) => 3 * n + 7)).key, 'on');
    assert.equal(classify(of((n) => n * n / 2 + n)).key, 'on2');
    assert.equal(classify(of((n) => 4 * n * Math.log2(n))).key, 'onlogn');
    assert.equal(classify(of((n) => 5 * Math.log2(n) + 2)).key, 'ologn');
    assert.equal(classify(of(() => 12)).key, 'o1');
    assert.equal(classify(of((n) => n).slice(0, 2)), null);
});

test('measuring stops at the first size that fails', async() => {
    const seen = [];
    const count = async(stdin) => {
        const n = Number(stdin.split('\n')[0]);
        seen.push(n);
        return n > 50 ? {status: 'toolong', steps: 0, message: ''} : {status: 'ok', steps: n * 2, message: ''};
    };
    const {points, problem} = await measure(count, '{n}', [10, 50, 100, 200]);
    assert.deepEqual(seen, [10, 50, 100]);
    assert.deepEqual(points.map((p) => p.steps), [20, 100, null, null]);
    assert.equal(problem.n, 100);
});
