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
 * Typing help (level 1) for the Monaco editor: completion of keywords, snippets, library functions and members,
 * and help with the parameters of a call. Monaco itself adds the words of the code.
 *
 * @module     tiny_codelab/intellisense
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import libraries from './libraries';
import {languages} from './common';

/**
 * Parse 'name(a, b)' or 'NAME' into a name and its parameters (null for a property).
 *
 * @param {string} signature
 * @returns {{name: string, params: ?string[], signature: string}}
 */
export const parseSignature = (signature) => {
    const open = signature.indexOf('(');
    if (open < 0) {
        return {name: signature, params: null, signature};
    }
    const inner = signature.slice(open + 1, signature.lastIndexOf(')'));
    const params = [];
    let depth = 0;
    let current = '';
    for (const ch of inner) {
        if (ch === '(' || ch === '<' || ch === '[') {
            depth++;
        } else if (ch === ')' || ch === '>' || ch === ']') {
            depth--;
        }
        if (ch === ',' && depth === 0) {
            params.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) {
        params.push(current.trim());
    }
    return {name: signature.slice(0, open), params, signature};
};

/**
 * Types of the variables declared in the code (String s, Scanner in, vector<int> v...).
 *
 * @param {Object} library
 * @param {string} code
 * @returns {Object<string, string>} variable name => member list name
 */
export const declaredTypes = (library, code) => {
    const types = {};
    if (!library.declaration) {
        return types;
    }
    const re = new RegExp(library.declaration.source, 'g');
    let m;
    while ((m = re.exec(code)) !== null) {
        const type = (library.typeAlias && library.typeAlias[m[1]]) || m[1];
        types[m[2]] = type;
    }
    return types;
};

/**
 * Members offered after 'object.' : of a class or module (Math., Console.) or of a declared variable (s., list.).
 *
 * @param {Object} library
 * @param {string} object text before the dot, may contain dots (System.out)
 * @param {string} code whole code, for declarations
 * @returns {?string[]}
 */
export const membersOf = (library, object, code) => {
    if (library.members[object]) {
        return library.members[object];
    }
    const type = declaredTypes(library, code)[object];
    return type && library.members[type] ? library.members[type] : null;
};

/**
 * The function called before an opening parenthesis.
 *
 * @param {string} text code before the parenthesis
 * @param {number} param index of the current parameter
 * @returns {?{object: string, name: string, param: number}}
 */
const callNamed = (text, param) => {
    const m = /([A-Za-z_][\w.]*)\s*$/.exec(text);
    if (!m) {
        return null;
    }
    const parts = m[1].split('.');
    return {name: parts.pop(), object: parts.join('.'), param};
};

/**
 * The call the cursor is in: function name (with its object) and the index of the current parameter.
 *
 * @param {string} before code before the cursor
 * @returns {?{object: string, name: string, param: number}}
 */
export const callAt = (before) => {
    let depth = 0;
    let commas = 0;
    let quote = null;
    // Strings are skipped from the end, so a quote is only noticed when it closes; good enough for one line of a call.
    for (let i = before.length - 1; i >= 0 && i > before.length - 2000; i--) {
        const ch = before[i];
        if (quote) {
            if (ch === quote && before[i - 1] !== '\\') {
                quote = null;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === ')' || ch === ']' || ch === '}') {
            depth++;
        } else if (ch === '(' || ch === '[' || ch === '{') {
            if (depth === 0) {
                return ch === '(' ? callNamed(before.slice(0, i), commas) : null;
            }
            depth--;
        } else if (ch === ',' && depth === 0) {
            commas++;
        } else if (ch === ';' && depth === 0) {
            return null;
        }
    }
    return null;
};

/**
 * Signatures of a function, looked up among the members of its object or among the library functions.
 *
 * @param {Object} library
 * @param {{object: string, name: string}} call
 * @param {string} code
 * @returns {Array<{signature: string, params: string[], group: string}>}
 */
export const signaturesOf = (library, call, code) => {
    const found = [];
    const add = (list, group) => list.map(parseSignature)
        .filter((s) => s.name === call.name && s.params)
        .forEach((s) => found.push({signature: s.signature, params: s.params, group}));
    if (call.object) {
        add(membersOf(library, call.object, code) || [], call.object);
    } else {
        Object.entries(library.functions).forEach(([group, list]) => add(list, group));
    }
    return found;
};

/**
 * Completion items for the text before the cursor.
 *
 * @param {Object} monaco
 * @param {Object} library
 * @param {string} line text of the line before the cursor
 * @param {string} code whole code
 * @param {Object} range range of the word being typed
 * @returns {Object[]}
 */
export const completionItems = (monaco, library, line, code, range) => {
    const kinds = monaco.languages.CompletionItemKind;
    const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    const fromSignature = (sig, group) => {
        const s = parseSignature(sig);
        return s.params === null
            ? {label: s.name, kind: kinds.Property, detail: group, insertText: s.name, range}
            : {label: s.name, kind: group === s.name ? kinds.Class : kinds.Function, detail: s.signature,
                documentation: group, insertText: s.name, range};
    };

    const include = /#\s*include\s*<[\w./]*$/.exec(line);
    if (include && library.headers) {
        return library.headers.map((h) => ({label: h, kind: kinds.File, insertText: h, range}));
    }
    const member = /([A-Za-z_][\w.]*)\.\w*$/.exec(line);
    if (member) {
        const list = membersOf(library, member[1], code);
        return list ? list.map((sig) => fromSignature(sig, member[1])) : [];
    }
    const items = library.keywords.map((k) => ({label: k, kind: kinds.Keyword, insertText: k, range}));
    library.snippets.forEach(([label, body]) => items.push({
        label, kind: kinds.Snippet, insertText: body, insertTextRules: snippetRule, detail: body.split('\n')[0], range,
    }));
    Object.entries(library.functions).forEach(([group, list]) => list.forEach((sig) => items.push(fromSignature(sig, group))));
    // Classes and modules with members (Math, Console, System), unless they are only types of variables.
    const modules = /^[A-Z]|^(math|random|console|process)$/;
    Object.keys(library.members).filter((name) => !name.includes('.') && modules.test(name))
        .forEach((name) => items.push({label: name, kind: kinds.Module, insertText: name, range}));
    return items;
};

/**
 * Register the typing help for the CodeLab languages in a Monaco instance (once per frame).
 *
 * @param {Object} monaco
 */
export const registerAssist = (monaco) => {
    if (monaco.codelabAssist) {
        return;
    }
    monaco.codelabAssist = true;
    // Monaco's language ids: c and cpp share the C++ library only where they differ.
    const ids = {};
    Object.entries(languages).forEach(([lang, id]) => {
        ids[id] = libraries[lang];
    });

    Object.entries(ids).forEach(([id, library]) => {
        monaco.languages.registerCompletionItemProvider(id, {
            triggerCharacters: ['.', '<'],
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                    startColumn: word.startColumn, endColumn: word.endColumn,
                };
                const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
                return {suggestions: completionItems(monaco, library, line, model.getValue(), range)};
            },
        });

        monaco.languages.registerSignatureHelpProvider(id, {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [','],
            provideSignatureHelp: (model, position) => {
                const before = model.getValueInRange({
                    startLineNumber: Math.max(1, position.lineNumber - 20), startColumn: 1,
                    endLineNumber: position.lineNumber, endColumn: position.column,
                });
                const call = callAt(before);
                const signatures = call ? signaturesOf(library, call, model.getValue()) : [];
                if (!signatures.length) {
                    return null;
                }
                return {
                    value: {
                        signatures: signatures.map((s) => ({
                            label: s.signature,
                            documentation: s.group,
                            parameters: s.params.map((p) => ({label: p})),
                        })),
                        activeSignature: 0,
                        activeParameter: Math.min(call.param, signatures[0].params.length - 1),
                    },
                    dispose: () => null,
                };
            },
        });
    });
};
