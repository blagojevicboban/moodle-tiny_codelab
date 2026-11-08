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
 * An interactive console for programs that run in the browser: the output as it is written, and a line to type the
 * input when the program asks for it.
 *
 * @module     tiny_codelab/terminal
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export class Terminal {
    /**
     * Console in a panel (the panel of tiny_codelab/console, cleared).
     *
     * @param {HTMLElement} panel
     * @param {string} inputLabel accessible name of the input line
     * @param {string} [okLabel] name of the button that sends the line (phone keyboards often have no Enter key)
     */
    constructor(panel, inputLabel, okLabel = '') {
        this.panel = panel;
        this.inputLabel = inputLabel;
        this.okLabel = okLabel;
        this.field = null;
        this.clear();
    }

    /**
     * Empty the console.
     */
    clear() {
        this.panel.replaceChildren();
        this.status = document.createElement('div');
        this.status.className = 'tiny_codelab-console-status tiny_codelab-status-running';
        this.output = document.createElement('pre');
        this.output.className = 'tiny_codelab-console-output tiny_codelab-terminal';
        this.panel.append(this.status, this.output);
        this.panel.hidden = false;
    }

    /**
     * Status line above the output.
     *
     * @param {string} text
     * @param {string} kind running, ok or error
     */
    setStatus(text, kind) {
        this.status.textContent = text;
        this.status.className = `tiny_codelab-console-status tiny_codelab-status-${kind}`;
    }

    /**
     * Add output.
     *
     * @param {string} text
     * @param {string} stream out or err
     */
    write(text, stream = 'out') {
        if (stream === 'err') {
            const span = document.createElement('span');
            span.className = 'tiny_codelab-console-error';
            span.textContent = text;
            this.output.append(span);
        } else {
            this.output.append(document.createTextNode(text));
        }
        this.panel.scrollTop = this.panel.scrollHeight;
    }

    /**
     * Ask the reader for one line of input, typed at the end of the output.
     *
     * @param {string} [eofLabel] when given, Ctrl+D or a button with this text ends the input (the promise gives null)
     * @returns {Promise<string|null>} the line (it is also echoed to the output), or null at the end of the input
     */
    ask(eofLabel = '') {
        this.cancelAsk();
        return new Promise((resolve) => {
            const field = document.createElement('input');
            field.type = 'text';
            field.className = 'tiny_codelab-terminal-input';
            field.setAttribute('aria-label', this.inputLabel);
            field.autocomplete = 'off';
            field.spellcheck = false;
            field.setAttribute('enterkeyhint', 'send');
            field.setAttribute('autocapitalize', 'off');
            field.setAttribute('autocorrect', 'off');
            // In a small form, so the Go / Send key of a phone keyboard sends the line (it often sends no Enter key);
            // the submit never reaches a form around the console (a quiz page).
            const form = document.createElement('form');
            form.className = 'tiny_codelab-terminal-form';
            form.noValidate = true;
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                done(field.value);
            });
            const done = (value) => {
                this.cancelAsk();
                if (value !== null) {
                    this.write(value + '\n');
                }
                resolve(value);
            };
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    done(field.value);
                } else if (eofLabel && e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
                    e.preventDefault();
                    done(null);
                }
            });
            this.field = field;
            this.form = form;
            form.append(field);
            if (this.okLabel) {
                const ok = document.createElement('button');
                ok.type = 'submit';
                ok.className = 'btn btn-primary btn-sm tiny_codelab-terminal-ok';
                ok.textContent = '✓';
                ok.title = this.okLabel;
                ok.setAttribute('aria-label', this.okLabel);
                form.append(ok);
            }
            this.output.append(form);
            if (eofLabel) {
                const eof = document.createElement('button');
                eof.type = 'button';
                eof.className = 'btn btn-link btn-sm tiny_codelab-terminal-eof';
                eof.textContent = eofLabel;
                eof.addEventListener('click', () => done(null));
                this.eofButton = eof;
                this.output.append(eof);
            }
            field.focus({preventScroll: true});
            this.panel.scrollTop = this.panel.scrollHeight;
        });
    }

    /**
     * Remove a pending input line (the program was stopped).
     */
    cancelAsk() {
        if (this.form) {
            this.form.remove();
            this.form = null;
        }
        this.field = null;
        if (this.eofButton) {
            this.eofButton.remove();
            this.eofButton = null;
        }
    }
}
