# CodeLab for TinyMCE (tiny_codelab)

[![Moodle Plugin CI](https://github.com/blagojevicboban/moodle-tiny_codelab/actions/workflows/ci.yml/badge.svg)](https://github.com/blagojevicboban/moodle-tiny_codelab/actions/workflows/ci.yml)
[![Moodle](https://img.shields.io/badge/Moodle-4.5%20to%205.3-orange.svg)](https://moodle.org)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-purple.svg)](https://php.net)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

**CodeLab** adds runnable program examples to Moodle. With this TinyMCE plugin, teachers insert an example into any text.
The example is written in the code editor of VS Code ([Monaco](https://microsoft.github.io/monaco-editor/)).
Readers can then edit and run it on the page (with [filter_codelab](https://github.com/blagojevicboban/moodle-filter_codelab)).

Languages: **C**, **C++**, **Python**, **Java**, **C#**, **JavaScript** (Node.js), **Pascal** and **PHP**.

This plugin is also the core of the CodeLab plugins. The filter and the question type use its editor, its runner and its
Jobe client.

> Status: **stable** (1.4.0).

## Features

- **Code editor** with syntax highlighting, line numbers, brackets and search, as in VS Code.
- **Typing help** for every language:
  - keywords;
  - snippets (`main`, `for`, `if`...);
  - library functions with their parameters (`printf`, `Console.WriteLine`, `Math.`...);
  - members of strings, lists and `Scanner`.

  It can be turned off for a single example (for tests).
- **Python typing help from [Jedi](https://jedi.readthedocs.io)**, when Python in the browser is on:
  - completion of everything Python knows, also the methods of the reader's own variables;
  - the parameters of the reader's own functions while a call is typed;
  - syntax errors marked in the editor.

  Jedi runs in Pyodide in its own worker and loads when the reader first types. Until then, the help above is used.
- **Run** from the dialog with an input field. Programs are compiled and run on a
  [Jobe](https://github.com/trampgeek/jobe) server.
- **Python in the browser** ([Pyodide](https://pyodide.org)):
  - `input()` asks for the input while the program runs;
  - **Step** runs the program line by line and shows its variables;
  - **Stop** also ends an endless loop.

  It needs a browser with JavaScript Promise Integration (Chrome and Edge 137+). Other browsers use Jobe.
- **Default input** of an example: readers start from it.
- Rate limit of runs per user, and a size limit of programs.

## Markup

An example is a `pre` element whose settings are class names, because Moodle's HTML cleaning keeps class names:

```html
<pre class="codelab codelab-lang-c codelab-run">#include <stdio.h> ...</pre>
<pre class="codelab-stdin">3 4</pre>
```

| Class | Meaning |
|---|---|
| `codelab-lang-…` | `c`, `cpp`, `python`, `java`, `csharp`, `javascript`, `pascal` or `php` |
| `codelab-run` | readers can edit and run the example (without it, the code is only shown) |
| `codelab-noassist` | no typing help, only syntax highlighting |
| `codelab-stdin` | the default input, in its own `pre` right after the example |

## Settings

*Site administration → Plugins → Text editors → TinyMCE editor → CodeLab*

| Setting | Default | Meaning |
|---|---|---|
| Jobe server | (empty) | Address of the Jobe server, for example `https://jobe.example.org` |
| Jobe API key | (empty) | Key sent in the `X-API-KEY` header |
| State of the Jobe server | | Shows whether the server answers, its languages, and whether a test program is accepted |
| Languages | all | Languages teachers can choose; those the Jobe server does not have are left out (Python not, when it runs in the browser) |
| CPU time | 5 s | Time limit of one run |
| Python in the browser | on | Run Python with Pyodide in the reader's browser |
| Address of Pyodide | (empty: jsDelivr) | Folder with a copy of Pyodide on your own server |
| Runs per minute | 20 | Rate limit of runs per user |
| Address of the interactive server | (empty) | WebSocket address of a [CodeLab runner](https://github.com/blagojevicboban/codelab-runner), for example `wss://runner.example.org` |
| Secret of the interactive server | (empty) | The secret shared with the runner (`CODELAB_SECRET`) |
| State of the interactive server | | Shows whether the runner answers and its languages |

C and C++ are compiled without warnings as errors (`-w`) and with the maths library (`-lm`). The Visual Studio functions
`scanf_s`, `fscanf_s`, `sscanf_s`, `printf_s` and `fprintf_s` are mapped to the standard ones.

## Interactive programs (optional)

Jobe gets the whole input before the run and returns the output at the end, so a program cannot ask for its input while
it runs. With a [CodeLab runner](https://github.com/blagojevicboban/codelab-runner) beside Jobe, **Run** of C, C++, Java and C# programs keeps the
program running: the prompts appear in the console and the reader types the input line by line, as in a terminal
(*End of input* or Ctrl+D closes it). **Step** runs C and C++ line by line there (gdb on the runner): the line that
runs next is marked and the variables of the function are shown, as for Python. This works in the editor dialog, in examples (filter_codelab) and in the attempt of a
question (qtype_codelab). The text in the input field is sent first. Grading and *Run the tests* stay on Jobe.

The runner is a small Node.js server that runs each program in a bubblewrap sandbox; see its README for the
installation. Moodle gives the browser a signed token for one session, valid for 60 seconds.

## SQL (optional)

With a CodeLab runner that has MariaDB, the language **MySQL (MariaDB)** is offered. An SQL example has a hidden
*setup* (the tables and data, a field of the dialog) that runs before the reader's SQL; the result is shown as by the
mysql client. Every run gets a fresh database with the same data. qtype_codelab grades SQL questions on the runner.

## Step and the debugger

**Step** runs a program line by line: Python in the browser, C and C++ on the CodeLab runner (gdb). The line that runs
next is marked in the editor, and the debugger panel below the console shows:

- **Step over** (a call runs without stopping in it), **Step out** (to the end of the current function) and
  **Auto step** with a speed slider; **Run** while paused goes on to the next breakpoint or the end;
- the **call stack**, innermost call first: a click on a call shows its variables (useful for recursion);
- the **variables** of the function, the changed ones marked;
- the **trace table**: the line and the values after each step.

A click left of a line number sets or removes a **breakpoint** (a red dot); Run then stops there, also without Step.

## Manual

The [CodeLab manual](docs/MANUAL.md) covers the three plugins for teachers, students and administrators:
examples, quiz questions, Step and the debugger, settings, the CodeLab runner and the error messages.

## Installation

1. Install **tiny_codelab** first, then **filter_codelab** and **qtype_codelab**.
2. In the settings of tiny_codelab, set the address and the API key of your Jobe server.
3. **Important: switch the filter on.** Go to *Site administration → Plugins → Filters → Manage filters* and set
   **CodeLab** to **On**. Until the filter is on, readers see the examples as plain code: they cannot edit or run them.

## Requirements

- Moodle 4.5 to 5.3
- PHP 8.2+
- A Jobe server for running programs (Python in the browser works without it)

## The CodeLab plugins

| Plugin | What it does |
|---|---|
| **tiny_codelab** (this plugin) | Inserts examples in the TinyMCE editor; the core of the others |
| [filter_codelab](https://github.com/blagojevicboban/moodle-filter_codelab) | Turns examples into code editors that readers can edit and run |
| [qtype_codelab](https://github.com/blagojevicboban/moodle-qtype_codelab) | Programming question: the student's program is graded on the teacher's tests |

Install tiny_codelab first.

## Privacy

Programs and their input are sent to the Jobe server set by the administrator. Nothing is stored in Moodle.
When Python runs in the browser, the reader's browser downloads Pyodide from the address in the settings. By default that
is the jsDelivr CDN. The browser does not send the program or its input there.

## Third-party libraries

- [Monaco Editor](https://github.com/microsoft/monaco-editor) 0.57.0, MIT. It is bundled in `thirdparty/monaco`, with
  the CodeLab languages only. Build it with `devtools/codelab-monaco/build.sh`.
- [Pyodide](https://pyodide.org) 314.0.7, MPL 2.0, with its Jedi package (MIT). They are not bundled: the browser
  loads them from the address in the settings.

## License

GNU GPL v3 or later. © 2026 Boban Blagojević
