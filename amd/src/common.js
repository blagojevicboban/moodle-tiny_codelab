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
 * Common values for tiny_codelab.
 *
 * @module     tiny_codelab/common
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export const component = 'tiny_codelab';
export const pluginName = `${component}/plugin`;
export const buttonName = component;
export const menuItemName = component;
export const icon = `${component}_icon`;

/** Class of every CodeLab block; the settings are classes too, because Moodle's HTML cleaning removes data-* attributes. */
export const blockClass = 'codelab';
export const langPrefix = 'codelab-lang-';
export const themePrefix = 'codelab-theme-';
export const runClass = 'codelab-run';
export const noAssistClass = 'codelab-noassist';
/** Input readers start from: <pre class="codelab-stdin"> right after the block. */
export const stdinClass = 'codelab-stdin';
/** Hidden code run before the block (the tables and data of SQL): <pre class="codelab-setup"> right after the block. */
export const setupClass = 'codelab-setup';

/** Supported Monaco themes. */
export const themes = {
    auto: 'auto',
    vs: 'vs',
    'vs-dark': 'vs-dark',
    'hc-black': 'hc-black',
};
export const defaultTheme = 'auto';

/** Languages in the order they are offered: class suffix => Monaco language id. */
export const languages = {
    c: 'c',
    cpp: 'cpp',
    python: 'python',
    java: 'java',
    csharp: 'csharp',
    javascript: 'javascript',
    pascal: 'pascal',
    php: 'php',
    // Only on the interactive server (CodeLab runner with MariaDB).
    mysql: 'mysql',
};

/** Languages that have a hidden setup (tables and data) and no input. */
export const setupLanguages = ['mysql'];
export const defaultLanguage = 'c';

export const iconSvg =
    '<svg width="24" height="24" viewBox="0 0 24 24">' +
    '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M7 10l-2 2 2 2M17 10l2 2-2 2M13 9l-2 6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';
