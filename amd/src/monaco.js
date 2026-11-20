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
const FONT_SIZE = 14;

/** Font sizes of the zoom steps (Ctrl + mouse wheel, Ctrl + plus / minus, Ctrl + 0 for the default). */
const ZOOM_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32];
const STORE_ZOOM = 'tiny_codelab_zoom';
const STORE_WRAP = 'tiny_codelab_wrap';

/**
 * Read a remembered value of this browser (private windows can refuse the storage).
 *
 * @param {string} key
 * @returns {?string}
 */
const recall = (key) => {
    try {
        return window.localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

/**
 * Remember a value in this browser.
 *
 * @param {string} key
 * @param {string} value
 */
const remember = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
    } catch (e) {
        // Nothing to do: the setting only lasts until the page is left.
    }
};

/**
 * Editor settings that every editor on the page shares: zoom and word wrap.
 *
 * @type {{fontSize: number, wrap: boolean, editors: Set<function(): void>}}
 */
const shared = {
    fontSize: ZOOM_SIZES.includes(Number(recall(STORE_ZOOM))) ? Number(recall(STORE_ZOOM)) : FONT_SIZE,
    wrap: recall(STORE_WRAP) === '1',
    editors: new Set(),
};

/**
 * Line height that goes with a font size.
 *
 * @param {number} fontSize
 * @returns {number}
 */
const lineHeightFor = (fontSize) => Math.round(fontSize * LINE_HEIGHT / FONT_SIZE);

/**
 * Change the font size of all editors on the page by some zoom steps, or back to the default (0).
 *
 * @param {number} steps
 */
const zoom = (steps) => {
    const index = ZOOM_SIZES.indexOf(shared.fontSize);
    const next = steps === 0 ? FONT_SIZE : ZOOM_SIZES[Math.min(Math.max(index + steps, 0), ZOOM_SIZES.length - 1)];
    if (next === shared.fontSize) {
        return;
    }
    shared.fontSize = next;
    remember(STORE_ZOOM, String(next));
    shared.editors.forEach((update) => update());
};

/**
 * Turn word wrap on or off in all editors on the page.
 */
const toggleWrap = () => {
    shared.wrap = !shared.wrap;
    remember(STORE_WRAP, shared.wrap ? '1' : '0');
    shared.editors.forEach((update) => update());
};

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
 * Detect whether dark mode is currently active on the page or in the browser.
 *
 * @returns {boolean}
 */
export const isDarkMode = () => {
    try {
        const doc = document.documentElement;
        const body = document.body;
        if (doc && doc.getAttribute('data-bs-theme') === 'dark') {
            return true;
        }
        if (body && (body.getAttribute('data-bs-theme') === 'dark' ||
            body.classList.contains('theme-dark') || body.classList.contains('dark-mode'))) {
            return true;
        }
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
        return false;
    }
};

/**
 * Resolve a theme name ('auto', 'vs', 'vs-dark', 'hc-black') to a concrete Monaco theme ('vs', 'vs-dark', 'hc-black').
 *
 * @param {string} theme
 * @returns {string}
 */
export const resolveTheme = (theme) => {
    if (theme === 'vs-dark' || theme === 'hc-black' || theme === 'vs') {
        return theme;
    }
    return isDarkMode() ? 'vs-dark' : 'vs';
};

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
 * @property {function(string): void} setTheme
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
    let lineHeight = lineHeightFor(shared.fontSize);
    frame.style.height = `${Math.min(Math.max(lines, minLines), maxLines) * lineHeight + PADDING}px`;
    const ready = frameReady(frame);
    frame.src = frameUrl();
    container.appendChild(frame);

    const win = await ready;
    const monaco = win.monaco;
    if (!options.noassist) {
        registerAssist(monaco, options.pyodide || '');
    }
    const lang = Object.prototype.hasOwnProperty.call(languages, options.lang) ? options.lang : defaultLanguage;
    const theme = resolveTheme(options.theme || 'auto');
    win.document.body.className = `theme-${theme}`;
    const editor = monaco.editor.create(win.document.getElementById('editor'), Object.assign({
        value: options.value || '',
        language: languages[lang],
        theme,
        readOnly: !!options.readOnly,
        automaticLayout: true,
        minimap: {enabled: false},
        scrollBeyondLastLine: false,
        fontSize: shared.fontSize,
        lineHeight,
        wordWrap: shared.wrap ? 'on' : 'off',
        mouseWheelZoom: false,
        stickyScroll: {enabled: true, maxLineCount: 3},
        bracketPairColorization: {enabled: true},
        guides: {bracketPairs: 'active', indentation: true},
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
    // Zoom: Ctrl + plus / minus / 0 (also on the number pad) and Ctrl + mouse wheel (a touchpad pinch sends the same).
    // Monaco combines keys with a bitwise or.
    /* eslint-disable no-bitwise */
    const ctrl = monaco.KeyMod.CtrlCmd;
    const keys = monaco.KeyCode;
    [[keys.Equal, 1], [keys.NumpadAdd, 1], [keys.Minus, -1], [keys.NumpadSubtract, -1], [keys.Digit0, 0], [keys.Numpad0, 0]]
        .forEach(([key, steps]) => editor.addCommand(ctrl | key, () => zoom(steps)));
    // Alt+Z turns word wrap on and off, as in Visual Studio Code.
    editor.addCommand(monaco.KeyMod.Alt | keys.KeyZ, toggleWrap);
    /* eslint-enable no-bitwise */
    const onWheel = (e) => {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        // Without this the browser would zoom the whole page.
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY) {
            zoom(e.deltaY < 0 ? 1 : -1);
        }
    };
    win.addEventListener('wheel', onWheel, {capture: true, passive: false});

    let fixedHeight = null;
    let normalHeight = frame.style.height;
    const resize = () => {
        if (fixedHeight !== null) {
            frame.style.height = `${fixedHeight}px`;
        } else if (options.autoHeight !== false) {
            const height = Math.min(Math.max(editor.getContentHeight(), minLines * lineHeight + PADDING),
                maxLines * lineHeight + PADDING);
            frame.style.height = `${height}px`;
        } else {
            frame.style.height = normalHeight;
        }
    };
    if (options.autoHeight !== false) {
        editor.onDidContentSizeChange(resize);
        resize();
    }
    const applyShared = () => {
        const previous = lineHeight;
        lineHeight = lineHeightFor(shared.fontSize);
        if (fixedHeight === null && options.autoHeight === false) {
            // A block of a fixed number of lines keeps its number of lines.
            const height = parseFloat(normalHeight) || 0;
            normalHeight = `${Math.round((height - PADDING) * lineHeight / previous) + PADDING}px`;
        }
        editor.updateOptions({fontSize: shared.fontSize, lineHeight, wordWrap: shared.wrap ? 'on' : 'off'});
        resize();
    };
    shared.editors.add(applyShared);

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
        setTheme: (value) => {
            const actual = resolveTheme(value);
            win.document.body.className = `theme-${actual}`;
            monaco.editor.setTheme(actual);
        },
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
            shared.editors.delete(applyShared);
            win.removeEventListener('wheel', onWheel, {capture: true});
            editor.dispose();
            frame.remove();
        },
        frame,
    };
};
