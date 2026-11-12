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
 * Runs for grading on the interactive server (CodeLab runner), for the languages Jobe does not have (SQL): Moodle's
 * server sends the program to POST /run, signed with the shared secret, and gets the output as from Jobe. For SQL the
 * output is only the result tables of the mariadb client.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class runner_client extends jobe {
    /**
     * Client of the runner of the settings.
     */
    public function __construct() {
        parent::__construct('', '', null);
    }

    /**
     * Whether the runner is set.
     *
     * @return bool
     */
    public function is_configured(): bool {
        return interactive::url() !== '';
    }

    /**
     * The headers of a signed request: the site, the time, a nonce (the server takes each request once) and
     * base64url(HMAC-SHA256(secret, time + "\n" + nonce + "\n" + body)); without the nonce, of time + "\n" + body
     * (runners older than 0.6.0).
     *
     * @param string $body
     * @param int|null $now
     * @param bool|string $nonce true for a new nonce, false for none, or the nonce
     * @return string[]
     */
    public static function signature_headers(string $body, ?int $now = null, $nonce = true): array {
        $time = (string) ($now ?? time());
        $headers = ['Content-Type: application/json', 'X-CodeLab-Site: ' . interactive::site(), 'X-CodeLab-Time: ' . $time];
        if ($nonce === true) {
            $nonce = random_string(24);
        }
        if ($nonce === false) {
            $signed = $time . "\n" . $body;
        } else {
            $signed = $time . "\n" . $nonce . "\n" . $body;
            $headers[] = 'X-CodeLab-Nonce: ' . $nonce;
        }
        $headers[] = 'X-CodeLab-Signature: ' . interactive::base64url(hash_hmac('sha256', $signed, interactive::secret(), true));
        return $headers;
    }

    /**
     * Run a program on the runner.
     *
     * @param string $lang
     * @param string $code
     * @param string $stdin
     * @return array status, outcome, cmpinfo, stdout, stderr
     */
    public function run(string $lang, string $code, string $stdin = ''): array {
        $result = ['status' => 'error', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''];
        if (!$this->is_configured()) {
            return ['status' => 'notconfigured'] + $result;
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $body = json_encode(['lang' => $lang, 'code' => $code, 'stdin' => $stdin]);
        $url = preg_replace('~^ws~', 'http', interactive::url()) . '/run';
        // A runner older than 0.6.0 does not know the nonce and refuses its signature: then once more without it.
        foreach ([true, false] as $nonce) {
            $curl = new \curl(['ignoresecurity' => true]);
            $curl->setHeader(self::signature_headers($body, null, $nonce));
            $response = $curl->post($url, $body, ['CURLOPT_TIMEOUT' => 60, 'CURLOPT_CONNECTTIMEOUT' => 10]);
            if ($curl->get_errno()) {
                return ['stderr' => 'CodeLab runner: ' . $curl->error] + $result;
            }
            if ((int) ($curl->get_info()['http_code'] ?? 0) !== 401) {
                break;
            }
        }
        $data = json_decode((string) $response, true);
        if (!is_array($data) || !isset($data['status'])) {
            $code = (int) ($curl->get_info()['http_code'] ?? 0);
            return ['stderr' => "CodeLab runner: HTTP {$code}"] + $result;
        }
        foreach (['cmpinfo', 'stdout', 'stderr'] as $field) {
            $result[$field] = is_string($data[$field] ?? null) ? $data[$field] : '';
        }
        $result['status'] = in_array($data['status'], ['ok', 'compile', 'runtime', 'time', 'memory', 'toolong', 'busy'], true)
            ? $data['status'] : 'error';
        return $result;
    }
}
