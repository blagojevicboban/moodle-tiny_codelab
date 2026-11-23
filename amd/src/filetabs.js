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
 * File tabs above a Monaco code editor for multi-file examples and questions: tab 0 is the main program and the
 * remaining tabs are the companion source, header or data files.
 *
 * @module     tiny_codelab/filetabs
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Display name of the main program tab for each CodeLab language. */
const MAIN_FILES = {
    c: 'main.c',
    cpp: 'main.cpp',
    python: 'main.py',
    java: 'Main.java',
    csharp: 'Program.cs',
    javascript: 'main.js',
    pascal: 'main.pas',
    php: 'main.php',
    mysql: 'query.sql',
    typescript: 'main.ts',
    bash: 'main.sh',
    go: 'main.go',
    rust: 'main.rs',
    r: 'main.R',
    ruby: 'main.rb',
    lua: 'main.lua',
    kotlin: 'Main.kt',
    perl: 'main.pl',
    octave: 'main.m',
    julia: 'main.jl',
    scheme: 'main.scm',
    dart: 'main.dart',
    scala: 'Main.scala',
    elixir: 'main.exs',
    swift: 'main.swift',
    haskell: 'Main.hs',
    html: 'index.html',
};

/** CodeLab language (or 'plaintext') inferred from a file extension. */
const EXT_LANG = {
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    hh: 'cpp',
    py: 'python',
    java: 'java',
    cs: 'csharp',
    js: 'javascript',
    ts: 'typescript',
    pas: 'pascal',
    php: 'php',
    sql: 'mysql',
    sh: 'bash',
    bash: 'bash',
    go: 'go',
    rs: 'rust',
    r: 'r',
    rb: 'ruby',
    lua: 'lua',
    kt: 'kotlin',
    pl: 'perl',
    m: 'octave',
    jl: 'julia',
    scm: 'scheme',
    dart: 'dart',
    scala: 'scala',
    ex: 'elixir',
    exs: 'elixir',
    swift: 'swift',
    hs: 'haskell',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    svg: 'xml',
};

/**
 * Default tab name of the main program for a language.
 *
 * @param {string} lang
 * @returns {string}
 */
export const mainFileName = (lang) => MAIN_FILES[lang] || 'main.txt';

/**
 * Infer the Monaco language key for a companion file name.
 *
 * @param {string} name
 * @param {string} [fallbackLang]
 * @returns {string}
 */
export const languageForFile = (name, fallbackLang = 'plaintext') => {
    const dot = String(name || '').lastIndexOf('.');
    if (dot < 0) {
        return 'plaintext';
    }
    const ext = name.slice(dot + 1).toLowerCase();
    if (ext === 'h' && fallbackLang === 'cpp') {
        return 'cpp';
    }
    return EXT_LANG[ext] || 'plaintext';
};

/**
 * Attach a keyboard-accessible tab bar above a Monaco editor for the main program and companion files.
 *
 * @param {Object} options
 * @param {HTMLElement} options.host the editor host element (the tab bar is inserted right before it)
 * @param {import('./monaco').CodeEditor} options.editor
 * @param {string} options.lang CodeLab language of the main program
 * @param {string} options.initialMain initial text of the main program
 * @param {Array<{name: string, text: string}>} options.files companion files (at least 1)
 * @param {boolean} [options.readOnlyMain] whether the main tab is read-only
 * @param {boolean} [options.readOnlyFiles] whether companion file tabs are read-only
 * @param {string} [options.label] accessible label of the tablist
 * @returns {{bar: HTMLElement, select: function(number): void, getMain: function(): string,
 *     setMain: function(string): void, getFiles: function(): Array<{name: string, text: string}>,
 *     reset: function(): void, onMainChange: function(function(string): void): void}}
 */
export const createFileTabs = ({
    host,
    editor,
    lang,
    initialMain,
    files,
    readOnlyMain = false,
    readOnlyFiles = false,
    label = '',
}) => {
    const names = [mainFileName(lang), ...files.map((f) => f.name)];
    const originals = [initialMain, ...files.map((f) => f.text)];
    const contents = [...originals];
    const mainListeners = [];
    let active = 0;
    let switching = false;

    const bar = document.createElement('div');
    bar.className = 'tiny_codelab-filetabs';
    bar.setAttribute('role', 'tablist');
    if (label) {
        bar.setAttribute('aria-label', label);
    }

    const buttons = names.map((name, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tiny_codelab-filetab' + (i === 0 ? ' active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.tabIndex = i === 0 ? 0 : -1;
        btn.textContent = name;
        bar.append(btn);
        return btn;
    });

    const select = (index) => {
        if (index < 0 || index >= names.length || index === active) {
            return;
        }
        active = index;
        buttons.forEach((btn, i) => {
            const on = i === active;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.tabIndex = on ? 0 : -1;
        });
        switching = true;
        try {
            editor.setValue(contents[active]);
            editor.setLanguage(active === 0 ? lang : languageForFile(names[active], lang));
            editor.setReadOnly(active === 0 ? readOnlyMain : readOnlyFiles);
        } finally {
            switching = false;
        }
    };

    buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => select(i));
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
                select(next);
                buttons[next].focus();
            }
        });
    });

    editor.onChange((value) => {
        if (switching) {
            return;
        }
        contents[active] = value;
        if (active === 0) {
            mainListeners.forEach((fn) => fn(value));
        }
    });

    host.before(bar);

    return {
        bar,
        select,
        getMain: () => contents[0],
        setMain: (text) => {
            contents[0] = text;
            if (active === 0) {
                switching = true;
                try {
                    editor.setValue(text);
                } finally {
                    switching = false;
                }
            }
        },
        getFiles: () => files.map((f, i) => ({name: f.name, text: contents[i + 1]})),
        reset: () => {
            originals.forEach((orig, i) => {
                contents[i] = orig;
            });
            switching = true;
            try {
                editor.setValue(contents[active]);
            } finally {
                switching = false;
            }
            mainListeners.forEach((fn) => fn(contents[0]));
        },
        onMainChange: (cb) => {
            mainListeners.push(cb);
        },
    };
};
