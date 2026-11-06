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
import {showVariables} from './session';

const KEYS = ['compiling', 'running', 'running_server', 'inputline', 'endinput', 'status_ok', 'status_runtime', 'status_time',
    'status_memory', 'status_toolong', 'status_stopped', 'status_compile', 'status_error', 'status_notconfigured',
    'status_nolanguage', 'status_ratelimit', 'status_busy', 'status_disconnected', 'paused', 'variables', 'novariables'];

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
        this.previous = {};
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
        this.previous = {};
        if (this.vars) {
            this.vars.hidden = true;
            this.vars.replaceChildren();
        }
        this.setState('running');
        this.terminal = new Terminal(this.panel, s.inputline);
        this.terminal.setStatus(s.compiling, 'running');
        let grant;
        try {
            const args = {contextid: this.contextid, lang: this.lang()};
            grant = await Ajax.call([{methodname: 'tiny_codelab_session', args}])[0];
        } catch (e) {
            this.end(s.status_error, 'error');
            return;
        }
        if (grant.status !== 'ok') {
            this.end(s[`status_${grant.status}`] || s.status_error, 'error');
            return;
        }
        const ws = this.ws = new WebSocket(`${grant.url}?token=${encodeURIComponent(grant.token)}`);
        let finished = false;
        ws.onopen = () => ws.send(JSON.stringify({type: 'start', lang: this.lang(), code: this.program(), stdin,
            debug: step && STEP_LANGUAGES.includes(this.lang()), setup: this.setup()}));
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
                this.end(s.status_busy, 'error');
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
     */
    paused({line, func, vars}) {
        const s = this.strings;
        const shown = line - this.offset;
        if (!this.editor || shown < 1 || shown > this.editor.getValue().split('\n').length) {
            this.send({type: 'step'});
            return;
        }
        this.terminal.setStatus(s.paused.replace('{$a}', shown), 'running');
        this.editor.highlightLine(shown);
        if (this.vars) {
            const values = Object.fromEntries(vars.map((v) => [v.name, v.value]));
            showVariables(this.vars, values, this.previous, `${s.variables}: ${func}()`, s.novariables);
            this.previous = values;
        }
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
     * Run the next line (paused in Step mode).
     */
    step() {
        if (this.state === 'paused') {
            this.setState('running');
            this.send({type: 'step'});
        }
    }

    /**
     * Run on without stopping (paused in Step mode).
     */
    resume() {
        if (this.state === 'paused') {
            this.setState('running');
            this.editor?.highlightLine(null);
            this.send({type: 'continue'});
        }
    }

    /**
     * Stop the program.
     */
    stop() {
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
    }
}
