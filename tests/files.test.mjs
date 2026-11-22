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
 * Tests of the files of a block: names kept in classes, reading the markup after a block, the check of the dialog and
 * the line count of the files after a run.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validFileName, fileClassOf, fileNameOf, filesProblem, MAX_FILE_SIZE} from '../amd/src/common.js';
import {filesOf} from '../amd/src/embed.js';
import {lineCount} from '../amd/src/session.js';

/**
 * Elements in a row, as siblings on a page: enough of the DOM for filesOf.
 *
 * @param {Array<{tag?: string, classes: string[], text?: string}>} specs
 * @returns {Array<Object>}
 */
const siblings = (specs) => {
    const elements = specs.map(({tag = 'PRE', classes, text = ''}) => ({
        nodeName: tag,
        classList: Object.assign([...classes], {contains: (c) => classes.includes(c)}),
        textContent: text,
        nextElementSibling: null,
    }));
    elements.forEach((e, i) => {
        e.nextElementSibling = elements[i + 1] || null;
    });
    return elements;
};

test('file names: letters, digits and _, one dot at most, no folders, at most 40 characters', () => {
    for (const name of ['input.txt', 'my_data.csv', 'data', 'A1.in', 'x'.repeat(36) + '.txt']) {
        assert.equal(validFileName(name), true, name);
    }
    for (const name of ['', 'a.b.c', '../x', 'dir/x.txt', 'my-data.txt', 'a b.txt', '.txt', 'x.', 'x'.repeat(41), 'č.txt']) {
        assert.equal(validFileName(name), false, name);
    }
});

test('a name and its class: the dot is a hyphen, and back', () => {
    assert.equal(fileClassOf('input.txt'), 'codelab-file-input-txt');
    assert.equal(fileClassOf('my_data.csv'), 'codelab-file-my_data-csv');
    assert.equal(fileClassOf('data'), 'codelab-file-data');
    for (const name of ['input.txt', 'my_data.csv', 'data']) {
        assert.equal(fileNameOf(fileClassOf(name)), name);
    }
    // The class of the element itself, other classes and classes that are no name.
    assert.equal(fileNameOf('codelab-file'), null);
    assert.equal(fileNameOf('codelab-stdin'), null);
    assert.equal(fileNameOf('codelab-file-a-b-c'), null);
    assert.equal(fileNameOf('codelab-file-'), null);
});

test('the files of a block come after its setup and input, up to the next element that is none of these', () => {
    const [block] = siblings([
        {classes: ['codelab', 'codelab-lang-python'], text: 'print(open("input.txt").read())'},
        {classes: ['codelab-stdin'], text: '3'},
        {classes: ['codelab-file', 'codelab-file-input-txt'], text: 'first\nsecond\n'},
        {classes: ['codelab-file', 'codelab-file-data-csv'], text: 'a,b\n'},
        // A file with a class that is no name, and a second file of the same name, are left out.
        {classes: ['codelab-file', 'codelab-file-a-b-c'], text: 'x'},
        {classes: ['codelab-file', 'codelab-file-input-txt'], text: 'again'},
        {tag: 'P', classes: [], text: 'Text of the page'},
        {classes: ['codelab-file', 'codelab-file-later-txt'], text: 'not of this block'},
    ]);
    assert.deepEqual(filesOf(block).map(({name, text}) => ({name, text})),
        [{name: 'input.txt', text: 'first\nsecond\n'}, {name: 'data.csv', text: 'a,b\n'}]);
});

test('the files stop at the next block', () => {
    const [first] = siblings([
        {classes: ['codelab', 'codelab-lang-python']},
        {classes: ['codelab', 'codelab-lang-python']},
        {classes: ['codelab-file', 'codelab-file-input-txt'], text: 'of the second block'},
    ]);
    assert.deepEqual(filesOf(first), []);
});

test('the dialog refuses a bad name, a name used twice and a file that is too large', () => {
    assert.equal(filesProblem([]), null);
    assert.equal(filesProblem([{name: 'input.txt', text: '1 2'}, {name: 'out.txt', text: ''}]), null);
    assert.deepEqual(filesProblem([{name: 'my file.txt', text: ''}]), {key: 'badfilename'});
    assert.deepEqual(filesProblem([{name: '', text: 'text without a name'}]), {key: 'badfilename'});
    assert.deepEqual(filesProblem([{name: 'a.txt', text: ''}, {name: 'a.txt', text: ''}]), {key: 'samefilename', a: 'a.txt'});
    assert.deepEqual(filesProblem([{name: 'big.txt', text: 'x'.repeat(MAX_FILE_SIZE + 1)}]), {key: 'filetoolarge', a: 'big.txt'});
});

test('the lines of a file after a run', () => {
    assert.equal(lineCount(''), 0);
    assert.equal(lineCount('one'), 1);
    assert.equal(lineCount('one\n'), 1);
    assert.equal(lineCount('one\ntwo\n'), 2);
    assert.equal(lineCount('one\n\n'), 2);
});
