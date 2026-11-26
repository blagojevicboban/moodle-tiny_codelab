# Changelog

## 1.33.1 (2026-11-26)

- Memory view of C#: an object shown by its type only ({Teacher}) is a value of its variable, no longer drawn as an
  array of one element.

## 1.33.0 (2026-11-26)

- Step for C#: with the CodeLab runner 0.25 or newer (and CodeLab Cloud), C# examples and answers run line by line as
  C and C++ do: breakpoints and conditional breakpoints, Step over and out, the call stack, the variables and Watch
  expressions. Arrays, two-dimensional arrays, lists, dictionaries, sets and objects are shown with their contents
  ({3, 1, 2}, {["Ana"] = 16}, {Value = 1, Next = {Node}}). The runner uses netcoredbg on .NET for Step; Run and
  grading stay as they were. A runner without it runs C# without stopping.

## 1.32.0 (2026-11-26)

- Panels below or beside the code, as in VS Code: two new icon buttons in the toolbar of an example that runs (Panels
  below the code, Panels beside the code). On a block at least 960 pixels wide the panels (Step with the timeline and
  the variables, Complexity, Flowchart, the input and the console) go beside the code by default; the reader's choice
  is kept in the browser and applies to every example. On a narrower block (a page with side blocks, a phone) the
  panels stay below the code and the buttons are hidden. A bar between the columns changes their widths with the
  mouse or the arrow keys (kept too), and the code column stays in view while the panels scroll when it fits the
  window. On the whole screen the editor then takes the whole height (module tiny_codelab/layout).

## 1.31.1 (2026-11-25)

- Test the servers: with a connection key, the hosted runner is named CodeLab Cloud with the site id and the server of
  the key, instead of CodeLab runner, so it is clear that the hosted runner is the one tested.

## 1.31.0 (2026-11-25)

- Free 30-day trial of the hosted runner with one click: while no connection key is set, the Hosted runner section
  of the settings has the button Get a free 30-day trial. Only on that click the address of the site and the e-mail
  address of the administrator are sent to trial.codelabedu.com (CodeLab Cloud). The trial server checks that the
  request comes from this site (it asks trialcheck.php about a random value the site made for ten minutes), and the
  connection key it answers with is set by itself. One trial per site. The Privacy API lists the new data.

## 1.30.0 (2026-11-25)

- Hosted runner settings: instead of one line, a box with the plan and its status, a bar of the runs of this month,
  the editor sessions and the quiz grading apart, the programs allowed at once, the end date with the days left and
  the site id and the server of the connection key. Numbers and dates follow the language of the site, and the plan
  status is translated. The box is yellow from 80 % of the runs or 7 days before the end date, and red when the plan is
  over its runs, suspended or expired (template tiny_codelab/cloud_usage).
- The description of the section says more simply when quizzes are graded on the hosted runner, and the section of
  the own Jobe server tells when a connection key is set above.

## 1.29.0 (2026-11-25)

- Matrices in the memory view: a list of lists of values (Python) or an array of arrays (C, C++, std::vector of
  vectors) is drawn as one table instead of one box per row. The numbers are shaded from the smallest to the largest
  (a heat map, as in the Algorithm plugins), the index variables of its rows stand beside them and those of its
  columns under them (only names used as t[i][j] in the program), and the cell t[i][j] is outlined. The cells written
  by the last step are marked, and a variable that points to one row (row = t[1]) gets an arrow to that row.
- A Python list whose rows are one and the same list ([[0] * 3] * 3) stays drawn with arrows and gets a warning:
  changing one row changes them all.

## 1.28.0 (2026-11-25)

