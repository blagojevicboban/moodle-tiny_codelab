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
 * A run on the interactive server (CodeLab runner) tied to a console: the program keeps running while the reader types
 * its input line by line, as in a terminal. Moodle gives a token for one session (tiny_codelab_session); the program
 * is sent over a WebSocket. Has the same state, start(), step(), resume() and stop() as tiny_codelab/session for Python:
 * C and C++ also run step by step (gdb on the server), with the line that runs next marked and the variables shown.
 *
 * @module     tiny_codelab/remote
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';
import {getStrings} from 'core/str';
import {component} from './common';
import {Terminal} from './terminal';
import {DebugPanel} from './debugpanel';
import {editorStack} from './session';

const KEYS = ['compiling', 'running', 'running_server', 'inputline', 'inputok', 'endinput', 'status_ok', 'status_runtime',
    'status_time', 'status_memory', 'status_toolong', 'status_stopped', 'status_compile', 'status_error', 'status_notconfigured',
    'status_nolanguage', 'status_ratelimit', 'status_busy', 'status_disconnected', 'status_unreachable', 'paused'];

/** Languages that run step by step on the interactive server. */
const STEP_LANGUAGES = ['c', 'cpp'];

/** Languages that read no input (SQL): the script runs to its end. */
const NO_INPUT = ['mysql'];
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
 * Whether a language runs on the interactive server of the site.
 *
 * @param {string[]|undefined} languages the interactive languages of runtime::config()
 * @param {string} lang
 * @returns {boolean}
 */
export const runsInteractively = (languages, lang) => Array.isArray(languages) && languages.includes(lang) &&
    typeof WebSocket !== 'undefined';

/**
 * Whether a language runs step by step on the interactive server of the site.
 *
 * @param {string[]|undefined} languages the interactive languages of runtime::config()
 * @param {string} lang
 * @returns {boolean}
 */
export const stepsInteractively = (languages, lang) => runsInteractively(languages, lang) && STEP_LANGUAGES.includes(lang);

