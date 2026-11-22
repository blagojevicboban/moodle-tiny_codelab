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
import {blockClass, langPrefix, themePrefix, ccPrefix, compilers, stdClassOf, stdFromClass, runClass, noAssistClass,
    stdinClass, setupClass, languages, defaultLanguage, themes, defaultTheme, fileClass, fileClassOf, fileNameOf,
    validFileName} from './common';

/** Class of the id of a block: codelab-id- and eight letters or digits, kept when the block is edited. */
export const idPrefix = 'codelab-id-';

/**
 * A new id for a block.
 *
 * @returns {string} eight lowercase letters and digits
 */
export const newBlockId = () => {
    let id = '';
    while (id.length < 8) {
        id += Math.random().toString(36).slice(2);
    }
    return id.slice(0, 8);
};

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
 * The files of a CodeLab block: the <pre class="codelab-file codelab-file-<name>"> elements that follow it, after its
 * setup and input, up to the next element that is none of these.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @returns {Array<{name: string, text: string, element: HTMLElement}>} in the order of the page
 */
export const filesOf = (pre) => {
    const files = [];
    let next = pre.nextElementSibling;
    while (next && next.nodeName === 'PRE' && !next.classList.contains(blockClass)) {
        if (next.classList.contains(fileClass)) {
            const name = [...next.classList].map(fileNameOf).find(Boolean);
            if (name && !files.some((f) => f.name === name)) {
                files.push({name, text: next.textContent, element: next});
            }
        } else if (!next.classList.contains(stdinClass) && !next.classList.contains(setupClass)) {
            break;
        }
        next = next.nextElementSibling;
    }
    return files;
};

/**
 * Settings of a CodeLab block, read from its classes.
 *
 * @param {HTMLElement} pre the <pre class="codelab"> element
 * @returns {{lang: string, run: boolean, noassist: boolean, code: string, stdin: string, setup: string, id: string,
 *     files: Array<{name: string, text: string}>}}
 */
export const readBlock = (pre) => {
    const idClass = [...pre.classList].find((c) => c.startsWith(idPrefix) && /^[a-z0-9]{8}$/.test(c.slice(idPrefix.length)));
    const langClass = [...pre.classList].find((c) => c.startsWith(langPrefix));
    const lang = langClass ? langClass.slice(langPrefix.length) : '';
    const themeClass = [...pre.classList].find((c) => c.startsWith(themePrefix));
    const theme = themeClass ? themeClass.slice(themePrefix.length) : '';
    const ccClass = [...pre.classList].find((c) => c.startsWith(ccPrefix));
    const cc = ccClass ? ccClass.slice(ccPrefix.length) : '';
    const std = [...pre.classList].map(stdFromClass).find(Boolean) || '';
    return {
        lang: Object.prototype.hasOwnProperty.call(languages, lang) ? lang : defaultLanguage,
        theme: Object.prototype.hasOwnProperty.call(themes, theme) ? theme : defaultTheme,
        compiler: compilers.includes(cc) ? cc : '',
        std,
        run: pre.classList.contains(runClass),
        noassist: pre.classList.contains(noAssistClass),
        // A block ends with a new line (so the closing tag is on its own line in the HTML source); the editor does not need it.
        code: pre.textContent.replace(/\n$/, ''),
        stdin: stdinOf(pre) ? stdinOf(pre).textContent : '',
        setup: setupOf(pre) ? setupOf(pre).textContent : '',
        // Stable across moves of the block on the page (tiny_codelab 1.18); '' for older blocks.
        id: idClass ? idClass.slice(idPrefix.length) : '',
        // Input files of a Python program (tiny_codelab 1.22).
        files: filesOf(pre).map(({name, text}) => ({name, text})),
    };
};

/**
 * HTML of a CodeLab block, followed by its setup, its input block and its files when it has them.
 *
 * @param {{lang: string, theme?: string, run: boolean, noassist: boolean, code: string, stdin?: string, setup?: string,
 *     id?: string, files?: Array<{name: string, text: string}>}} block
 * @returns {string}
 */
export const blockHtml = (block) => {
    const classes = [blockClass, langPrefix + block.lang];
    if (block.theme && block.theme !== defaultTheme) {
        classes.push(themePrefix + block.theme);
    }
    if ((block.lang === 'c' || block.lang === 'cpp') && block.compiler && compilers.includes(block.compiler)) {
        classes.push(ccPrefix + block.compiler);
    }
    if ((block.lang === 'c' || block.lang === 'cpp') && block.std) {
        classes.push(stdClassOf(block.std));
    }
    if (block.run) {
        classes.push(runClass);
    }
    if (block.noassist) {
        classes.push(noAssistClass);
    }
    if (block.id && /^[a-z0-9]{8}$/.test(block.id)) {
        classes.push(idPrefix + block.id);
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
    for (const file of block.files || []) {
        if (validFileName(file.name)) {
            const companion = document.createElement('pre');
            companion.className = `${fileClass} ${fileClassOf(file.name)}`;
            companion.textContent = file.text;
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
