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
 * Python in the browser: Pyodide in a Web Worker. input() waits for the reader (JavaScript Promise Integration, JSPI),
 * Step stops before every line of the program and sends its variables, Stop ends the worker (also an endless loop).
 *
 * One worker serves the whole page; a new run stops the one before.
 *
 * @module     tiny_codelab/python
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Most characters of output passed on; then the program is stopped (an endless print would freeze the page). */
const MAX_OUTPUT = 200000;

// The Python side: input() through JSPI, a tracer for Step, errors shown with the lines of the program only.
const HARNESS = [
    'import sys, builtins, json, traceback, types',
    'import js',
    'from pyodide.ffi import run_sync',
    '',
    'def __codelab_input(prompt=""):',
    '    if prompt:',
    '        sys.stdout.write(str(prompt))',
    '        sys.stdout.flush()',
    '    return run_sync(js.codelab.readLine())',
    '',
    'def __codelab_vars(frame):',
    '    out = {}',
    '    skip = (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type)',
    '    for k, v in frame.f_locals.items():',
    '        if k.startswith("__") or isinstance(v, skip):',
    '            continue',
    '        try:',
    '            r = repr(v)',
    '        except Exception:',
    '            r = "?"',
    '        out[k] = r if len(r) <= 200 else r[:197] + "..."',
    '    return json.dumps(out)',
    '',
    'def __codelab_trace(frame, event, arg):',
    '    if frame.f_code.co_filename != "<program>":',
    '        return None',
    '    if event == "line" and js.codelab.stepping:',
    '        run_sync(js.codelab.step(frame.f_lineno, frame.f_code.co_name, __codelab_vars(frame)))',
    '    return __codelab_trace',
    '',
    'def __codelab_run(code, step):',
    '    builtins.input = __codelab_input',
    '    try:',
    '        compiled = compile(code, "<program>", "exec")',
    '    except SyntaxError as e:',
    '        sys.stderr.write("".join(traceback.format_exception_only(type(e), e)))',
    '        return "error"',
    '    if step:',
    '        sys.settrace(__codelab_trace)',
    '    try:',
    '        exec(compiled, {"__name__": "__main__", "__builtins__": builtins})',
    '        return "ok"',
    '    except SystemExit:',
    '        return "ok"',
    '    except BaseException as e:',
    '        tb = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "<program>"]',
    '        sys.stderr.write("Traceback (most recent call last):\\n" + "".join(traceback.format_list(tb))',
    '                         + "".join(traceback.format_exception_only(type(e), e)))',
    '        return "error"',
    '    finally:',
    '        sys.settrace(None)',
    '        sys.stdout.flush()',
    '        sys.stderr.flush()',
].join('\n');

/**
 * Source of the worker (an ES module, as Pyodide is one).
 *
 * @param {string} base address of the Pyodide files, ending with /
 * @returns {string}
 */
const workerSource = (base) => `
import {loadPyodide} from ${JSON.stringify(base + 'pyodide.mjs')};
const HARNESS = ${JSON.stringify(HARNESS)};
let pyodide = null;
let pendingLine = null;
let pendingStep = null;
let written = 0;
const decoder = new TextDecoder();
self.codelab = {
    stepping: false,
    readLine: () => new Promise((resolve) => {
        pendingLine = resolve;
        postMessage({type: 'input'});
    }),
    step: (line, scope, vars) => new Promise((resolve) => {
        pendingStep = resolve;
        postMessage({type: 'line', line, scope, vars});
    }),
};
const writer = (stream) => ({
    write: (buffer) => {
        const text = decoder.decode(buffer);
        written += text.length;
        if (written > ${MAX_OUTPUT}) {
            postMessage({type: 'toolong'});
            throw new Error('Too much output');
        }
        postMessage({type: 'out', stream, text});
        return buffer.length;
    },
});
onmessage = async(e) => {
    const m = e.data;
    if (m.type === 'line' && pendingLine) {
        const resolve = pendingLine;
        pendingLine = null;
        resolve(m.text);
    } else if (m.type === 'resume' && pendingStep) {
        self.codelab.stepping = m.step;
        const resolve = pendingStep;
        pendingStep = null;
        resolve();
    } else if (m.type === 'run') {
        try {
            if (!pyodide) {
                postMessage({type: 'loading'});
                pyodide = await loadPyodide({indexURL: ${JSON.stringify(base)}});
                pyodide.setStdout(writer('out'));
                pyodide.setStderr(writer('err'));
            }
            written = 0;
            self.codelab.stepping = m.step;
            pyodide.globals.set('__codelab_code', m.code);
            pyodide.globals.set('__codelab_step', m.step);
            postMessage({type: 'started'});
            const status = await pyodide.runPythonAsync(HARNESS + '\\n__codelab_run(__codelab_code, __codelab_step)');
            postMessage({type: 'done', status: status === undefined ? 'ok' : String(status)});
        } catch (err) {
            postMessage({type: 'done', status: 'error', message: String(err && err.message || err)});
        }
    }
};
`;

