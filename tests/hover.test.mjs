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
 * Tests of tiny_codelab/hover: where a column is, numbers, characters, printf formats and operators.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {placeOf, numberAt, formatAt, operatorAt, charCode, numberLines, markdown} from '../amd/src/hover.js';

const LABELS = {num_dec: 'decimal', num_hex: 'hexadecimal', num_bin: 'binary', num_oct: 'octal', num_char: 'character'};

test('code, string and comment', () => {
    const line = String.raw`    printf("%d\n", x); // 0x1F`;
    assert.deepEqual(placeOf(line, line.indexOf('%d'), 'c'), {kind: 'string', start: 11, end: 16, quote: '"'});
    assert.equal(placeOf(line, line.indexOf('x)'), 'c').kind, 'code');
    assert.equal(placeOf(line, line.indexOf('0x1F'), 'c').kind, 'comment');
    assert.equal(placeOf("print('a # b') # c", 10, 'python').kind, 'string');
    assert.equal(placeOf("print('a # b') # c", 17, 'python').kind, 'comment');
    assert.equal(placeOf('x = 5 /* 7 */ + 2', 10, 'c').kind, 'comment');
    assert.equal(placeOf('x = 5 /* 7 */ + 2', 16, 'c').kind, 'code');
});

test('whole-number literals in every notation', () => {
    assert.equal(numberAt('x = 255;', 5, 'c').value, 255n);
    assert.equal(numberAt('a = 017;', 5, 'c').value, 15n);
    assert.equal(numberAt('a = 017;', 5, 'csharp').value, 17n);
    assert.equal(numberAt('n = 1_000_000', 6, 'python').value, 1000000n);
    assert.equal(numberAt('y = 0b1010;', 6, 'java').value, 10n);
    assert.equal(numberAt('y = 0xFFul;', 6, 'c').value, 255n);
    assert.equal(numberAt('x = 3.14;', 5, 'c'), null);
    assert.equal(numberAt('x = 1e5;', 4, 'c'), null);
    assert.equal(numberAt('x2 = 7', 1, 'c'), null);
    assert.equal(numberAt('x = 1;', 4, 'c'), null);
});

test('numeral systems and characters', () => {
    assert.equal(numberLines(255n, LABELS),
        'decimal      255\nhexadecimal  FF\nbinary       1111 1111\noctal        377');
    assert.match(numberLines(65n, LABELS), /character {4}'A'$/);
    assert.equal(charCode('A'), 65);
    assert.equal(charCode('\n'), 10);
    assert.equal(charCode('ab'), null);
});

test('printf and scanf formats', () => {
    const line = '    printf("%-08.2lf", x);';
    const place = placeOf(line, 12, 'c');
    assert.deepEqual(formatAt(line, place, 13, 'c').parts,
        [{key: 'fmt_lf'}, {key: 'fmt_minus'}, {key: 'fmt_zero'}, {key: 'fmt_width', a: '8'}, {key: 'fmt_precision', a: '2'}]);
    const scan = '    scanf("%f %s %c", &x, s, &c);';
    const where = placeOf(scan, 12, 'c');
    assert.deepEqual(formatAt(scan, where, 11, 'c').parts, [{key: 'fmt_f_scan'}, {key: 'fmt_scanamp'}]);
    assert.deepEqual(formatAt(scan, where, scan.indexOf('%s'), 'c').parts, [{key: 'fmt_s'}]);
    assert.equal(formatAt(scan, where, scan.indexOf(' %s'), 'c'), null);
    const java = '    System.out.printf("%d%n", n);';
    assert.deepEqual(formatAt(java, placeOf(java, 24, 'java'), 25, 'java').parts, [{key: 'fmt_n_java'}]);
});

test('operators', () => {
    assert.deepEqual(operatorAt('if (a == b)', 7), {text: '==', start: 6, end: 8});
    assert.equal(operatorAt('p->x', 2).text, '->');
    assert.equal(operatorAt('a=-1', 1).text, '=-');
    assert.equal(operatorAt('a b', 1), null);
});

test('markdown of a help text', () => {
    assert.equal(markdown('[[a[0]]] is the first, [[a = [3, 1]]] a list'), '`a[0]` is the first, `a = [3, 1]` a list');
    assert.equal(markdown('2 * 3 and <stdio.h>'), String.raw`2 \* 3 and \<stdio\.h\>`);
    assert.equal(markdown('[[int]] is 4 bytes.'), String.raw`${'`int`'} is 4 bytes\.`);
});
