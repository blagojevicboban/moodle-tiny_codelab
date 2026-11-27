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
 * Unit tests for tiny_codelab/sqlschema.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSqlSchema, parseSqlSchema} from '../amd/src/sqlschema.js';

test('hasSqlSchema detects CREATE TABLE and ignores plain queries', () => {
    assert.equal(hasSqlSchema('CREATE TABLE book (id INT PRIMARY KEY);'), true);
    assert.equal(hasSqlSchema('create temporary table if not exists tmp (x int);'), true);
    assert.equal(hasSqlSchema('SELECT * FROM book;'), false);
    assert.equal(hasSqlSchema(''), false);
});

test('parseSqlSchema parses columns, PK, FK, comments and sample rows (capped at 5)', () => {
    const sql = `
        -- Authors table
        CREATE TABLE author (
            id INT PRIMARY KEY,
            name VARCHAR(60) NOT NULL
        );
        /* Books with FK and composite values */
        CREATE TABLE \`book\` (
            id INT,
            title VARCHAR(80),
            author_id INT,
            price DECIMAL(8, 2),
            PRIMARY KEY (id),
            FOREIGN KEY (author_id) REFERENCES author(id)
        );
        INSERT INTO author VALUES (1, 'Ivo Andric'), (2, 'Mesa Selimovic');
        INSERT INTO book (id, title, author_id, price) VALUES
            (1, 'Na Drini, cuprija', 1, 12.50),
            (2, 'Prokleta avlija', 1, 9.00),
            (3, 'Dervis i smrt', 2, 11.20),
            (4, 'Tvrdjava', 2, 10.00),
            (5, 'Ostrvo', 2, 8.50),
            (6, 'Znakovi pored puta', 1, 14.00);
    `;
    const {tables} = parseSqlSchema(sql);
    assert.equal(tables.length, 2);

    const [author, book] = tables;
    assert.equal(author.name, 'author');
    assert.equal(author.columns.length, 2);
    assert.equal(author.columns[0].pk, true);
    assert.equal(author.columns[1].notNull, true);
    assert.equal(author.totalRows, 2);
    assert.deepEqual(author.rows[0], ['1', 'Ivo Andric']);

    assert.equal(book.name, 'book');
    assert.equal(book.columns[0].pk, true);
    assert.equal(book.columns[2].fk, true);
    assert.equal(book.columns[3].type, 'DECIMAL(8, 2)');
    assert.deepEqual(book.foreignKeys, [{column: 'author_id', refTable: 'author', refColumn: 'id'}]);
    assert.equal(book.totalRows, 6);
    assert.equal(book.rows.length, 5);
    assert.deepEqual(book.rows[0], ['1', 'Na Drini, cuprija', '1', '12.50']);
});

test('parseSqlSchema maps named INSERT columns and NULL values', () => {
    const sql = `
        CREATE TABLE item (id INT PRIMARY KEY, label VARCHAR(20), note VARCHAR(20));
        INSERT INTO item (label, id) VALUES ('O''Brien', 7);
    `;
    const {tables} = parseSqlSchema(sql);
    assert.equal(tables.length, 1);
    assert.deepEqual(tables[0].rows[0], ['7', "O'Brien", 'NULL']);
});
