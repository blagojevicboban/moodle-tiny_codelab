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

namespace tiny_codelab\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use tiny_codelab\local\interactive;

/**
 * A token for the C# language service of the CodeLab runner (completions, signatures, tooltips and errors while typing).
 * The service only analyzes the program and never runs it, so the token does not count against the rate limit of runs.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class analysis extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context of the page with the program'),
            'lang' => new external_value(PARAM_ALPHA, 'Language: csharp'),
        ]);
    }

    /**
     * Give a token for one connection to the language service.
     *
     * @param int $contextid
     * @param string $lang
     * @return array status (ok, notconfigured or nolanguage), url, token
     */
    public static function execute(int $contextid, string $lang): array {
        global $USER;
        $params = self::validate_parameters(self::execute_parameters(), ['contextid' => $contextid, 'lang' => $lang]);
        $context = \context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/codelab:run', $context);

        $result = ['status' => 'ok', 'url' => '', 'token' => ''];
        if (interactive::url() === '') {
            $result['status'] = 'notconfigured';
        } else if ($params['lang'] !== 'csharp' || !in_array('csharp', interactive::languages(), true)) {
            $result['status'] = 'nolanguage';
        } else {
            $result['url'] = interactive::url() . '/analysis';
            $result['token'] = interactive::token((int) $USER->id, 'csharp', null, 'analysis');
        }
        return $result;
    }

    /**
     * Result.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_ALPHA, 'ok, notconfigured or nolanguage'),
            'url' => new external_value(PARAM_RAW, 'WebSocket address of the language service, without the token'),
            'token' => new external_value(PARAM_RAW, 'Token for one connection'),
        ]);
    }
}
