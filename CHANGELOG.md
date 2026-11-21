# Changelog

## 1.13.4 (2026-11-21)

Fixes for the Moodle Plugins review:

- The speed test on the page Test the servers sends its runs through Moodle's HTTP client instead of calling curl
  directly, so the proxy settings of the site apply (#2).
- The arrows of the memory view and the icons of the toolbar are built as SVG elements, not from HTML strings (#3).
- The description says who provides the optional hosted runner, that it is a paid plan and where to ask for a key (#4).

## 1.13.3 (2026-11-20)

- Zoom in the code editor: Ctrl + mouse wheel (or a touchpad pinch), Ctrl + plus, Ctrl + minus and Ctrl + 0 for the
  default size. The block grows with the text, all editors on the page follow, and the browser remembers the size.
  The browser no longer zooms the whole page when Ctrl + wheel is used over an editor.
- Alt+Z turns word wrap on and off, as in Visual Studio Code; remembered like the zoom.
- Sticky scroll (the lines of the enclosing function and loop stay on top while scrolling), coloured bracket pairs and
  a guide line for the brackets around the cursor.
- Tooltips in the code editor, when the mouse rests on the code:
  - while a program is followed step by step, the value of a variable at the shown step (also when an older step is
    shown with Step back);
  - help for beginners on keywords (for, while, int, double, def, range ...), operators (= and ==, %, &&, ++, &, / between
    whole numbers, // and ** in Python) and on every part of a printf / scanf format such as %5.2lf (width, precision,
    & in scanf, %lf for double);
  - whole numbers in decimal, hexadecimal, binary and octal, and the code of a character such as 'A'.
  Help and numbers follow the typing help: a block or question without typing help shows only the values of a step.
  The texts are in English, Serbian Latin and Serbian Cyrillic.
- The filter and the question type use this editor, so they get all of it with this version.

## 1.13.2 (2026-11-20)

- Output panel: the text has its own dark colour on the light panel. Before, it took the colour of the page around the
  block, so a block on a dark part of a page (white text) printed white text on a light grey panel. The input line of
  an interactive program takes the colour of the panel too.
- No emoji in the block labels: the label above a block reads CodeLab and the language, and the stdin label has no
  keyboard sign.

## 1.13.1 (2026-11-18)

- Hosted runner: the settings page showed no usage and the runner status had no version or sessions, because the
  signed GET /usage and /health were sent without a nonce, which a hosted runner (CODELAB_REQUIRE_NONCE=1) refuses.
  Both are now signed with a nonce (every runner since 0.6.0 accepts it), and a usage the hosted runner does not give
  is shown with the reason instead of an empty box.
- Settings page: the hosted runner comes first after the server choice, with its own heading for the Jobe server,
  languages and editor below it. The runner status tells that the connection key is used (not the address, the
  secret or CODELAB_SECRETS above). The Jobe status says when Jobe is not used (Server for running and grading:
  CodeLab runner), and no Jobe server is only information when a runner runs the programs.
- Texts that still spoke only of Jobe now name the server for running and grading: the Jobe server, the languages,
  Python in the browser, the runner address and description, and the hosted runner (Automatic already uses it when
  the Jobe server is empty). English, Serbian Latin and Cyrillic.

## 1.13.0 (2026-11-16)

- Running and grading without Jobe: with CodeLab runner 0.8.0 the runner runs all eight languages and SQL to their
  end for grading. New setting Server for running and grading (Automatic, Jobe, CodeLab runner; class
  tiny_codelab\local\backend), used by the web service run, the language lists and qtype_codelab. Automatic uses Jobe
  when it is set and sends a run to the runner when Jobe cannot be reached or answers with a server error.
- Test the servers (test.php, linked on the settings page): whether Jobe and the runner answer, the version of each
  language, a small program in each that must print 42, and a benchmark of 10 different C programs sent together
  (median, slowest, runs per minute). Template tiny_codelab/servertest; jobe and runner_client get request() and parse().
- Hosted runner (optional): one connection key sets the address, the secret and the site of a hosted runner; the
  settings page shows its plan and monthly usage (GET /usage) and warns about a key that is not valid. The states
  quota, suspended and expired are shown to the reader and leave quiz answers for the teacher.
- Runner client: the versions of the languages from the signed /health, a run refused as busy is sent once more after
  3 s, a longer wait for the runner's queue, the limits of a question (CPU time, memory) on the runner.
- Privacy text: grading may also go to the runner. CI: Mustache lint.

## 1.12.0 (2026-11-12)

- Memory view of C and C++ with CodeLab runner 0.6.0: pointers are arrows. A pointer into an array points to it with
  its name under the cell (p walking through a), a pointer to a variable is shown as &name, objects on the heap are
  drawn with arrows through their pointer fields (a linked list of nodes), and NULL is written as such. With an older
  runner nothing changes.
- Open in CodeLab of tiny_algorithm: a new CodeLab example in the same editor starts from the code of the flowchart,
  with a note (new module tiny_codelab/importcode, Node tests).
- Runner security: each session token is for one language (the server refuses another), the settings page shows the
  id of the site for a secret of its own on a shared runner (CODELAB_SECRETS), and runs for grading (SQL) carry the
  site and a nonce, so a request cannot be sent again; with a runner older than 0.6.0 they are sent once more as before.
  The state of the server shows its version.

## 1.11.0 (2026-11-12)

- Bridge to the algorithm plugins: the settings for JavaScript say whether tiny_algorithm 2.13 or newer is installed
  (runtime::flowchart()), so filter_codelab 1.11 can draw a Python example as a flowchart. tiny_algorithm stays
  optional: without it nothing changes.
- Strings of the Flowchart button.

## 1.8.0 (2026-11-12)

- Complexity: a Python program is run in the browser for several sizes n (10 … 500, or the reader's own) with an
  input made from a template ({n}, {random}, {sorted}, {reversed}); the lines it runs are counted (the same on every
  computer, unlike time), drawn against n beside the curves n, n log n and n², and the growth that fits best is named
  (It grows like O(n²)). Keep for comparison draws a second version on the same chart; a table shows the counts.
- New module tiny_codelab/complexity and countLines in tiny_codelab/python; Node tests run with a small loader
  (tests/register.mjs) that stands in for Moodle's core modules.

## 1.7.0 (2026-11-12)

- Memory view in the debugger (Memory, under the variables): the frames with their variables and the objects they
  point to, with arrows, as in Python Tutor. Lists, tuples and arrays are rows of cells (numbers also as bars), the
  cells changed by the last step are green, and the variables used as an index in the program (a[i], a[j + 1]) are
  shown under their cell.
- Python in the browser: objects keep their identity (two names of one list point to the same box), with dicts, sets
  and objects of classes (a linked list of nodes).
- C and C++ on the CodeLab runner: arrays, arrays of arrays (as a grid), structs and std::vector, read from the values
  of gdb; no new runner needed.
- The memory view moves with Step back and the timeline of 1.6.
- New module tiny_codelab/memview with Node unit tests.

## 1.6.0 (2026-11-12)

- Step back and a timeline for the debugger, as in the algorithm plugins: every stop of a Step run is recorded (line,
  call stack, variables, output), so Step back, Step forward and a slider "Step N of M" move along the run, for Python
  in the browser and for C and C++ on the CodeLab runner. The editor marks the line of the shown step and the console
  shows the output as it was then.
- The record stays after the program ended: the slider goes over the whole run, up to the end of the program.
- Step again with the same input: a new Step run that gets the same input lines again, without typing.
- A click on a row number of the trace table shows that step; the row of the shown step is marked.
- New module tiny_codelab/timeline with Node unit tests (a new CI job).

## 1.5.1 (2026-11-08)

- Input on phones: the line where a running program reads its input has a check button, and the Go / Send key of a
  phone keyboard sends the line (phone keyboards often send no Enter key). It never submits a quiz page around it.
- Full screen button shows an icon (its name is the title), and the page behind it no longer scrolls on phones.
- New module tiny_codelab/icons for the tool buttons of the viewer (restore, copy, theme, full screen).
- A failed session request shows the real error message instead of a general error.

## 1.5.0 (2026-11-08)

- Support for VS Code themes: Visual Studio Light (`vs`), Visual Studio Dark (`vs-dark`), and High Contrast Dark (`hc-black`).
- New administrator setting "Theme" (`tiny_codelab/theme`): choose between Auto (matches site and system dark mode), Light, Dark, or High Contrast.
- Theme selector in the TinyMCE dialog: teachers can assign a specific theme to any code block.
- Styled pre.codelab blocks as modern IDE cards in the TinyMCE editor with language badges, Run indicators, and dark card styling for dark themes.

## 1.4.0 (2026-11-07)

- Debugger of Step, as in the algorithm plugins, for Python in the browser and C and C++ on the CodeLab runner
  0.5.0: breakpoints (a click left of the line number; Run stops there), Step over, Step out, automatic steps with a
  speed, the call stack (a frame shows its variables) and a trace table of the values after each step.
- A clear message when the interactive server cannot be reached (instead of "the server is busy").

## 1.3.0 (2026-11-06)

- SQL (MySQL / MariaDB) examples on the CodeLab runner 0.4.0: a hidden setup with the tables and data (a new field
  of the dialog), the reader's SQL shown as by the mysql client. Each run starts from the same data.
- Run of SQL through the web service goes to the runner (Moodle's server signs the request), for Run the tests.
- Full screen for the editor with its buttons and console (examples and question attempts), as in the algorithm plugins.
- Monaco bundle with MySQL and SQL highlighting.

## 1.2.0 (2026-11-06)

- Step for C and C++ on the CodeLab runner (gdb on the server): the line that runs next is marked in the editor
  and the variables of the function are shown, as for Python in the browser; the input is typed when the program
  asks for it. Needs CodeLab runner 0.2.0 with gdb.

## 1.1.0 (2026-11-06)

- Interactive programs: with a CodeLab runner beside Jobe (new settings), Run of C, C++, Java and C# keeps the
  program running and the reader types its input in the console while it runs. Web service tiny_codelab_session gives a
  signed token for one session. Without the runner nothing changes.

## 1.0.0 (2026-11-06)

- First stable release. No change in the code since 0.6.1; filter_codelab and qtype_codelab 1.0.0 need this version.

## 0.6.1 (2026-11-06)

- C and C++ programs written in Visual Studio run on Jobe: scanf_s, fscanf_s, sscanf_s, printf_s and fprintf_s are
  mapped to the standard functions.

## 0.6.0 (2026-11-06)

- The settings page shows the state of the Jobe server: whether it answers, its languages and their versions, and
  whether a test program is accepted (a wrong API key is found).
- New setting Languages. Teachers are offered only the languages turned on that the Jobe server has; Python also when it
  runs in the browser. Examples and questions keep their language.
- A run in a language the server does not have ends with a clear message.

## 0.5.0 (2026-11-06)

- Python typing help from Jedi (level 2), in Pyodide in its own Web Worker: completion of everything Python knows,
  also the methods of the reader's own variables, the parameters of the reader's own functions, and syntax errors
  marked in the editor. It loads when the reader first types; until then the typing help of level 1 is used. On when
  Python in the browser is on.

## 0.4.0 (2026-11-06)

- New languages: JavaScript (Node.js), Pascal and PHP, as offered by Jobe. Node.js gets a 1000 MB memory limit on
  Jobe, because V8 reserves more memory at start than Jobe's default limit allows.
- Python in the browser also in the dialog: Step, Stop and the variables, as in the filter.
- Step can pass over hidden code before the code of the editor (used by the question type).
- Privacy: the download of Pyodide from the jsDelivr CDN is declared.

## 0.3.0 (2026-11-06)

- Python in the browser (Pyodide 314.0.7 in a Web Worker): `input()` asks in the console while the program runs,
  Step goes line by line with the variables, Stop ends the program. Settings: Python in the browser, Address of Pyodide.

## 0.2.0 (2026-11-06)

- Monaco editor 0.57.0 (own bundle with the CodeLab languages) in an iframe, typing help for C, C++, Python, Java and C#.
- Jobe client, web service tiny_codelab_run with a rate limit per user, settings, and the dialog with Run.

## 0.1.0 (2026-11-05)

- First skeleton of the plugin.
