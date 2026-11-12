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
 * The interactive server (CodeLab runner) beside Jobe: it keeps a program running while the student types its input.
 * Moodle gives the browser a short-lived signed token; the server checks it with the shared secret.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class interactive {
    /** Languages the interactive server runs (Python runs in the browser). */
    const LANGUAGES = ['c', 'cpp', 'java', 'csharp', 'mysql'];

    /** Languages that run only on the interactive server, not on Jobe: SQL on MariaDB. */
    const ONLY = ['mysql'];

    /** Seconds a token may wait before the browser opens the session. */
    const TOKEN_SECONDS = 60;

    /**
     * Address of the server (ws:// or wss://), or '' when it is not set up.
     *
     * @return string
     */
    public static function url(): string {
        $url = rtrim(trim((string) get_config('tiny_codelab', 'runnerurl')), '/');
        return preg_match('~^wss?://~', $url) && self::secret() !== '' ? $url : '';
    }

    /**
     * The shared secret.
     *
     * @return string
     */
    public static function secret(): string {
        return trim((string) get_config('tiny_codelab', 'runnersecret'));
    }

    /**
     * Languages that run interactively on this site: those of the server that are also offered.
     *
     * @return array
     */
    public static function languages(): array {
        if (self::url() === '') {
            return [];
        }
        return array_values(array_intersect(self::LANGUAGES, languages::offered()));
    }

    /**
     * The id of this site on the server (in tokens and signed requests): the server may have a secret of its own for it
     * (CODELAB_SECRETS).
     *
     * @return string
     */
    public static function site(): string {
        global $CFG;
        return substr(sha1($CFG->wwwroot), 0, 12);
    }

    /**
     * A token for one session of a user, for one language.
     *
     * @param int $userid
     * @param string $lang the language the session may run ('' for any)
     * @param int|null $now
     * @return string
     */
    public static function token(int $userid, string $lang = '', ?int $now = null): string {
        $payload = [
            'u' => $userid,
            's' => self::site(),
            'e' => ($now ?? time()) + self::TOKEN_SECONDS,
            'n' => random_string(24),
        ];
        if ($lang !== '') {
            $payload['l'] = $lang;
        }
        $body = self::base64url(json_encode($payload));
        return $body . '.' . self::base64url(hash_hmac('sha256', $body, self::secret(), true));
    }

    /**
     * Base64 for addresses, without padding.
     *
     * @param string $data
     * @return string
     */
    public static function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * HTML for the settings page: whether the server answers at its /health address.
     *
     * @return string
     */
    public static function status_html(): string {
        global $CFG, $OUTPUT;
        $url = self::url();
        if ($url === '') {
            return $OUTPUT->notification(get_string('runnerstatus_notset', 'tiny_codelab'), 'info', false);
        }
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => true]);
        // Signed, so that the server also tells its version and load (only to Moodle).
        $curl->setHeader(runner_client::signature_headers('', null, false));
        $health = preg_replace('~^ws~', 'http', $url) . '/health';
        $body = $curl->get($health, [], ['CURLOPT_TIMEOUT' => 5, 'CURLOPT_CONNECTTIMEOUT' => 3]);
        $data = json_decode((string) $body, true);
        $site = \html_writer::div(get_string('runnerstatus_site', 'tiny_codelab', self::site()), 'small');
        if ($curl->get_errno() || empty($data['ok'])) {
            return $OUTPUT->notification(get_string('runnerstatus_error', 'tiny_codelab', s($health)), 'error', false) . $site;
        }
        return $OUTPUT->notification(get_string('runnerstatus_ok', 'tiny_codelab', (object) [
            'languages' => implode(', ', (array) ($data['languages'] ?? [])),
            'sessions' => isset($data['sessions']) ? (int) $data['sessions'] : '?',
            'version' => s((string) ($data['version'] ?? '?')),
        ]), 'success', false) . $site;
    }
}
