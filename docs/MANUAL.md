# CodeLab manual

For teachers, students and administrators. Version **1.4.0** of tiny_codelab, filter_codelab and qtype_codelab, and
version 0.5.0 of the CodeLab runner.

## 1. What CodeLab is

CodeLab brings the code editor of VS Code (Monaco) into Moodle: into pages, into the TinyMCE editor and into quizzes.
Students write a program, run it, follow it line by line and get a grade from tests.

| Part | What it does | Who sees it |
|---|---|---|
| **CodeLab (TinyMCE)**, tiny_codelab | Button in the editor that inserts code examples; the editor, the runs and the settings that the other two plugins use | Teachers editing a page |
| **CodeLab viewer**, filter_codelab | Turns the examples on pages into editors with Run, Step and Full screen | Students and teachers in pages |
| **CodeLab question**, qtype_codelab | Quiz question: the student writes a program and tests grade it | Students in quizzes, teachers in the question bank |
| **Jobe** | Compiles and runs programs for Run and for grading | Nobody directly |
| **CodeLab runner** (optional) | Keeps a program running while the student types its input; step by step for C and C++; SQL on MariaDB | Nobody directly |

**Languages:** C, C++, Python, Java, C#, JavaScript (Node.js), Pascal, PHP and MySQL (MariaDB).

**What runs where:**

- **Python** runs in the student's browser (Pyodide): Run with input and Step with variables, no server needed.
- **C, C++, Java, C#** run on the CodeLab runner when one is set: the student types the input while the program runs.
  C and C++ also have Step.
- **JavaScript, Pascal, PHP** run on Jobe: the input is given before the run.
- **MySQL** runs only on the runner (every run gets its own temporary database).
- **Quiz grading** is always done on a server (Jobe; the runner for SQL), never in the student's browser.

## 2. Teachers: examples in pages

An example is inserted with the **CodeLab** button of the TinyMCE editor, in any page, lesson, assignment or forum
post. On the page, students see it as an editor they can change and run.

### Inserting an example

1. Put the cursor where the example goes and click the **CodeLab** button (the `</>` icon). Text selected before
   becomes the code of the example.
2. Choose the **Language**. Only languages the site can run are offered.
3. Type or paste the code. The editor colours the syntax and offers completion (Ctrl+Space); for Python the
   suggestions come from Jedi.
4. In **Input**, type the input readers start from (for example `5 3`). Readers can change it.
5. Click **Run** in the dialog to check the example, then **Insert**.

### Options of the example

- **Readers can run it**: without this box the example is only coloured code, without Run.
- **No typing help (for tests)**: for examples in tests, no completion and no hints.
- **Setup run before the code, hidden from readers (tables and data)**: for MySQL, the tables and data that run before
  the reader's code. Readers do not see it, and every run starts from the same data.

### What readers get on the page

- **Run** runs the example. For C, C++, Java and C# the input is typed in the console while the program runs;
  **End of input** (or Ctrl+D) closes the input.
- **Step**, for Python, C and C++: line by line with the variables (section 4).
- **Restore original** brings back the code of the page. The reader's changes are kept in their browser until then.
- **Full screen**: the editor, the buttons and the console cover the screen; Esc goes back.
- **Copy** copies the code.

### An SQL example, step by step

1. In the dialog choose **MySQL (MariaDB)**.
2. In the setup field, write the `CREATE TABLE` and `INSERT` statements with the data.
3. In the editor, write the query readers will change, for example
   `SELECT title, year FROM book ORDER BY year;`.
4. Run shows the result as the `mysql` client does: tables, "Query OK, 1 row affected" and errors with their line.

## 3. Teachers: quiz questions

A CodeLab question grades the student's program with tests: each test gives the program an input and compares its
output with the expected one. The grade is the share of the weights of the tests the program passes. A question
without tests is graded by the teacher.

### Creating a question

In the question bank: **Create a new question → CodeLab**. The fields of the form:

