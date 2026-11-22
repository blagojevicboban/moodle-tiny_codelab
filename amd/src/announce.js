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
 * What a screen reader hears at the end of a run: the status and the start of the output, in a polite live region
 * next to the console. The console itself is a scrolling region, not live: hearing every line while it is written is
 * too much, and a program that prints a lot would never let the reader stop. A console that is itself live
 * (role="status" or aria-live, as filter_codelab and qtype_codelab give it) is left alone and nothing is added.
 *
 * @module     tiny_codelab/announce
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getString} from 'core/str';
import {component} from './common';

/** Most characters of the output that are read out. */
export const MAX_ANNOUNCED = 300;

/** @type {WeakMap<HTMLElement, HTMLElement>} live region of each console */
const regions = new WeakMap();

/**
 * The output as one line for reading: spaces and new lines become one space, and a long output is cut.
 *
 * @param {string} written
 * @returns {string}
 */
export const announcedOutput = (written) => {
    const text = written.replace(/\s+/g, ' ').trim();
    return text.length > MAX_ANNOUNCED ? `${text.slice(0, MAX_ANNOUNCED).trimEnd()}…` : text;
};

/**
 * The text read at the end of a run.
 *
 * @param {string} end the status (Finished, Runtime error ...)
 * @param {string} written the output of the program
 * @param {function(string): Promise<string>} label "Output: {$a}" for the given output
 * @returns {Promise<string>}
 */
export const outputAnnouncement = async(end, written, label) => {
    const text = announcedOutput(written);
    return text ? `${end} ${await label(text)}` : end;
};

/**
 * The live region of a console, made the first time (before the run, so that the screen reader knows it when the
 * text comes); null when the console is live itself or not on the page.
 *
 * @param {HTMLElement} panel
 * @returns {HTMLElement|null}
 */
export const liveRegion = (panel) => {
    if (regions.has(panel)) {
        return regions.get(panel);
    }
    if (panel.matches('[role="status"], [role="alert"], [role="log"], [aria-live]') || !panel.parentNode) {
        return null;
    }
    const region = document.createElement('div');
    region.className = 'sr-only visually-hidden';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    panel.after(region);
    regions.set(panel, region);
    return region;
};

/**
 * A run starts: the last announcement is removed, so the same text is read again at the end of this run.
 *
 * @param {HTMLElement} panel
 */
export const announceStart = (panel) => {
    const region = liveRegion(panel);
    if (region) {
        region.textContent = '';
    }
};

/**
 * A run ended: read its status and the start of its output.
 *
 * @param {HTMLElement} panel
 * @param {string} end
 * @param {string} written
 * @returns {Promise<void>}
 */
export const announceEnd = async(panel, end, written) => {
    const region = liveRegion(panel);
    if (region) {
        region.textContent = await outputAnnouncement(end, written, (text) => getString('outputannounce', component, text));
    }
};
