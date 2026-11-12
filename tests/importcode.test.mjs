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
 * Tests of the code prepared by tiny_algorithm (Open in CodeLab).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {IMPORT_KEY, takeImport} from '../amd/src/importcode.js';

/**
 * A session storage in memory.
 *
 * @param {Object} [value] stored under the key
 * @returns {Storage}
 */
const storage = (value) => {
    const items = new Map(value === undefined ? [] : [[IMPORT_KEY, JSON.stringify(value)]]);
    return {getItem: (k) => items.get(k) ?? null, removeItem: (k) => items.delete(k), has: (k) => items.has(k)};
};

const NOW = 1800000000000;

test('recent code of an offered language is taken once', () => {
    const s = storage({lang: 'cpp', code: 'int main() {}', source: 'tiny_algorithm', timestamp: NOW - 60000});
    assert.deepEqual(takeImport(['c', 'cpp'], s, NOW), {lang: 'cpp', code: 'int main() {}', source: 'tiny_algorithm'});
    assert.equal(s.has(IMPORT_KEY), false);
    assert.equal(takeImport(['c', 'cpp'], s, NOW), null);
});

test('old code, another language, empty code or bad data is not taken, and is removed', () => {
    const old = storage({lang: 'c', code: 'x', timestamp: NOW - 31 * 60000});
    assert.equal(takeImport(['c'], old, NOW), null);
    assert.equal(old.has(IMPORT_KEY), false);
    assert.equal(takeImport(['c'], storage({lang: 'pascal', code: 'x', timestamp: NOW}), NOW), null);
    assert.equal(takeImport(['c'], storage({lang: 'c', code: '  ', timestamp: NOW}), NOW), null);
    const bad = {getItem: () => '{not json', removeItem: () => undefined};
    assert.equal(takeImport(['c'], bad, NOW), null);
    assert.equal(takeImport(['c'], storage(), NOW), null);
});
