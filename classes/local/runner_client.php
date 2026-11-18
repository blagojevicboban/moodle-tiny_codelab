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
    /** Seconds before a run refused as busy is sent once more. */
    const BUSY_PAUSE = 3;

    /** @var int memory limit in MB, 0 for runner's default */
    protected $memorylimit = 0;

    /**
     * Client of the runner of the settings.
     *
     * @param int|null $cputime CPU seconds, null for the plugin setting
     * @param int $memorylimit memory limit in MB, 0 for the runner's default
     */
    public function __construct(?int $cputime = null, int $memorylimit = 0) {
        parent::__construct('', '', $cputime);
        $this->memorylimit = max(0, $memorylimit);
    }

    /**
     * Cache key for what is cached about this runner.
     *
     * @return string
     */
    public function cache_key(): string {
        return sha1('runner:' . interactive::url());
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
     * Ask the runner which languages it has via /health.
     *
     * @return array ok (bool), versions (CodeLab language => ''), error (text)
     */
    public function languages(): array {
        if (!$this->is_configured()) {
            return ['ok' => false, 'versions' => [], 'error' => ''];
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => true]);
        $curl->setHeader(self::signature_headers('', null, true));
        $health = preg_replace('~^ws~', 'http', interactive::url()) . '/health';
        $body = $curl->get($health, [], ['CURLOPT_TIMEOUT' => 5, 'CURLOPT_CONNECTTIMEOUT' => 3]);
        if ($curl->get_errno()) {
            return ['ok' => false, 'versions' => [], 'error' => $curl->error];
        }
        $data = json_decode((string) $body, true);
        if (!is_array($data) || empty($data['ok'])) {
            $code = (int) ($curl->get_info()['http_code'] ?? 0);
            return ['ok' => false, 'versions' => [], 'error' => "HTTP {$code}"];
        }
        $langs = array_values(array_intersect(
            array_merge(array_keys(jobe::LANGUAGES), interactive::ONLY),
            array_map('strval', (array) ($data['languages'] ?? []))
        ));
        // Runner 0.8.0 and newer also give the versions, as Jobe does.
        $versions = [];
        foreach ($langs as $lang) {
            $versions[$lang] = is_string($data['versions'][$lang] ?? null) ? $data['versions'][$lang] : '';
        }
        return ['ok' => true, 'versions' => $versions, 'error' => ''];
    }

    /**
     * Send one run for grading.
     *
     * @param string $url
     * @param string $body
     * @param bool $nonce sign with a nonce (runner 0.6.0 and newer)
     * @return array code (HTTP), data (decoded answer or null), error (of the connection, '' when none)
     */
    protected function post_run(string $url, string $body, bool $nonce): array {
        $curl = new \curl(['ignoresecurity' => true]);
        $curl->setHeader(self::signature_headers($body, null, $nonce));
        // The runner may keep a run waiting for a place (30 s), then it runs up to three times its CPU time.
        $response = $curl->post($url, $body, ['CURLOPT_TIMEOUT' => 45 + 3 * $this->cputime, 'CURLOPT_CONNECTTIMEOUT' => 10]);
        if ($curl->get_errno()) {
            return ['code' => 0, 'data' => null, 'error' => (string) $curl->error];
        }
        return ['code' => (int) ($curl->get_info()['http_code'] ?? 0), 'data' => json_decode((string) $response, true),
            'error' => ''];
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
        ['url' => $url, 'body' => $body] = $this->request($lang, $code, $stdin);
        $sent = $this->post_run($url, $body, true);
        // A runner older than 0.6.0 does not know the nonce and refuses its signature: then once more without it.
        if ($sent['error'] === '' && $sent['code'] === 401) {
            $sent = $this->post_run($url, $body, false);
        }
        // Runner 0.8.0 lets a run wait for a place; a run still refused as busy is sent once more, after a pause.
        if ($sent['error'] === '' && ($sent['data']['status'] ?? '') === 'busy') {
            sleep(self::BUSY_PAUSE);
            $sent = $this->post_run($url, $body, true);
        }
        if ($sent['error'] !== '') {
            return ['stderr' => 'CodeLab runner: ' . $sent['error']] + $result;
        }
        return self::parse_data($sent['code'], $sent['data']);
    }

    /**
     * The request of a run for grading, signed with a nonce of its own (see server_test for runs sent together).
     *
     * @param string $lang
     * @param string $code
     * @param string $stdin
     * @return array url, headers, body
     */
    public function request(string $lang, string $code, string $stdin = ''): array {
        $payload = ['lang' => $lang, 'code' => $code, 'stdin' => $stdin, 'cputime' => $this->cputime];
        if ($this->memorylimit > 0) {
            $payload['memory'] = $this->memorylimit;
        }
        $body = json_encode($payload);
        return ['url' => preg_replace('~^ws~', 'http', interactive::url()) . '/run',
            'headers' => self::signature_headers($body), 'body' => $body];
    }

    /**
     * Turn an answer of the runner into a result.
     *
     * @param int $httpcode
     * @param string $body
     * @return array status, outcome, cmpinfo, stdout, stderr
     */
    public function parse(int $httpcode, string $body): array {
        return self::parse_data($httpcode, json_decode($body, true));
    }

    /**
     * Turn a decoded answer of the runner into a result.
     *
     * @param int $httpcode
     * @param mixed $data
     * @return array status, outcome, cmpinfo, stdout, stderr
     */
    protected static function parse_data(int $httpcode, $data): array {
        $result = ['status' => 'error', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''];
        if (!is_array($data) || !isset($data['status'])) {
            return ['stderr' => "CodeLab runner: HTTP {$httpcode}"] + $result;
        }
        foreach (['cmpinfo', 'stdout', 'stderr'] as $field) {
            $result[$field] = is_string($data[$field] ?? null) ? $data[$field] : '';
        }
        $statuses = ['ok', 'compile', 'runtime', 'time', 'memory', 'toolong', 'busy', 'quota', 'suspended', 'expired'];
        $result['status'] = in_array($data['status'], $statuses, true) ? $data['status'] : 'error';
        return $result;
    }
}
