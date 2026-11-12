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
 * Lets Node load the AMD sources of the plugin: extension-less relative imports ('./common') get .js, and Moodle's
 * core modules (core/str) are the stubs of tests/stubs.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const STUB = new URL('./stubs/core.mjs', import.meta.url).href;

/**
 * Resolve a specifier (registerHooks: synchronous).
 *
 * @param {string} specifier
 * @param {object} context
 * @param {Function} nextResolve
 * @returns {object}
 */
export function resolveSync(specifier, context, nextResolve) {
    if (specifier.startsWith('core/')) {
        return {url: STUB, shortCircuit: true};
    }
    if (specifier.startsWith('.') && !/\.[cm]?js$/.test(specifier)) {
        try {
            return nextResolve(`${specifier}.js`, context);
        } catch {
            // Fall through to the default resolution.
        }
    }
    return nextResolve(specifier, context);
}

/**
 * The same for module.register() (asynchronous hooks, older Node).
 *
 * @param {string} specifier
 * @param {object} context
 * @param {Function} nextResolve
 * @returns {Promise<object>}
 */
export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('core/')) {
        return {url: STUB, shortCircuit: true};
    }
    if (specifier.startsWith('.') && !/\.[cm]?js$/.test(specifier)) {
        try {
            return await nextResolve(`${specifier}.js`, context);
        } catch {
            // Fall through to the default resolution.
        }
    }
    return nextResolve(specifier, context);
}
