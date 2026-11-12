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
 * marked, and a trace table of the values after each step. Every stop is recorded (tiny_codelab/timeline): Step back,
 * Step forward and a slider move along the run, also after the program ended, with the console as it was then.
 * As in the algorithm plugins.
 *
 * @module     tiny_codelab/debugpanel
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';
import {Timeline, outputLength, outputUpTo} from './timeline';

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
    'novariables', 'mainprogram', 'stepback', 'stepforward', 'stepagain', 'timeline', 'timelinepos', 'timelineend',
    'timelinepast', 'timelinepastended'];
let strings = null;

/** Most rows the trace table shows. */
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
     * @param {function(?number): void} [actions.mark] mark a line in the editor (null: none)
     * @param {function(): ?import('./terminal').Terminal} [actions.terminal] the console of the run
     * @param {function(): void} [actions.again] Step the program again with the same input
     */
    constructor(root, actions) {
        this.root = root;
        this.actions = actions;
        this.timeline = new Timeline();
        this.view = -1;
        this.ended = false;
        this.selected = 0;
        this.cut = null;
        this.auto = false;
        this.timer = null;
        this.delay = 600;
    }

    /**
     * A new run: no record, no automatic stepping.
     */
    reset() {
        this.stopAuto();
        this.showConsole(true);
        this.timeline.clear();
        this.view = -1;
        this.ended = false;
        this.root.replaceChildren();
        this.root.hidden = true;
    }

    /**
     * Positions of the slider: the stops, and after the end one more for the end of the program.
     *
     * @returns {number}
     */
    get positions() {
        return this.timeline.length + (this.ended ? 1 : 0);
    }

    /**
     * Whether an older stop is shown (Step moves forward in the record instead of running the program).
     *
     * @returns {boolean}
     */
    inPast() {
        return this.view >= 0 && this.view < this.positions - 1;
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
        const terminal = this.actions.terminal?.();
        const out = terminal ? outputLength(terminal.output) : 0;
        this.view = this.timeline.record({line, stack: stack.length ? stack : [{func: '', line, vars: {}}], out});
        this.selected = 0;
        this.render(s);
        if (this.auto) {
            this.timer = setTimeout(() => this.actions.step(), this.delay);
        }
    }

    /**
     * The program ended: the record stays, with one more position for the end.
     */
    async finish() {
        this.stopAuto();
        if (!this.timeline.length) {
            return;
        }
        const s = await loadPanelStrings();
        this.ended = true;
        this.view = this.positions - 1;
        this.selected = 0;
        this.render(s);
    }

    /**
     * The program runs on (no buttons until the next stop).
     */
    running() {
        if (this.inPast()) {
            // Continue from an older stop: back to the live console.
            this.view = this.timeline.length - 1;
            this.showConsole(true);
        }
        this.root.querySelectorAll('[data-action="next"], [data-action="out"], [data-action="back"]').forEach((b) => {
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
     * Show the stop at a position of the slider.
     *
     * @param {number} position
     */
    async goTo(position) {
        const s = await loadPanelStrings();
        this.view = Math.min(this.positions - 1, Math.max(0, position));
        this.selected = 0;
        this.render(s);
        if (this.auto) {
            if (this.inPast() || !this.ended) {
                this.timer = setTimeout(() => this.actions.step(), this.delay);
            } else {
                this.stopAuto();
                this.render(s);
            }
        }
    }

    /**
     * One stop forward in the record (while an older one is shown).
     */
    forward() {
        clearTimeout(this.timer);
        this.goTo(this.view + 1);
    }

    /**
     * Mark the line of the shown stop and show the console as it was then.
     */
    showView() {
        const atEnd = this.ended && this.view === this.timeline.length;
        const snap = this.timeline.get(Math.min(this.view, this.timeline.length - 1));
        this.actions.mark?.(atEnd || !snap ? null : snap.line);
        this.showConsole(this.inPast() ? snap?.out : true);
    }

    /**
     * The console: the live one, or a copy cut to the output of an older stop.
     *
     * @param {true|number} upto true for the live console, or the length of the output to show
     */
    showConsole(upto) {
        const terminal = this.actions.terminal?.();
        this.cut?.remove();
        this.cut = null;
        if (!terminal) {
            return;
        }
        const status = terminal.status;
        // The status line says that an earlier step is shown; the session's own status comes back (unless it changed).
        if (this.statusShown !== undefined && status.textContent === this.statusShown) {
            status.textContent = this.statusSaved;
        }
        this.statusShown = undefined;
        if (upto === true || upto === undefined) {
            terminal.output.hidden = false;
            return;
        }
        if (strings) {
            this.statusSaved = status.textContent;
            this.statusShown = (this.ended ? strings.timelinepastended : strings.timelinepast)
                .replace('{$a}', strings.timelinepos.replace('{$a->n}', String(this.timeline.get(this.view)?.step ?? this.view + 1))
                    .replace('{$a->m}', String(this.timeline.get(this.timeline.length - 1)?.step ?? this.timeline.length)));
            status.textContent = this.statusShown;
        }
        this.cut = outputUpTo(terminal.output, upto);
        this.cut.classList.add('tiny_codelab-console-past');
        terminal.output.hidden = true;
        terminal.output.after(this.cut);
    }

    /**
     * Draw the panel for the shown stop.
     *
     * @param {Object<string, string>} s strings
     */
    render(s) {
        const index = Math.min(this.view, this.timeline.length - 1);
        const snap = this.timeline.get(index);
        if (!snap) {
            return;
        }
        const stack = snap.stack;
        const live = !this.ended && !this.inPast();
        this.showView();
        this.root.replaceChildren();
        const controls = document.createElement('div');
        controls.className = 'tiny_codelab-debug-controls d-flex flex-wrap align-items-center gap-2 mb-2';
        const back = button(`◀ ${s.stepback}`, 'back');
        back.disabled = this.view <= 0;
        back.addEventListener('click', () => {
            this.stopAuto();
            this.goTo(this.view - 1);
        });
        controls.append(back);
        if (this.inPast()) {
            const fwd = button(`${s.stepforward} ▶`, 'forward');
            fwd.addEventListener('click', () => {
                this.stopAuto();
                this.forward();
            });
            controls.append(fwd);
        }
        if (!this.ended) {
            const over = button(s.stepover, 'next');
            over.disabled = !live;
            over.addEventListener('click', () => this.actions.next());
            const out = button(s.stepout, 'out');
            out.disabled = !live || stack.length < 2;
            out.addEventListener('click', () => this.actions.out());
            controls.append(over, out);
        }
        if (!this.ended || this.inPast()) {
            controls.append(this.autoButton(s));
        }
        if (this.ended && this.actions.again) {
            const again = button(s.stepagain, 'again');
            again.addEventListener('click', () => this.actions.again());
            controls.append(again);
        }
        this.root.append(controls, this.slider(s));

        const frames = this.view === this.timeline.length ? [] : stack;
        if (frames.length > 1) {
            const title = document.createElement('div');
            title.className = 'tiny_codelab-vars-title';
            title.textContent = s.callstack;
            const list = document.createElement('ol');
            list.className = 'tiny_codelab-callstack list-unstyled mb-2';
            frames.forEach((frame, i) => {
                const item = document.createElement('li');
                const link = document.createElement('button');
                link.type = 'button';
                link.className = 'btn btn-link btn-sm p-0' + (i === this.selected ? ' fw-bold' : '');
                link.textContent = (frame.func ? `${frame.func}()` : s.mainprogram) + (frame.line > 0 ? ` : ${frame.line}` : '');
                link.setAttribute('aria-current', i === this.selected ? 'true' : 'false');
                link.addEventListener('click', () => {
                    this.selected = i;
                    this.render(s);
                });
                item.append(link);
                list.append(item);
            });
            this.root.append(title, list);
        }

        const frame = stack[this.selected] || {func: '', vars: {}};
        const previous = this.selected === 0 && this.view < this.timeline.length ? this.timeline.varsAt(index - 1) : frame.vars;
        const vars = document.createElement('div');
        showVariables(vars, frame.vars, previous,
            frame.func && frame.func !== '<module>' ? `${s.variables}: ${frame.func}()` : s.variables, s.novariables);
        this.root.append(vars);
        if (this.timeline.length > 1) {
            this.root.append(this.traceTable(s, index));
        }
        this.root.hidden = false;
    }

    /**
     * Auto step: through the record while an older stop is shown, then on with the program.
     *
     * @param {Object<string, string>} s strings
     * @returns {HTMLButtonElement}
     */
    autoButton(s) {
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
        const group = document.createElement('span');
        group.className = 'd-inline-flex align-items-center gap-2';
        group.append(auto, speedLabel);
        return group;
    }

    /**
     * The slider over the record: "Step N of M", and the end of the program after it ended.
     *
     * @param {Object<string, string>} s strings
     * @returns {HTMLElement}
     */
    slider(s) {
        const wrap = document.createElement('label');
        wrap.className = 'tiny_codelab-timeline d-flex align-items-center gap-2 mb-2 small';
        const range = document.createElement('input');
        range.type = 'range';
        range.className = 'form-range tiny_codelab-timeline-range';
        range.min = '1';
        range.max = String(Math.max(1, this.positions));
        range.value = String(this.view + 1);
        range.disabled = this.positions < 2 || (!this.ended && !this.inPast() && this.timeline.length < 2);
        range.setAttribute('aria-label', s.timeline);
        const text = document.createElement('span');
        text.className = 'tiny_codelab-timeline-pos';
        const label = (position) => (this.ended && position === this.timeline.length ? s.timelineend
            : s.timelinepos.replace('{$a->n}', String(this.timeline.get(position)?.step ?? position + 1))
                .replace('{$a->m}', String(this.timeline.get(this.timeline.length - 1)?.step ?? this.timeline.length)));
        text.textContent = label(this.view);
        range.setAttribute('aria-valuetext', text.textContent);
        range.addEventListener('input', () => {
            this.stopAuto();
            text.textContent = label(Number(range.value) - 1);
            this.goTo(Number(range.value) - 1);
        });
        wrap.append(range, text);
        return wrap;
    }

    /**
     * The trace table: line and variables after each step; the row of the shown stop is marked.
     *
     * @param {Object<string, string>} s strings
     * @param {number} current index of the shown stop
     * @returns {HTMLDetailsElement}
     */
    traceTable(s, current) {
        const details = document.createElement('details');
        details.className = 'tiny_codelab-trace mt-2';
        details.open = this.traceOpen ?? false;
        details.addEventListener('toggle', () => {
            this.traceOpen = details.open;
        });
        const rows = this.timeline.items.slice(0, MAX_TRACE);
        const summary = document.createElement('summary');
        summary.textContent = `${s.tracetable} (${this.timeline.length})`;
        const names = [...new Set(rows.flatMap((row) => Object.keys(row.stack[0]?.vars || {})))];
        const table = document.createElement('table');
        table.className = 'tiny_codelab-vars-table tiny_codelab-trace-table';
        const head = table.createTHead().insertRow();
        ['#', s.traceline, ...names].forEach((name) => {
            const th = document.createElement('th');
            th.textContent = name;
            head.append(th);
        });
        const body = table.createTBody();
        rows.forEach((row, i) => {
            const tr = body.insertRow();
            const vars = row.stack[0]?.vars || {};
            const before = i > 0 ? rows[i - 1].stack[0]?.vars || {} : null;
            if (i === current) {
                tr.className = 'tiny_codelab-trace-current';
                tr.setAttribute('aria-current', 'step');
            }
            const number = tr.insertCell();
            const link = document.createElement('button');
            link.type = 'button';
            link.className = 'btn btn-link btn-sm p-0';
            link.textContent = String(row.step);
            link.addEventListener('click', () => {
                this.stopAuto();
                this.goTo(i);
            });
            number.append(link);
            tr.insertCell().textContent = `${row.line}`;
            names.forEach((name) => {
                const td = tr.insertCell();
                td.textContent = vars[name] ?? '';
                if (before && vars[name] !== before[name] && vars[name] !== undefined) {
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
