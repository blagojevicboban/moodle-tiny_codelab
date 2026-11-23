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
use tiny_codelab\local\ai_hint as hint;

/**
 * Ask the AI of the site to explain a compiler message or an error of the student's program.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ai_hint extends external_api {
    /** Names of the languages in the prompt. */
    const LANGUAGE_NAMES = ['c' => 'C', 'cpp' => 'C++', 'python' => 'Python', 'java' => 'Java', 'csharp' => 'C#',
        'javascript' => 'JavaScript', 'pascal' => 'Pascal', 'php' => 'PHP', 'mysql' => 'SQL (MySQL / MariaDB)',
        'typescript' => 'TypeScript', 'bash' => 'Bash', 'go' => 'Go', 'rust' => 'Rust', 'r' => 'R',
        'ruby' => 'Ruby', 'lua' => 'Lua', 'kotlin' => 'Kotlin', 'perl' => 'Perl', 'octave' => 'Octave',
        'html' => 'HTML / CSS / JS'];

    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context of the page'),
            'lang' => new external_value(PARAM_ALPHANUMEXT, 'Language of the program (c, cpp, python ...)'),
            'code' => new external_value(PARAM_RAW, 'The program'),
            'problem' => new external_value(PARAM_RAW, 'What the console showed: compiler messages or the error'),
            'questionid' => new external_value(PARAM_INT, 'The question in a quiz, 0 elsewhere', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Ask for the explanation.
     *
     * @param int $contextid
     * @param string $lang
     * @param string $code
     * @param string $problem
     * @param int $questionid
     * @return array
     */
    public static function execute(int $contextid, string $lang, string $code, string $problem, int $questionid = 0): array {
        global $USER;
        $params = self::validate_parameters(self::execute_parameters(), ['contextid' => $contextid, 'lang' => $lang,
            'code' => $code, 'problem' => $problem, 'questionid' => $questionid]);
        $context = \context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/codelab:aihint', $context);
        if (!hint::available($context, $params['questionid'])) {
            throw new \moodle_exception('aihintoff', 'tiny_codelab');
        }
        if (!\core_ai\manager::get_user_policy_status((int) $USER->id)) {
            throw new \moodle_exception('aihintpolicy', 'tiny_codelab');
        }
        if (trim($params['code']) === '' || trim($params['problem']) === '') {
            throw new \invalid_parameter_exception('Nothing to explain');
        }
        if (!hint::take_request((int) $USER->id)) {
            throw new \moodle_exception('aihintlimitreached', 'tiny_codelab', '', (int) get_config('tiny_codelab', 'aihintlimit'));
        }
        // The international name of the language of the user (Serbian has two scripts).
        $language = get_string('thislanguageint', 'langconfig');
        $scripts = ['sr_lt' => ' (Latin script)', 'sr_cr' => ' (Cyrillic script)'];
        $language .= $scripts[current_language()] ?? '';
        $action = new \core_ai\aiactions\generate_text(
            contextid: $context->id,
            userid: (int) $USER->id,
            prompttext: hint::prompt(
                self::LANGUAGE_NAMES[$params['lang']] ?? 'a programming language',
                $params['code'],
                $params['problem'],
                $language
            ),
        );
        try {
            $response = \core\di::get(\core_ai\manager::class)->process_action($action);
        } catch (\Throwable $e) {
            // A provider that cannot be reached can also throw; the student gets the same message.
            throw new \moodle_exception('aihintfailed', 'tiny_codelab', '', $e->getMessage());
        }
        if (!$response->get_success()) {
            throw new \moodle_exception('aihintfailed', 'tiny_codelab', '', $response->get_errormessage());
        }
        return ['text' => trim((string) ($response->get_response_data()['generatedcontent'] ?? ''))];
    }

    /**
     * Result.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'text' => new external_value(PARAM_RAW, 'The explanation (plain text)'),
        ]);
    }
}
