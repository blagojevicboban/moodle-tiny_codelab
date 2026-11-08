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
    // What the Jobe server answers: asked again when this settings page is opened, otherwise taken from the cache.
    $refresh = optional_param('section', '', PARAM_ALPHANUMEXT) === $settings->name;
    $settings->add(new admin_setting_description(
        'tiny_codelab/jobestatus',
        get_string('jobestatus', 'tiny_codelab'),
        \tiny_codelab\local\languages::status_html($refresh)
    ));
    $names = [];
    foreach (\tiny_codelab\local\languages::all() as $lang) {
        $names[$lang] = get_string('lang_' . $lang, 'tiny_codelab');
    }
    $settings->add(new admin_setting_configmulticheckbox(
        'tiny_codelab/languages',
        get_string('languages', 'tiny_codelab'),
        get_string('languages_desc', 'tiny_codelab'),
        array_fill_keys(array_keys($names), 1),
        $names
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

    $settings->add(new admin_setting_configselect(
        'tiny_codelab/theme',
        get_string('theme', 'tiny_codelab'),
        get_string('theme_desc', 'tiny_codelab'),
        'auto',
        [
            'auto' => get_string('theme_auto', 'tiny_codelab'),
            'vs' => get_string('theme_vs', 'tiny_codelab'),
            'vs-dark' => get_string('theme_vs_dark', 'tiny_codelab'),
            'hc-black' => get_string('theme_hc_black', 'tiny_codelab'),
        ]
    ));

    // The interactive server beside Jobe (CodeLab runner): optional.
    $settings->add(new admin_setting_heading(
        'tiny_codelab/runnerheading',
        get_string('runner', 'tiny_codelab'),
        get_string('runner_desc', 'tiny_codelab')
    ));
    $settings->add(new admin_setting_configtext(
        'tiny_codelab/runnerurl',
        get_string('runnerurl', 'tiny_codelab'),
        get_string('runnerurl_desc', 'tiny_codelab'),
        '',
        PARAM_RAW_TRIMMED
    ));
    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_codelab/runnersecret',
        get_string('runnersecret', 'tiny_codelab'),
        get_string('runnersecret_desc', 'tiny_codelab'),
        ''
    ));
    $settings->add(new admin_setting_description(
        'tiny_codelab/runnerstatus',
        get_string('runnerstatus', 'tiny_codelab'),
        $refresh ? \tiny_codelab\local\interactive::status_html() : ''
    ));
}
