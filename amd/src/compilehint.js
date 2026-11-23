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
 * Matches common GCC and Clang compiler and linker error messages and renders concise beginner-friendly
 * explanations with short fix examples under the compiler output.
 *
 * @module     tiny_codelab/compilehint
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';

/**
 * Ordered list of 40 common GCC/Clang compiler and linker error patterns.
 * More specific patterns come before general ones.
 *
 * @type {Array<{key: string, re: RegExp}>}
 */
export const PATTERNS = [
    {key: 'semicolon', re: /expected ['`‘]?;['`’]? (?:before|after|at end of)/i},
    {key: 'no_header', re: /No such file or directory|file not found/i},
    {key: 'unterminated_str', re: /missing terminating ["'] character/i},
    {key: 'unterminated_comment', re: /unterminated comment/i},
    {key: 'stray_char', re: /stray ['`‘\\]|non-ASCII character|invalid character|extended character .+ is not valid/i},
    {key: 'undef_ref_main', re: /undefined reference to [`'‘]main['’]/i},
    {key: 'undef_ref', re: /undefined reference to /i},
    {key: 'multiple_def', re: /multiple definition of /i},
    {key: 'else_without_if', re: /['`‘]else['`’] without a previous ['`‘]if['`’]|expected expression\s*$/i},
    {key: 'break_outside', re: /break statement not (?:within|in) loop or switch/i},
    {key: 'continue_outside', re: /continue statement not (?:within|in) (?:a )?loop/i},
    {key: 'duplicate_case', re: /duplicate case value/i},
    {key: 'case_not_const', re: /case label does not reduce to an integer constant|expression is not an integral constant/i},
    {key: 'implicit_decl', re: /implicit declaration of function|call to undeclared (?:library )?function/i},
    {key: 'undeclared', re: /undeclared \(first use|use of undeclared identifier|was not declared in this scope/i},
    {key: 'unknown_type', re: /unknown type name|does not name a type/i},
    {key: 'redefinition', re: /redefinition of |redeclaration of /i},
    {key: 'conflicting_types', re: /conflicting types for /i},
    {key: 'too_few_args', re: /too few arguments to function/i},
    {key: 'too_many_args', re: /too many arguments to function/i},
    {key: 'no_matching_fn', re: /no matching function for call to/i},
    {key: 'void_value', re: /void value not ignored|with an rvalue of type ['`‘]void['`’]/i},
    {key: 'return_in_void', re: /return-statement with a value, in function returning|void function .+ should not return a value/i},
    {key: 'return_no_value', re: /return-statement with no value|non-void function .+ should return a value/i},
    {key: 'const_assign', re: /assignment of read-only (?:variable|location)|cannot assign to variable .+ with const/i},
    {key: 'array_assign', re: /assignment to expression with array type|array type .+ is not assignable/i},
    {key: 'lvalue_required', re: /lvalue required as left operand of assignment|expression is not assignable/i},
    {key: 'not_a_function', re: /called object .* is not a function/i},
    {key: 'subscript_type', re: /subscripted value is neither array nor pointer|array subscript is not an integer/i},
    {key: 'member_arrow', re: /request for member .+ in something not a structure|is a pointer; did you mean to use ['`‘]->/i},
    {key: 'member_dot', re: /invalid type argument of ['`‘]->|is not a pointer; did you mean to use ['`‘]\./i},
    {key: 'no_member', re: /has no member named |no member named .+ in /i},
    {key: 'pointer_deref', re: /invalid type argument of unary ['`‘]\*|indirection requires pointer operand/i},
    {key: 'no_operator', re: /no match for ['`‘]operator|invalid operands to binary expression .+ostream|istream/i},
    {key: 'invalid_operands', re: /invalid operands to binary/i},
    {key: 'type_conversion', re: new RegExp(
        'invalid conversion from|cannot convert |incompatible types when assigning|' +
        'incompatible (?:integer to pointer|pointer to integer) conversion',
        'i'
    )},
    {key: 'expected_paren', re: /expected ['`‘]\)['`’]/i},
    {key: 'expected_bracket', re: /expected ['`‘]\][`'’]/i},
    {key: 'expected_brace', re: /expected ['`‘]}['`’]|expected declaration or statement at end of input/i},
    {key: 'expected_expr', re: /expected (?:primary-)?expression before/i},
];

/** Maximum number of distinct hints shown at once. */
const DEFAULT_MAX_HINTS = 3;

/**
 * Extract a 1-based line number from a compiler diagnostic line.
 *
 * @param {string} line
 * @returns {number} 1-based line number, or 0 when not found
 */
const extractLine = (line) => {
    const m = /(?:^|[\s/])[^:\s]+\.(?:c|cpp|cc|cxx|h|hpp):(\d+)(?::\d+)?:/i.exec(line);
    return m ? Number(m[1]) : 0;
};

/**
 * Whether a line of compiler output is a diagnostic line worth matching.
 *
 * @param {string} line
 * @returns {boolean}
 */
const isDiagnosticLine = (line) =>
    /(?:fatal )?error:|undefined reference to|multiple definition of/i.test(line);

/**
 * Find the first error line number in compiler output, or 0 when none is present.
 *
 * @param {string} output
 * @returns {number}
 */
export const firstErrorLine = (output) => {
    for (const raw of String(output || '').split(/\r?\n/)) {
        if (isDiagnosticLine(raw)) {
            const line = extractLine(raw);
            if (line > 0) {
                return line;
            }
        }
    }
    return 0;
};

/**
 * Parse raw GCC/Clang compiler output into up to maxHints matched error descriptors.
 *
 * @param {string} output
 * @param {number} [maxHints]
 * @returns {Array<{key: string, line: number}>}
 */
export const parseCompilerErrors = (output, maxHints = DEFAULT_MAX_HINTS) => {
    const text = String(output || '');
    if (!text) {
        return [];
    }
    const hints = [];
    const seen = new Set();
    for (const raw of text.split(/\r?\n/)) {
        if (!isDiagnosticLine(raw)) {
            continue;
        }
        const match = PATTERNS.find((p) => p.re.test(raw));
        if (!match) {
            continue;
        }
        const line = extractLine(raw);
        const id = `${match.key}:${line}`;
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        hints.push({key: match.key, line});
        if (hints.length >= maxHints) {
            break;
        }
    }
    return hints;
};

/**
 * Append text with [[code]] markers as safe text and <code> DOM nodes.
 *
 * @param {HTMLElement} target
 * @param {string} text
 */
const appendFormatted = (target, text) => {
    const parts = String(text || '').split(/(\[\[.*?\]\])/g);
    for (const part of parts) {
        if (!part) {
            continue;
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
            const code = document.createElement('code');
            code.className = 'tiny_codelab-code';
            code.textContent = part.slice(2, -2);
            target.append(code);
        } else {
            target.append(document.createTextNode(part));
        }
    }
};

/**
 * Create the line badge element (clickable button when onLine is provided).
 *
 * @param {number} line 1-based displayed line number
 * @param {string} template Moodle string for cmphint_line ("Line {$a}")
 * @param {?function(number): void} onLine
 * @returns {HTMLElement}
 */
const lineBadge = (line, template, onLine) => {
    const label = template.replace('{$a}', String(line));
    if (onLine) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tiny_codelab-cmphints-line btn btn-link btn-sm p-0 me-1 align-baseline';
        btn.textContent = `${label}:`;
        btn.addEventListener('click', () => onLine(line));
        return btn;
    }
    const span = document.createElement('strong');
    span.className = 'tiny_codelab-cmphints-line me-1';
    span.textContent = `${label}:`;
    return span;
};

/**
 * Build a localized explanation panel for compiler errors, or null when no known pattern matches.
 *
 * @param {string} output raw compiler output
 * @param {Object} [options]
 * @param {number} [options.offset] hidden prefix lines before the editor's code
 * @param {function(number): void} [options.onLine] called when the user clicks a line number
 * @returns {Promise<?HTMLElement>}
 */
export const renderCompileHints = async(output, {offset = 0, onLine = null} = {}) => {
    const hints = parseCompilerErrors(output);
    if (!hints.length) {
        return null;
    }
    const keys = ['cmphint_title', 'cmphint_line', ...new Set(hints.map((h) => `cmp_${h.key}`))];
    const values = await getStrings(keys.map((key) => ({key, component})));
    const s = Object.fromEntries(keys.map((key, i) => [key, values[i]]));

    const box = document.createElement('aside');
    box.className = 'tiny_codelab-cmphints alert alert-info py-2 px-3 mt-2 mb-1 small';
    const title = document.createElement('div');
    title.className = 'tiny_codelab-cmphints-title fw-bold mb-1';
    title.textContent = s.cmphint_title;
    const list = document.createElement('ul');
    list.className = 'tiny_codelab-cmphints-list mb-0 ps-3';

    for (const hint of hints) {
        const text = s[`cmp_${hint.key}`];
        if (!text) {
            continue;
        }
        const item = document.createElement('li');
        const shown = hint.line > offset ? hint.line - offset : hint.line;
        if (shown > 0) {
            item.append(lineBadge(shown, s.cmphint_line, onLine));
        }
        appendFormatted(item, text);
        list.append(item);
    }
    if (!list.childElementCount) {
        return null;
    }
    box.append(title, list);
    return box;
};
