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
 * Unit tests for tiny_codelab/filetabs.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainFileName, languageForFile} from '../amd/src/filetabs.js';

test('mainFileName returns the expected main file name per language', () => {
    assert.equal(mainFileName('c'), 'main.c');
    assert.equal(mainFileName('cpp'), 'main.cpp');
    assert.equal(mainFileName('python'), 'main.py');
    assert.equal(mainFileName('java'), 'Main.java');
    assert.equal(mainFileName('csharp'), 'Program.cs');
    assert.equal(mainFileName('mysql'), 'query.sql');
});

test('languageForFile infers Monaco language from extension and uses cpp for .h in C++', () => {
    assert.equal(languageForFile('pomoc.c', 'c'), 'c');
    assert.equal(languageForFile('pomoc.h', 'c'), 'c');
    assert.equal(languageForFile('pomoc.h', 'cpp'), 'cpp');
    assert.equal(languageForFile('utils.hpp', 'cpp'), 'cpp');
    assert.equal(languageForFile('Helper.java', 'java'), 'java');
    assert.equal(languageForFile('mod.py', 'python'), 'python');
    assert.equal(languageForFile('ulaz.txt', 'c'), 'plaintext');
    assert.equal(languageForFile('README', 'c'), 'plaintext');
});
