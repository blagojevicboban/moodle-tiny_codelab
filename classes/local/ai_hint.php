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
 * AI help (optional): with an AI provider of the site (Site administration, General, AI) a student can ask why a
 * program did not compile or stopped with an error. The answer explains and points to the place, never gives the
 * corrected program. Off by default; in a quiz only for a CodeLab question that allows it (qtype_codelab 1.12).
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ai_hint {
    /** Longest program sent to the AI. */
    const MAX_CODE = 8000;

    /** Longest error text (the console after the run). */
    const MAX_PROBLEM = 3000;

    /**
     * Can the current user ask for AI help here: the site setting is on, an AI provider generates text (and is allowed
     * in this context), the user has the capability, and the page is not a quiz, or it is a quiz with a CodeLab question
     * that allows AI explanations.
     *
     * @param \context $context the page
     * @param int $questionid the question the student works on in a quiz, 0 elsewhere
     * @return bool
     */
    public static function available(\context $context, int $questionid = 0): bool {
        if (!get_config('tiny_codelab', 'aihints') || !class_exists('\core_ai\manager') || !isloggedin() || isguestuser()) {
            return false;
        }
        if (!has_capability('tiny/codelab:aihint', $context) || !self::allowed_in($context, $questionid)) {
            return false;
        }
        try {
            $manager = \core\di::get(\core_ai\manager::class);
            if (!$manager->is_action_available(\core_ai\aiactions\generate_text::class)) {
                return false;
            }
            if (method_exists($manager, 'is_action_enabled_in_context')) {
                return $manager->is_action_enabled_in_context($context, \core_ai\aiactions\generate_text::class);
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Outside a quiz AI help is allowed; in a quiz only for a CodeLab question of that quiz with the option AI
     * explanations (qtype_codelab 1.12), so it cannot be asked where the teacher did not allow it.
     *
     * @param \context $context the page
     * @param int $questionid the question, 0 when not known
     * @return bool
     */
    public static function allowed_in(\context $context, int $questionid): bool {
        global $DB;
        $cm = self::quiz_of($context);
        if (!$cm) {
            return true;
        }
        if (!$questionid || !$DB->get_manager()->field_exists('qtype_codelab_options', 'aihints')) {
            return false;
        }
        $sql = "SELECT 1
                  FROM {quiz_slots} qs
                  JOIN {question_references} qr ON qr.itemid = qs.id AND qr.component = 'mod_quiz'
                       AND qr.questionarea = 'slot'
                  JOIN {question_versions} qv ON qv.questionbankentryid = qr.questionbankentryid
                  JOIN {qtype_codelab_options} o ON o.questionid = qv.questionid
                 WHERE qs.quizid = :quizid AND qv.questionid = :questionid AND o.aihints = 1";
        return $DB->record_exists_sql($sql, ['quizid' => $cm->instance, 'questionid' => $questionid]);
    }

    /**
     * Whether a context is a quiz or inside one.
     *
     * @param \context $context
     * @return bool
     */
    public static function in_quiz(\context $context): bool {
        return self::quiz_of($context) !== null;
    }

    /**
     * The quiz a context belongs to, if any.
     *
     * @param \context $context
     * @return \stdClass|null its course module
     */
    protected static function quiz_of(\context $context): ?\stdClass {
        foreach (array_merge([$context], $context->get_parent_contexts()) as $ctx) {
            if ($ctx->contextlevel == CONTEXT_MODULE) {
                $cm = get_coursemodule_from_id('', $ctx->instanceid, 0, false, IGNORE_MISSING);
                return $cm && $cm->modname === 'quiz' ? $cm : null;
            }
        }
        return null;
    }

    /**
     * Count one more request of a user; false when the limit of requests per hour is reached.
     *
     * @param int $userid
     * @return bool
     */
    public static function take_request(int $userid): bool {
        $limit = (int) get_config('tiny_codelab', 'aihintlimit');
        if ($limit <= 0) {
            return true;
        }
        $cache = \cache::make('tiny_codelab', 'aihints');
        $now = time();
        $times = array_values(array_filter((array) ($cache->get($userid) ?: []), fn($t) => $t > $now - HOURSECS));
        if (count($times) >= $limit) {
            return false;
        }
        $times[] = $now;
        $cache->set($userid, $times);
        return true;
    }

    /**
     * The prompt for the AI.
     *
     * @param string $lang name of the programming language (C, Python ...)
     * @param string $code the program
     * @param string $problem what the console showed: the compiler messages or the error of the run
     * @param string $language name of the language of the answer
     * @return string
     */
    public static function prompt(string $lang, string $code, string $problem, string $language): string {
        $cut = fn(string $text, int $max) => \core_text::substr(trim($text), 0, $max);
        $lines = [
            'You help a beginner who learns programming in ' . $lang . '. The program below did not compile or stopped ' .
            'with an error; the messages of the compiler or of the run follow it.',
            'Explain in simple words what the message means and on which line or in which statement the cause is.',
            'Rules: answer in ' . $language . ', in at most five short sentences, without headings. Do not write the ' .
            'corrected program or corrected lines of code, and do not give the full solution; the student must make the ' .
            'fix. You may name a statement or a variable of the program.',
            "\nProgram:\n" . $cut($code, self::MAX_CODE),
            "\nMessages:\n" . $cut($problem, self::MAX_PROBLEM),
        ];
        return implode("\n", $lines);
    }
}
