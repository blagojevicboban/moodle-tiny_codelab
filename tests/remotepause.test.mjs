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
 * Unit tests for pauses of tiny_codelab/remote while a companion file tab is shown.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteSession} from '../amd/src/remote.js';

const MAIN = Array.from({length: 20}, (_, i) => `line ${i + 1}`).join('\n');

/**
 * A fake session whose editor shows a 3-line companion tab while the main program has 20 lines.
 *
 * @returns {Object}
 */
const fakeSession = () => {
    const sent = [];
    const marks = [];
    return {
        sent,
        marks,
        offset: 0,
        mode: 'step',
        strings: {paused: 'Paused at line {$a}'},
        terminal: {setStatus: () => null},
        debug: null,
        editor: {
            getValue: () => 'a\nb\nc',
            getMainValue: () => MAIN,
            hasFile: (name) => name === 'util.c',
            highlightLine: (line, file) => marks.push([line, file]),
        },
        send: (msg) => sent.push(msg),
        setState: () => null,
        mainSource: RemoteSession.prototype.mainSource,
    };
};

test('a pause in the main program counts its lines, not those of the shown companion tab', () => {
    const s = fakeSession();
    RemoteSession.prototype.paused.call(s, {line: 15, func: 'main', vars: []});
    assert.deepEqual(s.sent, []);
    assert.deepEqual(s.marks, [[15, null]]);
});

test('a pause in a companion file with a tab is shown', () => {
    const s = fakeSession();
    RemoteSession.prototype.paused.call(s, {line: 2, file: 'util.c', func: 'f', vars: []});
    assert.deepEqual(s.sent, []);
    assert.deepEqual(s.marks, [[2, 'util.c']]);
});

test('a pause in a file without a tab goes on', () => {
    const s = fakeSession();
    RemoteSession.prototype.paused.call(s, {line: 2, file: 'other.c', func: 'f', vars: []});
    assert.deepEqual(s.sent, [{type: 'step'}]);
    assert.deepEqual(s.marks, []);
});
