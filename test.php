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
 * Test of the Jobe server and the CodeLab runner for the administrator: languages, a small program in each, benchmark.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/adminlib.php');

admin_externalpage_setup('tiny_codelab_servertest');

$url = new moodle_url('/lib/editor/tiny/plugins/codelab/test.php');
$run = optional_param('run', 0, PARAM_BOOL);

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('servertest', 'tiny_codelab'));
echo html_writer::tag('p', get_string('servertest_desc', 'tiny_codelab', \tiny_codelab\local\server_test::BURST));

if ($run && confirm_sesskey()) {
    core_php_time_limit::raise(300);
    \core\session\manager::write_close();
    $context = \tiny_codelab\local\server_test::run();
    echo $OUTPUT->render_from_template('tiny_codelab/servertest', $context);
}

$runurl = new moodle_url($url, ['run' => 1]);
$runlabel = get_string('servertest_run', 'tiny_codelab');
echo $OUTPUT->single_button($runurl, $runlabel, 'post', ['type' => single_button::BUTTON_PRIMARY]);
$backurl = new moodle_url('/admin/settings.php', ['section' => 'tiny_codelab_settings']);
echo $OUTPUT->single_button($backurl, get_string('back'), 'get');
echo $OUTPUT->footer();