| Field | What to enter |
|---|---|
| Programming language | The language of the answer. Only languages the site can run are offered. |
| Starting code | The code the student starts from (for example `#include` lines and an empty `main`). May be empty. |
| Solution | Your correct program. Empty expected outputs are filled from it, and it is checked when the question is saved. In the review the student sees it as the right answer. |
| Code before / Code after | Hidden code around the answer (advanced): for example the `class` and `Main` around a few statements, or `#include` lines. For SQL, Code before holds the tables and data. |
| Tests | For each test: test code (optional), input, expected output, *Hidden from students* and weight. |
| Tests in the attempt | The student can run the visible tests before submitting (*Run the tests*). |
| Comparing the output | How the output is compared (table below). |
| CPU time limit / Memory limit | Only when the defaults are not enough. The administrator sets the largest values (10 s and 2000 MB by default). |
| Typing help | Turn it off for tests. |

### Tests

- Leave the **Expected output** empty when there is a solution: it is filled by running the solution when the
  question is saved.
- A **hidden** test is not shown to the student. The feedback says only how many hidden tests passed.
- The **Weight** sets the share of the grade (weights 1, 1, 2 give 25 %, 25 %, 50 %).
- **Test code** is for tasks where the student writes a function: for example `printf("%d\n", sum(2, 3));` or
  `print(sum(2, 3))`. When *Code after* holds the marker `{{TEST}}` (for example inside your `main`), the test code
  goes in its place. Without the marker, a C or C++ program without `main` gets one around the test code, and other
  languages run the test code at the end.

### Comparing the output

| Choice | When |
|---|---|
| Exactly | Every character counts, also spaces. |
| Spaces at the end do not count | The default: spaces at the ends of lines and empty lines at the end are ignored. |
| Lines in any order (SQL rows) | The result of an SQL query without ORDER BY. |
| Numbers with a tolerance | Real numbers: 3.14159 matches 3.1416 with the tolerance 0.001 (absolute or relative). |
| Regular expression | The expected output of each test is a PCRE pattern that must match the whole output. |

### Check of the solution when saving

When the question is saved, the solution is run on every test that has an expected output. If a test fails, the
question is not saved, and the output of your solution is shown under the test. **Save even if the solution fails the
tests** saves it anyway (for example while you are still writing the tests). When Jobe cannot be reached, the question
is saved without the check.

### Quiz behaviour and penalties

In the quiz settings, under *Question behaviour*:

- **Interactive with multiple tries** or **Adaptive mode**: the student has a **Check** button. Each wrong Check takes
  the *Penalty for each incorrect try* off the mark (for example 10 %: a right answer at the second try gets 0.9). In
  Interactive mode the number of tries is the number of hints plus one.
- **Deferred feedback**: the programs run only when the attempt is submitted.

If Jobe does not work when the student presses Check, the try does not count and the student is asked to check again.
At the final submit such an answer waits for the teacher's grade.

### SQL questions

1. Language **MySQL (MariaDB)**.
2. **Code before** = `CREATE TABLE` and `INSERT` statements with the data.
3. For `SELECT` tasks the test has no test code; the expected output is the result table.
4. For `INSERT`, `UPDATE` or `DELETE` tasks, put a checking query in the **test code**, for example
   `SELECT * FROM book WHERE author_id = 2 ORDER BY year;`.
5. For a query without ORDER BY choose **Lines in any order (SQL rows)**.

Every run gets an empty temporary database with your data, so students do not affect each other.

### Check all solutions of a course

In the course menu (**More → Check CodeLab solutions**) the solution of every CodeLab question is run on its tests.
Questions whose solution fails, does not compile or is missing are listed first. Use it after a change on the server
or after restoring a course from a backup.

## 4. Students: writing, running and following a program

In pages and in quizzes you work in the same editor: you write the code, run it, type the input and follow it line by
line.

### The editor

- Ctrl+Space offers completion (statements, functions, variables); while you type a function call, its parameters are
  shown.
- Ctrl+Enter runs the program.
- Your changes to an example on a page stay in your browser; **Restore original** brings back the code of the page.
- **Full screen** shows the editor and the console over the whole screen; Esc goes back.

