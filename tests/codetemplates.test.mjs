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
 * Tests of tiny_codelab/codetemplates: every template has code, a known key and a lang string.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TEMPLATES, TEMPLATE_KEYS, templatesFor} from '../amd/src/codetemplates.js';

const strings = readFileSync(new URL('../lang/en/tiny_codelab.php', import.meta.url), 'utf8');

test('templates of every language: known keys, code, input with a final newline', () => {
    for (const [lang, list] of Object.entries(TEMPLATES)) {
        for (const [key, t] of Object.entries(list)) {
            assert.ok(TEMPLATE_KEYS.includes(key), `${lang} ${key}`);
            assert.ok(t.code.trim().length > 20, `${lang} ${key}`);
            assert.ok(t.stdin === '' || t.stdin.endsWith('\n'), `${lang} ${key}`);
            assert.ok(!/\t/.test(t.code), `${lang} ${key} has tabs`);
        }
    }
    for (const key of TEMPLATE_KEYS) {
        assert.ok(strings.includes(`$string['tpl_${key}']`), key);
    }
});

test('the main languages have all templates, in order; SQL has none', () => {
    for (const lang of ['c', 'cpp', 'python', 'java', 'csharp']) {
        assert.deepEqual(templatesFor(lang).map((t) => t.key), TEMPLATE_KEYS);
    }
    assert.deepEqual(templatesFor('pascal').map((t) => t.key), ['readarray', 'recursion']);
    assert.deepEqual(templatesFor('mysql'), []);
});

test('C keeps its escapes (printf with a newline)', () => {
    assert.ok(TEMPLATES.c.readarray.code.includes('printf("%d %d %d\\n"'));
});