export class RemoteSession {
    /**
     * A session.
     *
     * @param {Object} options
     * @param {string|function(): string} options.lang language, or a function giving the current one
     * @param {function(): string} options.program the whole program
     * @param {HTMLElement} options.panel console panel
     * @param {function(string): void} options.onState idle, running or paused
     * @param {number} [options.contextid] context of the page
     * @param {import('./monaco').CodeEditor} [options.editor] editor whose lines Step marks
     * @param {HTMLElement} [options.vars] variables panel of Step
     * @param {number} [options.offset] lines of hidden code before the editor's code; Step passes over hidden lines
     * @param {function(): string} [options.setup] SQL run before the program without showing its output
     */
    constructor({lang, program, panel, onState, contextid = M.cfg.contextid, editor = null, vars = null, offset = 0,
            setup = () => ''}) {
        this.setup = setup;
        this.editor = editor;
        this.vars = vars;
        this.offset = offset;
        this.mode = 'step';
        this.given = '';
        this.debug = vars ? new DebugPanel(vars, {step: () => this.step(), next: () => this.next(), out: () => this.out(),
            mark: (line) => this.editor?.highlightLine(line), terminal: () => this.terminal,
            again: () => this.start(true, this.given)}) : null;
        // Breakpoints set or removed while the program runs.
        editor?.onBreakpointsChange?.((lines) => this.send({type: 'breakpoints', lines: lines.map((l) => l + this.offset)}));
        this.lang = typeof lang === 'function' ? lang : () => lang;
        this.program = program;
        this.panel = panel;
        this.onState = onState;
        this.contextid = contextid;
        this.state = 'idle';
        this.ws = null;
        this.terminal = null;
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
     * Compile and run the program.
     *
     * @param {boolean} step stop before each line (C and C++)
     * @param {string} [stdin] input given before the start (sent at once; the rest is typed)
     */
    async start(step, stdin = '') {
        if (this.state !== 'idle') {
            return;
        }
        const s = this.strings = await loadStrings();
        this.debug?.reset();
        // The input of this run, for Step again with the same input.
        this.typed = stdin;
        this.mode = step ? 'step' : 'continue';
        const breakpoints = (this.editor?.getBreakpoints?.() || []).map((l) => l + this.offset);
        // Under gdb when stepping, or when Run has breakpoints to stop at.
        const debug = STEP_LANGUAGES.includes(this.lang()) && (step || breakpoints.length > 0);
        this.setState('running');
        this.terminal = new Terminal(this.panel, s.inputline, s.inputok);
        this.terminal.setStatus(s.compiling, 'running');
        let grant;
        try {
            const args = {contextid: this.contextid, lang: this.lang()};
            grant = await Ajax.call([{methodname: 'tiny_codelab_session', args}])[0];
        } catch (e) {
            const message = e?.message || e?.error || s.status_error;
            this.end(message, 'error');
            return;
        }
        if (grant.status !== 'ok') {
            this.end(s[`status_${grant.status}`] || s.status_error, 'error');
            return;
        }
        const ws = this.ws = new WebSocket(`${grant.url}?token=${encodeURIComponent(grant.token)}`);
        let finished = false;
        ws.onopen = () => ws.send(JSON.stringify({type: 'start', lang: this.lang(), code: this.program(), stdin,
            debug, step, breakpoints, setup: this.setup()}));
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'compiling':
                    this.terminal.setStatus(s.compiling, 'running');
                    break;
                case 'compile':
                    finished = true;
                    this.terminal.write(message.output, 'err');
                    this.end(s.status_compile, 'error');
                    break;
                case 'running':
                    if (NO_INPUT.includes(this.lang())) {
                        this.terminal.setStatus(s.running, 'running');
                    } else {
                        this.terminal.setStatus(s.running_server, 'running');
                        this.typeLines(s.endinput);
                    }
                    break;
                case 'out':
                case 'err':
                    this.terminal.write(message.data, message.type);
                    if (this.terminal.field) {
                        // Keep the input line after the newest output.
                        this.terminal.output.append(this.terminal.field);
                        if (this.terminal.eofButton) {
                            this.terminal.output.append(this.terminal.eofButton);
                        }
                    }
                    break;
                case 'paused':
                    this.paused(message);
                    break;
                case 'exit':
                    finished = true;
                    this.end(s[`status_${message.status}`] || s.status_runtime, message.status === 'ok' ? 'ok' : 'error');
                    break;
                case 'error':
                    finished = true;
                    this.end(message.message, 'error');
                    break;
            }
        };
        ws.onclose = (event) => {
            if (!finished && this.state === 'running') {
                this.end(event.code === 1006 && !event.wasClean ? s.status_disconnected : s.status_stopped, 'error');
            }
        };
        ws.onerror = () => {
            if (!finished && this.state === 'running') {
                finished = true;
                // The server refused the connection (origin, secret) or cannot be reached.
                this.end(s.status_unreachable, 'error');
            }
        };
    }

    /**
     * Send the lines the reader types until the program ends or the input is closed.
     *
     * @param {string} eofLabel
     */
    async typeLines(eofLabel) {
        // Also while paused in Step mode: a line typed then is read when the program gets to its input.
        while (this.state !== 'idle' && this.ws?.readyState === WebSocket.OPEN) {
            const line = await this.terminal.ask(eofLabel);
            if (this.state === 'idle' || this.ws?.readyState !== WebSocket.OPEN) {
                return;
            }
            if (line === null) {
                this.ws.send(JSON.stringify({type: 'eof'}));
                return;
            }
            this.typed += `${line}\n`;
            this.ws.send(JSON.stringify({type: 'stdin', data: `${line}\n`}));
        }
    }

    /**
     * The program stopped before a line (Step): mark it and show the variables; lines of the hidden code are passed.
     *
     * @param {Object} message of the server
     * @param {number} message.line line of the whole program that runs next
     * @param {string} message.func function of that line
     * @param {Array<{name: string, value: string}>} message.vars variables of the function
     * @param {Array<{func: string, line: number, vars: Array}>} [message.stack] the program's frames, innermost first
     */
    paused({line, func, vars, stack}) {
        const s = this.strings;
        const shown = line - this.offset;
        const lines = this.editor ? this.editor.getValue().split('\n').length : 0;
        if (!this.editor || shown < 1 || shown > lines) {
            // A line of the hidden code: go on as asked.
            this.send({type: this.mode === 'continue' ? 'continue' : 'step'});
            return;
        }
        this.terminal.setStatus(s.paused.replace('{$a}', shown), 'running');
        this.editor.highlightLine(shown);
        this.debug?.show({line: shown, stack: editorStack(stack || [{func, line, vars}], this.offset, lines)});
        this.setState('paused');
    }

    /**
     * Send a message to the server, if the session is open.
     *
     * @param {Object} message
     */
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Go on while paused.
     *
     * @param {string} mode step (one line, into calls), next (over calls), out (out of the function) or continue
     */
    go(mode) {
        if (this.state === 'paused') {
            this.mode = mode;
            this.setState('running');
            this.debug?.running();
            if (mode === 'continue') {
                this.editor?.highlightLine(null);
            }
            this.send({type: mode});
        }
    }

    /**
     * Run the next line (paused).
     */
    step() {
        if (this.debug?.inPast()) {
            this.debug.forward();
            return;
        }
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
        this.debug?.stopAuto();
        this.go('continue');
    }

    /**
     * Stop the program.
     */
    stop() {
        this.debug?.stopAuto();
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({type: 'stop'}));
        } else if (this.state === 'running') {
            this.ws?.close();
        }
    }

    /**
     * The run ended: status line, no more input.
     *
     * @param {string} text
     * @param {string} kind ok or error
     */
    end(text, kind) {
        this.debug?.stopAuto();
        this.given = this.typed || '';
        this.editor?.highlightLine(null);
        this.terminal?.cancelAsk();
        this.terminal?.setStatus(text, kind);
        if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
            this.ws.close();
        }
        this.ws = null;
        if (this.state !== 'idle') {
            this.setState('idle');
        }
        this.debug?.finish();
    }
}
