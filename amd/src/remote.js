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
 * is sent over a WebSocket. Has the same state, start() and stop() as tiny_codelab/session for Python.
 *
 * @module     tiny_codelab/remote
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';
import {getStrings} from 'core/str';
import {component} from './common';
import {Terminal} from './terminal';

const KEYS = ['compiling', 'running_server', 'inputline', 'endinput', 'status_ok', 'status_runtime', 'status_time',
    'status_memory', 'status_toolong', 'status_stopped', 'status_compile', 'status_error', 'status_notconfigured',
    'status_nolanguage', 'status_ratelimit', 'status_busy', 'status_disconnected'];
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

export class RemoteSession {
    /**
     * A session.
     *
     * @param {Object} options
     * @param {string|function(): string} options.lang language, or a function giving the current one
     * @param {function(): string} options.program the whole program
     * @param {HTMLElement} options.panel console panel
     * @param {function(string): void} options.onState idle or running
     * @param {number} [options.contextid] context of the page
     */
    constructor({lang, program, panel, onState, contextid = M.cfg.contextid}) {
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
     * @param {string} [stdin] input given before the start (sent at once; the rest is typed)
     */
    async start(stdin = '') {
        if (this.state !== 'idle') {
            return;
        }
        const s = await loadStrings();
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
        ws.onopen = () => ws.send(JSON.stringify({type: 'start', lang: this.lang(), code: this.program(), stdin}));
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
                    this.terminal.setStatus(s.running_server, 'running');
                    this.typeLines(s.endinput);
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
        while (this.state === 'running' && this.ws?.readyState === WebSocket.OPEN) {
            const line = await this.terminal.ask(eofLabel);
            if (this.state !== 'running' || this.ws?.readyState !== WebSocket.OPEN) {
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