### Run and input

1. Click **Run**.
2. When the program asks for input (`scanf`, `cin`, `Scanner`, `input()`), an input field appears in the console. Type
   the value and press Enter, after each value the program asks for.
3. A program that reads until the end of the input is closed with **End of input (Ctrl+D)**.
4. **Stop** ends the program, for example an endless loop.

You can also type the input in advance, in the **Input** field under the editor: it is sent to the program as soon as
it starts.

### Step and the debugger (Python, C, C++)

**Step** runs the program line by line. The line that runs next is marked yellow in the editor, and the debugger panel
is under the console.

| Button / part | What it does |
|---|---|
| Step | Runs one line; goes into the functions you wrote. |
| Step over | Runs one line; a function call runs whole, without stopping in it. |
| Step out | Finishes the current function and stops at the line that called it. |
| Run (while paused) | Goes on to the next breakpoint or to the end. |
| Auto step + Speed | Steps by itself; the Speed slider to the right is faster, Pause stops. |
| Call stack | The chain of calls, the newest on top (for example `fact() : 6`, `fact() : 8`, `main() : 14`). A click on a call shows its variables. |
| Variables | The values in the current function; those changed since the last step are marked. |
| Trace table | The line and the values after each step, like the table you write on paper. |

**Breakpoint:** click left of a line number; a red dot appears. **Run** then stops at that line, also without Step.
Another click removes the dot. Breakpoints can also be added while the program is paused.

When the program asks for input during Step, the input field appears in the console as in a normal run.

### In a quiz

- **Run** and **Step** work with your input, as in pages. They do not affect the grade.
- **Run the tests** runs the visible tests and says which ones pass, before you submit.
- **Check** (in interactive and adaptive quizzes) grades the answer on all tests. The feedback shows the visible tests
  with the input, the expected output and your output, and for the hidden ones only how many passed.
- Each wrong Check may carry a penalty (for example 10 %), so first try the program with **Run the tests**.
- If the server for checking does not work, the try does not count; wait a little and check again.

## 5. Administrators: installation and settings

CodeLab is three plugins, installed in this order: **tiny_codelab**, then **filter_codelab**, then **qtype_codelab**;
then the filter must be switched on. All three work on Moodle 4.5 to 5.3.

### Installation

1. Install the ZIPs in order: tiny_codelab, filter_codelab, qtype_codelab (the filter and the question type depend on
   tiny_codelab of the same version).
2. Switch the filter on: *Site administration → Plugins → Filters → Manage filters*, **CodeLab** to **On**. While the
   filter is off, readers see the examples as plain code.
3. Open the settings of tiny_codelab (below) and check that *State of the Jobe server* is green.
4. Try it: in a page click the CodeLab button of TinyMCE, insert a C example and click **Run**. The console must show
   **Finished** and the output.

An older filter_ace_inline can stay on: CodeLab blocks have no ace markup, so the two filters do not interfere.

### Settings of tiny_codelab

*Site administration → Plugins → Text editors → TinyMCE editor → CodeLab*.

| Setting | Default | Notes |
|---|---|---|
| Jobe server | (empty) | For example `https://jobe.example.org`, without `/jobe/index.php/restapi`. Empty: programs cannot be run (only Python in the browser) |
| Jobe API key | (empty) | Sent in the `X-API-KEY` header. Keep it only in this setting, never in files |
| Languages | all eight | Only languages the Jobe server has are offered (Python also without Jobe, in the browser) |
| CPU time limit | 5 s | From 1 to 30 s |
| Python in the browser | on | Pyodide; also turns on the Jedi typing help |
| Address of Pyodide | (empty: jsDelivr) | Or a copy on your own server, about 12 MB |
| Runs per minute | 20 | Per user; 0 = no limit |
| Address of the interactive server | (empty) | For example `wss://runner.example.org`. Empty: every program runs on Jobe |
| Secret of the interactive server | (empty) | The same as `CODELAB_SECRET` of the runner (or the secret of this site in `CODELAB_SECRETS`), at least 16 characters |

