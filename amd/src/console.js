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
 * The output panel under an editor: the status of the run, compiler messages, output and errors.
 *
 * @module     tiny_codelab/console
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';

const STATUSES = ['ok', 'compile', 'runtime', 'time', 'memory', 'illegal', 'busy', 'error', 'notconfigured', 'toolarge',
    'ratelimit'];

let strings = null;

/**
 * Status texts, loaded once.
 *
 * @returns {Promise<Object<string, string>>}
 */
const loadStrings = async() => {
    if (!strings) {
        const keys = STATUSES.map((s) => `status_${s}`).concat(['running', 'nooutput']);
        const values = await getStrings(keys.map((key) => ({key, component})));
        strings = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    }
    return strings;
};

/**
 * A block of text in the console.
 *
 * @param {string} text
 * @param {string} kind output, error or compile
 * @returns {HTMLElement}
 */
const block = (text, kind) => {
    const pre = document.createElement('pre');
    pre.className = `tiny_codelab-console-${kind}`;
    pre.textContent = text;
    return pre;
};

/**
 * Show that the program is running.
 *
 * @param {HTMLElement} panel
 */
export const showRunning = async(panel) => {
    const s = await loadStrings();
    panel.replaceChildren();
    const status = document.createElement('div');
    status.className = 'tiny_codelab-console-status tiny_codelab-status-running';
    status.textContent = s.running;
    panel.append(status);
    panel.hidden = false;
};

/**
 * Show the result of a run.
 *
 * @param {HTMLElement} panel element with role="status" (or aria-live), so screen readers hear the status
 * @param {import('./runner').RunResult} result
 */
export const showResult = async(panel, result) => {
    const s = await loadStrings();
    panel.replaceChildren();
    const status = document.createElement('div');
    status.className = `tiny_codelab-console-status tiny_codelab-status-${result.status}`;
    status.textContent = s[`status_${result.status}`] || s.status_error;
    panel.append(status);
    if (result.cmpinfo) {
        panel.append(block(result.cmpinfo, 'compile'));
    }
    if (result.stdout) {
        panel.append(block(result.stdout, 'output'));
    } else if (result.status === 'ok') {
        panel.append(block(s.nooutput, 'empty'));
    }
    if (result.stderr) {
        panel.append(block(result.stderr, 'error'));
    }
    panel.hidden = false;
};

/**
 * Show an error of the request itself (network, session).
 *
 * @param {HTMLElement} panel
 * @param {Error|Object} error
 */
export const showError = async(panel, error) => {
    await showResult(panel, {status: 'error', outcome: 0, cmpinfo: '', stdout: '',
        stderr: (error && (error.message || error.error)) || String(error)});
};
