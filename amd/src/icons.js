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
 * Small icons of the tool buttons (full screen, restore, copy, theme), so a toolbar fits one row on a phone.
 * The text of a button is in its title and aria-label.
 *
 * @module     tiny_codelab/icons
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const PATHS = {
    fullscreen: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4',
    exitfullscreen: 'M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4',
    reset: 'M3 8a5 5 0 1 0 1.5-3.55M3 2.5v2.5h2.5',
    copy: 'M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3',
    copied: 'M3 8.5l3 3 7-7',
    theme: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 2v12',
    // Panels below or beside the code (tiny_codelab/layout), as the panel position of VS Code.
    panelbottom: 'M2 3h12v10H2zM2 9.5h12',
    panelside: 'M2 3h12v10H2zM9.5 3v10',
};

/**
 * Put an icon in a button and name the button.
 *
 * @param {HTMLButtonElement} button
 * @param {string} name fullscreen, exitfullscreen, reset, copy, copied, theme, panelbottom or panelside
 * @param {string} label what the button does (title and aria-label)
 * @returns {HTMLButtonElement} the button
 */
export const setIcon = (button, name, label) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const path = document.createElementNS(NS, 'path');
    const attrs = [[svg, {viewBox: '0 0 16 16', width: '14', height: '14', 'aria-hidden': 'true', focusable: 'false'}],
        [path, {d: PATHS[name], fill: name === 'theme' ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': '1.6',
            'stroke-linecap': 'round', 'stroke-linejoin': 'round'}]];
    attrs.forEach(([e, list]) => Object.entries(list).forEach(([k, v]) => e.setAttribute(k, v)));
    if (name === 'theme') {
        path.setAttribute('fill-opacity', '.35');
    }
    svg.append(path);
    button.replaceChildren(svg);
    button.title = label;
    button.setAttribute('aria-label', label);
    button.classList.add('tiny_codelab-icon-button');
    return button;
};
