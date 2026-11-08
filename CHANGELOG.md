# Changelog

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
