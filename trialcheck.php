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
 * Answers the trial server whether this site asked for a trial with this nonce (in the last ten minutes).
 *
 * Public, without a session: the trial server calls it while the administrator waits for the key. It tells only
 * yes or no about a random value that this site made; it shows nothing else.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:ignore moodle.Files.RequireLogin.Missing -- the trial server calls it without a session (see above).
define('NO_MOODLE_COOKIES', true);

require_once(__DIR__ . '/../../../../../config.php');

$nonce = optional_param('nonce', '', PARAM_ALPHANUM);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(['ok' => \tiny_codelab\local\trial::check($nonce)]);
