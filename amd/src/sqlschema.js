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
 * Parses hidden SQL setup scripts (CREATE TABLE and INSERT INTO) and renders a compact schema and sample-rows panel
 * so students can inspect table names, columns, types, keys and example data without seeing the raw setup SQL.
 *
 * @module     tiny_codelab/sqlschema
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {component} from './common';

const MAX_SAMPLE_ROWS = 5;
const CREATE_RE = /\bCREATE\s+(?:TEMPORARY\s+)?TABLE\b/i;

let cachedStrings = null;

/**
 * Strip surrounding backticks or quotes from a SQL identifier.
 *
 * @param {string} raw
 * @returns {string}
 */
const unquoteId = (raw) => String(raw || '').trim().replace(/^[`"'[]|[`"'\]]$/g, '');

/**
 * Read a quoted SQL string/identifier starting at startIndex and return its end index.
 *
 * @param {string} sql
 * @param {number} startIndex
 * @returns {number}
 */
const readQuotedEnd = (sql, startIndex) => {
    const ch = sql[startIndex];
    let i = startIndex + 1;
    while (i < sql.length) {
        const c = sql[i];
        if (c === '\\' && i + 1 < sql.length) {
            i += 2;
            continue;
        }
        i++;
        if (c === ch) {
            if (sql[i] === ch) {
                i++;
                continue;
            }
            break;
        }
    }
    return i;
};

/**
 * Strip SQL comments (--, #, /* ... *\/) while preserving string literals.
 *
 * @param {string} sql
 * @returns {string}
 */
const stripComments = (sql) => {
    let out = '';
    let i = 0;
    const n = sql.length;
    while (i < n) {
        const ch = sql[i];
        const next = sql[i + 1] || '';
        if (ch === '\'' || ch === '"' || ch === '`') {
            const end = readQuotedEnd(sql, i);
            out += sql.slice(i, end);
            i = end;
            continue;
        }
        if ((ch === '-' && next === '-') || ch === '#') {
            const nl = sql.indexOf('\n', i);
            i = nl < 0 ? n : nl;
            continue;
        }
        if (ch === '/' && next === '*') {
            const end = sql.indexOf('*/', i + 2);
            i = end < 0 ? n : end + 2;
            out += ' ';
            continue;
        }
        out += ch;
        i++;
    }
    return out;
};

/**
 * Split text by a single-character separator at parenthesis depth 0, respecting quoted strings.
 *
 * @param {string} text
 * @param {string} sep
 * @returns {string[]}
 */
const splitTopLevel = (text, sep) => {
    const parts = [];
    let start = 0;
    let depth = 0;
    let quote = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (ch === '\\') {
                i++;
            } else if (ch === quote) {
                if (text[i + 1] === quote) {
                    i++;
                } else {
                    quote = '';
                }
            }
            continue;
        }
        if (ch === '\'' || ch === '"' || ch === '`') {
            quote = ch;
        } else if (ch === '(') {
            depth++;
        } else if (ch === ')' && depth > 0) {
            depth--;
        } else if (ch === sep && depth === 0) {
            const item = text.slice(start, i).trim();
            if (item) {
                parts.push(item);
            }
            start = i + 1;
        }
    }
    const tail = text.slice(start).trim();
    if (tail) {
        parts.push(tail);
    }
    return parts;
};

/**
 * Extract the balanced parenthesised block starting at openIndex.
 *
 * @param {string} text
 * @param {number} openIndex
 * @returns {{body: string, end: number}|null}
 */
const readParens = (text, openIndex) => {
    if (text[openIndex] !== '(') {
        return null;
    }
    let depth = 0;
    let quote = '';
    for (let i = openIndex; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (ch === '\\') {
                i++;
            } else if (ch === quote) {
                if (text[i + 1] === quote) {
                    i++;
                } else {
                    quote = '';
                }
            }
            continue;
        }
        if (ch === '\'' || ch === '"' || ch === '`') {
            quote = ch;
        } else if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
            if (depth === 0) {
                return {body: text.slice(openIndex + 1, i), end: i + 1};
            }
        }
    }
    return null;
};

/**
 * Unquote a SQL literal value for display in the sample-rows table.
 *
 * @param {string} raw
 * @returns {string}
 */
