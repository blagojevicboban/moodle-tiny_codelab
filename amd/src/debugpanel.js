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
 * The debugger panel of a Step run (Python in the browser, C and C++ on the CodeLab runner): Step over, Step out and
 * automatic stepping with a speed, the call stack (a frame shows its variables), the variables with the changed ones
 * marked, and a trace table of the values after each step. As in the algorithm plugins.
 *
 * @module     tiny_codelab/debugpanel
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';

/**
 * Show variables in a panel; values changed since the last step are marked.
 *
 * @param {HTMLElement} panel
 * @param {Object<string, string>} vars name => value
 * @param {Object<string, string>} previous the variables of the last step
 * @param {string} title
 * @param {string} empty text when there are none
 */
export const showVariables = (panel, vars, previous, title, empty) => {
    const names = Object.keys(vars);
    panel.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'tiny_codelab-vars-title';
    heading.textContent = title;
    panel.append(heading);
    if (!names.length) {
        const none = document.createElement('div');
        none.className = 'tiny_codelab-vars-empty';
        none.textContent = empty;
        panel.append(none);
    } else {
        const table = document.createElement('table');
        table.className = 'tiny_codelab-vars-table';
        names.forEach((name) => {
            const row = table.insertRow();
            row.className = previous[name] !== vars[name] ? 'tiny_codelab-vars-changed' : '';
            row.insertCell().textContent = name;
            row.insertCell().textContent = vars[name];
        });
        panel.append(table);
    }
    panel.hidden = false;
};

const KEYS = ['stepover', 'stepout', 'autostep', 'autostop', 'speed', 'callstack', 'tracetable', 'traceline', 'variables',
    'novariables', 'mainprogram'];
let strings = null;

/** Most rows the trace table keeps. */
const MAX_TRACE = 500;

/**
 * Strings, loaded once.
 *
 * @returns {Promise<Object<string, string>>}
 */
export const loadPanelStrings = async() => {
    if (!strings) {
        const values = await getStrings(KEYS.map((key) => ({key, component})));
        strings = Object.fromEntries(KEYS.map((key, i) => [key, values[i]]));
    }
    return strings;
};

/**
 * A small button.
 *
 * @param {string} text
 * @param {string} action
 * @returns {HTMLButtonElement}
 */
const button = (text, action) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline-secondary btn-sm';
    b.dataset.action = action;
    b.textContent = text;
    return b;
};

export class DebugPanel {
    /**
     * The panel in an element (the variables panel of the run).
     *
     * @param {HTMLElement} root
     * @param {Object} actions
     * @param {function(): void} actions.step one line, into calls
     * @param {function(): void} actions.next one line, over calls
     * @param {function(): void} actions.out to the end of the function
     */
    constructor(root, actions) {
        this.root = root;
        this.actions = actions;
        this.trace = [];
        this.previous = {};
        this.auto = false;
        this.timer = null;
        this.delay = 600;
    }

    /**
     * A new run: no trace, no automatic stepping.
     */
    reset() {
        this.stopAuto();
        this.trace = [];
        this.previous = {};
        this.root.replaceChildren();
        this.root.hidden = true;
    }

    /**
     * The program stopped before a line.
     *
     * @param {Object} pause
     * @param {number} pause.line line in the editor
     * @param {Array<{func: string, line: number, vars: Object<string, string>}>} pause.stack frames, innermost first,
     *     lines in the editor (0 for a line of the hidden code)
     */
    async show({line, stack}) {
        const s = await loadPanelStrings();
        const top = stack[0] || {func: '', line, vars: {}};
        if (this.trace.length < MAX_TRACE) {
            this.trace.push({line, func: top.func, vars: top.vars});
        }
        this.render(s, stack, 0);
        this.previous = top.vars;
        if (this.auto) {
            this.timer = setTimeout(() => this.actions.step(), this.delay);
        }
    }

    /**
     * The program runs on (no buttons until the next stop).
     */
    running() {
        this.root.querySelectorAll('[data-action="next"], [data-action="out"]').forEach((b) => {
            b.disabled = true;
        });
    }

    /**
     * Stop automatic stepping.
     */
    stopAuto() {
        clearTimeout(this.timer);
        this.timer = null;
        this.auto = false;
    }

