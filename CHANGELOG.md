# Changelog

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
