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
export const ccPrefix = 'codelab-cc-';
export const stdPrefix = 'codelab-std-';
export const runClass = 'codelab-run';
export const noAssistClass = 'codelab-noassist';

/** Whitelisted C/C++ compilers and standards. */
export const compilers = ['gcc', 'msvc', 'clang'];
export const cStandards = ['c99', 'c11', 'c17', 'c23'];
export const cppStandards = ['c++11', 'c++14', 'c++17', 'c++20', 'c++23'];

/**
 * Convert a standard string to a safe CSS class suffix (c++17 -> codelab-std-cpp17).
 *
 * @param {string} std
 * @returns {string}
 */
export const stdClassOf = (std) => stdPrefix + std.replace('c++', 'cpp');

/**
 * Extract a whitelisted C/C++ standard from a CSS class name, or empty string.
 *
 * @param {string} className
 * @returns {string}
 */
export const stdFromClass = (className) => {
    if (!className.startsWith(stdPrefix)) {
        return '';
    }
    const raw = className.slice(stdPrefix.length).replace(/^cpp/, 'c++');
    return cStandards.includes(raw) || cppStandards.includes(raw) ? raw : '';
};
/** Input readers start from: <pre class="codelab-stdin"> right after the block. */
export const stdinClass = 'codelab-stdin';
/** Hidden code run before the block (the tables and data of SQL): <pre class="codelab-setup"> right after the block. */
export const setupClass = 'codelab-setup';

/**
 * Files of a block (read by a Python program in the browser): <pre class="codelab-file codelab-file-input-txt"> after
 * the block and its input, one per file. The name is in a class, because Moodle's cleaning removes data-* attributes:
 * a name has no hyphen, so the hyphen in the class stands for the dot.
 */
export const fileClass = 'codelab-file';
export const filePrefix = 'codelab-file-';
/** At most this many files per block. */
export const MAX_FILES = 5;
/** At most this many characters per file. */
export const MAX_FILE_SIZE = 65536;

/**
 * Whether a file name can be kept in a class: letters, digits and _, with at most one dot (input.txt, my_data.csv,
 * data), at most 40 characters, no folders.
 *
 * @param {string} name
 * @returns {boolean}
 */
export const validFileName = (name) => typeof name === 'string' && name.length <= 40 &&
    /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)?$/.test(name);

/**
 * The class of a file name: input.txt is codelab-file-input-txt.
 *
 * @param {string} name a valid name (see validFileName)
 * @returns {string}
 */
export const fileClassOf = (name) => filePrefix + name.replace('.', '-');

/**
 * The file name of a class, or null when the class is not the name of a file.
 *
 * @param {string} className
 * @returns {?string}
 */
export const fileNameOf = (className) => {
    if (!className.startsWith(filePrefix)) {
        return null;
    }
    const name = className.slice(filePrefix.length).replace('-', '.');
    return validFileName(name) && fileClassOf(name) === className ? name : null;
};

/**
 * What is wrong with the files of the dialog, or null: a name that cannot be kept in a class, a name used twice, a file
 * that is too large. Empty rows (no name and no text) are left out when the block is saved.
 *
 * @param {Array<{name: string, text: string}>} files
 * @returns {?{key: string, a?: string}} a string of tiny_codelab with its parameter
 */
export const filesProblem = (files) => {
    const seen = new Set();
    for (const file of files) {
        if (!validFileName(file.name)) {
            return {key: 'badfilename'};
        }
        if (seen.has(file.name)) {
            return {key: 'samefilename', a: file.name};
        }
        seen.add(file.name);
        if (file.text.length > MAX_FILE_SIZE) {
            return {key: 'filetoolarge', a: file.name};
        }
    }
    return null;
};

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
    // Only on the interactive server (CodeLab runner).
    mysql: 'mysql',
    typescript: 'typescript',
    bash: 'shell',
    go: 'go',
    rust: 'rust',
    r: 'r',
    // Runs directly in the browser in a sandboxed preview iframe (no server required).
    html: 'html',
};

/** Languages that have a hidden setup (tables and data) and no input. */
export const setupLanguages = ['mysql'];
/** Languages that run directly in the browser without a server and read no stdin. */
export const browserOnlyLanguages = ['html'];
export const defaultLanguage = 'c';

export const iconSvg =
    '<svg width="24" height="24" viewBox="0 0 24 24">' +
    '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M7 10l-2 2 2 2M17 10l2 2-2 2M13 9l-2 6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';
