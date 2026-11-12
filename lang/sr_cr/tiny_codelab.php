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
 * Strings for component 'tiny_codelab', language 'sr_cr'.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['autostep'] = 'Аутоматски корак';
$string['autostop'] = 'Пауза';
$string['browserpython'] = 'Python у прегледачу';
$string['browserpython_desc'] = 'Python програми примера извршавају се у прегледачу читаоца (Pyodide): input() тражи улаз док програм ради, а Корак приказује програм ред по ред са променљивим. Оцене у квизу и даље даје Jobe сервер. Потребан је прегледач са JavaScript Promise Integration (Chrome, Edge 137+); остали прегледачи користе Jobe сервер.';
$string['button'] = 'CodeLab';
$string['cachedef_languages'] = 'Језици Jobe сервера';
$string['cachedef_runs'] = 'Недавна покретања сваког корисника (за ограничење по минуту)';
$string['callstack'] = 'Стек позива';
$string['codelab:run'] = 'Покретање програма на Jobe серверу';
$string['codelab:viewplugin'] = 'Коришћење додатка CodeLab у едитору';
$string['compiling'] = 'Превођење…';
$string['copied'] = 'Копирано';
$string['copy'] = 'Копирај';
$string['cputime'] = 'Ограничење процесорског времена (секунде)';
$string['cputime_desc'] = 'Најдуже време извршавања програма, од 1 до 30 секунди.';
$string['dialogtitle'] = 'CodeLab програм';
$string['editedcopy'] = 'Ваше измене се чувају у овом прегледачу.';
$string['editorlabel'] = 'Код програма';
$string['endinput'] = 'Крај уноса (Ctrl+D)';
$string['exitfullscreen'] = 'Изађи из целог екрана';
$string['fullscreen'] = 'Цео екран';
$string['input'] = 'Улаз';
$string['inputline'] = 'Улаз за програм';
$string['inputok'] = 'Пошаљи ред';
$string['insert'] = 'Убаци';
$string['jobeapikey'] = 'Jobe API кључ';
$string['jobeapikey_desc'] = 'Кључ који се шаље у заглављу X-API-KEY, ако га Jobe сервер тражи.';
$string['jobeserver'] = 'Jobe сервер';
$string['jobeserver_desc'] = 'Адреса Jobe сервера који преводи и извршава програме, на пример https://jobe.example.org (без /jobe/index.php/restapi). Празно: програми не могу да се покрећу.';
$string['jobestatus'] = 'Стање Jobe сервера';
$string['jobestatus_error'] = 'Jobe сервер не одговара ({$a}). Проверите адресу и API кључ.';
$string['jobestatus_missing'] = 'Нема их на овом серверу: {$a}. Ти језици се не нуде (Python се нуди кад ради у прегледачу).';
$string['jobestatus_notset'] = 'Jobe сервер није подешен: програми не могу да се покрену (само Python у прегледачу).';
$string['jobestatus_ok'] = 'Jobe сервер одговара. Језици: {$a}.';
$string['jobestatus_runfailed'] = 'Али пробни програм није прихваћен ({$a}). Проверите API кључ.';
$string['lang_c'] = 'C';
$string['lang_cpp'] = 'C++';
$string['lang_csharp'] = 'C#';
$string['lang_java'] = 'Java';
$string['lang_javascript'] = 'JavaScript (Node.js)';
$string['lang_mysql'] = 'MySQL (MariaDB)';
$string['lang_pascal'] = 'Pascal';
$string['lang_php'] = 'PHP';
$string['lang_python'] = 'Python';
$string['language'] = 'Језик';
$string['languages'] = 'Језици';
$string['languages_desc'] = 'Језици које наставници могу да изаберу за примере и питања. Језик који Jobe сервер нема се изоставља, осим Python-а кад ради у прегледачу. Примери и питања који већ користе неки језик задржавају га.';
$string['loadingpython'] = 'Учитава се Python… (први пут траје неколико секунди)';
$string['mainprogram'] = 'главни програм';
$string['menuitem'] = 'CodeLab програм';
$string['noassist'] = 'Без помоћи при куцању (за контролне)';
$string['nooutput'] = '(програм није ништа исписао)';
$string['novariables'] = '(још нема променљивих)';
$string['output'] = 'Излаз';
$string['paused'] = 'Заустављено пре реда {$a}';
$string['pluginname'] = 'CodeLab';
$string['privacy:metadata:jobe'] = 'Програми се шаљу Jobe серверу који је подесио администратор, да се преведу и изврше. Сервер враћа излаз; у Moodle-у се ништа не чува.';
$string['privacy:metadata:jobe:code'] = 'Програм који корисник покреће';
$string['privacy:metadata:jobe:stdin'] = 'Улаз који корисник даје програму';
$string['privacy:metadata:pyodide'] = 'Кад Python ради у прегледачу, прегледач корисника учитава Pyodide (Python интерпретер) са адресе коју је подесио администратор, подразумевано са jsDelivr CDN-а. Програм и улаз се не шаљу.';
$string['privacy:metadata:pyodide:ipaddress'] = 'IP адреса прегледача корисника, као при сваком преузимању';
$string['privacy:metadata:runner'] = 'Када администратор подеси интерактивни сервер (CodeLab runner), C, C++, Java и C# програми се извршавају на њему док корисник куца улаз. Сервер чува програм само док ради; ништа се не чува у Moodle-у.';
$string['privacy:metadata:runner:code'] = 'Програм који корисник покреће';
$string['privacy:metadata:runner:stdin'] = 'Улаз који корисник куца';
$string['privacy:metadata:runner:userid'] = 'Идентификатор корисника, у потписаном токену, ради ограничења броја програма које један корисник покреће истовремено';
$string['pyodideurl'] = 'Адреса Pyodide-а';
$string['pyodideurl_desc'] = 'Фолдер са Pyodide фајловима (pyodide.mjs и остали). Празно: {$a} (jsDelivr; прегледач читаоца их тада учитава одатле). Копија на вашем серверу чува прегледаче читалаца од других сервера.';
$string['ratelimit'] = 'Покретања у минути';
$string['ratelimit_desc'] = 'Колико пута један корисник може да покрене програме у минути (0: без ограничења).';
$string['reset'] = 'Врати оригинал';
$string['run'] = 'Покрени';
$string['runnable'] = 'Читаоци могу да га покрену';
$string['runner'] = 'Интерактивни сервер (CodeLab runner)';
$string['runner_desc'] = 'Није обавезно. Мали сервер поред Jobe-а који држи C, C++, Java или C# програм покренутим док читалац куца улаз у конзоли, као у терминалу. Без њега се улаз даје пре покретања и програм се извршава на Jobe-у. Оцењивање увек остаје на Jobe-у.';
$string['runnersecret'] = 'Тајна интерактивног сервера';
$string['runnersecret_desc'] = 'Иста тајна као CODELAB_SECRET на серверу, најмање 16 знакова. Moodle њоме потписује краткотрајни токен за свако покретање.';
$string['runnerstatus'] = 'Стање интерактивног сервера';
$string['runnerstatus_error'] = 'Интерактивни сервер се не јавља на {$a}.';
$string['runnerstatus_notset'] = 'Интерактивни сервер није подешен: програми се извршавају на Jobe-у са улазом датим пре покретања.';
$string['runnerstatus_ok'] = 'Интерактивни сервер се јавља. Језици: {$a->languages}. Отворених сесија: {$a->sessions}.';
$string['runnerurl'] = 'Адреса интерактивног сервера';
$string['runnerurl_desc'] = 'WebSocket адреса, на пример wss://runner.example.org. Оставите празно да се сви програми извршавају на Jobe-у.';
$string['running'] = 'Извршава се…';
$string['running_browser'] = 'Извршава се у вашем прегледачу…';
$string['running_server'] = 'Програм ради: укуцајте улаз испод и притисните Enter.';
$string['setup'] = 'Код који се извршава пре кода, скривен од читалаца (табеле и подаци)';
$string['speed'] = 'Брзина';
$string['status_busy'] = 'Сервер је заузет. Покушајте поново за тренутак.';
$string['status_compile'] = 'Грешка при превођењу';
$string['status_disconnected'] = 'Веза са интерактивним сервером је прекинута.';
$string['status_error'] = 'Програм није могао да се покрене.';
$string['status_illegal'] = 'Програм је покушао нешто што није дозвољено.';
$string['status_memory'] = 'Програм је заузео превише меморије.';
$string['status_nolanguage'] = 'Jobe сервер овог сајта нема овај језик.';
$string['status_notconfigured'] = 'Покретање програма није подешено на овом сајту (Jobe сервер).';
$string['status_ok'] = 'Завршено';
$string['status_ratelimit'] = 'Превише покретања у минути. Сачекајте мало и покушајте поново.';
$string['status_runtime'] = 'Грешка при извршавању';
$string['status_stopped'] = 'Заустављено';
$string['status_time'] = 'Прекорачено време (бесконачна петља?)';
$string['status_toolarge'] = 'Програм или улаз је превелик.';
$string['status_toolong'] = 'Превише исписа: програм је заустављен.';
$string['status_unreachable'] = 'Интерактивни сервер није доступан. Покушајте поново; ако се понови, јавите администратору.';
$string['step'] = 'Корак';
$string['stepagain'] = 'Поново корак по корак, исти улаз';
$string['stepback'] = 'Корак назад';
$string['stepforward'] = 'Корак напред';
$string['stepout'] = 'Изађи из функције';
$string['stepover'] = 'Прескочи позив';
$string['stop'] = 'Заустави';
$string['timeline'] = 'Место у извршавању';
$string['timelineend'] = 'Крај програма';
$string['timelinepast'] = '{$a}: приказан је ранији корак. Програм чека на последњем кораку.';
$string['timelinepastended'] = '{$a}: приказан је ранији корак. Програм је завршен.';
$string['timelinepos'] = 'Корак {$a->n} од {$a->m}';
$string['traceline'] = 'Ред';
$string['tracetable'] = 'Табела праћења';
$string['variables'] = 'Променљиве';
$string['viewerlabel'] = 'Програм ({$a})';
