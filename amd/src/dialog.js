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
 * The CodeLab dialog in TinyMCE: write and try a program, then insert it as a CodeLab block.
 *
 * @module     tiny_codelab/dialog
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import ModalSaveCancel from 'core/modal_save_cancel';
import ModalEvents from 'core/modal_events';
import Templates from 'core/templates';
import {getString, getStrings} from 'core/str';
import {getContextId} from 'editor_tiny/options';
import {component, languages, defaultLanguage, setupLanguages, browserOnlyLanguages, defaultTheme, MAX_FILES,
    filesProblem, cStandards, cppStandards} from './common';
import {TEMPLATE_KEYS, templatesFor} from './codetemplates';
import {readBlock, blockHtml, isBlock, stdinOf, setupOf, filesOf, newBlockId} from './embed';
import {createEditor} from './monaco';
import {run} from './runner';
import {showRunning, showResult, showError} from './console';
import {showWebPreview} from './webpreview';
import {getPyodide, getLanguages, getInteractive, getTheme} from './options';
import {available as pythonAvailable} from './python';
import {PythonSession} from './session';
import {RemoteSession, runsInteractively, stepsInteractively} from './remote';
import {takeImport} from './importcode';

let counter = 0;

/**
 * Wire the C/C++ compiler profile and language standard dropdowns in the dialog.
 *
 * @param {HTMLElement} root
 * @param {HTMLSelectElement} langSelect
 * @param {Object} block
 * @returns {{update: function(): void, compiler: function(): string, std: function(): string}}
 */
const wireCompiler = (root, langSelect, block) => {
    const field = root.querySelector('[data-region="compilerfield"]');
    const ccSelect = root.querySelector('[data-region="compiler"]');
    const stdSelect = root.querySelector('[data-region="std"]');
    ccSelect.value = block.compiler || '';
    const update = () => {
        const lang = langSelect.value;
        const isC = lang === 'c' || lang === 'cpp';
        field.hidden = !isC;
        const prev = stdSelect.value || block.std || '';
        stdSelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
        const list = {c: cStandards, cpp: cppStandards}[lang] || [];
        list.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s.toUpperCase();
            stdSelect.append(opt);
        });
        stdSelect.value = list.includes(prev) ? prev : '';
    };
    update();
    return {
        update,
        compiler: () => (langSelect.value === 'c' || langSelect.value === 'cpp' ? ccSelect.value : ''),
        std: () => (langSelect.value === 'c' || langSelect.value === 'cpp' ? stdSelect.value : ''),
    };
};

/**
 * Open the dialog for the selected CodeLab block, or for a new one with the selected text as its code.
 *
 * @param {TinyMCE} editor
 */
