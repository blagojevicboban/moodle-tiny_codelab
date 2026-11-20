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
 * Tooltips of the code editor, shown when the mouse rests on the code.
 *
 * - While a program is followed step by step: the value of a variable at the shown step.
 * - Help for beginners: keywords, operators and the parts of a printf / scanf format such as %5.2lf.
 * - Numbers in other numeral systems (decimal, hexadecimal, binary, octal) and the codes of characters.
 *
 * The help and the numbers follow the typing help: a block or question without typing help (noassist) shows only the
 * values of the step, which the variables panel shows anyway.
 *
 * @module     tiny_codelab/hover
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';

const CLIKE = ['c', 'cpp', 'java', 'csharp', 'javascript', 'php'];
const CC = ['c', 'cpp'];
const TYPED = ['c', 'cpp', 'java', 'csharp'];
const OOP = ['cpp', 'java', 'csharp', 'javascript', 'php'];
const PY = ['python'];

/** Words with help: [words separated by spaces, string key after hover_, Monaco languages]. */
const WORDS = [
    ['if', 'c_if', CLIKE], ['else', 'c_else', CLIKE], ['for', 'c_for', CLIKE], ['while', 'c_while', CLIKE],
    ['do', 'c_do', CLIKE], ['switch', 'c_switch', CLIKE], ['case', 'c_case', CLIKE], ['default', 'c_default', CLIKE],
    ['break', 'c_break', [...CLIKE, ...PY]], ['continue', 'c_continue', [...CLIKE, ...PY]], ['return', 'c_return', CLIKE],
    ['void', 'c_void', TYPED], ['int', 'c_int', TYPED], ['long', 'c_long', TYPED], ['short', 'c_short', TYPED],
    ['unsigned', 'c_unsigned', CC], ['double', 'c_double', TYPED], ['float', 'c_float', TYPED], ['char', 'c_char', TYPED],
    ['bool boolean', 'c_bool', TYPED], ['string String', 'c_string', ['cpp', 'java', 'csharp']],
    ['const', 'c_const', ['c', 'cpp', 'csharp', 'javascript']], ['static', 'c_static', [...TYPED, 'php']],
    ['struct', 'c_struct', ['c', 'cpp', 'csharp']], ['sizeof', 'c_sizeof', CC], ['typedef', 'c_typedef', CC],
    ['include', 'c_include', CC], ['define', 'c_define', CC], ['main Main', 'c_main', TYPED], ['new', 'c_new', OOP],
    ['class', 'c_class', [...OOP, ...PY]], ['public private protected', 'c_access', ['cpp', 'java', 'csharp', 'php']],
    ['this', 'c_this', OOP], ['NULL nullptr null', 'c_null', ['c', 'cpp', 'java', 'csharp', 'javascript', 'php']],
    ['printf', 'c_printf', CC], ['scanf', 'c_scanf', CC],
    ['using', 'cpp_using', ['cpp']], ['cout', 'cpp_cout', ['cpp']], ['cin', 'cpp_cin', ['cpp']], ['endl', 'cpp_endl', ['cpp']],
    ['let var', 'js_let', ['javascript']], ['function', 'js_function', ['javascript', 'php']],
    ['def', 'py_def', PY], ['return', 'py_return', PY], ['if', 'py_if', PY], ['elif', 'py_elif', PY], ['else', 'py_else', PY],
    ['for', 'py_for', PY], ['in', 'py_in', PY], ['range', 'py_range', PY], ['while', 'py_while', PY],
    ['import from', 'py_import', PY], ['print', 'py_print', PY], ['input', 'py_input', PY], ['int', 'py_int', PY],
    ['float', 'py_float', PY], ['str', 'py_str', PY], ['len', 'py_len', PY], ['list', 'py_list', PY], ['None', 'py_none', PY],
    ['True False', 'py_bool', PY], ['and or not', 'py_logic', PY], ['pass', 'py_pass', PY], ['lambda', 'py_lambda', PY],
    ['self', 'py_self', PY], ['try except', 'py_try', PY], ['append', 'py_append', PY],
];

