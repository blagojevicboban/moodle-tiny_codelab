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
 * Full screen for a code editor with its console: through the browser when it can, otherwise by covering the window.
 * Escape (or the button) goes back. As in the algorithm plugins.
 *
 * @module     tiny_codelab/fullscreen
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const ON = 'tiny_codelab-fullscreen';

/**
 * A button that shows an element (editor, buttons and console) on the whole screen.
 *
 * @param {Object} options
 * @param {HTMLElement} options.root the element shown on the whole screen
 * @param {import('./monaco').CodeEditor} options.editor its editor, which then takes most of the height
 * @param {string} options.label text of the button
 * @param {string} options.exitLabel text of the button on the whole screen
 * @param {string} [options.className] classes of the button
 * @returns {HTMLButtonElement}
 */
export const fullscreenButton = ({root, editor, label, exitLabel, className = 'btn btn-secondary btn-sm'}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${className} tiny_codelab-fullscreen-button`;
    button.dataset.action = 'fullscreen';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = label;

    const apply = (on) => {
        root.classList.toggle(ON, on);
        button.textContent = on ? exitLabel : label;
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        // On the whole screen the editor gets most of the height; the console stays below it.
        editor.setFixedHeight(on ? Math.max(200, Math.round(window.innerHeight * 0.6)) : null);
        if (on) {
            editor.focus();
        }
    };
    button.addEventListener('click', () => {
        const on = !root.classList.contains(ON);
        if (on && root.requestFullscreen) {
            root.requestFullscreen().catch(() => null);
        } else if (!on && document.fullscreenElement === root) {
            document.exitFullscreen().catch(() => null);
        }
        apply(on);
    });
    // The browser's own way out (Escape, F11) ends ours too.
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && root.classList.contains(ON)) {
            apply(false);
        }
    });
    // Covering the window (no browser full screen): Escape goes back.
    root.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root.classList.contains(ON) && !document.fullscreenElement) {
            apply(false);
        }
    });
    window.addEventListener('resize', () => {
        if (root.classList.contains(ON)) {
            editor.setFixedHeight(Math.max(200, Math.round(window.innerHeight * 0.6)));
        }
    });
    return button;
};
