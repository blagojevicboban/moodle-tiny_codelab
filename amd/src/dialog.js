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
import {component, languages, defaultLanguage} from './common';
import {readBlock, blockHtml, isBlock, stdinOf} from './embed';
import {createEditor} from './monaco';
import {run} from './runner';
import {showRunning, showResult, showError} from './console';
import {getPyodide} from './options';
import {available as pythonAvailable} from './python';
import {PythonSession} from './session';

let counter = 0;

/**
 * Open the dialog for the selected CodeLab block, or for a new one with the selected text as its code.
 *
 * @param {TinyMCE} editor
 */
export const openDialog = async(editor) => {
    const node = editor.selection.getNode();
    const existing = isBlock(node) ? node : null;
    const block = existing ? readBlock(existing)
        : {lang: defaultLanguage, run: true, noassist: false, stdin: '',
            code: editor.selection.getContent({format: 'text'}) || ''};

    const langs = Object.keys(languages);
    const names = await getStrings(langs.map((lang) => ({key: `lang_${lang}`, component})));
    const uniqid = `tiny_codelab_${++counter}`;
    const body = Templates.render('tiny_codelab/dialog', {
        uniqid,
        languages: langs.map((value, i) => ({value, name: names[i], selected: value === block.lang})),
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
    const panel = region('console');
    panel.hidden = true;
    // The input is saved with the block: readers start from it.
    region('stdin').value = block.stdin || '';

    const runButton = root.querySelector('[data-action="run"]');
    const stepButton = root.querySelector('[data-action="step"]');
    const stopButton = root.querySelector('[data-action="stop"]');
    // Python runs in the browser when it can: input() asks while the program runs, Step goes line by line.
    const pyodide = getPyodide(editor);
    const browser = () => langSelect.value === 'python' && pyodide !== '' && pythonAvailable();
    let session = null;

    let code = null;
    const doRun = async() => {
        if (browser()) {
            if (session.state === 'paused') {
                session.resume();
            } else if (session.state === 'idle') {
                await session.start(false, region('stdin').value);
            }
            return;
        }
        await showRunning(panel);
        try {
            await showResult(panel, await run(langSelect.value, code.getValue(), region('stdin').value,
                getContextId(editor)));
        } catch (e) {
            await showError(panel, e);
        }
    };
    code = await createEditor(region('editor'), {
        value: block.code,
        lang: block.lang,
        minLines: 12,
        maxLines: 24,
        label: await getString('editorlabel', component),
        onRun: doRun,
    });
    code.focus();

    session = new PythonSession({
        base: pyodide,
        editor: code,
        panel,
        vars: region('vars'),
        onState: (state) => {
            runButton.disabled = state === 'running';
            stepButton.disabled = state === 'running';
            stopButton.hidden = state === 'idle';
            langSelect.disabled = state !== 'idle';
        },
    });
    const showPythonButtons = () => {
        stepButton.hidden = !browser();
        if (!browser()) {
            region('vars').hidden = true;
        }
    };
    showPythonButtons();

    langSelect.addEventListener('change', () => {
        code.setLanguage(langSelect.value);
        showPythonButtons();
    });
    runButton.addEventListener('click', doRun);
    stepButton.addEventListener('click', () => {
        if (session.state === 'paused') {
            session.step();
        } else if (session.state === 'idle') {
            session.start(true, region('stdin').value);
        }
    });
    stopButton.addEventListener('click', () => session.stop());
    modal.getRoot().on(ModalEvents.hidden, () => {
        session.stop();
        code.dispose();
    });
    modal.getRoot().on(ModalEvents.save, () => {
        const html = blockHtml({
            lang: langSelect.value,
            run: region('run').checked,
            noassist: region('noassist').checked,
            code: code.getValue(),
            stdin: region('stdin').value,
        });
        if (existing) {
            const oldStdin = stdinOf(existing);
            if (oldStdin) {
                editor.dom.remove(oldStdin);
            }
            editor.dom.setOuterHTML(existing, html);
        } else {
            editor.insertContent(html);
        }
        editor.undoManager.add();
    });
};
