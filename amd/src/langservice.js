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
 * Typing help for C# and Java from the language services of the CodeLab runner: completion of the real members of
 * every type, signatures of calls, tooltips with the documentation of the library, and the errors of the compiler while
 * typing. C# is checked by Roslyn (runner 0.22.0 or newer) as C# 7.3 against the .NET Framework that Mono runs; Java
 * by the compiler of the runner's JDK (runner 0.23.0 or newer), with the Javadoc of the JDK.
 *
 * Moodle gives a token for one connection (tiny_codelab_analysis); a connection per language is opened when a reader
 * first types in such an editor, or points at its code, and is shared by all editors of the page. When the runner has
 * no service for the language, or does not answer in time, the editor keeps the typing help of level 1
 * (tiny_codelab/intellisense).
 *
 * @module     tiny_codelab/langservice
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';

/** Longest wait for an answer, in milliseconds (errors take longer: the whole program is compiled). */
const TIMEOUT = 4000;

/** The languages with a service (Monaco language ids), and the extension of their other files. */
export const SERVED = {csharp: /\.cs$/i, java: /\.java$/i};

/** Cultures of the compiler's messages, by the language of Moodle (Roslyn has these; javac fewer, else English). */
const CULTURES = {
    cs: 'cs', de: 'de', es: 'es', fr: 'fr', it: 'it', ja: 'ja', ko: 'ko', pl: 'pl', ru: 'ru', tr: 'tr',
    'pt-br': 'pt-BR', 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant',
};

/**
 * The state of the connection of one language.
 *
 * @typedef {Object} Connection
 * @property {?WebSocket} socket
 * @property {?Promise<?WebSocket>} opening
 * @property {boolean} disabled
 * @property {number} failures
 */

/** @type {Object<string, Connection>} */
const connections = {};
let next = 0;
/** @type {Map<number, function(?Object): void>} */
const pending = new Map();

/**
 * The connection state of a language.
 *
 * @param {string} lang
 * @returns {Connection}
 */
const state = (lang) => {
    connections[lang] = connections[lang] || {socket: null, opening: null, disabled: false, failures: 0};
    return connections[lang];
};

/**
 * The culture of the compiler's messages for the language of the page ('' for English).
 *
 * @returns {string}
 */
export const culture = () => {
    const lang = (document.documentElement.lang || '').toLowerCase().replace('_', '-');
    return CULTURES[lang] || CULTURES[lang.split('-')[0]] || '';
};

/**
 * Whether the service of a language may still be asked on this page.
 *
 * @param {string} lang Monaco language id
 * @returns {boolean}
 */
export const enabled = (lang) => Object.prototype.hasOwnProperty.call(SERVED, lang) && !state(lang).disabled
    && typeof WebSocket === 'function';

/**
 * Open the connection of a language, or give the open one.
 *
 * @param {string} lang
 * @returns {Promise<?WebSocket>}
 */
const connect = (lang) => {
    const c = state(lang);
    if (c.socket && c.socket.readyState === WebSocket.OPEN) {
        return Promise.resolve(c.socket);
    }
    if (c.opening) {
        return c.opening;
    }
    c.opening = (async() => {
        let grant;
        try {
            grant = await Ajax.call([{methodname: 'tiny_codelab_analysis', args: {contextid: M.cfg.contextid, lang}}])[0];
        } catch (e) {
            c.disabled = true;
            return null;
        }
        if (grant.status !== 'ok') {
            c.disabled = true;
            return null;
        }
        return new Promise((resolve) => {
            const ws = new WebSocket(`${grant.url}?token=${encodeURIComponent(grant.token)}`);
            let open = false;
            ws.onopen = () => {
                open = true;
                c.failures = 0;
                c.socket = ws;
                resolve(ws);
            };
            ws.onmessage = (event) => {
                let answer;
                try {
                    answer = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                const done = pending.get(answer.id);
                if (done) {
                    pending.delete(answer.id);
                    done(answer.error || answer.busy ? null : answer);
                }
            };
            ws.onclose = () => {
                if (!open && ++c.failures >= 3) {
                    // The runner has no service for this language (an older runner): level 1 stays.
                    c.disabled = true;
                }
                if (c.socket === ws) {
                    c.socket = null;
                }
                resolve(null);
            };
        });
    })().finally(() => {
        c.opening = null;
    });
    return c.opening;
};

/**
 * Ask the service of the model's language.
 *
 * @param {Object} model
 * @param {Object} request op, code, files, line, column, item
 * @returns {Promise<?Object>} null when there is no answer in time
 */
const ask = async(model, request) => {
    const lang = model.getLanguageId();
    if (!enabled(lang)) {
        return null;
    }
    const ws = await connect(lang);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return null;
    }
    const id = ++next;
    return new Promise((resolve) => {
        const finish = (answer) => {
            clearTimeout(timer);
            ws.removeEventListener('close', closed);
            resolve(answer);
        };
        const closed = () => {
            pending.delete(id);
            finish(null);
        };
        const timer = setTimeout(closed, request.op === 'diagnostics' ? TIMEOUT * 2 : TIMEOUT);
        ws.addEventListener('close', closed);
        pending.set(id, finish);
        ws.send(JSON.stringify(Object.assign({id, culture: culture()}, request)));
    });
};

/**
 * The files of the example in the model's language that are not shown (tabs of tiny_codelab/filetabs).
 *
 * @param {Object} model
 * @returns {Array<{name: string, code: string}>}
 */
export const filesOf = (model) => {
    const companions = model.codelab?.companions;
    const extension = SERVED[model.getLanguageId()];
    return typeof companions === 'function' && extension
        ? companions().filter((f) => extension.test(f.name) && typeof f.code === 'string') : [];
};

/**
 * What every request about a position carries.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Object}
 */
const at = (model, position) => ({code: model.getValue(), files: filesOf(model), line: position.lineNumber,
    column: position.column});

/**
 * Completions at a position.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?Array<{label: string, insert: string, kind: string, filter: string, sort: string, detail: string}>>}
 */
export const complete = async(model, position) =>
    (await ask(model, Object.assign({op: 'complete'}, at(model, position))))?.items ?? null;

/**
 * The description of one completion (its declaration and documentation).
 *
 * @param {Object} model
 * @param {Object} position where the completions were asked
 * @param {string} item label of the completion
 * @returns {Promise<?{text: string, doc: string}>}
 */
export const describe = (model, position, item) => ask(model, Object.assign({op: 'describe', item}, at(model, position)));

/**
 * The signatures of the call at a position.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?{signatures: Array, active: number, parameter: number}>}
 */
export const signatures = (model, position) => ask(model, Object.assign({op: 'signatures'}, at(model, position)));

/**
 * The tooltip at a position.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?{markdown: string[], line: number, column: number, endLine: number, endColumn: number}>}
 */
export const hover = (model, position) => ask(model, Object.assign({op: 'hover'}, at(model, position)));

/**
 * The errors and warnings of the compiler in the shown file.
 *
 * @param {Object} model
 * @returns {Promise<?Array<{file: string, severity: string, code: string, message: string, line: number,
 *     column: number, endLine: number, endColumn: number}>>}
 */
export const diagnostics = async(model) => {
    const answer = await ask(model, {op: 'diagnostics', code: model.getValue(), files: filesOf(model)});
    if (!answer) {
        return null;
    }
    // Roslyn names the shown file Program.cs; the Java service after its public class.
    const main = answer.main || 'Program.cs';
    return answer.items.filter((d) => d.file === main);
};
