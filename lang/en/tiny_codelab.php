<?php
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
 * Strings for component 'tiny_codelab', language 'en'.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['autostep'] = 'Auto step';
$string['autostop'] = 'Pause';
$string['browserpython'] = 'Python in the browser';
$string['browserpython_desc'] = 'Python programs of examples run in the reader\'s browser (Pyodide): input() asks for the input while the program runs, and Step shows the program line by line with its variables. Quiz grades still come from the Jobe server. Needs a browser with JavaScript Promise Integration (Chrome, Edge 137+); other browsers use the Jobe server.';
$string['button'] = 'CodeLab';
$string['cachedef_languages'] = 'Languages of the Jobe server';
$string['cachedef_runs'] = 'Recent runs of each user (for the limit of runs per minute)';
$string['callstack'] = 'Call stack';
$string['codelab:run'] = 'Run programs on the Jobe server';
$string['codelab:viewplugin'] = 'Use the CodeLab editor plugin';
$string['compiling'] = 'Compiling…';
$string['copied'] = 'Copied';
$string['copy'] = 'Copy';
$string['cputime'] = 'CPU time limit (seconds)';
$string['cputime_desc'] = 'Longest time a program may run, from 1 to 30 seconds.';
$string['dialogtitle'] = 'CodeLab program';
$string['editedcopy'] = 'Your changes are kept in this browser.';
$string['editorlabel'] = 'Program code';
$string['endinput'] = 'End of input (Ctrl+D)';
$string['exitfullscreen'] = 'Exit full screen';
$string['fullscreen'] = 'Full screen';
$string['input'] = 'Input';
$string['inputline'] = 'Input for the program';
$string['insert'] = 'Insert';
$string['jobeapikey'] = 'Jobe API key';
$string['jobeapikey_desc'] = 'Key sent in the X-API-KEY header, when the Jobe server requires one.';
$string['jobeserver'] = 'Jobe server';
$string['jobeserver_desc'] = 'Address of the Jobe server that compiles and runs the programs, for example https://jobe.example.org (without /jobe/index.php/restapi). Empty: programs cannot be run.';
$string['jobestatus'] = 'State of the Jobe server';
$string['jobestatus_error'] = 'The Jobe server does not answer ({$a}). Check its address and the API key.';
$string['jobestatus_missing'] = 'Not on this server: {$a}. These languages are not offered (Python is, when it runs in the browser).';
$string['jobestatus_notset'] = 'No Jobe server is set: programs cannot be run (only Python in the browser).';
$string['jobestatus_ok'] = 'The Jobe server answers. Languages: {$a}.';
$string['jobestatus_runfailed'] = 'But a test program was not accepted ({$a}). Check the API key.';
$string['lang_c'] = 'C';
$string['lang_cpp'] = 'C++';
$string['lang_csharp'] = 'C#';
$string['lang_java'] = 'Java';
$string['lang_javascript'] = 'JavaScript (Node.js)';
$string['lang_mysql'] = 'MySQL (MariaDB)';
$string['lang_pascal'] = 'Pascal';
$string['lang_php'] = 'PHP';
$string['lang_python'] = 'Python';
$string['language'] = 'Language';
$string['languages'] = 'Languages';
$string['languages_desc'] = 'Languages teachers can choose for examples and questions. A language the Jobe server does not have is left out, except Python when it runs in the browser. Examples and questions that already use a language keep it.';
$string['loadingpython'] = 'Loading Python… (the first time takes a few seconds)';
$string['mainprogram'] = 'main program';
$string['menuitem'] = 'CodeLab program';
$string['noassist'] = 'No typing help (for tests)';
$string['nooutput'] = '(the program printed nothing)';
$string['novariables'] = '(no variables yet)';
$string['output'] = 'Output';
$string['paused'] = 'Paused before line {$a}';
$string['pluginname'] = 'CodeLab';
$string['privacy:metadata:jobe'] = 'Programs are sent to the Jobe server set by the administrator to be compiled and run. The server returns the output; nothing is kept in Moodle.';
$string['privacy:metadata:jobe:code'] = 'The program the user runs';
$string['privacy:metadata:jobe:stdin'] = 'The input the user gives the program';
$string['privacy:metadata:pyodide'] = 'When Python runs in the browser, the user\'s browser loads Pyodide (the Python interpreter) from the address set by the administrator, by default the jsDelivr CDN. No program or input is sent.';
$string['privacy:metadata:pyodide:ipaddress'] = 'The IP address of the user\'s browser, as with any download';
$string['privacy:metadata:runner'] = 'When the administrator sets an interactive server (CodeLab runner), C, C++, Java and C# programs are run there while the user types their input. The server keeps a program only while it runs; nothing is kept in Moodle.';
$string['privacy:metadata:runner:code'] = 'The program the user runs';
$string['privacy:metadata:runner:stdin'] = 'The input the user types';
$string['privacy:metadata:runner:userid'] = 'The id of the user, in a signed token, to limit the number of programs each user runs at once';
$string['pyodideurl'] = 'Address of Pyodide';
$string['pyodideurl_desc'] = 'Folder with the Pyodide files (pyodide.mjs and the rest). Empty: {$a} (jsDelivr; the reader\'s browser then loads them from there). A copy on your own server keeps the readers\' browsers off other servers.';
$string['ratelimit'] = 'Runs per minute';
$string['ratelimit_desc'] = 'How many times one user may run programs in a minute (0: no limit).';
$string['reset'] = 'Restore original';
$string['run'] = 'Run';
$string['runnable'] = 'Readers can run it';
$string['runner'] = 'Interactive server (CodeLab runner)';
$string['runner_desc'] = 'Optional. A small server beside Jobe that keeps a C, C++, Java or C# program running while the reader types its input in the console, as in a terminal. Without it, the input is given before the run and the program runs on Jobe. Grading always stays on Jobe.';
$string['runnersecret'] = 'Secret of the interactive server';
$string['runnersecret_desc'] = 'The same secret as CODELAB_SECRET of the server, at least 16 characters. Moodle signs a short-lived token with it for each run.';
$string['runnerstatus'] = 'State of the interactive server';
$string['runnerstatus_error'] = 'The interactive server does not answer at {$a}.';
$string['runnerstatus_notset'] = 'The interactive server is not set: programs run on Jobe with the input given before the run.';
$string['runnerstatus_ok'] = 'The interactive server answers. Languages: {$a->languages}. Open sessions: {$a->sessions}.';
$string['runnerurl'] = 'Address of the interactive server';
$string['runnerurl_desc'] = 'WebSocket address, for example wss://runner.example.org. Leave it empty to run every program on Jobe.';
$string['running'] = 'Running…';
$string['running_browser'] = 'Running in your browser…';
$string['running_server'] = 'Running: type the input below and press Enter.';
$string['setup'] = 'Setup run before the code, hidden from readers (tables and data)';
$string['speed'] = 'Speed';
$string['status_busy'] = 'The server is busy. Try again in a moment.';
$string['status_compile'] = 'Compilation error';
$string['status_disconnected'] = 'The connection to the interactive server was lost.';
$string['status_error'] = 'The program could not be run.';
$string['status_illegal'] = 'The program tried something that is not allowed.';
$string['status_memory'] = 'The program used too much memory.';
$string['status_nolanguage'] = 'The Jobe server of this site does not have this language.';
$string['status_notconfigured'] = 'Running programs is not set up on this site (Jobe server).';
$string['status_ok'] = 'Finished';
$string['status_ratelimit'] = 'Too many runs in a minute. Wait a little and try again.';
$string['status_runtime'] = 'Error while running';
$string['status_stopped'] = 'Stopped';
$string['status_time'] = 'Time limit exceeded (an endless loop?)';
$string['status_toolarge'] = 'The program or its input is too large.';
$string['status_toolong'] = 'Too much output: the program was stopped.';
$string['status_unreachable'] = 'The interactive server could not be reached. Try again; if it repeats, tell the administrator.';
$string['step'] = 'Step';
$string['stepout'] = 'Step out';
$string['stepover'] = 'Step over';
$string['stop'] = 'Stop';
$string['theme'] = 'Theme';
$string['theme_auto'] = 'Automatic (matches site and system)';
$string['theme_desc'] = 'Default editor theme for CodeLab code blocks.';
$string['theme_hc_black'] = 'High Contrast Dark';
$string['theme_vs'] = 'Visual Studio (Light)';
$string['theme_vs_dark'] = 'Visual Studio Dark';
$string['toggletheme'] = 'Toggle theme (Light / Dark)';
$string['traceline'] = 'Line';
$string['tracetable'] = 'Trace table';
$string['variables'] = 'Variables';
$string['viewerlabel'] = '{$a} program';