The settings of qtype_codelab hold the upper limits for questions: *Largest CPU time of a question* (s per run) and
*Largest memory of a question* (MB per run).

The settings page asks the servers each time it is opened and shows two boxes:

- **State of the Jobe server**: green with the list of languages; red when the server does not answer or does not
  accept the API key; a list of the languages that are missing.
- **State of the interactive server**: green with its version, its languages (c, cpp, java, csharp, mysql) and the
  number of open sessions; red when it does not answer. Under it, the id of this site: one runner can serve several
  Moodle sites, each with a secret of its own (`CODELAB_SECRETS=<site id>:<secret>,...` on the runner, from 0.6.0),
  so that the administrator of one site cannot open sessions in the name of another.

### Interactive server (CodeLab runner)

The runner is an optional Node.js server beside Jobe
([github.com/blagojevicboban/codelab-runner](https://github.com/blagojevicboban/codelab-runner)). It keeps C, C++, Java
and C# programs running while the student types the input, runs Step and the debugger for C and C++ (gdb) and runs
SQL. It does not grade programming languages: grades still come from Jobe, except SQL questions, which Moodle grades
through the runner (`POST /run`).

A typical installation:

| Part | Where |
|---|---|
| Program | `/opt/codelab-runner/app`, owned by the system user `codelab` |
| Settings | `/etc/codelab-runner.env` (`CODELAB_SECRET` or `CODELAB_SECRETS`, `CODELAB_ORIGINS`, MariaDB), root only (600) |
| Service | systemd `codelab-runner`; listens on `127.0.0.1:8090` only |
| HTTPS | A TLS proxy in front (nginx, or Apache with `ProxyPass ... upgrade=websocket`); browsers need `wss://` |
| Check | `curl http://127.0.0.1:8090/health` answers `{"ok":true,...}` |

Important for a new server:

- Packages: `bubblewrap`, `build-essential`, `openjdk-21-jdk-headless`, `mono-mcs`, `gdb`, `mariadb-server` (the same
  compiler versions as Jobe on Ubuntu 24.04, so the output is the same as in grading).
- Ubuntu 23.10 and newer: AppArmor blocks the user namespaces that bubblewrap needs; add the profile
  `/etc/apparmor.d/bwrap` from the runner's README.
- Every program runs in a sandbox without network, with limits on time (10 s CPU, 300 s per session), output
  (100 KB) and sessions (30 in all, 2 per user). 30 students at once need about 1 GB of memory for C and C++, more for
  Java and C#.

### MariaDB for SQL

For SQL the runner uses a local MariaDB: each session gets its own database and user (`cl_...`), with a 5 s limit per
statement, and the database is dropped at the end. The admin user **codelab_admin** may use only the `cl_%` databases
and is created once: `sudo bash deploy/mariadb-admin.sh <password>`. Set `CODELAB_MYSQL_USER`,
`CODELAB_MYSQL_PASSWORD` and `CODELAB_MYSQL_SOCKET` in `/etc/codelab-runner.env`. Without them the runner does not
offer SQL.

### Updating the runner (webhook)

With `CODELAB_DEPLOY_SECRET` set and a GitHub webhook to `https://<runner>/deploy` (content type `application/json`,
the same secret, push events only), a push to `main` updates the server: the runner runs `git pull --ff-only` and
`npm ci --omit=dev`, waits until the open sessions end (at most 60 s) and exits, and systemd starts the new version.
If the service does not come back: `sudo systemctl status codelab-runner` and `sudo journalctl -u codelab-runner`.

### Moving from CodeRunner

CodeRunner and CodeLab work side by side; existing CodeRunner questions stay as they are. Questions of the kind
"program, input, output" (c_program, cpp_program, csharp_program, java_program, python3) and c_function map well to
CodeLab questions: input, expected output and test code per test. Questions that use their own templates, template
graders, random variants or files have no CodeLab counterpart. Convert only a **copy** of a course first and compare
the grades: in a trial with three school courses, 1109 of 1111 student answers got the same grade (the 2 others
differed only because CodeRunner compiles C with `-Wall -Werror`).

## 6. Questions and troubleshooting

Most errors come either from the student's program (time, memory, output) or from a server (Jobe, runner); the message
in the console says which.

### Messages in the console

| Message | What it means | What to do |
|---|---|---|
| Compilation error | The program does not compile; the compiler's message with the line number is below | Fix the code in that line |
| Error while running | The program crashed (division by zero, bad index, exception) | Go through it with Step or a breakpoint |
| Time limit exceeded (an endless loop?) | The program ran longer than the limit (5 s) | Check the loop conditions; check whether the program waits for input that was not given |
| The program used too much memory | Too large an array, or endless recursion | Make the array smaller, check the end of the recursion |
| Too much output: the program was stopped | More than 100 KB of output, usually printing in an endless loop | Check the loop that prints |
| The program or its input is too large | The code or the Input field is too large for the server | Shorten the input |
| Too many runs in a minute | The user went over 20 runs in a minute | Wait a minute |
| The server is busy | The runner already runs 30 programs, or the user has 2 open | Stop the other program (another tab) or try again in a moment |
| The interactive server could not be reached | The browser cannot open the `wss://` connection | If it repeats: the administrator checks the runner (below) |
| The connection to the interactive server was lost | The network dropped, or the runner was updated during the run | Run again |
| The Jobe server of this site does not have this language | The language is not installed on Jobe | Administrator: *State of the Jobe server* lists the missing languages |
| Running programs is not set up on this site | The Jobe server setting is empty | The administrator sets the address and the key |
| The program could not be run | Jobe did not answer | The administrator checks Jobe |

### In a quiz

- **"The program could not be checked on the server (Jobe), so this try does not count"**: a Check while Jobe is down
  does not use a try. The student presses Check again in a moment.
- **"Your teacher will grade it"** after submitting: Jobe did not work during grading. The attempt waits for a grade;
  when Jobe works again, the teacher regrades the quiz or grades by hand.
- **The teacher's solution fails a test** when the question is saved: fix the solution or the expected output;
  *Save even if the solution fails the tests* saves the question anyway.
- **The grade differs from CodeRunner**: CodeLab does not compile with `-Wall -Werror`, so a program with warnings
  passes.

### Frequent questions

- **An example shows as plain code, without Run.** The CodeLab filter is not on for the site or for the course.
- **Python has no interactive input() and no Step.** The browser has no JavaScript Promise Integration (Chrome or
  Edge 137+ needed); Python then runs on Jobe with the input given in advance. Also check that *Python in the browser*
  is on.
- **A C program does not show its prompt before the input ("Enter a number:").** Without the runner the input is given
  before the run in the Input field, so the whole output appears at the end. With the runner the prompt appears at
  once.
- **Step does not work for Java or C#.** Step and the debugger exist for Python (in the browser) and C/C++ (gdb on the
  runner).
- **The program reads until the end of the input.** In the runner's console the end of the input is sent with
  **End of input** or Ctrl+D.
- **Are a student's changes to an example kept?** Each reader changes their own copy in their browser;
  **Restore original** brings back the teacher's code. Nothing is sent to the teacher.

### Checking the servers (administrators)

1. Open the settings of tiny_codelab: both state boxes must be green.
2. Jobe red: check the address (without `/jobe/index.php/restapi`) and the API key; "a test program was not accepted"
   means a wrong key.
3. Runner red: on the server `sudo systemctl status codelab-runner`, then `curl http://127.0.0.1:8090/health`. If the
   service runs but the state is red, check the TLS proxy and that the site address is in `CODELAB_ORIGINS`.
4. The runner does not run programs (sandbox error): on Ubuntu 24.04 check the AppArmor profile for bwrap.
5. SQL is not offered: `CODELAB_MYSQL_*` is missing in `/etc/codelab-runner.env`, or MariaDB does not run.
