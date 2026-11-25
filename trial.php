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
 * The button Get a free trial of the settings page: asks the trial server for a connection key and sets it.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../../config.php');

require_login();
require_capability('moodle/site:config', context_system::instance());
require_sesskey();

$settings = new moodle_url('/admin/settings.php', ['section' => 'tiny_codelab_settings']);
if (!\tiny_codelab\local\trial::offered()) {
    redirect($settings);
}
\core\session\manager::write_close();
$result = \tiny_codelab\local\trial::request((string) $USER->email);
if ($result['ok']) {
    $message = get_string('trial_ok', 'tiny_codelab', (object) [
        'site' => $result['site'],
        'expires' => $result['expires'],
    ]);
    redirect($settings, $message, null, \core\output\notification::NOTIFY_SUCCESS);
}
$message = get_string('trial_error_' . $result['error'], 'tiny_codelab');
redirect($settings, $message, null, \core\output\notification::NOTIFY_ERROR);
