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
 * A run of a Python program in the browser tied to an editor, a console and a variables panel: output and input in the
 * console, and in Step mode the line that runs next marked in the editor and the variables shown.
 *
 * @module     tiny_codelab/session
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';
import {runPython} from './python';
import {Terminal} from './terminal';

const KEYS = ['loadingpython', 'running_browser', 'paused', 'status_ok', 'status_runtime', 'status_stopped',
    'status_toolong', 'inputline', 'variables', 'novariables'];
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

export class PythonSession {
    /**
     * A session.
     *
     * @param {Object} options
     * @param {string} options.base address of the Pyodide files
     * @param {import('./monaco').CodeEditor} options.editor
     * @param {HTMLElement} options.panel console panel
     * @param {HTMLElement} options.vars variables panel
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
        this.previous = {};
        this.state = 'idle';
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
        this.terminal = new Terminal(this.panel, s.inputline);
        this.terminal.setStatus(s.running_browser, 'running');
        this.previous = {};
        this.vars.hidden = !step;
        this.vars.replaceChildren();
        this.editor.highlightLine(null);
        this.setState('running');
        const terminal = this.terminal;
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
            onLine: (programLine, scope, vars) => {
                const line = programLine - this.offset;
                if (line < 1 || line > this.editor.getValue().split('\n').length) {
                    // A line of the hidden code: go on to the next line.
                    this.run.resume(true);
                    return;
                }
                terminal.setStatus(s.paused.replace('{$a}', line), 'running');
                this.editor.highlightLine(line);
                this.showVars(vars, scope, s);
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
                this.run = null;
                this.setState('idle');
            },
        }, step);
    }

    /**
     * Run the next line (paused in Step mode).
     */
    step() {
        if (this.run && this.state === 'paused') {
            this.setState('running');
            this.run.resume(true);
        }
    }

    /**
     * Run on without stopping (paused in Step mode).
     */
    resume() {
        if (this.run && this.state === 'paused') {
            this.setState('running');
            this.editor.highlightLine(null);
            this.run.resume(false);
        }
    }

    /**
     * Stop the program.
     */
    stop() {
        if (this.run) {
            this.run.stop();
        }
    }

    /**
     * Show the variables; values changed since the last step are marked.
     *
     * @param {Object<string, string>} vars
     * @param {string} scope name of the function (<module> for the main program)
     * @param {Object<string, string>} s strings
     */
    showVars(vars, scope, s) {
        const names = Object.keys(vars);
        this.vars.replaceChildren();
        const title = document.createElement('div');
        title.className = 'tiny_codelab-vars-title';
        title.textContent = scope && scope !== '<module>' ? `${s.variables}: ${scope}()` : s.variables;
        this.vars.append(title);
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = 'tiny_codelab-vars-empty';
            empty.textContent = s.novariables;
            this.vars.append(empty);
        } else {
            const table = document.createElement('table');
            table.className = 'tiny_codelab-vars-table';
            names.forEach((name) => {
                const row = table.insertRow();
                const changed = this.previous[name] !== vars[name];
                row.className = changed ? 'tiny_codelab-vars-changed' : '';
                row.insertCell().textContent = name;
                row.insertCell().textContent = vars[name];
            });
            this.vars.append(table);
        }
        this.vars.hidden = false;
        this.previous = vars;
    }
}
