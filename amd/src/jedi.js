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
 * Typing help for Python from Jedi (level 2): completion of everything Python knows, also the reader's own variables
 * and their methods, signatures of calls, and syntax errors. Jedi runs in Pyodide in its own Web Worker, separate from
 * the worker that runs programs (that one is stopped by Stop and is busy while a program runs).
 *
 * The worker is started when a reader first types in a Python editor. Until Jedi is loaded, or when it does not answer
 * in time, the editor keeps the typing help of level 1 (tiny_codelab/intellisense).
 *
 * @module     tiny_codelab/jedi
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Longest wait for an answer, in milliseconds; then level 1 is used. */
const TIMEOUT = 1500;

/** Most completions passed on. */
const MAX_ITEMS = 200;

// The Python side: one function per request, results as JSON.
const HELPER = [
    'import jedi, json',
    '',
    'def __codelab_complete(code, line, column):',
    '    out = []',
    '    for c in jedi.Script(code).complete(line, column)[:' + MAX_ITEMS + ']:',
    '        if c.name.startswith("__"):',
    '            continue',
    '        out.append({"name": c.name, "type": c.type, "description": c.description})',
    '    return json.dumps(out)',
    '',
    'def __codelab_signatures(code, line, column):',
    '    out = []',
    '    for s in jedi.Script(code).get_signatures(line, column):',
    '        out.append({"label": s.to_string(), "params": [p.to_string() for p in s.params],',
    '                    "index": s.index if s.index is not None else 0, "doc": s.docstring(raw=True)[:500]})',
    '    return json.dumps(out)',
    '',
    'def __codelab_errors(code):',
    '    out = []',
    '    for e in jedi.Script(code).get_syntax_errors():',
    '        out.append({"line": e.line, "column": e.column, "until_line": e.until_line,',
    '                    "until_column": e.until_column, "message": e.get_message()})',
    '    return json.dumps(out)',
].join('\n');

/**
 * Source of the worker (an ES module, as Pyodide is one).
 *
 * @param {string} base address of the Pyodide files, ending with /
 * @returns {string}
 */
const workerSource = (base) => `
import {loadPyodide} from ${JSON.stringify(base + 'pyodide.mjs')};
const ready = (async() => {
    const pyodide = await loadPyodide({indexURL: ${JSON.stringify(base)}});
    await pyodide.loadPackage('jedi');
    pyodide.runPython(${JSON.stringify(HELPER)});
    return pyodide;
})();
onmessage = async(e) => {
    const {id, op, code, line, column} = e.data;
    try {
        const pyodide = await ready;
        const fn = pyodide.globals.get('__codelab_' + op);
        const result = op === 'errors' ? fn(code) : fn(code, line, column);
        fn.destroy();
        postMessage({id, result: JSON.parse(result)});
    } catch (err) {
        postMessage({id, error: String(err && err.message || err)});
    }
};
`;

let base = '';
let worker = null;
let failed = false;
let next = 0;
const pending = new Map();

/**
 * Set the address of Pyodide (tiny_codelab\local\runtime::config()); '' turns Jedi off.
 *
 * @param {string} url
 */
export const setBase = (url) => {
    if (url && !base) {
        base = url;
    }
};

/**
 * Whether Jedi can be used on this page.
 *
 * @returns {boolean}
 */
export const enabled = () => base !== '' && !failed && typeof Worker === 'function';

/**
 * Start the worker (loading Pyodide and Jedi takes a few seconds; requests wait for it).
 */
export const start = () => {
    if (worker || !enabled()) {
        return;
    }
    try {
        const url = URL.createObjectURL(new Blob([workerSource(base)], {type: 'text/javascript'}));
        worker = new Worker(url, {type: 'module'});
    } catch (e) {
        failed = true;
        return;
    }
    worker.onmessage = (e) => {
        const request = pending.get(e.data.id);
        if (request) {
            pending.delete(e.data.id);
            request(e.data.error ? null : e.data.result);
        }
    };
    worker.onerror = () => {
        // Pyodide or Jedi could not be loaded: level 1 stays.
        failed = true;
        worker = null;
        pending.forEach((request) => request(null));
        pending.clear();
    };
};

/**
 * Ask Jedi; null when it is not ready in time or fails.
 *
 * @param {string} op complete, signatures or errors
 * @param {string} code
 * @param {number} [line] 1-based
 * @param {number} [column] 0-based
 * @returns {Promise<?Array<Object>>}
 */
const ask = (op, code, line = 0, column = 0) => {
    start();
    if (!worker) {
        return Promise.resolve(null);
    }
    const id = ++next;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            resolve(null);
        }, op === 'errors' ? TIMEOUT * 4 : TIMEOUT);
        pending.set(id, (result) => {
            clearTimeout(timer);
            resolve(result);
        });
        worker.postMessage({id, op, code, line, column});
    });
};

/**
 * Completions at a position.
 *
 * @param {string} code
 * @param {number} line 1-based
 * @param {number} column 0-based
 * @returns {Promise<?Array<{name: string, type: string, description: string}>>}
 */
export const complete = (code, line, column) => ask('complete', code, line, column);

/**
 * Signatures of the call at a position.
 *
 * @param {string} code
 * @param {number} line 1-based
 * @param {number} column 0-based
 * @returns {Promise<?Array<{label: string, params: string[], index: number, doc: string}>>}
 */
export const signatures = (code, line, column) => ask('signatures', code, line, column);

/**
 * Syntax errors of the code.
 *
 * @param {string} code
 * @returns {Promise<?Array<{line: number, column: number, until_line: number, until_column: number, message: string}>>}
 */
export const errors = (code) => ask('errors', code);
