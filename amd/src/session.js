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
 * A run of a Python program in the browser tied to an editor, a console and a debugger panel: output and input in the
 * console; in Step mode, or at a breakpoint, the line that runs next marked in the editor, with the call stack, the
 * variables and a trace table (tiny_codelab/debugpanel); Step, Step over, Step out and Continue.
 *
 * @module     tiny_codelab/session
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';
import {runPython} from './python';
import {Terminal} from './terminal';
import {DebugPanel} from './debugpanel';

const KEYS = ['loadingpython', 'running_browser', 'paused', 'status_ok', 'status_runtime', 'status_stopped',
    'status_toolong', 'inputline', 'inputok'];
let strings = null;

/**
 * Strings, loaded once.
 *
 * @returns {Promise<Object<string, string>>}
 */
const loadStrings = async() => {
    if (!strings) {
        const values = await getStrings(KEYS.map((key) => ({key, component})));
        strings = Object.fromEntries(KEYS.map((key, i) => [key, values[i]]));
    }
    return strings;
};

/**
 * The lines of a call stack in the editor: a line of the hidden code becomes 0.
 *
 * @param {Array<{func: string, line: number, vars: Object|Array}>} stack frames of the whole program
 * @param {number} offset lines of hidden code before the editor's code
 * @param {number} lines lines of the editor
 * @returns {Array<{func: string, line: number, vars: Object<string, string>}>}
 */
export const editorStack = (stack, offset, lines) => stack.map((frame) => {
    const line = frame.line - offset;
    const vars = Array.isArray(frame.vars) ? Object.fromEntries(frame.vars.map((v) => [v.name, v.value])) : frame.vars;
    return {func: frame.func === '<module>' ? '' : frame.func, line: line >= 1 && line <= lines ? line : 0, vars};
});

export class PythonSession {
    /**
     * A session.
     *
     * @param {Object} options
     * @param {string} options.base address of the Pyodide files
     * @param {import('./monaco').CodeEditor} options.editor
     * @param {HTMLElement} options.panel console panel
     * @param {HTMLElement} options.vars debugger panel
     * @param {function(string): void} options.onState idle, running or paused
     * @param {function(): string} [options.program] the whole program (default: the code of the editor)
     * @param {number} [options.offset] lines of hidden code before the editor's code in the program; Step passes over
     *     the hidden lines and marks the editor's lines
     */
    constructor({base, editor, panel, vars, onState, program = null, offset = 0}) {
        this.base = base;
        this.editor = editor;
        this.program = program || (() => editor.getValue());
        this.offset = offset;
        this.panel = panel;
        this.vars = vars;
        this.onState = onState;
        this.run = null;
        this.terminal = null;
        this.state = 'idle';
        this.mode = 'step';
        this.debug = new DebugPanel(vars, {step: () => this.step(), next: () => this.next(), out: () => this.out()});
        // Breakpoints set or removed while the program runs.
        this.editor.onBreakpointsChange?.((lines) => this.run?.setBreakpoints(lines.map((l) => l + this.offset)));
    }

    /**
     * Change the state and tell the owner.
     *
     * @param {string} state
     */
    setState(state) {
        this.state = state;
        this.onState(state);
    }

    /**
     * Start the program.
     *
     * @param {boolean} step stop before the first line
     * @param {string} stdin lines given to input() first; then the reader is asked
     */
    async start(step, stdin = '') {
        const s = await loadStrings();
        const queue = stdin === '' ? [] : stdin.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
        this.terminal = new Terminal(this.panel, s.inputline, s.inputok);
        this.terminal.setStatus(s.running_browser, 'running');
        this.debug.reset();
        this.editor.highlightLine(null);
        this.mode = step ? 'step' : 'continue';
        this.setState('running');
        const terminal = this.terminal;
        const breakpoints = (this.editor.getBreakpoints?.() || []).map((l) => l + this.offset);
        this.run = runPython(this.base, this.program(), {
            onLoading: () => terminal.setStatus(s.loadingpython, 'running'),
            onStarted: () => terminal.setStatus(s.running_browser, 'running'),
            onOutput: (text, stream) => terminal.write(text, stream),
            onInput: async() => {
                let line;
                if (queue.length) {
                    line = queue.shift();
                    terminal.write(line + '\n');
                } else {
                    line = await terminal.ask();
                }
                if (this.run) {
                    this.run.sendInput(line);
                }
            },
            onLine: (programLine, scope, vars, stack) => {
                const lines = this.editor.getValue().split('\n').length;
                const line = programLine - this.offset;
                if (line < 1 || line > lines) {
                    // A line of the hidden code: go on as asked.
                    this.run.resume(this.mode === 'continue' ? 'continue' : 'step');
                    return;
                }
                terminal.setStatus(s.paused.replace('{$a}', line), 'running');
                this.editor.highlightLine(line);
                this.debug.show({line, stack: editorStack(stack, this.offset, lines)});
                this.setState('paused');
            },
            onDone: ({status, message}) => {
                terminal.cancelAsk();
                if (message && status === 'error') {
                    terminal.write(message + '\n', 'err');
                }
                const text = {ok: s.status_ok, stopped: s.status_stopped, toolong: s.status_toolong}[status] || s.status_runtime;
                terminal.setStatus(text, status === 'ok' ? 'ok' : 'error');
                this.editor.highlightLine(null);
                this.debug.stopAuto();
                this.run = null;
                this.setState('idle');
            },
        }, step, breakpoints);
    }

    /**
     * Go on while paused.
     *
     * @param {string} mode step (one line, into calls), next (over calls), out (out of the function) or continue
     */
    go(mode) {
        if (this.run && this.state === 'paused') {
            this.mode = mode;
            this.setState('running');
            this.debug.running();
            if (mode === 'continue') {
                this.editor.highlightLine(null);
            }
            this.run.resume(mode);
        }
    }

    /**
     * Run the next line (paused).
     */
    step() {
        this.go('step');
    }

    /**
     * Run the next line without stopping in the functions it calls (paused).
     */
    next() {
        this.go('next');
    }

    /**
     * Run to the end of the current function (paused).
     */
    out() {
        this.go('out');
    }

    /**
     * Run on to the next breakpoint or the end (paused).
     */
    resume() {
        this.debug.stopAuto();
        this.go('continue');
    }

    /**
     * Stop the program.
     */
    stop() {
        this.debug.stopAuto();
        if (this.run) {
            this.run.stop();
        }
    }
}
