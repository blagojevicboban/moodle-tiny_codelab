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
 * Strings for component 'tiny_codelab', language 'sr_lt'.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['autostep'] = 'Automatski korak';
$string['autostop'] = 'Pauza';
$string['browserpython'] = 'Python u pregledaču';
$string['browserpython_desc'] = 'Python programi primera izvršavaju se u pregledaču čitaoca (Pyodide): input() traži ulaz dok program radi, a Korak prikazuje program red po red sa promenljivim. Ocene u kvizu i dalje daje Jobe server. Potreban je pregledač sa JavaScript Promise Integration (Chrome, Edge 137+); ostali pregledači koriste Jobe server.';
$string['button'] = 'CodeLab';
$string['cachedef_languages'] = 'Jezici Jobe servera';
$string['cachedef_runs'] = 'Nedavna pokretanja svakog korisnika (za ograničenje po minutu)';
$string['callstack'] = 'Stek poziva';
$string['codelab:run'] = 'Pokretanje programa na Jobe serveru';
$string['codelab:viewplugin'] = 'Korišćenje dodatka CodeLab u editoru';
$string['compiling'] = 'Prevođenje…';
$string['complexity'] = 'Složenost';
$string['copied'] = 'Kopirano';
$string['copy'] = 'Kopiraj';
$string['cputime'] = 'Ograničenje procesorskog vremena (sekunde)';
$string['cputime_desc'] = 'Najduže vreme izvršavanja programa, od 1 do 30 sekundi.';
$string['cxchart'] = 'Izvršeni redovi u zavisnosti od veličine n';
$string['cxclose'] = 'Zatvori';
$string['cxcurrent'] = 'program';
$string['cxerror'] = 'Merenje je stalo kod n = {$a->n}: {$a->error}';
$string['cxfailed'] = '–';
$string['cxinput'] = 'Ulaz za veličinu n';
$string['cxinputhelp'] = '{n} je veličina; {random} daje n slučajnih brojeva od 1 do 1000 u jednom redu, {sorted} iste sortirane, {reversed} sortirane od najvećeg.';
$string['cxkeep'] = 'Zadrži za poređenje';
$string['cxkept'] = 'zadržano';
$string['cxlooks'] = 'Raste kao {$a}.';
$string['cxmeasure'] = 'Izmeri';
$string['cxmeasuring'] = 'Merenje za n = {$a}…';
$string['cxo1'] = 'O(1)';
$string['cxologn'] = 'O(log n)';
$string['cxon'] = 'O(n)';
$string['cxon2'] = 'O(n²)';
$string['cxon3'] = 'O(n³)';
$string['cxonlogn'] = 'O(n log n)';
$string['cxsizes'] = 'Veličine n';
$string['cxsteps'] = 'izvršeni redovi';
$string['cxtoolong'] = 'izvršava previše redova';
$string['cxunknown'] = 'Izmerite bar tri veličine da bi se odredio rast.';
$string['dialogtitle'] = 'CodeLab program';
$string['editedcopy'] = 'Vaše izmene se čuvaju u ovom pregledaču.';
$string['editorlabel'] = 'Kod programa';
$string['endinput'] = 'Kraj unosa (Ctrl+D)';
$string['exitfullscreen'] = 'Izađi iz celog ekrana';
$string['fullscreen'] = 'Ceo ekran';
$string['input'] = 'Ulaz';
$string['inputline'] = 'Ulaz za program';
$string['inputok'] = 'Pošalji red';
$string['insert'] = 'Ubaci';
$string['jobeapikey'] = 'Jobe API ključ';
$string['jobeapikey_desc'] = 'Ključ koji se šalje u zaglavlju X-API-KEY, ako ga Jobe server traži.';
$string['jobeserver'] = 'Jobe server';
$string['jobeserver_desc'] = 'Adresa Jobe servera koji prevodi i izvršava programe, na primer https://jobe.example.org (bez /jobe/index.php/restapi). Prazno: programi ne mogu da se pokreću.';
$string['jobestatus'] = 'Stanje Jobe servera';
$string['jobestatus_error'] = 'Jobe server ne odgovara ({$a}). Proverite adresu i API ključ.';
$string['jobestatus_missing'] = 'Nema ih na ovom serveru: {$a}. Ti jezici se ne nude (Python se nudi kad radi u pregledaču).';
$string['jobestatus_notset'] = 'Jobe server nije podešen: programi ne mogu da se pokrenu (samo Python u pregledaču).';
$string['jobestatus_ok'] = 'Jobe server odgovara. Jezici: {$a}.';
$string['jobestatus_runfailed'] = 'Ali probni program nije prihvaćen ({$a}). Proverite API ključ.';
$string['lang_c'] = 'C';
$string['lang_cpp'] = 'C++';
$string['lang_csharp'] = 'C#';
$string['lang_java'] = 'Java';
$string['lang_javascript'] = 'JavaScript (Node.js)';
$string['lang_mysql'] = 'MySQL (MariaDB)';
$string['lang_pascal'] = 'Pascal';
$string['lang_php'] = 'PHP';
$string['lang_python'] = 'Python';
$string['language'] = 'Jezik';
$string['languages'] = 'Jezici';
$string['languages_desc'] = 'Jezici koje nastavnici mogu da izaberu za primere i pitanja. Jezik koji Jobe server nema se izostavlja, osim Python-a kad radi u pregledaču. Primeri i pitanja koji već koriste neki jezik zadržavaju ga.';
$string['loadingpython'] = 'Učitava se Python… (prvi put traje nekoliko sekundi)';
$string['mainprogram'] = 'glavni program';
$string['memmore'] = 'još {$a}';
$string['memory'] = 'Memorija';
$string['memref'] = 'pokazuje na {$a}';
$string['menuitem'] = 'CodeLab program';
$string['noassist'] = 'Bez pomoći pri kucanju (za kontrolne)';
$string['nooutput'] = '(program nije ništa ispisao)';
$string['novariables'] = '(još nema promenljivih)';
$string['output'] = 'Izlaz';
$string['paused'] = 'Zaustavljeno pre reda {$a}';
$string['pluginname'] = 'CodeLab';
$string['privacy:metadata:jobe'] = 'Programi se šalju Jobe serveru koji je podesio administrator, da se prevedu i izvrše. Server vraća izlaz; u Moodle-u se ništa ne čuva.';
$string['privacy:metadata:jobe:code'] = 'Program koji korisnik pokreće';
$string['privacy:metadata:jobe:stdin'] = 'Ulaz koji korisnik daje programu';
$string['privacy:metadata:pyodide'] = 'Kad Python radi u pregledaču, pregledač korisnika učitava Pyodide (Python interpreter) sa adrese koju je podesio administrator, podrazumevano sa jsDelivr CDN-a. Program i ulaz se ne šalju.';
$string['privacy:metadata:pyodide:ipaddress'] = 'IP adresa pregledača korisnika, kao pri svakom preuzimanju';
$string['privacy:metadata:runner'] = 'Kada administrator podesi interaktivni server (CodeLab runner), C, C++, Java i C# programi se izvršavaju na njemu dok korisnik kuca ulaz. Server čuva program samo dok radi; ništa se ne čuva u Moodle-u.';
$string['privacy:metadata:runner:code'] = 'Program koji korisnik pokreće';
$string['privacy:metadata:runner:stdin'] = 'Ulaz koji korisnik kuca';
$string['privacy:metadata:runner:userid'] = 'Identifikator korisnika, u potpisanom tokenu, radi ograničenja broja programa koje jedan korisnik pokreće istovremeno';
$string['pyodideurl'] = 'Adresa Pyodide-a';
$string['pyodideurl_desc'] = 'Folder sa Pyodide fajlovima (pyodide.mjs i ostali). Prazno: {$a} (jsDelivr; pregledač čitaoca ih tada učitava odande). Kopija na vašem serveru čuva pregledače čitalaca od drugih servera.';
$string['ratelimit'] = 'Pokretanja u minuti';
$string['ratelimit_desc'] = 'Koliko puta jedan korisnik može da pokrene programe u minuti (0: bez ograničenja).';
$string['reset'] = 'Vrati original';
$string['run'] = 'Pokreni';
$string['runnable'] = 'Čitaoci mogu da ga pokrenu';
$string['runner'] = 'Interaktivni server (CodeLab runner)';
$string['runner_desc'] = 'Nije obavezno. Mali server pored Jobe-a koji drži C, C++, Java ili C# program pokrenutim dok čitalac kuca ulaz u konzoli, kao u terminalu. Bez njega se ulaz daje pre pokretanja i program se izvršava na Jobe-u. Ocenjivanje uvek ostaje na Jobe-u.';
$string['runnersecret'] = 'Tajna interaktivnog servera';
$string['runnersecret_desc'] = 'Ista tajna kao CODELAB_SECRET na serveru, najmanje 16 znakova. Moodle njome potpisuje kratkotrajni token za svako pokretanje.';
$string['runnerstatus'] = 'Stanje interaktivnog servera';
$string['runnerstatus_error'] = 'Interaktivni server se ne javlja na {$a}.';
$string['runnerstatus_notset'] = 'Interaktivni server nije podešen: programi se izvršavaju na Jobe-u sa ulazom datim pre pokretanja.';
$string['runnerstatus_ok'] = 'Interaktivni server se javlja. Jezici: {$a->languages}. Otvorenih sesija: {$a->sessions}.';
$string['runnerurl'] = 'Adresa interaktivnog servera';
$string['runnerurl_desc'] = 'WebSocket adresa, na primer wss://runner.example.org. Ostavite prazno da se svi programi izvršavaju na Jobe-u.';
$string['running'] = 'Izvršava se…';
$string['running_browser'] = 'Izvršava se u vašem pregledaču…';
$string['running_server'] = 'Program radi: ukucajte ulaz ispod i pritisnite Enter.';
$string['setup'] = 'Kod koji se izvršava pre koda, skriven od čitalaca (tabele i podaci)';
$string['speed'] = 'Brzina';
$string['status_busy'] = 'Server je zauzet. Pokušajte ponovo za trenutak.';
$string['status_compile'] = 'Greška pri prevođenju';
$string['status_disconnected'] = 'Veza sa interaktivnim serverom je prekinuta.';
$string['status_error'] = 'Program nije mogao da se pokrene.';
$string['status_illegal'] = 'Program je pokušao nešto što nije dozvoljeno.';
$string['status_memory'] = 'Program je zauzeo previše memorije.';
$string['status_nolanguage'] = 'Jobe server ovog sajta nema ovaj jezik.';
$string['status_notconfigured'] = 'Pokretanje programa nije podešeno na ovom sajtu (Jobe server).';
$string['status_ok'] = 'Završeno';
$string['status_ratelimit'] = 'Previše pokretanja u minuti. Sačekajte malo i pokušajte ponovo.';
$string['status_runtime'] = 'Greška pri izvršavanju';
$string['status_stopped'] = 'Zaustavljeno';
$string['status_time'] = 'Prekoračeno vreme (beskonačna petlja?)';
$string['status_toolarge'] = 'Program ili ulaz je prevelik.';
$string['status_toolong'] = 'Previše ispisa: program je zaustavljen.';
$string['status_unreachable'] = 'Interaktivni server nije dostupan. Pokušajte ponovo; ako se ponovi, javite administratoru.';
$string['step'] = 'Korak';
$string['stepagain'] = 'Ponovo korak po korak, isti ulaz';
$string['stepback'] = 'Korak nazad';
$string['stepforward'] = 'Korak napred';
$string['stepout'] = 'Izađi iz funkcije';
$string['stepover'] = 'Preskoči poziv';
$string['stop'] = 'Zaustavi';
$string['timeline'] = 'Mesto u izvršavanju';
$string['timelineend'] = 'Kraj programa';
$string['timelinepast'] = '{$a}: prikazan je raniji korak. Program čeka na poslednjem koraku.';
$string['timelinepastended'] = '{$a}: prikazan je raniji korak. Program je završen.';
$string['timelinepos'] = 'Korak {$a->n} od {$a->m}';
$string['traceline'] = 'Red';
$string['tracetable'] = 'Tabela praćenja';
$string['variables'] = 'Promenljive';
$string['viewerlabel'] = 'Program ({$a})';