/** Operators with help: [operators separated by spaces, string key after hover_, Monaco languages]. */
const OPERATORS = [
    ['=', 'op_assign', [...CLIKE, ...PY]], ['==', 'op_eq', [...CLIKE, ...PY]], ['!=', 'op_ne', [...CLIKE, ...PY]],
    ['=== !==', 'op_strict', ['javascript', 'php']], ['&&', 'op_and', CLIKE], ['||', 'op_or', CLIKE], ['!', 'op_not', CLIKE],
    ['%', 'op_mod', [...CLIKE, ...PY]], ['++', 'op_inc', CLIKE], ['--', 'op_dec', CLIKE],
    ['+= -= *= /= %=', 'op_compound', [...CLIKE, ...PY]], ['->', 'op_arrow', CC], ['::', 'op_scope', ['cpp']],
    ['<< >>', 'op_shift', ['c', 'cpp', 'java', 'csharp', 'javascript']], ['&', 'op_addr', CC],
    ['/', 'op_div', TYPED], ['/', 'py_div', PY], ['//', 'py_floordiv', PY], ['**', 'py_pow', PY],
];

/** Languages whose strings can hold a printf format. */
const FORMAT_LANGS = ['c', 'cpp', 'java', 'php', 'python'];
/** Languages where a number with a leading 0 is octal. */
const OCTAL_ZERO = ['c', 'cpp', 'java', 'php'];
/** Languages with character literals in single quotes. */
const CHAR_LANGS = TYPED;

/**
 * A table: language => word or operator => string key.
 *
 * @param {Array} list
 * @returns {Object<string, Object<string, string>>}
 */
const table = (list) => {
    const result = {};
    list.forEach(([items, key, langs]) => langs.forEach((lang) => {
        result[lang] = result[lang] || {};
        items.split(' ').forEach((item) => {
            result[lang][item] = key;
        });
    }));
    return result;
};
const WORD_KEYS = table(WORDS);
const OPERATOR_KEYS = table(OPERATORS);

const FORMAT_KEYS = ['fmt_d', 'fmt_u', 'fmt_ld', 'fmt_lld', 'fmt_f_print', 'fmt_f_scan', 'fmt_lf', 'fmt_e', 'fmt_g', 'fmt_c',
    'fmt_s', 'fmt_x', 'fmt_o', 'fmt_p', 'fmt_pct', 'fmt_zu', 'fmt_n_java', 'fmt_width', 'fmt_precision', 'fmt_minus',
    'fmt_zero', 'fmt_plus', 'fmt_scanamp'];
const OTHER_KEYS = ['value', 'num_dec', 'num_hex', 'num_bin', 'num_oct', 'num_char'];

let strings = null;

/**
 * The texts of the tooltips (hover_<key>), loaded once.
 *
 * @returns {Promise<Object<string, string>>}
 */
const loadStrings = async() => {
    if (!strings) {
        const keys = [...new Set([...WORDS, ...OPERATORS].map((entry) => entry[1]).concat(FORMAT_KEYS, OTHER_KEYS))];
        const values = await getStrings(keys.map((key) => ({key: `hover_${key}`, component})));
        strings = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    }
    return strings;
};

/**
 * The comment that starts at a column: its end (the end of the line for a line comment), or -1.
 *
 * @param {string} line
 * @param {number} i column, from 0
 * @param {boolean} python
 * @returns {number}
 */
const commentEnd = (line, i, python) => {
    if (python) {
        return line[i] === '#' ? line.length : -1;
    }
    if (line.startsWith('//', i)) {
        return line.length;
    }
    if (line.startsWith('/*', i)) {
        const close = line.indexOf('*/', i + 2);
        return close < 0 ? line.length : close + 2;
    }
    return -1;
};

/**
 * Where a column of a line is: in code, in a string (with its bounds) or in a comment. Only this line is looked at.
 *
 * @param {string} line
 * @param {number} index column, from 0
 * @param {string} lang Monaco language
 * @returns {{kind: string, start?: number, end?: number, quote?: string}}
 */
