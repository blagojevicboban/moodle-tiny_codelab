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
 * Turtle graphics for Python in the browser: the module `turtle` of the program (Python, run by Pyodide in the worker,
 * as the real module needs Tk) and the drawing panel under the console, which shows the events the module sends.
 *
 * The module follows the standard one: the turtle starts at (0, 0) looking east, y goes up, angles in degrees, and the
 * usual functions and Turtle / Screen methods (forward, left, circle, goto, penup, color, begin_fill, dot, write,
 * speed, bgcolor ...). Lines are drawn with a short animation that follows speed() (0: at once).
 *
 * @module     tiny_codelab/turtle
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Most lines drawn; a longer drawing keeps its first lines and says so. */
export const MAX_LINES = 20000;

/**
 * The Python module (source). It sends its events in batches through js.codelab.turtle(json); _flush() is called by
 * the harness before input(), before every Step stop and at the end of the program.
 */
export const TURTLE_PY = [
    'import math, json, js',
    '',
    '_buf = []',
    '_screen_state = {"colormode": 1.0}',
    '',
    'class TurtleGraphicsError(Exception):',
    '    pass',
    '',
    'class Terminator(Exception):',
    '    pass',
    '',
    'def _flush():',
    '    if _buf:',
    '        js.codelab.turtle(json.dumps(_buf))',
    '        _buf.clear()',
    '',
    'def _send(ev):',
    '    _buf.append(ev)',
    '    if len(_buf) >= 200:',
    '        _flush()',
    '',
    'def _color(args):',
    '    c = args[0] if len(args) == 1 else args',
    '    if isinstance(c, str):',
    '        return c.replace(" ", "")',
    '    try:',
    '        r, g, b = c',
    '        k = 255 / _screen_state["colormode"]',
    '        return "#%02x%02x%02x" % (round(r * k), round(g * k), round(b * k))',
    '    except Exception:',
    '        raise TurtleGraphicsError("bad color: " + repr(c))',
    '',
    'class Turtle:',
    '    _count = 0',
    '',
    '    def __init__(self, shape="classic", undobuffersize=1000, visible=True):',
    '        Turtle._count += 1',
    '        self._id = Turtle._count',
    '        self._x = 0.0',
    '        self._y = 0.0',
    '        self._h = 0.0',
    '        self._down = True',
    '        self._pen = "black"',
    '        self._fill = "black"',
    '        self._w = 1',
    '        self._speed = 3',
    '        self._shown = bool(visible)',
    '        self._poly = None',
    '        self._ev("turtle")',
    '',
    '    def _ev(self, kind, **extra):',
    '        ev = {"t": kind, "id": self._id, "x": self._x, "y": self._y, "h": self._h, "c": self._pen,',
    '              "v": self._shown, "s": self._speed}',
    '        ev.update(extra)',
    '        _send(ev)',
    '',
    '    def _go(self, x, y, event=True):',
    '        x1, y1 = self._x, self._y',
    '        self._x, self._y = float(x), float(y)',
    '        if self._poly is not None:',
    '            self._poly.append([self._x, self._y])',
    '        if self._down:',
    '            self._ev("line", x1=x1, y1=y1, w=self._w)',
    '        elif event:',
    '            self._ev("turtle")',
    '',
    '    def forward(self, distance):',
    '        a = math.radians(self._h)',
    '        self._go(self._x + distance * math.cos(a), self._y + distance * math.sin(a))',
    '    fd = forward',
    '',
    '    def back(self, distance):',
    '        self.forward(-distance)',
    '    bk = backward = back',
    '',
    '    def left(self, angle):',
    '        self._h = (self._h + angle) % 360',
    '        self._ev("turtle")',
    '    lt = left',
    '',
    '    def right(self, angle):',
    '        self.left(-angle)',
    '    rt = right',
    '',
    '    def goto(self, x, y=None):',
    '        if y is None:',
    '            x, y = x',
    '        self._go(x, y)',
    '    setpos = setposition = goto',
    '',
    '    def setx(self, x):',
    '        self._go(x, self._y)',
    '',
    '    def sety(self, y):',
    '        self._go(self._x, y)',
    '',
    '    def setheading(self, to_angle):',
    '        self._h = to_angle % 360',
    '        self._ev("turtle")',
    '    seth = setheading',
    '',
    '    def home(self):',
    '        self._go(0, 0)',
    '        self.setheading(0)',
    '',
    '    def circle(self, radius, extent=None, steps=None):',
    '        if extent is None:',
    '            extent = 360',
    '        if steps is None:',
    '            frac = abs(extent) / 360',
    '            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)',
    '        w = extent / steps',
    '        w2 = 0.5 * w',
    '        length = 2.0 * radius * math.sin(math.radians(w2))',
    '        if radius < 0:',
    '            length, w, w2 = -length, -w, -w2',
    '        self._h = (self._h + w2) % 360',
    '        for _ in range(steps):',
    '            a = math.radians(self._h)',
    '            self._go(self._x + length * math.cos(a), self._y + length * math.sin(a), False)',
    '            self._h = (self._h + w) % 360',
    '        self._h = (self._h - w2) % 360',
    '        self._ev("turtle")',
    '',
    '    def dot(self, size=None, *color):',
    '        if size is None:',
    '            size = max(self._w + 4, 2 * self._w)',
    '        self._ev("dot", r=size / 2, fc=_color(color) if color else self._pen)',
    '',
    '    def write(self, arg, move=False, align="left", font=("Arial", 8, "normal")):',
    '        size = font[1] if isinstance(font, (tuple, list)) and len(font) > 1 else 8',
    '        self._ev("text", text=str(arg), align=align, size=size)',
    '',
    '    def penup(self):',
    '        self._down = False',
    '    pu = up = penup',
    '',
    '    def pendown(self):',
    '        self._down = True',
    '    pd = down = pendown',
    '',
    '    def isdown(self):',
    '        return self._down',
    '',
    '    def pencolor(self, *args):',
    '        if not args:',
    '            return self._pen',
    '        self._pen = _color(args)',
    '        self._ev("turtle")',
    '',
    '    def fillcolor(self, *args):',
    '        if not args:',
    '            return self._fill',
    '        self._fill = _color(args)',
    '',
    '    def color(self, *args):',
    '        if not args:',
    '            return self._pen, self._fill',
    '        if len(args) == 2 and not all(isinstance(a, (int, float)) for a in args):',
    '            self._pen, self._fill = _color(args[:1]), _color(args[1:])',
    '        else:',
    '            self._pen = self._fill = _color(args)',
    '        self._ev("turtle")',
    '',
    '    def pensize(self, width=None):',
    '        if width is None:',
    '            return self._w',
    '        self._w = width',
    '    width = pensize',
    '',
    '    def speed(self, speed=None):',
    '        if speed is None:',
    '            return self._speed',
    '        names = {"fastest": 0, "fast": 10, "normal": 6, "slow": 3, "slowest": 1}',
    '        speed = names.get(speed, speed)',
    '        self._speed = int(speed) if 0.5 <= speed <= 10.5 else 0',
    '',
    '    def hideturtle(self):',
    '        self._shown = False',
    '        self._ev("turtle")',
    '    ht = hideturtle',
    '',
    '    def showturtle(self):',
    '        self._shown = True',
    '        self._ev("turtle")',
    '    st = showturtle',
    '',
    '    def isvisible(self):',
    '        return self._shown',
    '',
    '    def position(self):',
    '        return (round(self._x, 10), round(self._y, 10))',
    '    pos = position',
    '',
    '    def xcor(self):',
    '        return round(self._x, 10)',
    '',
    '    def ycor(self):',
    '        return round(self._y, 10)',
    '',
    '    def heading(self):',
    '        return self._h',
    '',
    '    def distance(self, x, y=None):',
    '        if y is None:',
    '            x, y = x',
    '        return math.hypot(x - self._x, y - self._y)',
    '',
    '    def towards(self, x, y=None):',
    '        if y is None:',
    '            x, y = x',
    '        return math.degrees(math.atan2(y - self._y, x - self._x)) % 360',
    '',
    '    def begin_fill(self):',
    '        self._poly = [[self._x, self._y]]',
    '',
    '    def end_fill(self):',
    '        if self._poly is not None and len(self._poly) > 2:',
    '            self._ev("fill", pts=self._poly, fc=self._fill)',
    '        self._poly = None',
    '',
    '    def filling(self):',
    '        return self._poly is not None',
    '',
    '    def clear(self):',
    '        self._ev("clear")',
    '',
    '    def reset(self):',
    '        self._x = self._y = self._h = 0.0',
    '        self._down = True',
    '        self._pen = self._fill = "black"',
    '        self._w = 1',
    '        self._ev("clear")',
    '',
    '    def shape(self, name=None):',
    '        return "classic"',
    '',
    '    def stamp(self):',
    '        return 0',
    '',
    '    def getscreen(self):',
    '        return _screen',
    '',
    '    def degrees(self, fullcircle=360.0):',
    '        pass',
    '',
    'RawTurtle = Pen = Turtle',
    '',
    'class _Screen:',
    '    def bgcolor(self, *args):',
    '        if args:',
    '            _send({"t": "bg", "c": _color(args)})',
    '',
    '    def colormode(self, cmode=None):',
    '        if cmode is None:',
    '            return _screen_state["colormode"]',
    '        _screen_state["colormode"] = float(cmode)',
    '',
    '    def _nothing(self, *args, **kwargs):',
    '        return None',
    '',
    '    setup = title = tracer = update = exitonclick = mainloop = done = bye = listen = delay = _nothing',
    '    onkey = onkeypress = onclick = onscreenclick = ontimer = screensize = _nothing',
    '',
    '_screen = _Screen()',
    '',
    'def Screen():',
    '    return _screen',
    '',
    '_turtle = []',
    '',
    'def _get():',
    '    if not _turtle:',
    '        _turtle.append(Turtle())',
    '    return _turtle[0]',
    '',
    'def getturtle():',
    '    return _get()',
    'getpen = getturtle',
    '',
    'def _module_function(name):',
    '    def f(*args, **kwargs):',
    '        return getattr(_get(), name)(*args, **kwargs)',
    '    f.__name__ = name',
    '    return f',
    '',
    'for _name in ["forward", "fd", "back", "bk", "backward", "left", "lt", "right", "rt", "goto", "setpos",',
    '              "setposition", "setx", "sety", "setheading", "seth", "home", "circle", "dot", "write", "penup",',
    '              "pu", "up", "pendown", "pd", "down", "isdown", "pencolor", "fillcolor", "color", "pensize",',
    '              "width", "speed", "hideturtle", "ht", "showturtle", "st", "isvisible", "position", "pos", "xcor",',
    '              "ycor", "heading", "distance", "towards", "begin_fill", "end_fill", "filling", "clear", "reset",',
    '              "shape", "stamp", "degrees"]:',
    '    globals()[_name] = _module_function(_name)',
    '',
    'for _name in ["bgcolor", "colormode", "setup", "title", "tracer", "update", "exitonclick", "mainloop", "done",',
    '              "bye", "listen", "delay", "onkey", "onkeypress", "onclick", "onscreenclick", "ontimer", "screensize"]:',
    '    globals()[_name] = getattr(_screen, _name)',
].join('\n');