let worker = null;
let current = null;

/**
 * Whether Python can run in this browser (JSPI is needed for input() and Step).
 *
 * @returns {boolean}
 */
export const available = () => typeof WebAssembly === 'object' && typeof WebAssembly.Suspending === 'function' &&
    typeof Worker === 'function';

/**
 * Stop the running program (the worker is ended; the next run loads Pyodide again, from the browser cache).
 */
const stopWorker = () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    if (current) {
        const handlers = current;
        current = null;
        handlers.onDone({status: 'stopped'});
    }
};

/**
 * Handlers of a run.
 *
 * @typedef {Object} PythonHandlers
 * @property {function(): void} [onLoading] Pyodide is being loaded (the first run on a page)
 * @property {function(): void} [onStarted] the program has started
 * @property {function(string, string): void} onOutput text and stream (out or err)
 * @property {function(): void} onInput the program waits for a line (answer with sendInput)
 * @property {function(number, string, Object<string, string>): void} [onLine] Step: line, function and variables
 * @property {function({status: string, message?: string}): void} onDone status ok, error, stopped or toolong
 */

/**
 * Run a Python program in the browser.
 *
 * @param {string} base address of the Pyodide files, ending with /
 * @param {string} code
 * @param {PythonHandlers} handlers
 * @param {boolean} step stop before the first line
 * @returns {{sendInput: function(string): void, resume: function(boolean): void, stop: function(): void}}
 */
export const runPython = (base, code, handlers, step = false) => {
    // A program still running is stopped; an idle worker keeps Pyodide loaded for the next run.
    if (current) {
        stopWorker();
    }
    if (!worker) {
        const url = URL.createObjectURL(new Blob([workerSource(base)], {type: 'text/javascript'}));
        worker = new Worker(url, {type: 'module'});
        worker.onerror = (e) => {
            const h = current;
            stopWorker();
            if (h) {
                h.onDone({status: 'error', message: e.message || 'Python could not be loaded.'});
            }
        };
    }
    const own = worker;
    current = handlers;
    let toolong = false;
    own.onmessage = (e) => {
        if (current !== handlers) {
            return;
        }
        const m = e.data;
        if (m.type === 'loading' && handlers.onLoading) {
            handlers.onLoading();
        } else if (m.type === 'started' && handlers.onStarted) {
            handlers.onStarted();
        } else if (m.type === 'out') {
            handlers.onOutput(m.text, m.stream);
        } else if (m.type === 'input') {
            handlers.onInput();
        } else if (m.type === 'line' && handlers.onLine) {
            handlers.onLine(m.line, m.scope, JSON.parse(m.vars));
        } else if (m.type === 'toolong') {
            toolong = true;
        } else if (m.type === 'done') {
            current = null;
            handlers.onDone(toolong ? {status: 'toolong'} : {status: m.status, message: m.message});
        }
    };
    own.postMessage({type: 'run', code, step});
    return {
        sendInput: (text) => own.postMessage({type: 'line', text}),
        resume: (stepAgain) => own.postMessage({type: 'resume', step: stepAgain}),
        stop: () => {
            if (current === handlers) {
                stopWorker();
            }
        },
    };
};