export const placeOf = (line, index, lang) => {
    const python = lang === 'python';
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        const comment = commentEnd(line, i, python);
        if (comment >= 0) {
            if (index >= i && index < comment) {
                return {kind: 'comment'};
            }
            i = comment;
            continue;
        }
        if (ch === '"' || ch === "'" || (ch === '`' && lang === 'javascript')) {
            let j = i + 1;
            while (j < line.length && line[j] !== ch) {
                j += line[j] === '\\' ? 2 : 1;
            }
            if (index >= i && index <= j) {
                return {kind: 'string', start: i, end: Math.min(j, line.length), quote: ch};
            }
            i = j + 1;
            continue;
        }
        if (i >= index) {
            break;
        }
        i++;
    }
    return {kind: 'code'};
};

/**
 * The numeral systems of a whole number, as lines "label  value".
 *
 * @param {bigint} value
 * @param {Object<string, string>} s strings
 * @param {?string} [character] the character, when the number is a character code
 * @returns {string}
 */
export const numberLines = (value, s, character = null) => {
    const bin = value.toString(2);
    const padded = bin.padStart(Math.ceil(bin.length / 4) * 4, '0').replace(/(.{4})(?=.)/g, '$1 ');
    const rows = [[s.num_dec, value.toString()], [s.num_hex, value.toString(16).toUpperCase()], [s.num_bin, padded],
        [s.num_oct, value.toString(8)]];
    if (character !== null) {
        rows.push([s.num_char, character]);
    } else if (value >= 32n && value <= 126n) {
        rows.push([s.num_char, `'${String.fromCharCode(Number(value))}'`]);
    }
    const width = Math.max(...rows.map((r) => r[0].length));
    return rows.map(([label, text]) => `${label.padEnd(width)}  ${text}`).join('\n');
};

/**
 * The whole-number literal at a column of a line in code, or null (real numbers, 0 and 1 have none).
 *
 * @param {string} line
 * @param {number} index column, from 0
 * @param {string} lang
 * @returns {?{value: bigint, start: number, end: number}}
 */
export const numberAt = (line, index, lang) => {
    const re = /\b(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*)([uUlLnN]*)\b/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (index < start || index >= end) {
            continue;
        }
        const after = line[end] || '';
        if (line[start - 1] === '.' || after === '.' || /[eE]/.test(after)) {
            return null;
        }
        let text = m[1].replace(/_/g, '');
        let value;
        try {
            if (/^0[oO]/.test(text)) {
                value = BigInt('0o' + text.slice(2));
            } else if (/^0\d+$/.test(text) && OCTAL_ZERO.includes(lang)) {
                value = BigInt('0o' + text.slice(1));
            } else if (/^\d+$/.test(text)) {
                text = text.replace(/^0+(?=\d)/, '');
                value = BigInt(text);
            } else {
                value = BigInt(text);
            }
        } catch (e) {
            return null;
        }
        return value > 1n ? {value, start, end} : null;
    }
    return null;
};

/** Codes of the escape sequences in a character literal. */
const ESCAPES = {n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11};

/**
 * The code of a character literal such as 'A' or '\n', or null.
 *
 * @param {string} inner the text between the quotes
 * @returns {?number}
 */
export const charCode = (inner) => {
    if (inner.length === 1) {
        return inner.codePointAt(0);
    }
    if (inner.length === 2 && inner[0] === '\\' && Object.prototype.hasOwnProperty.call(ESCAPES, inner[1])) {
        return ESCAPES[inner[1]];
    }
    return null;
};

/** Help of the conversions that do not depend on the size or the function. */
const CONVERSIONS = {'%': 'fmt_pct', e: 'fmt_e', E: 'fmt_e', a: 'fmt_e', A: 'fmt_e', g: 'fmt_g', G: 'fmt_g', c: 'fmt_c',
    s: 'fmt_s', x: 'fmt_x', X: 'fmt_x', o: 'fmt_o', p: 'fmt_p'};

/**
 * The help of a conversion of a format, such as d in %ld, or null.
 *
 * @param {string} conv the letter
 * @param {string} [size] hh, h, l, ll, L, z, j or t
 * @param {boolean} scan the format of scanf
 * @param {string} lang
 * @returns {?string}
 */
