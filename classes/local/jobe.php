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
 * Client of a Jobe server (https://github.com/trampgeek/jobe), which compiles and runs programs in a sandbox.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class jobe {
    /** CodeLab language => Jobe language id. */
    const LANGUAGES = ['c' => 'c', 'cpp' => 'cpp', 'python' => 'python3', 'java' => 'java', 'csharp' => 'csharp',
        'javascript' => 'nodejs', 'pascal' => 'pascal', 'php' => 'php'];

    /** File names Jobe compiles (Java: the public class decides, see source_file_name()). */
    const FILES = ['c' => 'prog.c', 'cpp' => 'prog.cpp', 'python' => 'prog.py', 'java' => 'Main.java', 'csharp' => 'prog.cs',
        'javascript' => 'prog.js', 'pascal' => 'prog.pas', 'php' => 'prog.php'];

    /** Jobe outcomes => short status names used by the plugins. */
    const OUTCOMES = [
        11 => 'compile', 12 => 'runtime', 13 => 'time', 15 => 'ok', 17 => 'memory', 19 => 'illegal', 20 => 'error',
        21 => 'busy',
    ];

    /**
     * Run parameters per language. Jobe's defaults for C and C++ include -Wall -Werror, and Jobe takes any compiler
     * message as a compilation error, so a student's unused variable would stop the program: warnings are turned off
     * (-w), as the CodeRunner examples of the lessons did, and the maths library is linked (math.h, cmath). Node.js
     * reserves more virtual memory at start than Jobe's default limit allows, so it gets 1000 MB.
     */
    const PARAMETERS = [
        'c' => ['compileargs' => ['-std=c11', '-D_GNU_SOURCE', '-w'], 'linkargs' => ['-lm']],
        'cpp' => ['compileargs' => ['-std=c++17', '-w'], 'linkargs' => ['-lm']],
        'javascript' => ['memorylimit' => 1000],
    ];

    /** Largest program and input accepted, in bytes. */
    const MAX_SIZE = 65536;

    /** @var string server address, without the REST path */
    protected $server;

    /** @var string API key, may be empty */
    protected $apikey;

    /** @var int CPU time limit in seconds */
    protected $cputime;

    /**
     * Client with the given server, or the one of the plugin settings.
     *
     * @param string|null $server address such as https://jobe.example.org
     * @param string|null $apikey
     * @param int|null $cputime seconds
     */
    public function __construct(?string $server = null, ?string $apikey = null, ?int $cputime = null) {
        $this->server = rtrim(trim($server ?? (string) get_config('tiny_codelab', 'jobeserver')), '/');
        $this->apikey = trim($apikey ?? (string) get_config('tiny_codelab', 'jobeapikey'));
        $this->cputime = max(1, min(30, $cputime ?? (int) (get_config('tiny_codelab', 'cputime') ?: 5)));
    }

    /**
     * Whether a server is set.
     *
     * @return bool
     */
    public function is_configured(): bool {
        return $this->server !== '';
    }

    /**
     * A key for what is cached about this server: it changes with the address and the API key.
     *
     * @return string
     */
    public function cache_key(): string {
        return sha1($this->server . "\n" . $this->apikey);
    }

    /**
     * URL of the runs resource. Like CodeRunner, the setting holds only the server; the REST path is added here.
     *
     * @return string
     */
    public function runs_url(): string {
        return $this->rest_url('runs');
    }

    /**
     * URL of a resource of Jobe's REST API.
     *
     * @param string $resource runs or languages
     * @return string
     */
    protected function rest_url(string $resource): string {
        $server = preg_match('~^https?://~i', $this->server) ? $this->server : 'http://' . $this->server;
        return $server . '/jobe/index.php/restapi/' . $resource;
    }

    /**
     * Headers of a request, with the API key when there is one.
     *
     * @return string[]
     */
    protected function headers(): array {
        $headers = ['Content-Type: application/json; charset=utf-8', 'Accept: application/json'];
        if ($this->apikey !== '') {
            $headers[] = 'X-API-KEY: ' . $this->apikey;
        }
        return $headers;
    }

    /**
     * Ask the server which languages it has.
     *
     * @return array ok (bool), versions (CodeLab language => version, only the languages CodeLab knows), error (text)
     */
    public function languages(): array {
        if (!$this->is_configured()) {
            return ['ok' => false, 'versions' => [], 'error' => ''];
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl();
        $curl->setHeader($this->headers());
        $body = $curl->get($this->rest_url('languages'), [], ['CURLOPT_TIMEOUT' => 10, 'CURLOPT_CONNECTTIMEOUT' => 5]);
        if ($curl->get_errno()) {
            return ['ok' => false, 'versions' => [], 'error' => $curl->error];
        }
        return self::parse_languages((int) ($curl->get_info()['http_code'] ?? 0), (string) $body);
    }

    /**
     * Turn Jobe's list of languages ([["c", "13.3.0"], ...]) into the CodeLab languages it covers.
     *
     * @param int $httpcode
     * @param string $body
     * @return array ok, versions, error
     */
    public static function parse_languages(int $httpcode, string $body): array {
        $list = json_decode($body, true);
        if ($httpcode !== 200 || !is_array($list)) {
            return ['ok' => false, 'versions' => [], 'error' => 'HTTP ' . $httpcode];
        }
        $jobe = [];
        foreach ($list as $item) {
            if (is_array($item) && isset($item[0])) {
                $jobe[(string) $item[0]] = (string) ($item[1] ?? '');
            }
        }
        $versions = [];
        foreach (self::LANGUAGES as $lang => $id) {
            if (isset($jobe[$id])) {
                $versions[$lang] = $jobe[$id];
            }
        }
        return ['ok' => true, 'versions' => $versions, 'error' => ''];
    }

    /**
     * File name of the program: Java needs the name of its public class.
     *
     * @param string $lang
     * @param string $code
     * @return string
     */
    public static function source_file_name(string $lang, string $code): string {
        if ($lang === 'java' && preg_match('/public\s+(?:final\s+|abstract\s+)*class\s+([A-Za-z_]\w*)/', $code, $m)) {
            return $m[1] . '.java';
        }
        return self::FILES[$lang];
    }

    /**
     * The request Jobe expects.
     *
     * @param string $lang CodeLab language
     * @param string $code
     * @param string $stdin
     * @return array
     */
    public function run_spec(string $lang, string $code, string $stdin = ''): array {
        return ['run_spec' => [
            'language_id' => self::LANGUAGES[$lang],
            'sourcecode' => $code,
            'sourcefilename' => self::source_file_name($lang, $code),
            'input' => $stdin,
            'parameters' => ['cputime' => $this->cputime] + (self::PARAMETERS[$lang] ?? []),
        ]];
    }

    /**
     * Turn Jobe's answer into a result.
     *
     * @param int $httpcode
     * @param string $body
     * @return array status, outcome, cmpinfo, stdout, stderr
     */
    public static function parse_response(int $httpcode, string $body): array {
        $result = ['status' => 'error', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''];
        $data = json_decode($body, true);
        if ($httpcode !== 200 || !is_array($data) || !isset($data['outcome'])) {
            $result['stderr'] = $httpcode === 403 ? 'Jobe: access denied (API key).' : "Jobe: HTTP {$httpcode}";
            return $result;
        }
        $outcome = (int) $data['outcome'];
        $result['outcome'] = $outcome;
        $result['status'] = self::OUTCOMES[$outcome] ?? 'error';
        foreach (['cmpinfo', 'stdout', 'stderr'] as $field) {
            $result[$field] = is_string($data[$field] ?? null) ? $data[$field] : '';
        }
        return $result;
    }

    /**
     * Compile and run a program.
     *
     * @param string $lang c, cpp, python, java, csharp, javascript, pascal or php
     * @param string $code
     * @param string $stdin
     * @return array status (ok, compile, runtime, time, memory, illegal, busy, error, notconfigured, nolanguage),
     *     outcome, cmpinfo, stdout, stderr
     */
    public function run(string $lang, string $code, string $stdin = ''): array {
        if (!isset(self::LANGUAGES[$lang])) {
            throw new \invalid_parameter_exception('Unknown language: ' . $lang);
        }
        if (!$this->is_configured()) {
            return ['status' => 'notconfigured', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''];
        }
        if (!languages::on_server($lang, $this)) {
            return ['status' => 'nolanguage', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '', 'stderr' => ''];
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl();
        $curl->setHeader($this->headers());
        $body = $curl->post($this->runs_url(), json_encode($this->run_spec($lang, $code, $stdin)), [
            'CURLOPT_TIMEOUT' => $this->cputime + 30,
            'CURLOPT_CONNECTTIMEOUT' => 10,
        ]);
        if ($curl->get_errno()) {
            return ['status' => 'error', 'outcome' => 0, 'cmpinfo' => '', 'stdout' => '',
                'stderr' => 'Jobe: ' . $curl->error];
        }
        return self::parse_response((int) ($curl->get_info()['http_code'] ?? 0), (string) $body);
    }
}
