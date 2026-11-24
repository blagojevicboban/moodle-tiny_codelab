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
    const LANGUAGES = ['c', 'cpp', 'java', 'csharp', 'mysql', 'typescript', 'bash', 'go', 'rust', 'r',
        'ruby', 'lua', 'kotlin', 'perl', 'octave', 'julia', 'scheme', 'dart', 'scala', 'elixir', 'swift', 'haskell'];

    /** Languages that run only on the interactive server, not on Jobe. */
    const ONLY = ['mysql', 'typescript', 'bash', 'go', 'rust', 'r', 'ruby', 'lua', 'kotlin', 'perl', 'octave',
        'julia', 'scheme', 'dart', 'scala', 'elixir', 'swift', 'haskell'];

    /** Seconds a token may wait before the browser opens the session. */
    const TOKEN_SECONDS = 60;

    /**
     * Decoded connection key of a hosted runner, or null when empty or invalid.
     *
     * @return array|null keys: url, secret, site
     */
    public static function cloud_config(): ?array {
        $raw = trim((string) get_config('tiny_codelab', 'cloudkey'));
        if ($raw === '') {
            return null;
        }
        $decoded = base64_decode($raw, true);
        if ($decoded === false) {
            return null;
        }
        $data = json_decode($decoded, true);
        if (!is_array($data)) {
            return null;
        }
        $url = rtrim(trim((string) ($data['url'] ?? '')), '/');
        $secret = trim((string) ($data['secret'] ?? ''));
        $site = trim((string) ($data['site'] ?? ''));
        if (!preg_match('~^wss?://~', $url) || $secret === '') {
            return null;
        }
        return ['url' => $url, 'secret' => $secret, 'site' => $site];
    }

    /**
     * Address of the server (ws:// or wss://), or '' when it is not set up.
     *
     * @return string
     */
    public static function url(): string {
        $cloud = self::cloud_config();
        if ($cloud !== null) {
            return $cloud['url'];
        }
        $url = rtrim(trim((string) get_config('tiny_codelab', 'runnerurl')), '/');
        return preg_match('~^wss?://~', $url) && self::secret() !== '' ? $url : '';
    }

    /**
     * The shared secret.
     *
     * @return string
     */
    public static function secret(): string {
        $cloud = self::cloud_config();
        if ($cloud !== null) {
            return $cloud['secret'];
        }
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
        $cloud = self::cloud_config();
        if ($cloud !== null && $cloud['site'] !== '') {
            return $cloud['site'];
        }
        global $CFG;
        return substr(sha1($CFG->wwwroot), 0, 12);
    }

    /**
     * A token for one session of a user, for one language.
     *
     * @param int $userid
     * @param string $lang the language the session may run ('' for any)
     * @param int|null $now
     * @param string $purpose '' for a session that runs a program, 'analysis' for the C# language service
     * @return string
     */
    public static function token(int $userid, string $lang = '', ?int $now = null, string $purpose = ''): string {
        $payload = [
            'u' => $userid,
            's' => self::site(),
            'e' => ($now ?? time()) + self::TOKEN_SECONDS,
            'n' => random_string(24),
        ];
        if ($lang !== '') {
            $payload['l'] = $lang;
        }
        if ($purpose !== '') {
            $payload['p'] = $purpose;
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
        global $OUTPUT;
        $url = self::url();
        if ($url === '') {
            return $OUTPUT->notification(get_string('runnerstatus_notset', 'tiny_codelab'), 'info', false);
        }
        $curl = runner_client::curl();
        // Signed (with a nonce, which a hosted runner requires), so that the server also tells its version and load.
        $curl->setHeader(runner_client::signature_headers('', null, true));
        $health = preg_replace('~^ws~', 'http', $url) . '/health';
        $body = $curl->get($health, [], ['CURLOPT_TIMEOUT' => 5, 'CURLOPT_CONNECTTIMEOUT' => 3]);
        $data = json_decode((string) $body, true);
        // With a connection key the address and the secret fields are not used, and CODELAB_SECRETS is not the site's.
        $sitetext = self::cloud_config() !== null ? 'runnerstatus_cloud' : 'runnerstatus_site';
        $site = \html_writer::div(get_string($sitetext, 'tiny_codelab', s(self::site())), 'small');
        if ($curl->get_errno() || empty($data['ok'])) {
            return $OUTPUT->notification(get_string('runnerstatus_error', 'tiny_codelab', s($health)), 'error', false) . $site;
        }
        return $OUTPUT->notification(get_string('runnerstatus_ok', 'tiny_codelab', (object) [
            'languages' => implode(', ', (array) ($data['languages'] ?? [])),
            'sessions' => isset($data['sessions']) ? (int) $data['sessions'] : '?',
            'version' => s((string) ($data['version'] ?? '?')),
        ]), 'success', false) . $site;
    }

    /**
     * HTML for the settings page: plan and monthly usage of a hosted runner from GET /usage (empty for plain self-host runners).
     *
     * @return string
     */
    public static function usage_html(): string {
        global $OUTPUT;
        if (trim((string) get_config('tiny_codelab', 'cloudkey')) !== '' && self::cloud_config() === null) {
            return $OUTPUT->notification(get_string('cloudkeyinvalid', 'tiny_codelab'), 'warning', false);
        }
        $url = self::url();
        if ($url === '') {
            return '';
        }
        $curl = runner_client::curl();
        $curl->setHeader(runner_client::signature_headers('', null, true));
        $usageurl = preg_replace('~^ws~', 'http', $url) . '/usage';
        $body = $curl->get($usageurl, [], ['CURLOPT_TIMEOUT' => 5, 'CURLOPT_CONNECTTIMEOUT' => 3]);
        $code = (int) ($curl->get_info()['http_code'] ?? 0);
        $data = json_decode((string) $body, true);
        if ($curl->get_errno() || $code === 404 || !is_array($data) || !isset($data['quota'])) {
            // A self-hosted runner has no /usage: nothing to show. With a connection key the answer must be there.
            if (self::cloud_config() === null) {
                return '';
            }
            if ($curl->get_errno()) {
                $why = (string) $curl->error;
            } else if (is_array($data) && is_string($data['error'] ?? null)) {
                $why = $data['error'];
            } else {
                $why = $code ? "HTTP {$code}" : get_string('error');
            }
            return $OUTPUT->notification(get_string('cloudusage_error', 'tiny_codelab', s($why)), 'warning', false);
        }
        $used = (int) ($data['used'] ?? 0);
        $quota = (int) $data['quota'];
        $type = ($quota > 0 && $used >= $quota) || ($data['status'] ?? '') !== 'active' ? 'warning' : 'info';
        return $OUTPUT->notification(get_string('cloudusage', 'tiny_codelab', (object) [
            'plan' => s((string) ($data['plan'] ?? '')),
            'used' => $used,
            'quota' => $quota,
            'status' => s((string) ($data['status'] ?? '')),
            'expires' => s((string) ($data['expires'] ?? '')),
        ]), $type, false);
    }
}
