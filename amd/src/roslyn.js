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
 * Typing help for C# from Roslyn on the CodeLab runner (runner 0.22.0 or newer): completion of the real members of
 * every type, signatures of calls, tooltips with the documentation of .NET and errors of the compiler while typing. The
 * program is checked as C# 7.3 against the .NET Framework that Mono runs, as the runner and Jobe compile it.
 *
 * Moodle gives a token for one connection (tiny_codelab_analysis); the connection is opened when a reader first types
 * in a C# editor and is shared by all editors of the page. When the runner has no language service, or does not answer
 * in time, the editor keeps the typing help of level 1 (tiny_codelab/intellisense).
 *
 * @module     tiny_codelab/roslyn
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';

/** Longest wait for an answer, in milliseconds (errors take longer: the whole program is compiled). */
const TIMEOUT = 4000;

/** Cultures of the compiler's messages that Roslyn has, by the language of Moodle. */
const CULTURES = {
    cs: 'cs', de: 'de', es: 'es', fr: 'fr', it: 'it', ja: 'ja', ko: 'ko', pl: 'pl', ru: 'ru', tr: 'tr',
    'pt-br': 'pt-BR', 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant',
};

/** @type {?WebSocket} */
let socket = null;
/** @type {?Promise<?WebSocket>} */
let opening = null;
let disabled = false;
let failures = 0;
let next = 0;
/** @type {Map<number, function(?Object): void>} */
const pending = new Map();

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
 * Whether the language service may still be asked on this page.
 *
 * @returns {boolean}
 */
export const enabled = () => !disabled && typeof WebSocket === 'function';

/**
 * Open the connection, or give the open one.
 *
 * @returns {Promise<?WebSocket>}
 */
const connect = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return Promise.resolve(socket);
    }
    if (opening) {
        return opening;
    }
    opening = (async() => {
        let grant;
        try {
            grant = await Ajax.call([{methodname: 'tiny_codelab_analysis',
                args: {contextid: M.cfg.contextid, lang: 'csharp'}}])[0];
        } catch (e) {
            disabled = true;
            return null;
        }
        if (grant.status !== 'ok') {
            disabled = true;
            return null;
        }
        return new Promise((resolve) => {
            const ws = new WebSocket(`${grant.url}?token=${encodeURIComponent(grant.token)}`);
            let open = false;
            ws.onopen = () => {
                open = true;
                failures = 0;
                socket = ws;
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
                if (!open && ++failures >= 3) {
                    // The runner has no language service (an older runner answers 404): level 1 stays.
                    disabled = true;
                }
                if (socket === ws) {
                    socket = null;
                }
                pending.forEach((done) => done(null));
                pending.clear();
                resolve(null);
            };
        });
    })().finally(() => {
        opening = null;
    });
    return opening;
};

/**
 * Ask the language service.
 *
 * @param {Object} request op, code, files, line, column, item
 * @returns {Promise<?Object>} null when there is no answer in time
 */
const ask = async(request) => {
    if (!enabled()) {
        return null;
    }
    const ws = await connect();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return null;
    }
    const id = ++next;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            resolve(null);
        }, request.op === 'diagnostics' ? TIMEOUT * 2 : TIMEOUT);
        pending.set(id, (answer) => {
            clearTimeout(timer);
            resolve(answer);
        });
        ws.send(JSON.stringify(Object.assign({id, culture: culture()}, request)));
    });
};

/**
 * The C# files of the example that are not shown (tabs of tiny_codelab/filetabs).
 *
 * @param {Object} model
 * @returns {Array<{name: string, code: string}>}
 */
export const filesOf = (model) => {
    const companions = model.codelab?.companions;
    return typeof companions === 'function'
        ? companions().filter((f) => /\.cs$/i.test(f.name) && typeof f.code === 'string') : [];
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
export const complete = async(model, position) => (await ask(Object.assign({op: 'complete'}, at(model, position))))?.items
    ?? null;

/**
 * The description of one completion (its declaration and documentation).
 *
 * @param {Object} model
 * @param {Object} position where the completions were asked
 * @param {string} item label of the completion
 * @returns {Promise<?{text: string, doc: string}>} the declaration and its documentation
 */
export const describe = (model, position, item) => ask(Object.assign({op: 'describe', item}, at(model, position)));

/**
 * The signatures of the call at a position.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?{signatures: Array, active: number, parameter: number}>}
 */
export const signatures = (model, position) => ask(Object.assign({op: 'signatures'}, at(model, position)));

/**
 * The tooltip at a position.
 *
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?{markdown: string[], line: number, column: number, endLine: number, endColumn: number}>}
 */
export const hover = (model, position) => ask(Object.assign({op: 'hover'}, at(model, position)));

/**
 * The errors and warnings of the compiler in the shown file.
 *
 * @param {Object} model
 * @returns {Promise<?Array<{file: string, severity: string, code: string, message: string, line: number,
 *     column: number, endLine: number, endColumn: number}>>}
 */
export const diagnostics = async(model) => {
    const answer = await ask({op: 'diagnostics', code: model.getValue(), files: filesOf(model)});
    return answer ? answer.items.filter((d) => d.file === 'Program.cs') : null;
};