const conversionKey = (conv, size, scan, lang) => {
    if ('di'.includes(conv)) {
        return {ll: 'fmt_lld', l: 'fmt_ld'}[size] || 'fmt_d';
    }
    if (conv === 'u') {
        return size === 'z' ? 'fmt_zu' : 'fmt_u';
    }
    if ('fF'.includes(conv)) {
        if (size === 'l' || size === 'L') {
            return 'fmt_lf';
        }
        return scan ? 'fmt_f_scan' : 'fmt_f_print';
    }
    if (conv === 'n') {
        return lang === 'java' ? 'fmt_n_java' : null;
    }
    return CONVERSIONS[conv] || null;
};

/**
 * The printf / scanf format at a column of a string, as the keys of its help, or null.
 *
 * @param {string} line
 * @param {{start: number, end: number}} place the string
 * @param {number} index column, from 0
 * @param {string} lang
 * @returns {?{start: number, end: number, parts: Array<{key: string, a?: string}>}}
 */
export const formatAt = (line, place, index, lang) => {
    const inner = line.slice(place.start + 1, place.end);
    const re = /%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGaAcspn%])/g;
    const scan = /scanf\w*\s*\($/.test(line.slice(0, place.start).trimEnd()) || /scanf/.test(line.slice(0, place.start));
    let m;
    while ((m = re.exec(inner)) !== null) {
        const start = place.start + 1 + m.index;
        const end = start + m[0].length;
        if (index < start || index >= end) {
            continue;
        }
        const [, flags, width, precision, size, conv] = m;
        const key = conversionKey(conv, size, scan, lang);
        if (!key) {
            return null;
        }
        const parts = [{key}];
        [['-', 'fmt_minus'], ['0', 'fmt_zero'], ['+', 'fmt_plus']].forEach(([flag, flagKey]) => {
            if (flags.includes(flag)) {
                parts.push({key: flagKey});
            }
        });
        if (width && width !== '*') {
            parts.push({key: 'fmt_width', a: width});
        }
        if (precision && precision !== '*') {
            parts.push({key: 'fmt_precision', a: precision});
        }
        if (scan && !'s%'.includes(conv)) {
            parts.push({key: 'fmt_scanamp'});
        }
        return {start, end, parts};
    }
    return null;
};

/**
 * The operator at a column of a line in code: the longest run of operator signs around it.
 *
 * @param {string} line
 * @param {number} index column, from 0
 * @returns {?{text: string, start: number, end: number}}
 */
export const operatorAt = (line, index) => {
    const signs = '=!<>&|+-*/%:';
    if (!signs.includes(line[index] || ' ')) {
        return null;
    }
    let start = index;
    let end = index + 1;
    while (start > 0 && signs.includes(line[start - 1])) {
        start--;
    }
    while (end < line.length && signs.includes(line[end])) {
        end++;
    }
    return {text: line.slice(start, end), start, end};
};

/**
 * Markdown of a help text: code is written [[like this]] in the language strings (Moodle's checker does not want
 * backticks there), and everything else is escaped, so that * _ < and the like are shown as they are.
 *
 * @param {string} text
 * @returns {string}
 */
