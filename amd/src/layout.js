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
 * Panels below or beside the code, as the panel position of VS Code. On a wide block the panels (Step, variables,
 * input, console) go beside the code by default; two icon buttons choose the place, and the reader's choice is kept
 * for all blocks. On a narrow block (a page with side blocks, a phone) the panels always stay below the code and the
 * buttons are hidden. A bar between the columns changes their widths (mouse or arrow keys).
 *
 * @module     tiny_codelab/layout
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {setIcon} from './icons';

/** Class of the root when the panels are beside the code. */
export const SIDE = 'tiny_codelab-side';
/** Event on the root after the place of the panels changes. */
export const CHANGE = 'tiny_codelab-layoutchange';

const PLACE_KEY = 'codelab_panels';
const SPLIT_KEY = 'codelab_split';
const DEFAULT_SPLIT = 58;
const MIN_SPLIT = 25;
const MAX_SPLIT = 75;
// Space the sticky code column leaves free in the window (the toolbar of the block, the navigation bar).
const STICKY_ROOM = 90;

/**
 * The reader's settings; localStorage may be unavailable (private mode), then nothing is kept.
 *
 * @param {string} key
 * @returns {{get: function(): ?string, set: function(string): void}}
 */
const setting = (key) => ({
    get: () => {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    set: (value) => {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            // Not allowed: the choice holds for this page only.
        }
    },
});

/** All blocks of the page, so a choice made in one is applied to all. */
const blocks = new Set();

/**
 * The saved width of the code column, in percent.
 *
 * @returns {number}
 */
const savedSplit = () => {
    const value = Number(setting(SPLIT_KEY).get());
    return value >= MIN_SPLIT && value <= MAX_SPLIT ? value : DEFAULT_SPLIT;
};

/**
 * Let a block choose where its panels are.
 *
 * @param {Object} options
 * @param {HTMLElement} options.root the block; its children after main are the panels
 * @param {HTMLElement} options.main the code column (the editor with its file tabs)
 * @param {{bottom: string, side: string, resize: string}} options.labels names of the buttons and of the bar
 * @param {number} [options.minWidth] narrowest block with the panels beside the code, in pixels
 * @param {string} [options.className] classes of the buttons
 * @returns {{buttons: HTMLButtonElement[], update: function(): void}} the two buttons for the toolbar
 */
export const panelLayout = ({root, main, labels, minWidth = 960, className = 'btn btn-secondary btn-sm'}) => {
    main.classList.add('tiny_codelab-layout-main');
    const side = document.createElement('div');
    side.className = 'tiny_codelab-layout-side';

    const make = (place, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = className;
        b.dataset.action = `panel${place}`;
        setIcon(b, `panel${place}`, label);
        b.addEventListener('click', () => {
            setting(PLACE_KEY).set(place);
            blocks.forEach((block) => block.update());
            (place === 'side' ? splitter : b).focus();
        });
        return b;
    };
    const bottomButton = make('bottom', labels.bottom);
    const sideButton = make('side', labels.side);

    // The bar between the columns, at the right edge of the code column.
    const splitter = document.createElement('div');
    splitter.className = 'tiny_codelab-splitter';
    splitter.tabIndex = 0;
    splitter.title = labels.resize;
    const attrs = {'role': 'separator', 'aria-orientation': 'vertical', 'aria-label': labels.resize,
        'aria-valuemin': String(MIN_SPLIT), 'aria-valuemax': String(MAX_SPLIT)};
    Object.entries(attrs).forEach(([k, v]) => splitter.setAttribute(k, v));
    main.append(splitter);

    const setSplit = (value, save) => {
        const split = Math.round(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value)));
        root.style.setProperty('--tiny-codelab-split', `${split}%`);
        splitter.setAttribute('aria-valuenow', String(split));
        if (save) {
            setting(SPLIT_KEY).set(String(split));
        }
    };
    setSplit(savedSplit(), false);
    splitter.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        splitter.setPointerCapture(e.pointerId);
        // The editor is an iframe: it would take the pointer while the bar moves over it.
        root.classList.add('tiny_codelab-dragging');
    });
    splitter.addEventListener('pointermove', (e) => {
        if (splitter.hasPointerCapture(e.pointerId)) {
            const rect = root.getBoundingClientRect();
            setSplit((e.clientX - rect.left) / rect.width * 100, false);
        }
    });
    const endDrag = (e) => {
        if (splitter.hasPointerCapture(e.pointerId)) {
            splitter.releasePointerCapture(e.pointerId);
        }
        root.classList.remove('tiny_codelab-dragging');
        setSplit(Number(splitter.getAttribute('aria-valuenow')), true);
    };
    splitter.addEventListener('pointerup', endDrag);
    splitter.addEventListener('pointercancel', endDrag);
    splitter.addEventListener('keydown', (e) => {
        const now = Number(splitter.getAttribute('aria-valuenow'));
        const next = {ArrowLeft: now - 5, ArrowRight: now + 5, Home: MIN_SPLIT, End: MAX_SPLIT}[e.key];
        if (next !== undefined) {
            e.preventDefault();
            setSplit(next, true);
        }
    });

    // The code column stays in view while the panels scroll, when it fits the window.
    const sticky = () => {
        root.classList.toggle('tiny_codelab-sticky', root.classList.contains(SIDE)
            && main.offsetHeight < window.innerHeight - STICKY_ROOM);
    };

    const toSide = () => {
        const panels = [];
        for (let n = main.nextSibling; n; n = n.nextSibling) {
            panels.push(n);
        }
        side.append(...panels);
        main.after(side);
    };
    const toBottom = () => {
        side.after(...side.childNodes);
        side.remove();
    };

    const update = () => {
        const wide = root.clientWidth >= minWidth;
        const place = setting(PLACE_KEY).get() === 'bottom' ? 'bottom' : 'side';
        const beside = wide && place === 'side';
        bottomButton.hidden = sideButton.hidden = !wide;
        bottomButton.setAttribute('aria-pressed', beside ? 'false' : 'true');
        sideButton.setAttribute('aria-pressed', beside ? 'true' : 'false');
        if (beside !== root.classList.contains(SIDE)) {
            if (beside) {
                toSide();
            } else {
                toBottom();
            }
            root.classList.toggle(SIDE, beside);
            root.dispatchEvent(new CustomEvent(CHANGE, {detail: {side: beside}}));
        }
        sticky();
    };
    const block = {update};
    blocks.add(block);

    let frame = 0;
    const later = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            if (!root.isConnected) {
                blocks.delete(block);
                return;
            }
            update();
        });
    };
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(later);
        observer.observe(root);
        observer.observe(main);
    }
    window.addEventListener('resize', later);
    update();
    return {buttons: [bottomButton, sideButton], update};
};
