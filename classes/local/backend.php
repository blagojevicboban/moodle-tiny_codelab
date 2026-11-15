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
 * Which server runs programs to their end and grades them: Jobe or the CodeLab runner (setting "backend").
 *
 * Interactive runs, Step and the debugger always use the runner; SQL runs only there.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backend {
    /** Jobe when it is set up, otherwise the runner; the runner also when Jobe cannot be reached. */
    const AUTO = 'auto';

    /** Always Jobe (SQL still on the runner). */
    const JOBE = 'jobe';

    /** Always the runner (no Jobe needed). */
    const RUNNER = 'runner';

    /**
     * The setting.
     *
     * @return string auto, jobe or runner
     */
    public static function mode(): string {
        $mode = (string) get_config('tiny_codelab', 'backend');
        return in_array($mode, [self::JOBE, self::RUNNER], true) ? $mode : self::AUTO;
    }

    /**
     * Whether programs of a language are run to their end and graded on the runner.
     *
     * @param string $lang
     * @return bool
     */
    public static function on_runner(string $lang): bool {
        if (in_array($lang, interactive::ONLY, true)) {
            return true;
        }
        return match (self::mode()) {
            self::RUNNER => true,
            self::JOBE => false,
            default => !(new jobe())->is_configured(),
        };
    }

    /**
     * Whether a run that could not reach Jobe goes to the runner instead.
     *
     * @return bool
     */
    public static function fallback(): bool {
        return self::mode() === self::AUTO && interactive::url() !== '';
    }

    /**
     * The client for the languages offered on this site (the settings page and the language lists).
     *
     * @return jobe
     */
    public static function languages_client(): jobe {
        return self::on_runner('c') ? new runner_client() : new jobe();
    }
}
