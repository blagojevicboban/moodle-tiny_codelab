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
 * Tests of tiny_codelab/announce (what a screen reader hears at the end of a run) and of the reduced motion of the
 * turtle drawing.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_ANNOUNCED, announceEnd, announcedOutput, liveRegion, outputAnnouncement} from '../amd/src/announce.js';
import {linesPerFrame, reducedMotion} from '../amd/src/turtle.js';

const label = async(text) => `Output: ${text}`;

/**
 * A console element with only what the module uses.
 *
 * @param {Object<string, string>} attributes
 * @param {boolean} [onPage]
 * @returns {Object}
 */
const fakePanel = (attributes = {}, onPage = true) => {
    const after = [];
    return {
        after: (node) => after.push(node),
        added: after,
        parentNode: onPage ? {} : null,
        matches: (selector) => Object.keys(attributes).some((name) => selector.includes(`[${name}`)
            && (name !== 'role' || selector.includes(`"${attributes.role}"`))),
    };
};

globalThis.document = {
    createElement: () => ({attributes: {}, setAttribute(name, value) {
        this.attributes[name] = value;
    }, textContent: ''}),
};

test('the output is read as one line', () => {
    assert.equal(announcedOutput('1\n2\n\n  3\t4\n'), '1 2 3 4');
    assert.equal(announcedOutput(' \n '), '');
});

test('a long output is cut', () => {
    const text = announcedOutput('x'.repeat(MAX_ANNOUNCED + 50));
    assert.equal(text, `${'x'.repeat(MAX_ANNOUNCED)}…`);
});

test('the end is read with the output, or alone', async() => {
    assert.equal(await outputAnnouncement('Finished.', 'Hello\nworld\n', label), 'Finished. Output: Hello world');
    assert.equal(await outputAnnouncement('Finished.', '', label), 'Finished.');
});

test('a polite live region is added after a console that is not live', async() => {
    const panel = fakePanel({role: 'region'});
    const region = liveRegion(panel);
    assert.ok(region);
    assert.deepEqual(panel.added, [region]);
    assert.equal(region.attributes['aria-live'], 'polite');
    assert.equal(liveRegion(panel), region, 'made once');
    await announceEnd(panel, 'Finished.', '42\n');
    assert.equal(region.textContent, 'Finished. outputannounce');
});

test('a console that is live itself, or not on the page, gets no region', () => {
    assert.equal(liveRegion(fakePanel({role: 'status'})), null);
    assert.equal(liveRegion(fakePanel({'aria-live': 'polite'})), null);
    assert.equal(liveRegion(fakePanel({}, false)), null);
});

test('reduced motion draws the turtle at once', () => {
    assert.equal(reducedMotion(), false, 'no matchMedia in Node');
    globalThis.matchMedia = (query) => ({matches: query === '(prefers-reduced-motion: reduce)'});
    try {
        assert.equal(reducedMotion(), true);
        assert.equal(linesPerFrame(reducedMotion() ? 0 : 3), Infinity);
    } finally {
        delete globalThis.matchMedia;
    }
});
