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
 * Free trial of the hosted CodeLab runner, asked for by the administrator with one button.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_codelab\local;

/**
 * Free trial of the hosted CodeLab runner.
 *
 * The administrator clicks the button (nothing is sent before): this site makes a nonce, keeps it for ten minutes and
 * sends its address, the nonce and the e-mail address of the administrator to the trial server. The server asks this
 * site whether it made the nonce (trialcheck.php), so no one can ask for a trial in the name of another site, and
 * answers with the connection key, which is set here.
 *
 * @package    tiny_codelab
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class trial {
    /** Where trials are asked for (CodeLab Cloud, codelabedu.com). */
    const URL = 'https://trial.codelabedu.com/trial';

    /** Seconds a nonce is valid. */
    const NONCE_TIME = 600;

    /**
     * Whether the button is offered: no connection key yet.
     *
     * @return bool
     */
    public static function offered(): bool {
        return trim((string) get_config('tiny_codelab', 'cloudkey')) === '';
    }

    /**
     * Ask for a trial and set its connection key.
     *
     * @param string $email the e-mail address of the administrator (the key is also sent there)
     * @param \curl|null $curl for tests
     * @return array ['ok' => bool, 'error' => code of the error or '', 'site' => site id, 'expires' => YYYY-MM-DD]
     */
    public static function request(string $email, ?\curl $curl = null): array {
        global $CFG;
        $nonce = random_string(48);
        set_config('trialnonce', $nonce . ':' . time(), 'tiny_codelab');
        if ($curl === null) {
            require_once($CFG->libdir . '/filelib.php');
            $curl = new \curl();
        }
        $curl->setHeader(['Content-Type: application/json', 'Accept: application/json']);
        $body = $curl->post(self::URL, json_encode([
            'wwwroot' => $CFG->wwwroot,
            'email' => validate_email($email) ? $email : '',
            'nonce' => $nonce,
        ]), ['CURLOPT_TIMEOUT' => 30, 'CURLOPT_CONNECTTIMEOUT' => 5]);
        unset_config('trialnonce', 'tiny_codelab');
        $data = json_decode((string) $body, true);
        if ($curl->get_errno() || !is_array($data)) {
            return ['ok' => false, 'error' => 'connect', 'site' => '', 'expires' => ''];
        }
        if (empty($data['ok']) || !is_string($data['key'] ?? null)) {
            $error = (string) ($data['error'] ?? '');
            return ['ok' => false, 'error' => in_array($error, ['used', 'verify', 'busy', 'invalid'], true) ? $error : 'failed',
                'site' => '', 'expires' => ''];
        }
        set_config('cloudkey', trim($data['key']), 'tiny_codelab');
        if (interactive::cloud_config() === null) {
            unset_config('cloudkey', 'tiny_codelab');
            return ['ok' => false, 'error' => 'failed', 'site' => '', 'expires' => ''];
        }
        return ['ok' => true, 'error' => '', 'site' => (string) ($data['site'] ?? ''),
            'expires' => (string) ($data['expires'] ?? '')];
    }

    /**
     * Whether this site made the nonce in the last ten minutes (the question of the trial server).
     *
     * @param string $nonce
     * @param int|null $now
     * @return bool
     */
    public static function check(string $nonce, ?int $now = null): bool {
        $stored = (string) get_config('tiny_codelab', 'trialnonce');
        if ($nonce === '' || !preg_match('~^([A-Za-z0-9]{48}):(\d+)$~', $stored, $m)) {
            return false;
        }
        return hash_equals($m[1], $nonce) && ($now ?? time()) - (int) $m[2] <= self::NONCE_TIME;
    }
}
