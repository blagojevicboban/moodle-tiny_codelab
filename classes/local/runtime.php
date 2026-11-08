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

namespace tiny_codelab\local;

/**
 * Settings of the in-browser runtimes, passed to the JavaScript of the editor, the filter and the question type.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class runtime {
    /** Default address of the Pyodide files (Python in the browser). */
    const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

    /**
     * Address of the Pyodide files.
     *
     * @return string ending with /, or '' when Python runs only on Jobe
     */
    public static function pyodide(): string {
        if (get_config('tiny_codelab', 'browserpython') === '0') {
            return '';
        }
        $url = trim((string) get_config('tiny_codelab', 'pyodideurl')) ?: self::PYODIDE_URL;
        return rtrim($url, '/') . '/';
    }

    /**
     * Settings for JavaScript.
     *
     * @return array ['pyodide' => address of the Pyodide files ending with /, or '' when Python runs only on Jobe,
     *     'interactive' => languages that run on the interactive server, 'theme' => default editor theme]
     */
    public static function config(): array {
        $theme = (string) get_config('tiny_codelab', 'theme');
        return [
            'pyodide' => self::pyodide(),
            'interactive' => interactive::languages(),
            'theme' => $theme !== '' ? $theme : 'auto',
        ];
    }
}