export const markdown = (text) => text.split(/\[\[(.*?\]*)\]\](?!\])/).map((part, i) => {
    if (i % 2 === 0) {
        return part.replace(/[\\`*_{}[\]()#+\-.!<>|~]/g, '\\$&');
    }
    const fence = part.includes('`') ? '``' : '`';
    return `${fence}${part}${fence}`;
}).join('');

/**
 * Text of a string with {$a} filled in.
 *
 * @param {string} text
 * @param {string} [a]
 * @returns {string}
 */
const fill = (text, a) => markdown(a === undefined ? text : text.split('{$a}').join(a));

/**
 * Markdown of a code block (the value of a variable or the numbers).
 *
 * @param {string} text
 * @returns {string}
 */
const codeBlock = (text) => '```\n' + text.replace(/```/g, '`​``') + '\n```';

/**
 * The tooltip in a string: the code of a character literal, or the help of a printf format.
 *
 * @param {string} line
 * @param {Object} place the string (placeOf)
 * @param {number} index column, from 0
 * @param {string} lang
 * @param {Object<string, string>} s strings
 * @returns {?{start: number, end: number, contents: Array<{value: string}>}}
 */
const stringHover = (line, place, index, lang, s) => {
    if (place.quote === "'" && CHAR_LANGS.includes(lang)) {
        const code = charCode(line.slice(place.start + 1, place.end));
        if (code !== null) {
            const text = numberLines(BigInt(code), s, line.slice(place.start, place.end + 1));
            return {start: place.start, end: place.end + 1, contents: [{value: codeBlock(text)}]};
        }
    }
    const format = FORMAT_LANGS.includes(lang) ? formatAt(line, place, index, lang) : null;
    if (!format) {
        return null;
    }
    return {start: format.start, end: format.end, contents: format.parts.map((part) => ({value: fill(s[part.key], part.a)}))};
};

/**
 * The tooltip in code: a number, a word with help or an operator with help.
 *
 * @param {string} line
 * @param {?{word: string, startColumn: number, endColumn: number}} word the word at the position (Monaco)
 * @param {number} index column, from 0
 * @param {string} lang
 * @param {Object<string, string>} s strings
 * @returns {?{start: number, end: number, contents: Array<{value: string}>}}
 */
const codeHover = (line, word, index, lang, s) => {
    const number = numberAt(line, index, lang);
    if (number) {
        return {start: number.start, end: number.end, contents: [{value: codeBlock(numberLines(number.value, s))}]};
    }
    if (word) {
        const keys = WORD_KEYS[lang] || {};
        const key = Object.prototype.hasOwnProperty.call(keys, word.word) ? keys[word.word] : null;
        // The words include and define only after #.
        const directive = key === 'c_include' || key === 'c_define';
        if (!key || (directive && !/^\s*#\s*$/.test(line.slice(0, word.startColumn - 1)))) {
            return null;
        }
        return {start: word.startColumn - 1, end: word.endColumn - 1, contents: [{value: fill(s[key])}]};
    }
    const operator = operatorAt(line, index);
    const keys = OPERATOR_KEYS[lang] || {};
    if (!operator || !Object.prototype.hasOwnProperty.call(keys, operator.text)) {
        return null;
    }
    return {start: operator.start, end: operator.end, contents: [{value: fill(s[keys[operator.text]])}]};
};

/**
 * The tooltip at a position, or null.
 *
 * @param {Object} monaco
 * @param {Object} model
 * @param {Object} position
 * @returns {Promise<?Object>}
 */
const provideHover = async(monaco, model, position) => {
    const settings = model.codelab || {};
    const lang = model.getLanguageId();
    const line = model.getLineContent(position.lineNumber);
    const index = position.column - 1;
    const place = placeOf(line, index, lang);
    const word = place.kind === 'code' ? model.getWordAtPosition(position) : null;
    const s = await loadStrings();
    let found = null;
    if (word && settings.values && Object.prototype.hasOwnProperty.call(settings.values, word.word)) {
        // The value of a variable at the shown step.
        let value = String(settings.values[word.word]);
        value = value.length > 400 ? value.slice(0, 400) + ' …' : value;
        found = {start: word.startColumn - 1, end: word.endColumn - 1,
            contents: [{value: `*${s.value}*`}, {value: codeBlock(`${word.word} = ${value}`)}]};
    } else if (settings.help && place.kind === 'string') {
        found = stringHover(line, place, index, lang, s);
    } else if (settings.help && place.kind === 'code') {
        found = codeHover(line, word, index, lang, s);
    }
    if (!found) {
        return null;
    }
    return {
        range: new monaco.Range(position.lineNumber, found.start + 1, position.lineNumber, found.end + 1),
        contents: found.contents,
    };
};

/**
 * Register the tooltips in a Monaco instance (once per frame). What a model shows is in model.codelab:
 * {help: boolean, values: ?Object<string, string>}.
 *
 * @param {Object} monaco
 */
export const registerHover = (monaco) => {
    if (monaco.codelabHover) {
        return;
    }
    monaco.codelabHover = true;
    ['c', 'cpp', 'python', 'java', 'csharp', 'javascript', 'pascal', 'php', 'mysql'].forEach((id) => {
        monaco.languages.registerHoverProvider(id, {
            provideHover: (model, position) => provideHover(monaco, model, position).catch(() => null),
        });
    });
};