    /**
     * Draw the panel.
     *
     * @param {Object<string, string>} s strings
     * @param {Array} stack
     * @param {number} selected index of the frame whose variables are shown
     */
    render(s, stack, selected) {
        this.root.replaceChildren();
        const controls = document.createElement('div');
        controls.className = 'tiny_codelab-debug-controls d-flex flex-wrap align-items-center gap-2 mb-2';
        const over = button(s.stepover, 'next');
        over.addEventListener('click', () => this.actions.next());
        const out = button(s.stepout, 'out');
        out.disabled = stack.length < 2;
        out.addEventListener('click', () => this.actions.out());
        const auto = button(this.auto ? s.autostop : s.autostep, 'auto');
        auto.setAttribute('aria-pressed', this.auto ? 'true' : 'false');
        auto.addEventListener('click', () => {
            if (this.auto) {
                this.stopAuto();
                auto.textContent = s.autostep;
                auto.setAttribute('aria-pressed', 'false');
            } else {
                this.auto = true;
                auto.textContent = s.autostop;
                auto.setAttribute('aria-pressed', 'true');
                this.actions.step();
            }
        });
        const speedLabel = document.createElement('label');
        speedLabel.className = 'd-flex align-items-center gap-1 mb-0 small';
        const speed = document.createElement('input');
        speed.type = 'range';
        speed.min = '100';
        speed.max = '1500';
        speed.step = '100';
        // Right is faster.
        speed.value = String(1600 - this.delay);
        speed.addEventListener('input', () => {
            this.delay = 1600 - Number(speed.value);
        });
        speedLabel.append(s.speed, speed);
        controls.append(over, out, auto, speedLabel);
        this.root.append(controls);

        if (stack.length > 1) {
            const title = document.createElement('div');
            title.className = 'tiny_codelab-vars-title';
            title.textContent = s.callstack;
            const list = document.createElement('ol');
            list.className = 'tiny_codelab-callstack list-unstyled mb-2';
            stack.forEach((frame, i) => {
                const item = document.createElement('li');
                const link = document.createElement('button');
                link.type = 'button';
                link.className = 'btn btn-link btn-sm p-0' + (i === selected ? ' fw-bold' : '');
                link.textContent = (frame.func ? `${frame.func}()` : s.mainprogram) + (frame.line > 0 ? ` : ${frame.line}` : '');
                link.setAttribute('aria-current', i === selected ? 'true' : 'false');
                link.addEventListener('click', () => this.render(s, stack, i));
                item.append(link);
                list.append(item);
            });
            this.root.append(title, list);
        }

        const frame = stack[selected] || {func: '', vars: {}};
        const vars = document.createElement('div');
        showVariables(vars, frame.vars, selected === 0 ? this.previous : frame.vars,
            frame.func && frame.func !== '<module>' ? `${s.variables}: ${frame.func}()` : s.variables, s.novariables);
        this.root.append(vars);
        if (this.trace.length > 1) {
            this.root.append(this.traceTable(s));
        }
        this.root.hidden = false;
    }

    /**
     * The trace table: line and variables after each step.
     *
     * @param {Object<string, string>} s strings
     * @returns {HTMLDetailsElement}
     */
    traceTable(s) {
        const details = document.createElement('details');
        details.className = 'tiny_codelab-trace mt-2';
        details.open = this.traceOpen ?? false;
        details.addEventListener('toggle', () => {
            this.traceOpen = details.open;
        });
        const summary = document.createElement('summary');
        summary.textContent = `${s.tracetable} (${this.trace.length})`;
        const names = [...new Set(this.trace.flatMap((row) => Object.keys(row.vars)))];
        const table = document.createElement('table');
        table.className = 'tiny_codelab-vars-table tiny_codelab-trace-table';
        const head = table.createTHead().insertRow();
        ['#', s.traceline, ...names].forEach((name) => {
            const th = document.createElement('th');
            th.textContent = name;
            head.append(th);
        });
        const body = table.createTBody();
        this.trace.forEach((row, i) => {
            const tr = body.insertRow();
            tr.insertCell().textContent = String(i + 1);
            tr.insertCell().textContent = `${row.line}`;
            names.forEach((name) => {
                const td = tr.insertCell();
                td.textContent = row.vars[name] ?? '';
                if (i > 0 && row.vars[name] !== this.trace[i - 1].vars[name] && row.vars[name] !== undefined) {
                    td.className = 'tiny_codelab-vars-changed';
                }
            });
        });
        const scroll = document.createElement('div');
        scroll.className = 'tiny_codelab-trace-scroll';
        scroll.append(table);
        details.append(summary, scroll);
        return details;
    }
}
