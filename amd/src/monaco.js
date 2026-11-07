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
 * The Monaco code editor in a frame.
 *
 * Monaco brings its own module loader and styles, which clash with Moodle's RequireJS and theme, so every editor runs
 * in a frame (frame.html of this plugin, same origin) and is created through the frame's window.
 *
 * @module     tiny_codelab/monaco
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {languages, defaultLanguage} from './common';
import {registerAssist} from './intellisense';

const LINE_HEIGHT = 19;
const PADDING = 8;

/**
 * Address of the frame page; jsrev makes browsers load a new copy after an upgrade.
 *
 * @returns {string}
 */
const frameUrl = () => `${M.cfg.wwwroot}/lib/editor/tiny/plugins/codelab/frame.html?rev=${M.cfg.jsrev}`;

/**
 * Wait until the frame has loaded Monaco.
 *
 * @param {HTMLIFrameElement} frame
 * @returns {Promise<Window>}
 */
const frameReady = (frame) => new Promise((resolve, reject) => {
    frame.addEventListener('load', () => {
        const win = frame.contentWindow;
        if (win && win.monaco) {
            resolve(win);
        } else {
            reject(new Error('The code editor could not be loaded.'));
        }
    }, {once: true});
});

/**
 * Editor options that turn typing help off (for tests).
 *
 * @type {Object}
 */
const NO_ASSIST = {
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off',
    parameterHints: {enabled: false},
    hover: {enabled: false},
    snippetSuggestions: 'none',
    acceptSuggestionOnEnter: 'off',
};

/**
 * A code editor.
 *
 * @typedef {Object} CodeEditor
 * @property {function(): string} getValue
 * @property {function(string): void} setValue
 * @property {function(string): void} setLanguage
 * @property {function(boolean): void} setReadOnly
 * @property {function(function(string): void): void} onChange
 * @property {function(?number): void} highlightLine mark the line that runs next (null: none)
 * @property {function(): void} focus
 * @property {function(?number): void} setFixedHeight a fixed height in pixels (full screen), or null to grow with the code
 * @property {function(): number[]} getBreakpoints lines with a breakpoint (options.breakpoints)
 * @property {function(function(number[]): void): void} onBreakpointsChange called when a breakpoint is set or removed
 * @property {function(): void} dispose
 * @property {HTMLIFrameElement} frame
 */

/**
 * Create a code editor inside a container.
 *
 * @param {HTMLElement} container element the frame is added to
 * @param {Object} options
 * @param {string} [options.value] code
 * @param {string} [options.lang] c, cpp, python, java, csharp, javascript, pascal or php
 * @param {boolean} [options.readOnly]
 * @param {boolean} [options.noassist] no code completion and hints
 * @param {boolean} [options.autoHeight] grow with the code, between minLines and maxLines
 * @param {number} [options.minLines]
 * @param {number} [options.maxLines]
 * @param {string} [options.label] accessible name of the editor
 * @param {function(): void} [options.onRun] called on Ctrl+Enter
 * @param {string} [options.pyodide] address of Pyodide: Python typing help from Jedi (level 2); '' for level 1
 * @param {boolean} [options.breakpoints] a click left of the line numbers sets or removes a breakpoint (Step)
 * @returns {Promise<CodeEditor>}
 */
