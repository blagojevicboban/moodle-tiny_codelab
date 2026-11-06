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
 * Settings of tiny_codelab: the Jobe server that runs the programs.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_configtext(
        'tiny_codelab/jobeserver',
        get_string('jobeserver', 'tiny_codelab'),
        get_string('jobeserver_desc', 'tiny_codelab'),
        '',
        PARAM_URL
    ));
    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_codelab/jobeapikey',
        get_string('jobeapikey', 'tiny_codelab'),
        get_string('jobeapikey_desc', 'tiny_codelab'),
        ''
    ));
    $settings->add(new admin_setting_configtext(
        'tiny_codelab/cputime',
        get_string('cputime', 'tiny_codelab'),
        get_string('cputime_desc', 'tiny_codelab'),
        5,
        PARAM_INT
    ));
    $settings->add(new admin_setting_configcheckbox(
        'tiny_codelab/browserpython',
        get_string('browserpython', 'tiny_codelab'),
        get_string('browserpython_desc', 'tiny_codelab'),
        1
    ));
    $settings->add(new admin_setting_configtext(
        'tiny_codelab/pyodideurl',
        get_string('pyodideurl', 'tiny_codelab'),
        get_string('pyodideurl_desc', 'tiny_codelab', \tiny_codelab\local\runtime::PYODIDE_URL),
        '',
        PARAM_URL
    ));
    $settings->add(new admin_setting_configtext(
        'tiny_codelab/ratelimit',
        get_string('ratelimit', 'tiny_codelab'),
        get_string('ratelimit_desc', 'tiny_codelab'),
        20,
        PARAM_INT
    ));
}