const formatValue = (raw) => {
    const t = String(raw || '').trim();
    if (/^NULL$/i.test(t)) {
        return 'NULL';
    }
    if ((t.startsWith('\'') && t.endsWith('\'')) || (t.startsWith('"') && t.endsWith('"'))) {
        const q = t[0];
        return t.slice(1, -1).replace(new RegExp(`${q}${q}`, 'g'), q).replace(/\\(['"\\])/g, '$1');
    }
    return t;
};

/**
 * Parse a single CREATE TABLE statement into a table descriptor.
 *
 * @param {string} stmt
 * @returns {?Object}
 */
const parseCreateTable = (stmt) => {
    const head = stmt.match(/^\s*CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\w.]+)\s*\(/i);
    if (!head) {
        return null;
    }
    const open = stmt.indexOf('(', head.index + head[0].length - 1);
    const block = readParens(stmt, open);
    if (!block) {
        return null;
    }
    const name = unquoteId(head[1].split('.').pop());
    const columns = [];
    const foreignKeys = [];
    const pkNames = new Set();

    splitTopLevel(block.body, ',').forEach((item) => {
        const cleaned = item.replace(/^\s*CONSTRAINT\s+[`"\w]+\s+/i, '').trim();
        const pk = cleaned.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pk) {
            splitTopLevel(pk[1], ',').forEach((c) => pkNames.add(unquoteId(c).toLowerCase()));
            return;
        }
        const fk = cleaned.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\w.]+)\s*\(([^)]+)\)/i);
        if (fk) {
            const col = unquoteId(fk[1]);
            foreignKeys.push({column: col, refTable: unquoteId(fk[2].split('.').pop()), refColumn: unquoteId(fk[3])});
            return;
        }
        if (/^(?:UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL|CHECK)\b/i.test(cleaned)) {
            return;
        }
        const colMatch = cleaned.match(/^([`"\w]+)\s+([A-Za-z]+(?:\s*\([^)]*\))?(?:\s+UNSIGNED)?)(.*)$/i);
        if (!colMatch) {
            return;
        }
        const colName = unquoteId(colMatch[1]);
        const type = colMatch[2].replace(/\s+/g, ' ').toUpperCase();
        const rest = colMatch[3] || '';
        const ref = rest.match(/\bREFERENCES\s+([`"\w.]+)\s*\(([^)]+)\)/i);
        if (ref) {
            foreignKeys.push({column: colName, refTable: unquoteId(ref[1].split('.').pop()), refColumn: unquoteId(ref[2])});
        }
        columns.push({
            name: colName,
            type,
            pk: /\bPRIMARY\s+KEY\b/i.test(rest),
            fk: Boolean(ref),
            notNull: /\bNOT\s+NULL\b/i.test(rest),
        });
    });

    const fkSet = new Set(foreignKeys.map((f) => f.column.toLowerCase()));
    columns.forEach((c) => {
        if (pkNames.has(c.name.toLowerCase())) {
            c.pk = true;
        }
        if (fkSet.has(c.name.toLowerCase())) {
            c.fk = true;
        }
    });

    return {name, columns, foreignKeys, rows: [], totalRows: 0};
};

/**
 * Parse an INSERT INTO statement and append its rows to the matching table.
 *
 * @param {string} stmt
 * @param {Map<string, Object>} byName
 */
const parseInsert = (stmt, byName) => {
    const head = stmt.match(/^\s*INSERT\s+(?:IGNORE\s+)?INTO\s+([`"\w.]+)\s*/i);
    if (!head) {
        return;
    }
    const table = byName.get(unquoteId(head[1].split('.').pop()).toLowerCase());
    if (!table) {
        return;
    }
    let pos = head[0].length;
    let colOrder = null;
    if (stmt[pos] === '(') {
        const cols = readParens(stmt, pos);
        if (!cols) {
            return;
        }
        colOrder = splitTopLevel(cols.body, ',').map((c) => unquoteId(c).toLowerCase());
        pos = cols.end;
    }
    const rest = stmt.slice(pos);
    const valMatch = rest.match(/^\s*VALUES\s*/i);
    if (!valMatch) {
        return;
    }
    let idx = pos + valMatch[0].length;
    while (idx < stmt.length) {
        while (idx < stmt.length && /[\s,]/.test(stmt[idx])) {
            idx++;
        }
        if (stmt[idx] !== '(') {
            break;
        }
        const tuple = readParens(stmt, idx);
        if (!tuple) {
            break;
        }
        const vals = splitTopLevel(tuple.body, ',').map(formatValue);
        table.totalRows++;
        if (table.rows.length < MAX_SAMPLE_ROWS) {
            if (colOrder) {
                const mapped = table.columns.map((c) => {
                    const p = colOrder.indexOf(c.name.toLowerCase());
                    return p >= 0 && p < vals.length ? vals[p] : 'NULL';
                });
                table.rows.push(mapped);
            } else {
                table.rows.push(vals);
            }
        }
        idx = tuple.end;
    }
};

/**
 * Whether a SQL setup script defines at least one table.
 *
 * @param {string} sql
 * @returns {boolean}
 */
export const hasSqlSchema = (sql) => CREATE_RE.test(String(sql || ''));

/**
 * Parse a SQL setup script into structured table definitions and sample rows.
 *
 * @param {string} sql
 * @returns {{tables: Array<Object>}}
 */
export const parseSqlSchema = (sql) => {
    const clean = stripComments(String(sql || ''));
    const statements = splitTopLevel(clean, ';');
    const tables = [];
    const byName = new Map();
    statements.forEach((stmt) => {
        if (/^\s*CREATE\s+(?:TEMPORARY\s+)?TABLE\b/i.test(stmt)) {
            const table = parseCreateTable(stmt);
            if (table && table.columns.length) {
                tables.push(table);
                byName.set(table.name.toLowerCase(), table);
            }
        } else if (/^\s*INSERT\s+/i.test(stmt)) {
            parseInsert(stmt, byName);
        }
    });
    return {tables};
};

/**
 * Load UI strings for the SQL schema panel once.
 *
 * @returns {Promise<Object<string, string>>}
 */
const loadStrings = async() => {
    if (!cachedStrings) {
        const keys = ['sqlschema', 'sqlschemarows', 'sqlschemamore', 'sqlschemafk'];
        const values = await getStrings(keys.map((key) => ({key, component})));
        cachedStrings = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    }
    return cachedStrings;
};

/**
 * Build a single table card DOM element.
 *
 * @param {Object} table
 * @param {Object<string, string>} s
 * @returns {HTMLElement}
 */
const buildCard = (table, s) => {
    const card = document.createElement('div');
    card.className = 'tiny_codelab-sqlschema-card';

    const head = document.createElement('div');
    head.className = 'tiny_codelab-sqlschema-head';
    const title = document.createElement('span');
    title.className = 'tiny_codelab-sqlschema-name font-monospace';
    title.textContent = table.name;
    head.append(title);
    if (table.totalRows > 0) {
        const count = document.createElement('span');
        count.className = 'tiny_codelab-sqlschema-count';
        count.textContent = s.sqlschemarows.replace('{$a}', String(table.totalRows));
        head.append(count);
    }
    card.append(head);

    const cols = document.createElement('div');
    cols.className = 'tiny_codelab-sqlschema-cols';
    table.columns.forEach((col) => {
        const item = document.createElement('span');
        item.className = 'tiny_codelab-sqlschema-col font-monospace';
        const cname = document.createElement('span');
        cname.className = 'tiny_codelab-sqlschema-colname';
        cname.textContent = col.name;
        const ctype = document.createElement('span');
        ctype.className = 'tiny_codelab-sqlschema-coltype';
        ctype.textContent = col.type;
        item.append(cname, ctype);
        if (col.pk) {
            const pk = document.createElement('span');
            pk.className = 'tiny_codelab-sqlschema-badge tiny_codelab-sqlschema-pk';
            pk.textContent = 'PK';
            item.append(pk);
        }
        if (col.fk) {
            const fk = document.createElement('span');
            fk.className = 'tiny_codelab-sqlschema-badge tiny_codelab-sqlschema-fk';
            fk.textContent = 'FK';
            item.append(fk);
        }
        cols.append(item);
    });
    card.append(cols);

    if (table.foreignKeys.length) {
        const fks = document.createElement('div');
        fks.className = 'tiny_codelab-sqlschema-fks small';
        fks.textContent = table.foreignKeys
            .map((fk) => `${fk.column} \u2192 ${s.sqlschemafk.replace('{$a}', `${fk.refTable}.${fk.refColumn}`)}`)
            .join(' \u00b7 ');
        card.append(fks);
    }

    if (table.rows.length) {
        const wrap = document.createElement('div');
        wrap.className = 'tiny_codelab-sqlschema-scroll';
        const tbl = document.createElement('table');
        tbl.className = 'table table-sm mb-0 tiny_codelab-sqlschema-table';
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        table.columns.forEach((c) => {
            const th = document.createElement('th');
            th.textContent = c.name;
            trHead.append(th);
        });
        thead.append(trHead);
        const tbody = document.createElement('tbody');
        table.rows.forEach((row) => {
            const tr = document.createElement('tr');
            table.columns.forEach((_, idx) => {
                const td = document.createElement('td');
                td.textContent = idx < row.length ? row[idx] : '';
                tr.append(td);
            });
            tbody.append(tr);
        });
        tbl.append(thead, tbody);
        wrap.append(tbl);
        card.append(wrap);
        if (table.totalRows > table.rows.length) {
            const more = document.createElement('div');
            more.className = 'tiny_codelab-sqlschema-more small';
            more.textContent = s.sqlschemamore.replace('{$a}', String(table.totalRows - table.rows.length));
            card.append(more);
        }
    }

    return card;
};

/**
 * Render the SQL schema and sample-rows cards into the given panel element.
 *
 * @param {HTMLElement} panel
 * @param {string} sql
 * @returns {Promise<boolean>} true if at least one table was rendered
 */
export const renderSqlSchema = async(panel, sql) => {
    const {tables} = parseSqlSchema(sql);
    panel.replaceChildren();
    if (!tables.length) {
        return false;
    }
    const s = await loadStrings();
    const grid = document.createElement('div');
    grid.className = 'tiny_codelab-sqlschema-grid';
    tables.forEach((t) => grid.append(buildCard(t, s)));
    panel.append(grid);
    return true;
};
