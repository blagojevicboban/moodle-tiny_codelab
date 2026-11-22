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
 * Tests of tiny_codelab/turtle: the Python module of turtle graphics (run with the Python of the machine and a stub of
 * the module js of Pyodide) and the helpers of the drawing panel.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {TURTLE_PY, cssColor, linesPerFrame} from '../amd/src/turtle.js';

const python = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);

/**
 * Run a program that uses the module and return the events it sent.
 *
 * @param {string} program
 * @returns {Array<Object>}
 */
const events = (program) => {
    const harness = [
        'import sys, types, json',
        'sent = []',
        'js = types.ModuleType("js")',
        'js.codelab = types.SimpleNamespace(turtle=lambda text: sent.extend(json.loads(text)))',
        'sys.modules["js"] = js',
        'm = types.ModuleType("turtle")',
        'exec(compile(sys.stdin.read().split("#--PROGRAM--")[0], "<turtle>", "exec"), m.__dict__)',
        'sys.modules["turtle"] = m',
        'exec(sys.argv[1])',
        'm._flush()',
        'print(json.dumps(sent))',
    ].join('\n');
    const result = spawnSync(python, ['-c', harness, program], {input: TURTLE_PY + '\n#--PROGRAM--\n', encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
};

const near = (a, b) => Math.abs(a - b) < 1e-6;

test('a square: four lines, back home looking east', {skip: !python && 'no Python'}, () => {
    const ev = events('import turtle\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)');
    const lines = ev.filter((e) => e.t === 'line');
    assert.equal(lines.length, 4);
    assert.ok(near(lines[0].x, 100) && near(lines[0].y, 0));
    assert.ok(near(lines[1].x, 100) && near(lines[1].y, 100));
    const last = ev[ev.length - 1];
    assert.ok(near(last.x, 0) && near(last.y, 0) && near(last.h, 0));
});

test('circle, colours, pen up, fill, dot and text', {skip: !python && 'no Python'}, () => {
    const ev = events([
        'from turtle import *',
        't = Turtle()',
        't.color("red", "yellow")',
        't.begin_fill()',
        't.circle(50)',
        't.end_fill()',
        't.penup()',
        't.goto(0, 120)',
        't.pendown()',
        't.pensize(3)',
        't.dot(10, "blue")',
        'colormode(255)',
        't.pencolor(0, 128, 255)',
        't.write("Hi", align="center", font=("Arial", 12, "bold"))',
        'bgcolor("light blue")',
        'speed(0)',
        'forward(10)',
    ].join('\n'));
    const circle = ev.filter((e) => e.t === 'line' && e.c === 'red');
    assert.ok(circle.length > 10, `${circle.length} segments`);
    // A circle ends where it started.
    assert.ok(Math.abs(circle[circle.length - 1].x) < 1e-6 && Math.abs(circle[circle.length - 1].y) < 1e-6);
    const fill = ev.find((e) => e.t === 'fill');
    assert.equal(fill.fc, 'yellow');
    assert.equal(fill.pts.length, circle.length + 1);
    // Moving with the pen up draws no line.
    assert.ok(!ev.some((e) => e.t === 'line' && near(e.y, 120)));
    assert.equal(ev.find((e) => e.t === 'dot').fc, 'blue');
    const text = ev.find((e) => e.t === 'text');
    assert.equal(text.text, 'Hi');
    assert.equal(text.c, '#0080ff');
    assert.equal(text.size, 12);
    assert.equal(ev.find((e) => e.t === 'bg').c, 'lightblue');
    // The module functions use another turtle (the first one made by them), with speed 0.
    const last = ev.filter((e) => e.t === 'line').pop();
    assert.equal(last.s, 0);
    assert.notEqual(last.id, text.id);
});

test('position, heading and distance answer like the standard module', {skip: !python && 'no Python'}, () => {
    const ev = events([
        'import turtle',
        'turtle.left(45)',
        'turtle.forward(2 ** 0.5)',
        'x, y = turtle.position()',
        'assert abs(x - 1) < 1e-9 and abs(y - 1) < 1e-9, (x, y)',
        'assert turtle.heading() == 45',
        'assert abs(turtle.distance(0, 0) - 2 ** 0.5) < 1e-9',
        'assert abs(turtle.towards(1, 2) - 90) < 1e-9',
        'turtle.done()',
    ].join('\n'));
    assert.ok(ev.length > 0);
});

test('colours for SVG and lines per frame', () => {
    assert.equal(cssColor('red'), 'red');
    assert.equal(cssColor('#ff8800'), '#ff8800');
    assert.equal(cssColor('url(javascript:1)'), 'black');
    assert.equal(cssColor(undefined), 'black');
    assert.equal(linesPerFrame(0), Infinity);
    assert.equal(linesPerFrame(3), 3);
    assert.equal(linesPerFrame(10), 10);
});
