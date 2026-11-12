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
 * Code prepared by the algorithm plugins: Open in CodeLab of the flowchart editor (tiny_algorithm) keeps the code of the
 * flowchart in the session storage of the page (codelab_import: lang, code, source, timestamp); a new CodeLab example
 * opened in the same editor starts from it, once.
 *
 * @module     tiny_codelab/importcode
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** The key of the session storage. */
export const IMPORT_KEY = 'codelab_import';

/** Minutes the prepared code waits for a new example. */
const IMPORT_MINUTES = 30;

/**
 * Take the prepared code: it is removed, and given when it is recent and its language is offered.
 *
 * @param {string[]} langs languages of the dialog
 * @param {Storage} [storage]
 * @param {number} [now] milliseconds
 * @returns {?{lang: string, code: string, source: string}}
 */
export const takeImport = (langs, storage = window.sessionStorage, now = Date.now()) => {
    let data = null;
    try {
        data = JSON.parse(storage.getItem(IMPORT_KEY) || 'null');
        storage.removeItem(IMPORT_KEY);
    } catch (e) {
        return null;
    }
    if (!data || typeof data.code !== 'string' || data.code.trim() === '' || !langs.includes(data.lang)) {
        return null;
    }
    const age = now - Number(data.timestamp);
    if (!(age >= 0 && age < IMPORT_MINUTES * 60000)) {
        return null;
    }
    return {lang: data.lang, code: data.code, source: String(data.source || '')};
};
