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
use tiny_codelab\local\jobe;
use tiny_codelab\local\runner_client;

/**
 * Web service tiny_codelab_run: runs a program on the Jobe server for the Run button of editors and examples.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class run extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context of the page with the program'),
            'lang' => new external_value(PARAM_ALPHA, 'Language: c, cpp, python, java, csharp, javascript, pascal or php'),
            'code' => new external_value(PARAM_RAW, 'Program'),
            'stdin' => new external_value(PARAM_RAW, 'Standard input', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Run the program.
     *
     * @param int $contextid
     * @param string $lang
     * @param string $code
     * @param string $stdin
     * @return array
     */
    public static function execute(int $contextid, string $lang, string $code, string $stdin = ''): array {
        global $USER;
        $params = self::validate_parameters(
            self::execute_parameters(),
            ['contextid' => $contextid, 'lang' => $lang, 'code' => $code, 'stdin' => $stdin]
        );
        $context = \context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/codelab:run', $context);

        // SQL runs only on the interactive server (CodeLab runner); without one it is not available.
        $runner = in_array($params['lang'], interactive::ONLY, true);
        if ($runner && !in_array($params['lang'], interactive::languages(), true)) {
            return self::result(['status' => 'nolanguage']);
        }
        if (!$runner && !isset(jobe::LANGUAGES[$params['lang']])) {
            throw new \invalid_parameter_exception('Unknown language');
        }
        if (strlen($params['code']) > jobe::MAX_SIZE || strlen($params['stdin']) > jobe::MAX_SIZE) {
            return self::result(['status' => 'toolarge']);
        }
        if (!self::allow_run((int) $USER->id)) {
            return self::result(['status' => 'ratelimit']);
        }
        $client = $runner ? new runner_client() : new jobe();
        return self::result($client->run($params['lang'], $params['code'], $params['stdin']));
    }

    /**
     * Count the run and say whether the user may run now (runs per minute from the settings, 0: no limit).
     *
     * @param int $userid
     * @return bool
     */
    public static function allow_run(int $userid): bool {
        $limit = (int) get_config('tiny_codelab', 'ratelimit');
        if ($limit <= 0) {
            return true;
        }
        $cache = \cache::make('tiny_codelab', 'runs');
        $now = time();
        $times = array_values(array_filter((array) ($cache->get($userid) ?: []), fn($t) => $t > $now - 60));
        if (count($times) >= $limit) {
            return false;
        }
        $times[] = $now;
        $cache->set($userid, $times);
        return true;
    }

    /**
     * A result with every field.
     *
     * @param array $result
     * @return array
     */
    protected static function result(array $result): array {
        return array_merge(['status' => 'error', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''], $result);
    }

    /**
     * Result.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_ALPHA, 'ok, compile, runtime, time, memory, illegal, busy, error, ' .
                'notconfigured, nolanguage, toolarge or ratelimit'),
            'outcome' => new external_value(PARAM_INT, 'Jobe outcome code, 0 when Jobe was not asked'),
            'cmpinfo' => new external_value(PARAM_RAW, 'Compiler messages'),
            'stdout' => new external_value(PARAM_RAW, 'Standard output'),
            'stderr' => new external_value(PARAM_RAW, 'Standard error'),
        ]);
    }
}
