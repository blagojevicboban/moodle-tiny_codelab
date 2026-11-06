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
 * Reading and writing CodeLab blocks in HTML.
 *
 * @module     tiny_codelab/embed
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {blockClass, langPrefix, runClass, noAssistClass, stdinClass, setupClass, languages, defaultLanguage} from './common';

/**
 * A companion of a CodeLab block among the two elements right after it: <pre class="codelab-setup"> and
 * <pre class="codelab-stdin">, in this order when both are there.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @param {string} className
 * @returns {?HTMLElement}
 */
const companionOf = (pre, className) => {
    let next = pre.nextElementSibling;
    for (let i = 0; i < 2 && next && next.nodeName === 'PRE' && !next.classList.contains(blockClass); i++) {
        if (next.classList.contains(className)) {
            return next;
        }
        next = next.nextElementSibling;
    }
    return null;
};

/**
 * The input block of a CodeLab block: <pre class="codelab-stdin"> right after it, with the input readers start from.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @returns {?HTMLElement}
 */
export const stdinOf = (pre) => companionOf(pre, stdinClass);

/**
 * The setup of a CodeLab block: <pre class="codelab-setup"> right after it, with SQL run before the block's code.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @returns {?HTMLElement}
 */
export const setupOf = (pre) => companionOf(pre, setupClass);

/**
 * Settings of a CodeLab block, read from its classes.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @returns {{lang: string, run: boolean, noassist: boolean, code: string, stdin: string, setup: string}}
 */
export const readBlock = (pre) => {
    const langClass = [...pre.classList].find((c) => c.startsWith(langPrefix));
    const lang = langClass ? langClass.slice(langPrefix.length) : '';
    return {
        lang: Object.prototype.hasOwnProperty.call(languages, lang) ? lang : defaultLanguage,
        run: pre.classList.contains(runClass),
        noassist: pre.classList.contains(noAssistClass),
        // A block ends with a new line (so the closing tag is on its own line in the HTML source); the editor does not need it.
        code: pre.textContent.replace(/\n$/, ''),
        stdin: stdinOf(pre) ? stdinOf(pre).textContent : '',
        setup: setupOf(pre) ? setupOf(pre).textContent : '',
    };
};

/**
 * HTML of a CodeLab block, followed by its setup and its input block when it has them.
 *
 * @param {{lang: string, run: boolean, noassist: boolean, code: string, stdin?: string, setup?: string}} block
 * @returns {string}
 */
export const blockHtml = (block) => {
    const classes = [blockClass, langPrefix + block.lang];
    if (block.run) {
        classes.push(runClass);
    }
    if (block.noassist) {
        classes.push(noAssistClass);
    }
    const pre = document.createElement('pre');
    pre.className = classes.join(' ');
    pre.textContent = block.code;
    let html = pre.outerHTML;
    for (const [className, text] of [[setupClass, block.setup], [stdinClass, block.stdin]]) {
        if (text) {
            const companion = document.createElement('pre');
            companion.className = className;
            companion.textContent = text;
            html += companion.outerHTML;
        }
    }
    return html;
};

/**
 * Whether a node is a CodeLab block.
 *
 * @param {Node} node
 * @returns {boolean}
 */
export const isBlock = (node) => !!node && node.nodeName === 'PRE' && node.classList.contains(blockClass);
