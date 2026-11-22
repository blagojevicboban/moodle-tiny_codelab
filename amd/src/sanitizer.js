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
 * Parses AddressSanitizer and UndefinedBehaviorSanitizer stderr output into a concise student-friendly diagnostic
 * with the exact source line number in prog.c / prog.cpp.
 *
 * @module     tiny_codelab/sanitizer
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Find the first line number in the student's file (prog.c or prog.cpp).
 *
 * @param {string} stderr
 * @returns {number} 1-based line number, or 0 when not found
 */
const findLine = (stderr) => {
    const m = /(?:^|[\s/])prog\.(?:c|cpp):(\d+)/m.exec(stderr);
    return m ? Number(m[1]) : 0;
};

/**
 * Parse ASan / UBSan stderr into a structured diagnostic, or null when no sanitizer report is present.
 *
 * @param {string} stderr
 * @returns {?{kind: string, line: number, detail: string}}
 */
export const parseSanitizer = (stderr) => {
    const text = String(stderr || '');
    if (!text) {
        return null;
    }
    const idx = /prog\.(?:c|cpp):(\d+)(?::\d+)?: runtime error: index (-?\d+) out of bounds for type '([^']+)'/.exec(text);
    if (idx) {
        return {kind: 'index_oob', line: Number(idx[1]), detail: `${idx[2]} (${idx[3]})`};
    }
    const line = findLine(text);
    if (/(?:stack|heap|global)-buffer-overflow/.test(text)) {
        return {kind: 'buffer_overflow', line, detail: ''};
    }
    if (/(?:heap-use-after-free|stack-use-after-return|stack-use-after-scope)/.test(text)) {
        return {kind: 'use_after_free', line, detail: ''};
    }
    if (/runtime error:.*null pointer|AddressSanitizer: SEGV/.test(text)) {
        return {kind: 'null_pointer', line, detail: ''};
    }
    if (/runtime error: signed integer overflow/.test(text)) {
        return {kind: 'int_overflow', line, detail: ''};
    }
    if (/runtime error: division by zero/.test(text)) {
        return {kind: 'div_zero', line, detail: ''};
    }
    return null;
};

/**
 * Format a parsed sanitizer diagnostic using Moodle strings.
 *
 * @param {{kind: string, line: number, detail: string}} info
 * @param {Object<string, string>} strings
 * @returns {string}
 */
export const formatSanitizer = (info, strings) => {
    const template = strings[`san_${info.kind}`] || '';
    if (!template) {
        return '';
    }
    return template
        .replace('{$a->line}', info.line > 0 ? String(info.line) : '?')
        .replace('{$a->detail}', info.detail || '');
};
