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
 * AI help in the console: when a run ends with a compiler message or an error, a button asks the AI of the site
 * (tiny_codelab_ai_hint) to explain it. The answer is plain text under the button; it explains and points to the
 * place, never gives the corrected program. The AI policy of Moodle is accepted first when the user has not done it.
 *
 * @module     tiny_codelab/aihint
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';
import CustomEvents from 'core/custom_interaction_events';
import PolicyModal from 'core_ai/policymodal';
import {getStrings} from 'core/str';
import {component} from './common';

const KEYS = ['aihint', 'aihintasking', 'aihintnote'];
let strings = null;

/** Status classes of the console that end a run with an error worth explaining. */
const ERRORS = /tiny_codelab-status-(compile|runtime|time|memory|error)\b/;

/** Longest console text sent. */
const MAX_PROBLEM = 3000;

const para = (cls, text) => {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    return p;
};

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
 * What the console shows, for the AI: the status, the compiler messages and the errors (the end of a long text).
 *
 * @param {HTMLElement} panel
 * @returns {string}
 */
export const consoleText = (panel) => {
    const parts = [...panel.querySelectorAll('.tiny_codelab-console-status, .tiny_codelab-console-compile, ' +
        '.tiny_codelab-console-error, .tiny_codelab-console-output, .tiny_codelab-terminal')]
        .filter((e) => !e.closest('.tiny_codelab-aihint'))
        .map((e) => e.textContent.trim()).filter(Boolean);
    const text = parts.join('\n');
    return text.length > MAX_PROBLEM ? text.slice(text.length - MAX_PROBLEM) : text;
};

/**
 * Ask the AI and show the answer in a box.
 *
 * @param {Object} args
 * @param {number} args.contextid
 * @param {string} args.lang language of the program
 * @param {string} args.code
 * @param {string} args.problem
 * @param {HTMLElement} args.box
 * @returns {Promise<void>}
 */
export const ask = async({contextid, lang, code, problem, box}) => {
    const s = await loadStrings();
    box.replaceChildren(para('tiny_codelab-aihint-wait', s.aihintasking));
    try {
        const result = await Ajax.call([{methodname: 'tiny_codelab_ai_hint', args: {contextid, lang, code, problem}}])[0];
        const text = document.createElement('div');
        text.className = 'tiny_codelab-aihint-text';
        text.textContent = result.text;
        box.replaceChildren(para('tiny_codelab-aihint-note', s.aihintnote), text);
    } catch (e) {
        if (e && e.errorcode === 'aihintpolicy') {
            // The AI policy of the site: accepted once, then the question is asked again.
            box.replaceChildren();
            const modal = await PolicyModal.create();
            modal.getModal().on(CustomEvents.events.activate, modal.getActionSelector('save'), () => {
                ask({contextid, lang, code, problem, box});
            });
            return;
        }
        box.replaceChildren(para('tiny_codelab-aihint-error', (e && e.message) || String(e)));
    }
};

/**
 * Watch a console: after each run that ends with an error, offer the AI button under it.
 *
 * @param {HTMLElement} panel the console panel (emptied by each run)
 * @param {Object} options
 * @param {number} options.contextid the page
 * @param {function(): string} options.lang language of the program
 * @param {function(): string} options.code the program
 */
export const watchErrors = (panel, {contextid, lang, code}) => {
    const offer = async() => {
        const status = panel.querySelector('.tiny_codelab-console-status');
        if (!status || !ERRORS.test(status.className) || panel.querySelector('.tiny_codelab-aihint')) {
            return;
        }
        const s = await loadStrings();
        if (panel.querySelector('.tiny_codelab-aihint')) {
            return;
        }
        const wrap = document.createElement('div');
        wrap.className = 'tiny_codelab-aihint mt-2';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-secondary btn-sm';
        button.dataset.action = 'aihint';
        button.textContent = s.aihint;
        const box = document.createElement('div');
        box.className = 'tiny_codelab-aihint-box';
        box.setAttribute('aria-live', 'polite');
        button.addEventListener('click', async() => {
            button.disabled = true;
            try {
                await ask({contextid, lang: lang(), code: code(), problem: consoleText(panel), box});
            } finally {
                button.disabled = false;
            }
        });
        wrap.append(button, box);
        panel.append(wrap);
    };
    new MutationObserver(() => offer()).observe(panel, {childList: true, subtree: true, attributes: true,
        attributeFilter: ['class']});
};