const NS = 'http://www.w3.org/2000/svg';

const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    return e;
};

const round = (v) => Math.round(v * 100) / 100;

/**
 * A colour of the program as SVG understands it: CSS names and #rrggbb; anything else black.
 *
 * @param {string} c
 * @returns {string}
 */
export const cssColor = (c) => (typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30})$/.test(c) ? c : 'black');

/**
 * Lines per animation frame for a speed of the turtle (0: all at once).
 *
 * @param {number} speed 0 to 10
 * @returns {number}
 */
export const linesPerFrame = (speed) => (speed > 0 ? Math.max(1, Math.round(speed)) : Infinity);

export class TurtleView {
    /**
     * The drawing panel (not on the page until the first event).
     *
     * @param {Object<string, string>} s strings turtle and turtlelimit
     */
    constructor(s) {
        this.s = s;
        this.root = document.createElement('div');
        this.root.className = 'tiny_codelab-turtle';
        this.svg = svgEl('svg', {'class': 'tiny_codelab-turtle-svg', role: 'img', 'aria-label': s.turtle});
        this.fills = svgEl('g');
        this.lines = svgEl('g', {'stroke-linecap': 'round'});
        this.marks = svgEl('g');
        this.turtles = svgEl('g');
        this.svg.append(this.fills, this.lines, this.marks, this.turtles);
        this.note = document.createElement('p');
        this.note.className = 'tiny_codelab-turtle-note';
        this.note.hidden = true;
        this.root.append(this.svg, this.note);
        this.queue = [];
        this.count = 0;
        this.markers = new Map();
        this.bounds = {x1: -200, y1: -150, x2: 200, y2: 150};
        this.frame = null;
        this.fit();
    }