- C and C++ typing help from clangd on the CodeLab runner 0.24.0 or newer, like C# and Java: completion of the real
  members of every struct, class and library type (std::vector, std::string, the reader's own types) and of the names
  in scope, the overloads and parameters of a call, tooltips with the declaration and the comments of the glibc and
  libstdc++ headers, and the compiler's errors and warnings while typing (also wrong printf formats). The runner checks
  the program with the language standard and the compiler profile of the example (the Visual Studio profile knows
  conio.h and scanf_s), and the other .c, .h and .cpp files of a multi-file example are found by #include. The built-in
  beginner tooltips (printf formats, keywords) stay next to those of clangd.
- New option `build` of the Monaco editor: the compiler profile and the standard of a C or C++ example, sent with each
  request of the language service (filter_codelab 1.19 passes those of the example; without it the runner's defaults,
  C11 and C++17, are used).

## 1.27.0 (2026-11-25)

- Java typing help from the CodeLab runner 0.23.0 or newer, like C# in 1.26: completion of the real members of every
  type (instance members after a value, static ones after a class, the names in scope), the overloads and parameters
  of a call, tooltips with the declaration and the Javadoc of the JDK, and the compiler's errors and warnings while
  typing. The runner checks the program with the compiler of its JDK, the one that runs and grades it; the file is
  named after its public class, and the other Java files of a multi-file example are included.
- The client of the language services is now `tiny_codelab/langservice` (was `roslyn`), one connection per language.

## 1.26.0 (2026-11-24)

- C# typing help from Roslyn on the CodeLab runner 0.22.0 or newer: completion of the real members of every .NET type
  and of the reader's own classes, the overloads and parameters of a call, tooltips with the declaration and the
  documentation of .NET, and the errors and warnings of the compiler marked while typing (in the language of the page
  where Roslyn has it). The program is checked as C# 7.3 against .NET Framework 4.7.2, the API of Mono that runs and
  grades it, and the other C# files of a multi-file example are included. Web service `tiny_codelab_analysis` gives a
  token for one connection; it is not a run and does not count against the rate limit. Without the service, or with
  typing help off, the built-in help stays.

## 1.25.1 (2026-11-24)

- Breakpoints and stack frames in companion C/C++ files (CodeLab runner 0.21.0+): Step switches to the tab of the file
  that runs next, breakpoints are kept per tab and the stack shows `file:line` for frames in companion files.
- Fixed: a pause in the main program was skipped when a companion file tab with fewer lines was shown; a pause in a
  file that has no tab now goes on instead of marking a line in the wrong tab.

## 1.25.0 (2026-11-24)

- Conditional breakpoints in the debugger (Python in the browser and C/C++ on CodeLab runner 0.20.0+): right-click or
  Shift+click the gutter next to a line number to enter a condition such as `i == 7`; conditional breakpoints show an
  amber ring with a hover tooltip and move with their line when code is edited.
- Watch expressions in the debugger panel (Python in the browser and C/C++ on CodeLab runner 0.20.0+): add custom
  expressions such as `a[i]` or `total + i` to track their values across steps, with live evaluation while paused,
  change highlighting and timeline history.
- Updated all 29 interface languages with strings for conditional breakpoints and watch expressions.
- Compiler error hints now also match GCC's `expected ',' or ';'` semicolon diagnostic.

## 1.24.0 (2026-11-23)

- Interface translated into 14 more languages (29 total): added Portuguese (Brazil), Turkish, Dutch, Russian, Ukrainian,
  Romanian, Hungarian, Bulgarian, Greek, Albanian, Japanese, Simplified Chinese, Korean and Arabic.
- Sandboxed HTML / CSS / JS live preview in the browser (no execution server required): renders HTML with companion CSS
  and JS tabs inside a strictly sandboxed iframe (`sandbox="allow-scripts allow-forms"`, no `allow-same-origin`) with a
  bridged console and error panel.
- 17 new programming languages on the CodeLab runner (27 languages total): TypeScript, Bash, Go, Rust, R, Ruby, Lua,
  Kotlin, Perl, Octave, Julia, Scheme, Dart, Scala, Elixir, Swift and Haskell, each automatically offered when installed
  on the runner.
- Rebuilt the bundled Monaco Editor with native syntax highlighting for the new languages, HTML, CSS and XML.

## 1.23.1 (2026-11-23)

- Java without a public class: the program file is named after the class with `main` (for example `class Zadatak`),
  so Jobe can run it. Before, the file was `Main.java` and Jobe found no class `Main` to run. CodeLab runner 0.16.1
  names the file the same way.

## 1.23.0 (2026-11-23)

- Compiler profiles for C and C++: GCC, Clang, or an MSVC compatibility mode with the headers and safe functions of
  Visual Studio (conio.h, windows.h, scanf_s with sizes, fopen_s, strcpy_s), and the language standard (C99 to C23,
  C++11 to C++23), per example or for the whole site; Jobe gets the same headers and arguments.
- Safe mode for C and C++ on the CodeLab runner 0.12.0: AddressSanitizer and UndefinedBehaviorSanitizer report
  out-of-bounds access, use after free, null pointers, division by zero and integer overflow, and the editor marks the
  line.
- Explanations of 40 common GCC and Clang compiler and linker errors in plain language, with short examples, under the
  compiler output, in all 15 languages.
- Multi-file examples: companion source, header and data files open as tabs above the editor; extra C, C++, Java and C#
  source files are compiled together on Jobe and on the runner.
- Peak memory of a run from the CodeLab runner 0.13.0 is passed on to the test results.
- Heap leaks: blocks not freed when a C or C++ program ends under Step (runner 0.15.0) are marked in the memory view,
  with an alert.

## 1.22.0 (2026-11-23)

- Files of an example: teachers can attach up to 5 input files (64 KB each) to a CodeLab block in the dialog. They are
  written into the working folder before each run in Python in the browser (Pyodide), on the CodeLab runner (0.10.0,
  both interactive sessions and `POST /run`) and on Jobe (`file_list`).
- Output files: regular files created or changed by the program in Pyodide or on the CodeLab runner are listed under
  the console with their line count and text.

## 1.21.0 (2026-11-22)

- The interface in 12 more languages: German, French, Spanish, Italian, Portuguese, Polish, Croatian, Bosnian,
  Slovenian, Macedonian, Slovak and Czech (15 with English and Serbian). The Serbian files got the 7 strings of the
  editor theme that they lacked.
- Runs for grading on the CodeLab runner 0.9.0 keep the time of the run, and the run service returns it, so
  qtype_codelab can show the time of each test and apply a time limit per test. Jobe gives no time; nothing else
  changes.
- devtools/demo-video: scripts that record the demo reel of the plugins (not in the ZIP).

## 1.20.0 (2026-11-22)

- Accessibility: in Windows high contrast the console, the debugger, the memory view, the call tree, the trace table,
  the AI explanation and the complexity panel follow the system colours, and what only a colour showed (changed
  variables, the current step, repeated calls, the bars of an array) gets a border or a dashed line. More contrast and
  reduced motion are followed too; with reduced motion the turtle draws at once.
- Screen readers hear the end of a run with the start of its output, instead of every line while it is written. The
  console of the dialog, the trace table and the memory view can be reached and scrolled with the keyboard.
- The requests to the CodeLab runner (health, grading, status and usage) all go through one helper, so a runner on a
  private address or localhost works the same for each of them.
- README: MySQL (MariaDB) is listed among the languages.

## 1.19.0 (2026-11-22)

- AI explanations of errors in quizzes: allowed only for a CodeLab question of that quiz with the option AI
  explanations (qtype_codelab 1.12); the web service tiny_codelab_ai_hint takes the question id and checks it.
  Everywhere else in a quiz the button is still never shown.

## 1.18.0 (2026-11-22)

- Every block saved with the dialog gets an id (class codelab-id- and eight letters or digits), kept when the block is
  edited. filter_codelab 1.13 keys the readers' copies by it, so they stay with their example when examples are added
  or moved on the page.

## 1.17.0 (2026-11-22)

- AI explanations of errors (optional, off by default): with an AI provider of the site (Site administration, General,
  AI), a button under a compiler message or an error in the console of an example asks the AI to explain it. The AI
  gets the program and the messages of the console, and is told to answer in the language of the user, in a few
  sentences, without writing the corrected program. Settings AI explanations of errors and AI explanations per hour
  (10 by default), capability tiny/codelab:aihint, web service tiny_codelab_ai_hint. Never offered in a quiz. The AI
  policy of Moodle is accepted first when the user has not done it yet.

## 1.16.0 (2026-11-22)

- Templates in the CodeLab dialog: a list beside the language inserts a small complete program. C, C++, Python, Java
  and C# have six: reading an array (sum, minimum, maximum), bubble sort, binary search, a matrix with the sums of its
  rows, records (the best student) and recursion (factorial); JavaScript, PHP and Pascal have the first and the last.
  An empty editor gets the template and, when the input is empty, an input that fits it; otherwise the template goes
  in at the cursor. The names are in English, Serbian Latin and Serbian Cyrillic.

## 1.15.0 (2026-11-22)

- Turtle graphics for Python in the browser: `import turtle` gives a module that follows the standard one (the real
  module needs Tk, which the browser does not have). The turtle starts at (0, 0) looking east; forward, back, left,
  right, goto, setx, sety, setheading, home, circle (with extent and steps), penup, pendown, pencolor, fillcolor, color,
  pensize, speed, begin_fill and end_fill, dot, write, hideturtle, showturtle, position, heading, distance, towards,
  clear and reset, as module functions and as methods of Turtle objects; Screen with bgcolor and colormode, and done,
  mainloop and exitonclick do nothing.
- The drawing appears under the console while the program runs, fitted to the panel. Lines are animated by speed()
  (0 draws at once), and Step shows the turtle draw line by line. After 20000 lines the rest is only counted.
- Typing help knows the turtle functions.

## 1.14.0 (2026-11-22)

- Call tree in the debugger: while a program is followed step by step (Python in the browser, C and C++ under gdb on
  the CodeLab runner), every call of a function is drawn under the call that made it, with its arguments read from the
  function's parameters. In Python a finished call shows the value it returned. The running call is blue, the calls
  waiting for it light blue, and a call made again with the same arguments is amber, so repeated work (fib(2) in
  fib(4)) is easy to see. A summary counts the calls, the repeated ones and the deepest level; after 200 calls the rest
  are only counted.
- The tree follows Step back and the slider of the timeline, and a click on a call goes to its first stop.
- The filter and the question type use this debugger, so they get the call tree with this version.

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