export const createEditor = async(container, options = {}) => {
    const minLines = options.minLines || 3;
    const maxLines = options.maxLines || 30;
    const lines = (options.value || '').split('\n').length;
    const frame = document.createElement('iframe');
    frame.className = 'tiny_codelab-frame';
    frame.title = options.label || '';
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.style.display = 'block';
    frame.style.height = `${Math.min(Math.max(lines, minLines), maxLines) * LINE_HEIGHT + PADDING}px`;
    const ready = frameReady(frame);
    frame.src = frameUrl();
    container.appendChild(frame);

    const win = await ready;
    const monaco = win.monaco;
    if (!options.noassist) {
        registerAssist(monaco, options.pyodide || '');
    }
    const lang = Object.prototype.hasOwnProperty.call(languages, options.lang) ? options.lang : defaultLanguage;
    const editor = monaco.editor.create(win.document.getElementById('editor'), Object.assign({
        value: options.value || '',
        language: languages[lang],
        readOnly: !!options.readOnly,
        automaticLayout: true,
        minimap: {enabled: false},
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineHeight: LINE_HEIGHT,
        lineNumbersMinChars: 3,
        glyphMargin: !!options.breakpoints,
        tabSize: 4,
        insertSpaces: true,
        renderLineHighlight: 'line',
        fixedOverflowWidgets: true,
        ariaLabel: options.label || '',
        padding: {top: PADDING / 2, bottom: PADDING / 2},
    }, options.noassist ? NO_ASSIST : {}));

    if (options.noassist) {
        // Ctrl+Space would still open the list of suggestions. Monaco combines keys with a bitwise or.
        // eslint-disable-next-line no-bitwise
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => null);
    }
    if (options.onRun) {
        // eslint-disable-next-line no-bitwise
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, options.onRun);
    }
    let fixedHeight = null;
    let normalHeight = frame.style.height;
    const resize = () => {
        if (fixedHeight !== null) {
            frame.style.height = `${fixedHeight}px`;
        } else if (options.autoHeight !== false) {
            const height = Math.min(Math.max(editor.getContentHeight(), minLines * LINE_HEIGHT + PADDING),
                maxLines * LINE_HEIGHT + PADDING);
            frame.style.height = `${height}px`;
        } else {
            frame.style.height = normalHeight;
        }
    };
    if (options.autoHeight !== false) {
        editor.onDidContentSizeChange(resize);
        resize();
    }

    const current = editor.createDecorationsCollection();

    // Breakpoints: decorations, so that they move with their lines when the code changes.
    const breakpoints = editor.createDecorationsCollection();
    const breakpointListeners = [];
    const breakpointLines = () => [...new Set(breakpoints.getRanges().map((r) => r.startLineNumber))].sort((a, b) => a - b);
    if (options.breakpoints) {
        editor.onMouseDown((e) => {
            const type = e.target.type;
            if (type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || !e.target.position) {
                return;
            }
            const line = e.target.position.lineNumber;
            const lines = breakpointLines();
            const next = lines.includes(line) ? lines.filter((l) => l !== line) : [...lines, line];
            breakpoints.set(next.map((l) => ({
                range: new monaco.Range(l, 1, l, 1),
                options: {isWholeLine: false, glyphMarginClassName: 'codelab-breakpoint', stickiness: 1},
            })));
            breakpointListeners.forEach((listener) => listener(breakpointLines()));
        });
    }

    return {
        getValue: () => editor.getValue(),
        highlightLine: (line) => {
            current.set(line ? [{
                range: new monaco.Range(line, 1, line, 1),
                options: {isWholeLine: true, className: 'codelab-current-line', linesDecorationsClassName: 'codelab-current-mark'},
            }] : []);
            if (line) {
                editor.revealLineInCenterIfOutsideViewport(line);
            }
        },
        setValue: (value) => editor.setValue(value),
        setLanguage: (value) => monaco.editor.setModelLanguage(editor.getModel(), languages[value] || languages[defaultLanguage]),
        setReadOnly: (value) => editor.updateOptions({readOnly: !!value}),
        onChange: (callback) => editor.onDidChangeModelContent(() => callback(editor.getValue())),
        focus: () => editor.focus(),
        getBreakpoints: breakpointLines,
        onBreakpointsChange: (listener) => breakpointListeners.push(listener),
        setFixedHeight: (height) => {
            if (fixedHeight === null) {
                normalHeight = frame.style.height;
            }
            fixedHeight = height;
            resize();
        },
        dispose: () => {
            editor.dispose();
            frame.remove();
        },
        frame,
    };
};