    /**
     * Take a batch of events of the program; they are drawn over the next animation frames.
     *
     * @param {Array<Object>} events
     */
    add(events) {
        this.queue.push(...events);
        if (!this.frame) {
            this.frame = (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16))(
                () => this.tick());
        }
    }

    /**
     * Draw the events of one frame: lines up to the speed of the turtle, other events as they come.
     */
    tick() {
        this.frame = null;
        let budget = null;
        while (this.queue.length) {
            const ev = this.queue[0];
            if (ev.t === 'line') {
                budget = budget === null ? linesPerFrame(ev.s) : budget;
                if (budget <= 0) {
                    break;
                }
                budget--;
            }
            this.queue.shift();
            this.apply(ev);
        }
        this.fit();
        if (this.queue.length && this.root.isConnected) {
            this.add([]);
        } else if (!this.root.isConnected) {
            this.queue = [];
        }
    }

    /**
     * Draw all events still waiting (the program ended, or a test).
     */
    flush() {
        this.queue.splice(0).forEach((ev) => this.apply(ev));
        this.fit();
    }

    /**
     * Show one event.
     *
     * @param {Object} ev
     */
    apply(ev) {
        const id = String(ev.id ?? 0);
        switch (ev.t) {
            case 'line':
                if (this.count < MAX_LINES) {
                    this.lines.append(svgEl('line', {x1: round(ev.x1), y1: round(-ev.y1), x2: round(ev.x), y2: round(-ev.y),
                        stroke: cssColor(ev.c), 'stroke-width': Math.max(0.5, Number(ev.w) || 1), 'data-id': id}));
                    this.grow(ev.x1, ev.y1);
                } else {
                    this.note.textContent = this.s.turtlelimit.replace('{$a}', String(MAX_LINES));
                    this.note.hidden = false;
                }
                this.count++;
                break;
            case 'fill':
                this.fills.append(svgEl('polygon', {points: ev.pts.map(([x, y]) => `${round(x)},${round(-y)}`).join(' '),
                    fill: cssColor(ev.fc), 'data-id': id}));
                break;
            case 'dot':
                this.marks.append(svgEl('circle', {cx: round(ev.x), cy: round(-ev.y), r: Math.max(0.5, ev.r),
                    fill: cssColor(ev.fc), 'data-id': id}));
                break;
            case 'text': {
                const anchor = {center: 'middle', right: 'end'}[ev.align] || 'start';
                const text = svgEl('text', {x: round(ev.x), y: round(-ev.y), 'font-size': Math.max(6, ev.size * 1.33),
                    fill: cssColor(ev.c), 'text-anchor': anchor, 'data-id': id});
                text.textContent = ev.text;
                this.marks.append(text);
                break;
            }
            case 'clear':
                this.svg.querySelectorAll(`[data-id="${id}"]`).forEach((e) => e.remove());
                break;
            case 'bg':
                this.svg.style.backgroundColor = cssColor(ev.c);
                return;
        }
        this.grow(ev.x, ev.y);
        this.place(id, ev);
    }

    /**
     * Grow the drawn area to a point.
     *
     * @param {number} x
     * @param {number} y
     */
    grow(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }
        const b = this.bounds;
        b.x1 = Math.min(b.x1, x);
        b.y1 = Math.min(b.y1, y);
        b.x2 = Math.max(b.x2, x);
        b.y2 = Math.max(b.y2, y);
    }

    /**
     * Move the mark of a turtle (an arrow head pointing to its heading).
     *
     * @param {string} id
     * @param {{x: number, y: number, h: number, c: string, v: boolean}} ev
     */
    place(id, ev) {
        let mark = this.markers.get(id);
        if (!mark) {
            mark = svgEl('polygon', {points: '9,0 -7,6 -3,0 -7,-6', 'class': 'tiny_codelab-turtle-marker'});
            this.markers.set(id, mark);
            this.turtles.append(mark);
        }
        // The heading goes counter-clockwise from east; SVG rotates clockwise with y down.
        mark.setAttribute('transform', `translate(${round(ev.x)},${round(-ev.y)}) rotate(${round(-ev.h)})`);
        mark.setAttribute('fill', cssColor(ev.c));
        mark.style.display = ev.v === false ? 'none' : '';
    }

    /**
     * Fit the view to the drawing.
     */
    fit() {
        const b = this.bounds;
        const pad = 20;
        this.svg.setAttribute('viewBox', `${round(b.x1 - pad)} ${round(-b.y2 - pad)} ${round(b.x2 - b.x1 + 2 * pad)} ` +
            `${round(b.y2 - b.y1 + 2 * pad)}`);
    }
}
