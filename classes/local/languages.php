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
 * The languages CodeLab offers: those the administrator turned on that the Jobe server has, and Python when it runs in
 * the browser. What the server has is asked once an hour (a failed answer again after five minutes) and cached.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class languages {
    /** Seconds a failed answer of the server is kept before asking again. */
    const RETRY = 300;

    /**
     * What the server has: ok, versions (CodeLab language => version), error, time of the answer.
     *
     * @param jobe|null $jobe client (default: the one of the settings)
     * @param bool $refresh ask the server even when the answer is cached
     * @return array
     */
    public static function server(?jobe $jobe = null, bool $refresh = false): array {
        $jobe = $jobe ?? new jobe();
        if (!$jobe->is_configured()) {
            return ['ok' => false, 'versions' => [], 'error' => '', 'time' => 0];
        }
        $cache = \cache::make('tiny_codelab', 'languages');
        $key = $jobe->cache_key();
        $info = $refresh ? false : $cache->get($key);
        if ($info === false || (!$info['ok'] && time() - $info['time'] > self::RETRY)) {
            $info = $jobe->languages() + ['time' => time()];
            $cache->set($key, $info);
        }
        return $info;
    }

    /**
     * State of the Jobe server for the settings page: whether it answers, and which languages it has.
     *
     * @param bool $refresh ask the server now
     * @return string HTML
     */
    public static function status_html(bool $refresh = false): string {
        $jobe = new jobe();
        if (!$jobe->is_configured()) {
            return \html_writer::div(get_string('jobestatus_notset', 'tiny_codelab'), 'alert alert-warning');
        }
        $info = self::server($jobe, $refresh);
        if (!$info['ok']) {
            return \html_writer::div(get_string('jobestatus_error', 'tiny_codelab', s($info['error'])), 'alert alert-danger');
        }
        $have = [];
        $missing = [];
        foreach (array_keys(jobe::LANGUAGES) as $lang) {
            $name = get_string('lang_' . $lang, 'tiny_codelab');
            if (isset($info['versions'][$lang])) {
                $have[] = $name . ' ' . $info['versions'][$lang];
            } else {
                $missing[] = $name;
            }
        }
        $text = get_string('jobestatus_ok', 'tiny_codelab', s(implode(', ', $have)));
        if ($missing) {
            $text .= ' ' . get_string('jobestatus_missing', 'tiny_codelab', s(implode(', ', $missing)));
        }
        // Jobe lists its languages without checking the API key: a small program shows whether runs are accepted.
        $failed = $refresh ? self::test_run($jobe, array_keys($info['versions'])) : '';
        if ($failed !== '') {
            $text .= ' ' . get_string('jobestatus_runfailed', 'tiny_codelab', s($failed));
            return \html_writer::div($text, 'alert alert-danger');
        }
        return \html_writer::div($text, $missing ? 'alert alert-warning' : 'alert alert-success');
    }

    /**
     * Run a small program on the server.
     *
     * @param jobe $jobe
     * @param string[] $langs languages the server has
     * @return string why the run failed, or '' when it worked (or no test language is there)
     */
    protected static function test_run(jobe $jobe, array $langs): string {
        $programs = ['python' => "print(1)\n", 'c' => "#include <stdio.h>\nint main(void) { printf(\"1\\n\"); return 0; }\n"];
        foreach ($programs as $lang => $code) {
            if (in_array($lang, $langs, true)) {
                $result = $jobe->run($lang, $code);
                return $result['status'] === 'ok' ? '' : trim($result['stderr'] ?: $result['cmpinfo'] ?: $result['status']);
            }
        }
        return '';
    }

    /**
     * Whether the server can run a language. When it cannot be asked, the run is tried (and fails with its own error).
     *
     * @param string $lang CodeLab language
     * @param jobe|null $jobe
     * @return bool
     */
    public static function on_server(string $lang, ?jobe $jobe = null): bool {
        $info = self::server($jobe);
        return !$info['ok'] || isset($info['versions'][$lang]);
    }

    /**
     * Every language of CodeLab: those of Jobe, then those that run only on the interactive server (SQL).
     *
     * @return string[]
     */
    public static function all(): array {
        return array_merge(array_keys(jobe::LANGUAGES), interactive::ONLY);
    }

    /**
     * Languages the administrator turned on (all when the setting has not been saved).
     *
     * @return string[]
     */
    public static function enabled(): array {
        $setting = get_config('tiny_codelab', 'languages');
        if ($setting === false || $setting === null) {
            return self::all();
        }
        $chosen = array_filter(explode(',', (string) $setting));
        return array_values(array_intersect(self::all(), $chosen));
    }

    /**
     * Languages teachers can choose for examples and questions, in the order of jobe::LANGUAGES.
     *
     * @param string|null $current the language of the example or question being edited, always kept
     * @return string[]
     */
    public static function offered(?string $current = null): array {
        $info = self::server();
        $browser = runtime::pyodide() !== '';
        $offered = [];
        $runner = interactive::url() !== '';
        foreach (self::enabled() as $lang) {
            if (in_array($lang, interactive::ONLY, true)) {
                // SQL runs only on the interactive server.
                if ($runner) {
                    $offered[] = $lang;
                }
            } else if (!$info['ok'] || isset($info['versions'][$lang]) || ($lang === 'python' && $browser)) {
                $offered[] = $lang;
            }
        }
        if ($current !== null && in_array($current, self::all(), true) && !in_array($current, $offered, true)) {
            $offered[] = $current;
        }
        return $offered;
    }
}
