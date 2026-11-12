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
    '__codelab_skip = (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type)',
    '__codelab_prim = (bool, int, float, complex, str, bytes, type(None))',
    '',
    'def __codelab_short(v):',
    '    try:',
    '        r = repr(v)',
    '    except Exception:',
    '        r = "?"',
    '    return r if len(r) <= 60 else r[:57] + "..."',
    '',
    '# The memory view (tiny_codelab/memview): a value is {"v": text} or {"r": id} of an object of the heap.',
    'def __codelab_ref(v, heap, depth):',
    '    if isinstance(v, __codelab_prim):',
    '        return {"v": __codelab_short(v)}',
    '    i = str(id(v))',
    '    if i in heap:',
    '        return {"r": i}',
    '    if len(heap) >= 60 or depth > 8 or isinstance(v, __codelab_skip):',
    '        return {"v": __codelab_short(v)}',
    '    node = {"t": type(v).__name__}',
    '    heap[i] = node',
    '    try:',
    '        if isinstance(v, (list, tuple, set, frozenset)):',
    '            many = isinstance(v, (set, frozenset))',
    '            seq = sorted(v, key=repr) if many else list(v)',
    '            node["k"] = "set" if many else ("tuple" if isinstance(v, tuple) else "list")',
    '            node["n"] = len(seq)',
    '            node["items"] = [__codelab_ref(x, heap, depth + 1) for x in seq[:50]]',
    '        elif isinstance(v, dict):',
    '            node["k"] = "dict"',
    '            node["n"] = len(v)',
    '            node["items"] = [[__codelab_ref(a, heap, depth + 1), __codelab_ref(b, heap, depth + 1)]',
    '                             for a, b in list(v.items())[:50]]',
    '        elif hasattr(v, "__dict__") and not callable(v):',
    '            fields = [(a, b) for a, b in vars(v).items() if not a.startswith("__")]',
    '            node["k"] = "object"',
    '            node["n"] = len(fields)',
    '            node["items"] = [[{"v": a}, __codelab_ref(b, heap, depth + 1)] for a, b in fields[:50]]',
    '        else:',
    '            node["k"] = "other"',
    '            node["items"] = [{"v": __codelab_short(v)}]',
    '    except Exception:',
    '        node["k"] = "other"',
    '        node["items"] = [{"v": "?"}]',
    '    return {"r": i}',
    '',
    'def __codelab_refs(frame, heap):',
    '    out = {}',
    '    for k, v in frame.f_locals.items():',
    '        if k.startswith("__") or isinstance(v, __codelab_skip):',
    '            continue',
    '        out[k] = __codelab_ref(v, heap, 0)',
    '    return out',
    '',
    'def __codelab_depth(frame):',
    '    depth = 0',
    '    while frame is not None:',
    '        if frame.f_code.co_filename == "<program>":',
    '            depth += 1',
    '        frame = frame.f_back',
    '    return depth',
    '',
    'def __codelab_stack(frame):',
    '    stack = []',
    '    heap = {}',
    '    while frame is not None and len(stack) < 30:',
    '        if frame.f_code.co_filename == "<program>":',
    '            stack.append({"func": frame.f_code.co_name, "line": frame.f_lineno,',
    '                          "vars": json.loads(__codelab_vars(frame)), "refs": __codelab_refs(frame, heap)})',
    '        frame = frame.f_back',
    '    return json.dumps({"frames": stack, "heap": heap})',
    '',
    'def __codelab_trace(frame, event, arg):',
    '    if frame.f_code.co_filename != "<program>":',
    '        return None',
    '    if event == "line":',
    '        c = js.codelab',
    '        mode = c.mode',
    '        stop = c.isBreakpoint(frame.f_lineno)',
    '        depth = 0',
    '        if not stop and mode != "continue":',
    '            depth = __codelab_depth(frame)',
    '            stop = mode == "step" or (mode == "next" and depth <= c.refDepth) or (mode == "out" and depth < c.refDepth)',
    '        if stop:',
    '            depth = depth or __codelab_depth(frame)',
    '            run_sync(c.step(frame.f_lineno, frame.f_code.co_name, __codelab_vars(frame), __codelab_stack(frame), depth))',
    '    elif event == "return":',
    '        # The caller goes on in the middle of its line, without a line event: stop there when the function that',
    '        # returns is the one of the last stop (Step, Step over or Step out).',
    '        c = js.codelab',
    '        caller = frame.f_back',
    '        if c.mode != "continue" and caller is not None and caller.f_code.co_filename == "<program>":',
    '            depth = __codelab_depth(frame)',
    '            if depth == c.refDepth or (c.mode != "out" and depth < c.refDepth):',
    '                run_sync(c.step(caller.f_lineno, caller.f_code.co_name, __codelab_vars(caller),',
    '                                __codelab_stack(caller), depth - 1))',
    '    return __codelab_trace',
    '',
    'def __codelab_run(code, trace):',
    '    builtins.input = __codelab_input',
    '    try:',
    '        compiled = compile(code, "<program>", "exec")',
    '    except SyntaxError as e:',
    '        sys.stderr.write("".join(traceback.format_exception_only(type(e), e)))',
    '        return "error"',
    '    if trace:',
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
// Step by step: mode step (every line), next (not deeper than refDepth), out (above refDepth), continue (only at
// breakpoints).
let breakpoints = new Set();
self.codelab = {
    mode: 'continue',
    refDepth: 0,
    isBreakpoint: (line) => breakpoints.has(line),
    readLine: () => new Promise((resolve) => {
        pendingLine = resolve;
        postMessage({type: 'input'});
    }),
    step: (line, scope, vars, stack, depth) => new Promise((resolve) => {
        self.codelab.refDepth = depth;
        pendingStep = resolve;
        postMessage({type: 'line', line, scope, vars, stack});
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
    } else if (m.type === 'breakpoints') {
        breakpoints = new Set(m.lines);
    } else if (m.type === 'resume' && pendingStep) {
        self.codelab.mode = m.mode;
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
            breakpoints = new Set(m.breakpoints || []);
            self.codelab.mode = m.step ? 'step' : 'continue';
            pyodide.globals.set('__codelab_code', m.code);
            // The tracer slows the program down: only when it may stop.
            pyodide.globals.set('__codelab_step', m.step || breakpoints.size > 0);
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
 * @property {function(number, string, Object<string, string>, Array, Object): void} [onLine] Step: line, function,
 *     variables, the call stack (frames of the program, innermost first: func, line, vars, refs) and the heap of the
 *     memory view (tiny_codelab/memview)
 * @property {function({status: string, message?: string}): void} onDone status ok, error, stopped or toolong
 */

/**
 * Run a Python program in the browser.
 *
 * @param {string} base address of the Pyodide files, ending with /
 * @param {string} code
 * @param {PythonHandlers} handlers
 * @param {boolean} step stop before the first line
 * @param {number[]} [breakpoints] lines to stop at
 * @returns {{sendInput: function(string): void, resume: function(string): void, setBreakpoints: function(number[]): void,
 *     stop: function(): void}} resume with step, next, out or continue
 */
export const runPython = (base, code, handlers, step = false, breakpoints = []) => {
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
            const memory = JSON.parse(m.stack);
            handlers.onLine(m.line, m.scope, JSON.parse(m.vars), memory.frames, memory.heap);
        } else if (m.type === 'toolong') {
            toolong = true;
        } else if (m.type === 'done') {
            current = null;
            handlers.onDone(toolong ? {status: 'toolong'} : {status: m.status, message: m.message});
        }
    };
    own.postMessage({type: 'run', code, step, breakpoints});
    return {
        sendInput: (text) => own.postMessage({type: 'line', text}),
        resume: (mode) => own.postMessage({type: 'resume', mode}),
        setBreakpoints: (lines) => own.postMessage({type: 'breakpoints', lines}),
        stop: () => {
            if (current === handlers) {
                stopWorker();
            }
        },
    };
};
