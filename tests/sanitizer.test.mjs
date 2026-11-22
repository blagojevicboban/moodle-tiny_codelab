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
 * Unit tests for tiny_codelab/sanitizer (ASan/UBSan parser).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSanitizer, formatSanitizer} from '../amd/src/sanitizer.js';

test('parses UBSan array index out of bounds with line and detail', () => {
    const stderr = "prog.c:5:21: runtime error: index 5 out of bounds for type 'int [3]'\n";
    const info = parseSanitizer(stderr);
    assert.deepEqual(info, {kind: 'index_oob', line: 5, detail: '5 (int [3])'});
    const msg = formatSanitizer(info, {san_index_oob: 'Line {$a->line}: out of bounds {$a->detail}'});
    assert.equal(msg, 'Line 5: out of bounds 5 (int [3])');
});

test('parses ASan buffer overflow, use-after-free, null pointer, overflow and division by zero', () => {
    assert.deepEqual(
        parseSanitizer('ERROR: AddressSanitizer: stack-buffer-overflow on address 0x1\n    #0 0x1 in main /box/prog.c:14'),
        {kind: 'buffer_overflow', line: 14, detail: ''}
    );
    assert.deepEqual(
        parseSanitizer('ERROR: AddressSanitizer: heap-use-after-free\n    #0 0x1 in main /box/prog.cpp:9'),
        {kind: 'use_after_free', line: 9, detail: ''}
    );
    assert.deepEqual(
        parseSanitizer('prog.c:7:5: runtime error: division by zero\n'),
        {kind: 'div_zero', line: 7, detail: ''}
    );
    assert.equal(parseSanitizer('normal error without sanitizer'), null);
});
