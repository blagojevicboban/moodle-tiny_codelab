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
 * Sandboxed live preview of HTML, CSS and JavaScript examples inside the browser (no server required).
 *
 * Security: the preview runs in an <iframe sandbox="allow-scripts allow-forms"> WITHOUT allow-same-origin, so user
 * scripts execute in an opaque null origin and cannot access Moodle cookies, DOM, storage or sesskey.
 *
 * @module     tiny_codelab/webpreview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

let previewCounter = 0;

/**
 * Escape closing </script> tags inside an inline script body.
 *
 * @param {string} text
 * @returns {string}
 */
const safeScript = (text) => String(text || '').replace(/<\/script/gi, '<\\/script');

/**
 * Escape closing </style> tags inside an inline style body.
 *
 * @param {string} text
 * @returns {string}
 */
const safeStyle = (text) => String(text || '').replace(/<\/style/gi, '<\\/style');

/**
 * Small console/error bridge injected into the preview document so console.log and runtime errors appear below
 * the preview frame via postMessage.
 *
 * @param {string} id unique preview identifier
 * @returns {string}
 */
const consoleBridge = (id) => {
    const safeId = JSON.stringify(id);
    return '<script>(function(){' +
        `var id=${safeId};` +
        'function send(level,args){try{var t=[];for(var i=0;i<args.length;i++){' +
        'var a=args[i];t.push(typeof a==="object"&&a!==null?JSON.stringify(a):String(a));}' +
        'parent.postMessage({codelabPreviewId:id,level:level,text:t.join(" ")},"*");}catch(e){}}' +
        '["log","warn","error","info"].forEach(function(m){var orig=console[m];' +
        'console[m]=function(){send(m,arguments);if(orig){orig.apply(console,arguments);}};});' +
        'window.addEventListener("error",function(e){send("error",[e.message+(e.lineno?" (line "+e.lineno+")":"")]);});' +
        '})();<\\/script>'.replace('<\\/script>', '</script>');
};

/**
 * Assemble a complete HTML document from the main HTML code and optional companion CSS/JS files.
 * Linked <link href="style.css"> and <script src="script.js"> tags are inlined; unlinked .css and .js companion
 * files are injected automatically into <head> and before </body>.
 *
 * @param {string} html main HTML content
 * @param {Array<{name: string, text: string}>} [files] companion files
 * @param {string} [previewId] when given, injects the console postMessage bridge
 * @returns {string}
 */
export const buildHtmlDocument = (html, files = [], previewId = '') => {
    let doc = String(html || '');
    const list = Array.isArray(files) ? files : [];
    const byName = new Map(list.map((f) => [String(f.name || '').toLowerCase(), String(f.text || '')]));
    const used = new Set();

    // Inline <link rel="stylesheet" href="name.css"> matching a companion file.
    doc = doc.replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (tag, href) => {
        const key = href.replace(/^\.\//, '').toLowerCase();
        if (byName.has(key) && key.endsWith('.css')) {
            used.add(key);
            return `<style>\n${safeStyle(byName.get(key))}\n</style>`;
        }
        return tag;
    });

    // Inline <script src="name.js"></script> matching a companion file.
    doc = doc.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
        const key = src.replace(/^\.\//, '').toLowerCase();
        if (byName.has(key) && key.endsWith('.js')) {
            used.add(key);
            return `<script>\n${safeScript(byName.get(key))}\n</script>`;
        }
        return tag;
    });

    // Collect unlinked .css and .js companion files.
    const extraCss = [];
    const extraJs = [];
    for (const file of list) {
        const key = String(file.name || '').toLowerCase();
        if (used.has(key)) {
            continue;
        }
        if (key.endsWith('.css')) {
            extraCss.push(`<style>\n${safeStyle(file.text)}\n</style>`);
        } else if (key.endsWith('.js')) {
            extraJs.push(`<script>\n${safeScript(file.text)}\n</script>`);
        }
    }

    const bridge = previewId ? consoleBridge(previewId) : '';
    const headAdd = [bridge, ...extraCss].filter(Boolean).join('\n');
    const bodyAdd = extraJs.join('\n');

    if (/<html\b/i.test(doc)) {
        if (headAdd) {
            doc = /<head\b[^>]*>/i.test(doc)
                ? doc.replace(/<head\b[^>]*>/i, (m) => `${m}\n${headAdd}`)
                : doc.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>\n${headAdd}\n</head>`);
        }
        if (bodyAdd) {
            doc = /<\/body>/i.test(doc)
                ? doc.replace(/<\/body>/i, `${bodyAdd}\n</body>`)
                : `${doc}\n${bodyAdd}`;
        }
        return doc;
    }

    return [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        headAdd,
        '</head>',
        '<body>',
        doc,
        bodyAdd,
        '</body>',
        '</html>',
    ].join('\n');
};

/**
 * Render an HTML/CSS/JS live preview inside the console panel using a strictly sandboxed iframe.
 *
 * @param {HTMLElement} panel
 * @param {string} html
 * @param {Array<{name: string, text: string}>} [files]
 */
export const showWebPreview = (panel, html, files = []) => {
    const id = `cl_preview_${++previewCounter}_${Date.now()}`;
    panel.replaceChildren();

    const iframe = document.createElement('iframe');
    iframe.className = 'tiny_codelab-webpreview';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.title = 'HTML preview';
    iframe.srcdoc = buildHtmlDocument(html, files, id);

    const log = document.createElement('pre');
    log.className = 'tiny_codelab-webconsole';
    log.hidden = true;

    const onMessage = (event) => {
        if (!iframe.isConnected) {
            window.removeEventListener('message', onMessage);
            return;
        }
        if (event.source !== iframe.contentWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.codelabPreviewId !== id) {
            return;
        }
        log.hidden = false;
        const line = document.createElement('div');
        line.className = data.level === 'error' ? 'tiny_codelab-console-error' : '';
        line.textContent = String(data.text || '');
        log.append(line);
    };
    window.addEventListener('message', onMessage);

    panel.append(iframe, log);
    panel.hidden = false;
};
