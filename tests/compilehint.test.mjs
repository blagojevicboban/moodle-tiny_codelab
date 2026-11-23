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
 * Unit tests for tiny_codelab/compilehint (40 GCC/Clang compiler and linker error patterns).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PATTERNS, parseCompilerErrors, firstErrorLine} from '../amd/src/compilehint.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLES = [
    ['semicolon', "prog.c:4:15: error: expected ';' before 'return'"],
    ['no_header', 'prog.c:1:10: fatal error: stdoi.h: No such file or directory'],
    ['no_header', "prog.cpp:1:10: fatal error: 'iostrem' file not found"],
    ['unterminated_str', 'prog.c:5:12: error: missing terminating " character'],
    ['unterminated_comment', 'prog.c:3:1: error: unterminated comment'],
    ['stray_char', "prog.c:4:10: error: stray '\\342' in program"],
    ['undef_ref_main', "/usr/bin/ld: /tmp/cc.o: undefined reference to `main'"],
    ['undef_ref', "/usr/bin/ld: prog.c:(.text+0x15): undefined reference to `sqrt'"],
    ['multiple_def', "/usr/bin/ld: prog.o: multiple definition of `foo'"],
    ['else_without_if', "prog.c:7:5: error: 'else' without a previous 'if'"],
    ['break_outside', 'prog.c:6:5: error: break statement not within loop or switch'],
    ['continue_outside', 'prog.c:6:5: error: continue statement not within a loop'],
    ['duplicate_case', 'prog.c:8:9: error: duplicate case value'],
    ['case_not_const', 'prog.c:7:9: error: case label does not reduce to an integer constant'],
    ['implicit_decl', "prog.c:4:5: error: implicit declaration of function 'printf'"],
    ['implicit_decl', "prog.c:4:5: error: call to undeclared library function 'printf'"],
    ['undeclared', "prog.c:5:5: error: 'x' undeclared (first use in this function)"],
    ['undeclared', "prog.cpp:5:5: error: 'cout' was not declared in this scope"],
    ['undeclared', "prog.cpp:5:5: error: use of undeclared identifier 'x'"],
    ['unknown_type', "prog.c:3:1: error: unknown type name 'bool'"],
    ['unknown_type', "prog.cpp:3:1: error: 'string' does not name a type"],
    ['redefinition', "prog.c:6:9: error: redefinition of 'x'"],
    ['conflicting_types', "prog.c:8:5: error: conflicting types for 'sum'"],
    ['too_few_args', "prog.c:9:5: error: too few arguments to function 'add'"],
    ['too_many_args', "prog.c:9:5: error: too many arguments to function 'add'"],
    ['no_matching_fn', "prog.cpp:9:5: error: no matching function for call to 'sort(int&)'"],
    ['void_value', 'prog.c:7:13: error: void value not ignored as it ought to be'],
    ['return_in_void', "prog.cpp:4:12: error: return-statement with a value, in function returning 'void'"],
    ['return_no_value', "prog.cpp:4:5: error: return-statement with no value, in function returning 'int'"],
    ['const_assign', "prog.c:5:7: error: assignment of read-only variable 'n'"],
    ['array_assign', 'prog.c:5:7: error: assignment to expression with array type'],
    ['lvalue_required', 'prog.c:5:9: error: lvalue required as left operand of assignment'],
    ['not_a_function', "prog.c:6:13: error: called object 'a' is not a function or function pointer"],
    ['subscript_type', 'prog.c:5:12: error: subscripted value is neither array nor pointer nor vector'],
    ['member_arrow', "prog.c:8:12: error: request for member 'x' in something not a structure or union"],
    ['member_dot', "prog.c:8:12: error: invalid type argument of '->' (have 'struct P')"],
    ['no_member', "prog.cpp:8:7: error: 'struct P' has no member named 'z'"],
    ['pointer_deref', "prog.c:6:13: error: invalid type argument of unary '*' (have 'int')"],
    ['no_operator', "prog.cpp:5:10: error: no match for 'operator>>' (operand types are 'std::ostream' and 'int')"],
    ['invalid_operands', "prog.c:5:14: error: invalid operands to binary % (have 'double' and 'int')"],
    ['type_conversion', "prog.cpp:5:13: error: invalid conversion from 'const char*' to 'int'"],
    ['expected_paren', "prog.c:5:16: error: expected ')' before ';' token"],
    ['expected_bracket', "prog.c:4:12: error: expected ']' before ';' token"],
    ['expected_brace', 'prog.c:10:1: error: expected declaration or statement at end of input'],
    ['expected_expr', "prog.c:5:13: error: expected expression before ')' token"],
    ['semicolon', "prog.c:6:5: error: expected \u2018,\u2019 or \u2018;\u2019 before \u2018printf\u2019"],
];

test('all 40 patterns have unique keys and matching English lang strings', () => {
    assert.equal(PATTERNS.length, 40);
    assert.equal(new Set(PATTERNS.map((p) => p.key)).size, 40);
    const en = readFileSync(join(root, 'lang', 'en', 'tiny_codelab.php'), 'utf8');
    assert.ok(en.includes("$string['cmphint_title']"), 'missing cmphint_title');
    assert.ok(en.includes("$string['cmphint_line']"), 'missing cmphint_line');
    for (const p of PATTERNS) {
        assert.ok(en.includes(`$string['cmp_${p.key}']`), `missing lang string cmp_${p.key}`);
    }
});

test('every pattern matches real GCC and Clang diagnostics', () => {
    const covered = new Set();
    for (const [expectedKey, sample] of SAMPLES) {
        const res = parseCompilerErrors(sample);
        assert.equal(res.length, 1, `expected 1 match for: ${sample}`);
        assert.equal(res[0].key, expectedKey, `wrong key for: ${sample}`);
        covered.add(expectedKey);
    }
    assert.equal(covered.size, PATTERNS.length, 'every pattern should be covered by a test sample');
});

test('parseCompilerErrors deduplicates, extracts line numbers, and caps at maxHints', () => {
    const output = [
        "prog.c: In function 'main':",
        "prog.c:4:15: error: expected ';' before 'printf'",
        "prog.c:4:15: error: expected ';' before 'return'",
        "prog.c:5:5: error: 'x' undeclared (first use in this function)",
        'prog.c:5:5: note: each undeclared identifier is reported only once',
        "prog.c:6:9: error: redefinition of 'y'",
        "prog.c:7:5: error: 'else' without a previous 'if'",
    ].join('\n');
    const res = parseCompilerErrors(output);
    assert.deepEqual(res, [
        {key: 'semicolon', line: 4},
        {key: 'undeclared', line: 5},
        {key: 'redefinition', line: 6},
    ]);
    assert.equal(firstErrorLine(output), 4);
});

test('empty or warning-only output returns no hints', () => {
    assert.deepEqual(parseCompilerErrors(''), []);
    assert.deepEqual(parseCompilerErrors("prog.c:3:9: warning: unused variable 'x' [-Wunused-variable]"), []);
    assert.equal(firstErrorLine(''), 0);
});