export const openDialog = async(editor) => {
    const node = editor.selection.getNode();
    const existing = isBlock(node) ? node : null;
    const defaultThemeVal = getTheme(editor) || defaultTheme;
    const block = existing ? readBlock(existing)
        : {lang: defaultLanguage, theme: defaultThemeVal, run: true, noassist: false, stdin: '',
            code: editor.selection.getContent({format: 'text'}) || ''};

    // Only the languages that can run here, and the language of the example being edited.
    const offered = getLanguages(editor);
    // A new example without selected text starts from the code of a flowchart (Open in CodeLab of tiny_algorithm).
    const imported = existing || block.code !== '' ? null
        : takeImport(Object.keys(languages).filter((lang) => !offered.length || offered.includes(lang)));
    if (imported) {
        block.lang = imported.lang;
        block.code = imported.code;
    }
    const langs = Object.keys(languages).filter((lang) => !offered.length || offered.includes(lang) ||
        browserOnlyLanguages.includes(lang) || lang === block.lang);
    const names = await getStrings(langs.map((lang) => ({key: `lang_${lang}`, component})));

    const themeKeys = ['auto', 'vs', 'vs-dark', 'hc-black'];
    const themeNames = await getStrings(themeKeys.map((k) => ({key: `theme_${k.replace('-', '_')}`, component})));
    const selectedTheme = block.theme || defaultThemeVal;

    const uniqid = `tiny_codelab_${++counter}`;
    const body = Templates.render('tiny_codelab/dialog', {
        uniqid,
        languages: langs.map((value, i) => ({value, name: names[i], selected: value === block.lang})),
        themes: themeKeys.map((value, i) => ({value, name: themeNames[i], selected: value === selectedTheme})),
        run: block.run,
        noassist: block.noassist,
    });
    const modal = await ModalSaveCancel.create({
        title: getString('dialogtitle', component),
        body,
        large: true,
        removeOnClose: true,
        show: true,
        buttons: {save: getString('insert', component)},
    });
    const root = modal.getRoot()[0];
    await modal.getBodyPromise();
    const region = (name) => root.querySelector(`[data-region="${name}"]`);
    const langSelect = region('lang');
    const themeSelect = region('theme');
    const cc = wireCompiler(root, langSelect, block);
    if (imported) {
        const notice = document.createElement('div');
        notice.className = 'alert alert-info py-2 mb-2';
        notice.textContent = await getString('importedcode', component);
        region('editor').before(notice);
    }
    const panel = region('console');
    panel.hidden = true;
    // The input is saved with the block: readers start from it.
    region('stdin').value = block.stdin || '';
    // SQL: the tables and data, run before the reader's code and not shown to readers.
    region('setup').value = block.setup || '';
    const showSetup = () => {
        region('setupfield').hidden = !setupLanguages.includes(langSelect.value) && region('setup').value === '';
    };
    showSetup();

    // Files the program reads (Python in the browser for now): a name and a text per file, at most MAX_FILES.
    const fileStrings = await getStrings(['filename', 'filetext', 'removefile', 'filescount'].map((key) => ({key, component})));
    const [fileNameLabel, fileTextLabel, removeLabel, countLabel] = fileStrings;
    const fileRows = () => [...region('files').querySelectorAll('.tiny_codelab-file')];
    const files = () => fileRows().map((row) => ({name: row.querySelector('input').value.trim(),
        text: row.querySelector('textarea').value})).filter((f) => f.name !== '' || f.text !== '');
    const showFiles = () => {
        const count = fileRows().length;
        region('filessummary').textContent = countLabel.replace('{$a}', count);
        root.querySelector('[data-action="addfile"]').disabled = count >= MAX_FILES;
        region('filesfield').hidden = setupLanguages.includes(langSelect.value) && count === 0;
        region('filesnote').hidden = true;
    };
    const addFile = (file) => {
        const n = ++counter;
        const row = document.createElement('div');
        row.className = 'tiny_codelab-file border rounded p-2 mb-2';
        const head = document.createElement('div');
        head.className = 'd-flex align-items-center gap-2 mb-1';
        const label = document.createElement('label');
        label.className = 'mb-0';
        label.htmlFor = `${uniqid}-file${n}`;
        label.textContent = fileNameLabel;
        const name = document.createElement('input');
        name.type = 'text';
        name.id = label.htmlFor;
        name.className = 'form-control form-control-sm font-monospace w-auto';
        name.maxLength = 40;
        name.spellcheck = false;
        name.value = file.name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-outline-danger btn-sm ms-auto';
        remove.textContent = removeLabel;
        remove.addEventListener('click', () => {
            row.remove();
            showFiles();
            root.querySelector('[data-action="addfile"]').focus();
        });
        head.append(label, name, remove);
        const text = document.createElement('textarea');
        text.className = 'form-control font-monospace';
        text.rows = 4;
        text.spellcheck = false;
        text.value = file.text;
        const textName = () => text.setAttribute('aria-label', fileTextLabel.replace('{$a}', name.value.trim()));
        textName();
        name.addEventListener('input', textName);
        row.append(head, text);
        region('files').append(row);
        showFiles();
        return name;
    };
    (block.files || []).forEach(addFile);
    region('filesfield').open = (block.files || []).length > 0;
    root.querySelector('[data-action="addfile"]').addEventListener('click', () => {
        if (fileRows().length < MAX_FILES) {
            addFile({name: fileRows().length ? '' : 'input.txt', text: ''}).focus();
        }
    });

    const runButton = root.querySelector('[data-action="run"]');
    const stepButton = root.querySelector('[data-action="step"]');
    const stopButton = root.querySelector('[data-action="stop"]');
    // Python runs in the browser when it can: input() asks while the program runs, Step goes line by line.
    const pyodide = getPyodide(editor);
    const browser = () => langSelect.value === 'python' && pyodide !== '' && pythonAvailable();
    // C, C++, Java and C# run on the interactive server when the site has one: the input is typed while they run.
    const interactive = getInteractive(editor);
    const remote = () => runsInteractively(interactive, langSelect.value);
    // C and C++ also run step by step there (gdb).
    const remoteStep = () => stepsInteractively(interactive, langSelect.value);
    let session = null;
    let remoteSession = null;

    let code = null;
    const doRun = async() => {
        if (browserOnlyLanguages.includes(langSelect.value)) {
            showWebPreview(panel, code.getValue(), files());
            return;
        }
        if (browser()) {
            if (session.state === 'paused') {
                session.resume();
            } else if (session.state === 'idle') {
                await session.start(false, region('stdin').value);
            }
            return;
        }
        if (remote()) {
            if (remoteSession.state === 'paused') {
                remoteSession.resume();
            } else if (remoteSession.state === 'idle') {
                await remoteSession.start(false, region('stdin').value);
            }
            return;
        }
        await showRunning(panel);
        try {
            await showResult(panel, await run(langSelect.value, code.getValue(), region('stdin').value,
                getContextId(editor), files(), cc.compiler(), cc.std()));
        } catch (e) {
            await showError(panel, e);
        }
    };
    code = await createEditor(region('editor'), {
        value: block.code,
        lang: block.lang,
        theme: selectedTheme,
        minLines: 12,
        maxLines: 24,
        label: await getString('editorlabel', component),
        onRun: doRun,
        pyodide,
        // Breakpoints where Step exists: Python in the browser, C, C++ and C# on the interactive server.
        breakpoints: pyodide !== '' || interactive.some((lang) => stepsInteractively(interactive, lang)),
        build: () => ({compiler: cc.compiler(), std: cc.std()}),
    });
    code.focus();

    const onState = (state) => {
        runButton.disabled = state === 'running';
        stepButton.disabled = state === 'running';
        stopButton.hidden = state === 'idle';
        langSelect.disabled = state !== 'idle';
    };
    session = new PythonSession({
        base: pyodide,
        editor: code,
        panel,
        vars: region('vars'),
        onState,
        files,
    });
    remoteSession = new RemoteSession({
        lang: () => langSelect.value,
        program: () => code.getValue(),
        panel,
        onState,
        contextid: getContextId(editor),
        editor: code,
        vars: region('vars'),
        setup: () => (setupLanguages.includes(langSelect.value) ? region('setup').value : ''),
        files,
        compiler: () => cc.compiler(),
        std: () => cc.std(),
    });
    const showPythonButtons = () => {
        stepButton.hidden = !browser() && !remoteStep();
        if (stepButton.hidden) {
            region('vars').hidden = true;
        }
    };
    showPythonButtons();

    // Templates of the language: an empty editor gets the template (and its input, when the input is empty), otherwise
    // the template goes in at the cursor.
    const templateNames = await getStrings(TEMPLATE_KEYS.map((key) => ({key: `tpl_${key}`, component})));
    const templateSelect = region('template');
    const showTemplates = () => {
        const list = templatesFor(langSelect.value);
        templateSelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
        list.forEach(({key}) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = templateNames[TEMPLATE_KEYS.indexOf(key)];
            templateSelect.append(option);
        });
        templateSelect.value = '';
        region('templatefield').hidden = !list.length;
    };
    showTemplates();
    templateSelect.addEventListener('change', () => {
        const chosen = templatesFor(langSelect.value).find((t) => t.key === templateSelect.value);
        templateSelect.value = '';
        if (!chosen) {
            return;
        }
        if (code.getValue().trim() === '') {
            code.setValue(chosen.code);
            if (region('stdin').value.trim() === '') {
                region('stdin').value = chosen.stdin;
            }
        } else {
            code.insertText(chosen.code);
        }
    });

    langSelect.addEventListener('change', () => {
        code.setLanguage(langSelect.value);
        showPythonButtons();
        showSetup();
        showTemplates();
        showFiles();
        cc.update();
    });
    themeSelect.addEventListener('change', () => {
        code.setTheme(themeSelect.value);
    });
    runButton.addEventListener('click', doRun);
    stepButton.addEventListener('click', () => {
        if (!browser()) {
            if (remoteSession.state === 'paused') {
                remoteSession.step();
            } else if (remoteSession.state === 'idle') {
                remoteSession.start(true, region('stdin').value);
            }
        } else if (session.state === 'paused') {
            session.step();
        } else if (session.state === 'idle') {
            session.start(true, region('stdin').value);
        }
    });
    stopButton.addEventListener('click', () => {
        session.stop();
        remoteSession.stop();
    });
    modal.getRoot().on(ModalEvents.hidden, () => {
        session.stop();
        remoteSession.stop();
        code.dispose();
    });
    modal.getRoot().on(ModalEvents.save, async(e) => {
        // A file the block cannot keep: the dialog stays open and says why.
        const problem = filesProblem(files());
        if (problem) {
            e.preventDefault();
            region('filesfield').open = true;
            region('fileerror').hidden = false;
            region('fileerror').textContent = await getString(problem.key, component, problem.a);
            return;
        }
        const html = blockHtml({
            // A block keeps its id; a new or older block gets one, so the readers' copies stay with it when it moves.
            id: block.id || newBlockId(),
            lang: langSelect.value,
            theme: themeSelect.value,
            compiler: cc.compiler(),
            std: cc.std(),
            run: region('run').checked,
            noassist: region('noassist').checked,
            code: code.getValue(),
            stdin: region('stdin').value,
            setup: setupLanguages.includes(langSelect.value) ? region('setup').value : '',
            files: files(),
        });
        if (existing) {
            for (const old of [stdinOf(existing), setupOf(existing), ...filesOf(existing).map((f) => f.element)]) {
                if (old) {
                    editor.dom.remove(old);
                }
            }
            editor.dom.setOuterHTML(existing, html);
        } else {
            editor.insertContent(html);
        }
        editor.undoManager.add();
    });
};
