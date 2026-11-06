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
 * Running programs: for now on the Jobe server through the web service tiny_codelab_run.
 * In-browser runtimes (Pyodide, JSCPP) come later behind the same run() call.
 *
 * @module     tiny_codelab/runner
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';

/**
 * Result of a run.
 *
 * @typedef {Object} RunResult
 * @property {string} status ok, compile, runtime, time, memory, illegal, busy, error, notconfigured, toolarge or ratelimit
 * @property {number} outcome Jobe outcome code
 * @property {string} cmpinfo compiler messages
 * @property {string} stdout
 * @property {string} stderr
 */

/**
 * Run a program.
 *
 * @param {string} lang c, cpp, python, java, csharp, javascript, pascal or php
 * @param {string} code
 * @param {string} stdin
 * @param {number} [contextid] context of the page, the current page's by default
 * @returns {Promise<RunResult>}
 */
export const run = (lang, code, stdin = '', contextid = M.cfg.contextid) => Ajax.call([{
    methodname: 'tiny_codelab_run',
    args: {contextid, lang, code, stdin},
}])[0];
