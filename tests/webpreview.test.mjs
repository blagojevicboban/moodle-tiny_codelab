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
 * Unit tests for tiny_codelab/webpreview.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHtmlDocument} from '../amd/src/webpreview.js';

test('buildHtmlDocument wraps an HTML fragment and injects unlinked CSS and JS companion files', () => {
    const doc = buildHtmlDocument('<h1>Zdravo</h1>', [
        {name: 'style.css', text: 'h1 { color: red; }'},
        {name: 'script.js', text: 'console.log("ok");'},
    ]);
    assert.match(doc, /<!DOCTYPE html>/);
    assert.match(doc, /<style>\nh1 \{ color: red; \}\n<\/style>/);
    assert.match(doc, /<script>\nconsole\.log\("ok"\);\n<\/script>/);
    assert.match(doc, /<h1>Zdravo<\/h1>/);
});

test('buildHtmlDocument inlines linked stylesheet and script tags without duplicating them', () => {
    const html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="app.css"></head>' +
        '<body><p>Hi</p><script src="./app.js"></script></body></html>';
    const doc = buildHtmlDocument(html, [
        {name: 'app.css', text: 'p { margin: 0; }'},
        {name: 'app.js', text: 'const s = "</script>";'},
    ]);
    assert.equal((doc.match(/p \{ margin: 0; \}/g) || []).length, 1);
    assert.match(doc, /<\\\/script>/);
    assert.doesNotMatch(doc, /href="app\.css"/);
    assert.doesNotMatch(doc, /src="\.\/app\.js"/);
});
