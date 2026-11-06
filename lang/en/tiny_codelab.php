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

$string['browserpython'] = 'Python in the browser';
$string['browserpython_desc'] = 'Python programs of examples run in the reader\'s browser (Pyodide): input() asks for the input while the program runs, and Step shows the program line by line with its variables. Quiz grades still come from the Jobe server. Needs a browser with JavaScript Promise Integration (Chrome, Edge 137+); other browsers use the Jobe server.';
$string['button'] = 'CodeLab';
$string['cachedef_runs'] = 'Recent runs of each user (for the limit of runs per minute)';
$string['codelab:run'] = 'Run programs on the Jobe server';
$string['codelab:viewplugin'] = 'Use the CodeLab editor plugin';
$string['copied'] = 'Copied';
$string['copy'] = 'Copy';
$string['cputime'] = 'CPU time limit (seconds)';
$string['cputime_desc'] = 'Longest time a program may run, from 1 to 30 seconds.';
$string['dialogtitle'] = 'CodeLab program';
$string['editedcopy'] = 'Your changes are kept in this browser.';
$string['editorlabel'] = 'Program code';
$string['input'] = 'Input';
$string['inputline'] = 'Input for the program';
$string['insert'] = 'Insert';
$string['jobeapikey'] = 'Jobe API key';
$string['jobeapikey_desc'] = 'Key sent in the X-API-KEY header, when the Jobe server requires one.';
$string['jobeserver'] = 'Jobe server';
$string['jobeserver_desc'] = 'Address of the Jobe server that compiles and runs the programs, for example https://jobe.example.org (without /jobe/index.php/restapi). Empty: programs cannot be run.';
$string['lang_c'] = 'C';
$string['lang_cpp'] = 'C++';
$string['lang_csharp'] = 'C#';
$string['lang_java'] = 'Java';
$string['lang_javascript'] = 'JavaScript (Node.js)';
$string['lang_pascal'] = 'Pascal';
$string['lang_php'] = 'PHP';
$string['lang_python'] = 'Python';
$string['language'] = 'Language';
$string['loadingpython'] = 'Loading Python… (the first time takes a few seconds)';
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
$string['pyodideurl'] = 'Address of Pyodide';
$string['pyodideurl_desc'] = 'Folder with the Pyodide files (pyodide.mjs and the rest). Empty: {$a} (jsDelivr; the reader\'s browser then loads them from there). A copy on your own server keeps the readers\' browsers off other servers.';
$string['ratelimit'] = 'Runs per minute';
$string['ratelimit_desc'] = 'How many times one user may run programs in a minute (0: no limit).';
$string['reset'] = 'Restore original';
$string['run'] = 'Run';
$string['runnable'] = 'Readers can run it';
$string['running'] = 'Running…';
$string['running_browser'] = 'Running in your browser…';
$string['status_busy'] = 'The server is busy. Try again in a moment.';
$string['status_compile'] = 'Compilation error';
$string['status_error'] = 'The program could not be run.';
$string['status_illegal'] = 'The program tried something that is not allowed.';
$string['status_memory'] = 'The program used too much memory.';
$string['status_notconfigured'] = 'Running programs is not set up on this site (Jobe server).';
$string['status_ok'] = 'Finished';
$string['status_ratelimit'] = 'Too many runs in a minute. Wait a little and try again.';
$string['status_runtime'] = 'Error while running';
$string['status_stopped'] = 'Stopped';
$string['status_time'] = 'Time limit exceeded (an endless loop?)';
$string['status_toolarge'] = 'The program or its input is too large.';
$string['status_toolong'] = 'Too much output: the program was stopped.';
$string['step'] = 'Step';
$string['stop'] = 'Stop';
$string['variables'] = 'Variables';
$string['viewerlabel'] = '{$a} program';
