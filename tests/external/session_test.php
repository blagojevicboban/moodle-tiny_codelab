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
use tiny_codelab\local\interactive;

/**
 * Unit tests for the tokens of the interactive server (web service tiny_codelab_session).
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\external\session
 * @covers     \tiny_codelab\local\interactive
 */
final class session_test extends \advanced_testcase {
    /** Secret of the tests. */
    const SECRET = 'a-secret-of-sixteen-or-more';

    /**
     * A student in a course, logged in.
     *
     * @return \context_course
     */
    protected function student_context(): \context_course {
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($user);
        return \context_course::instance($course->id);
    }

    /**
     * Ask for a session.
     *
     * @param \context $context
     * @param string $lang
     * @return array
     */
    protected function ask(\context $context, string $lang): array {
        return external_api::clean_returnvalue(session::execute_returns(), session::execute($context->id, $lang));
    }

    public function test_not_configured(): void {
        $this->resetAfterTest();
        $context = $this->student_context();
        $this->assertSame('notconfigured', $this->ask($context, 'c')['status']);
        $this->assertSame([], interactive::languages());
        // An address without a secret is not enough.
        set_config('runnerurl', 'wss://runner.example.org', 'tiny_codelab');
        $this->assertSame('', interactive::url());
    }

    public function test_token(): void {
        global $USER;
        $this->resetAfterTest();
        set_config('runnerurl', 'wss://runner.example.org/', 'tiny_codelab');
        set_config('runnersecret', self::SECRET, 'tiny_codelab');
        $context = $this->student_context();
        $this->assertSame(['c', 'cpp', 'java', 'csharp', 'mysql'], interactive::languages());

        $result = $this->ask($context, 'cpp');
        $this->assertSame('ok', $result['status']);
        $this->assertSame('wss://runner.example.org/session', $result['url']);
        // The token as the server checks it: payload "." HMAC-SHA256 of the payload, both base64url.
        [$body, $mac] = explode('.', $result['token']);
        $this->assertSame(interactive::base64url(hash_hmac('sha256', $body, self::SECRET, true)), $mac);
        $payload = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
        $this->assertEquals($USER->id, $payload['u']);
        // The session may run only the language of the token, on the server of this site.
        $this->assertSame('cpp', $payload['l']);
        $this->assertSame(interactive::site(), $payload['s']);
        $this->assertGreaterThan(time(), $payload['e']);
        $this->assertLessThanOrEqual(time() + interactive::TOKEN_SECONDS, $payload['e']);
        // Every token has its own nonce.
        $other = explode('.', interactive::token(1))[0];
        $this->assertNotSame($payload['n'], json_decode(base64_decode(strtr($other, '-_', '+/')), true)['n']);

        // Python runs in the browser, not on the interactive server.
        $this->assertSame('nolanguage', $this->ask($context, 'python')['status']);
    }

    public function test_runner_client(): void {
        $this->resetAfterTest();
        $client = new \tiny_codelab\local\runner_client();
        $this->assertSame('notconfigured', $client->run('mysql', 'SELECT 1;')['status']);
        set_config('runnerurl', 'ws://localhost:8090', 'tiny_codelab');
        set_config('runnersecret', self::SECRET, 'tiny_codelab');
        $this->assertTrue($client->is_configured());
        $this->assertContains('mysql', interactive::languages());
        // The signature the runner checks: HMAC-SHA256 of the time, the nonce and the body, each after a new line.
        $client = \tiny_codelab\local\runner_client::class;
        $headers = $client::signature_headers('{"lang":"mysql"}', 1800000000, 'abcdefghijklmnopqrstuvwx');
        $signed = "1800000000\nabcdefghijklmnopqrstuvwx\n{\"lang\":\"mysql\"}";
        $mac = interactive::base64url(hash_hmac('sha256', $signed, self::SECRET, true));
        $this->assertContains('X-CodeLab-Time: 1800000000', $headers);
        $this->assertContains('X-CodeLab-Nonce: abcdefghijklmnopqrstuvwx', $headers);
        $this->assertContains('X-CodeLab-Site: ' . interactive::site(), $headers);
        $this->assertContains('X-CodeLab-Signature: ' . $mac, $headers);
        // Without a nonce (runners older than 0.6.0): of the time and the body.
        $old = $client::signature_headers('{"lang":"mysql"}', 1800000000, false);
        $mac = interactive::base64url(hash_hmac('sha256', "1800000000\n{\"lang\":\"mysql\"}", self::SECRET, true));
        $this->assertContains('X-CodeLab-Signature: ' . $mac, $old);
        $this->assertEmpty(preg_grep('/^X-CodeLab-Nonce/', $old));
        // A new nonce for every request.
        $first = preg_grep('/^X-CodeLab-Nonce/', $client::signature_headers('{}'));
        $this->assertNotEquals($first, preg_grep('/^X-CodeLab-Nonce/', $client::signature_headers('{}')));
    }

    public function test_rate_limit(): void {
        $this->resetAfterTest();
        set_config('runnerurl', 'ws://localhost:8090', 'tiny_codelab');
        set_config('runnersecret', self::SECRET, 'tiny_codelab');
        set_config('ratelimit', 2, 'tiny_codelab');
        $context = $this->student_context();
        $this->assertSame('ok', $this->ask($context, 'c')['status']);
        $this->assertSame('ok', $this->ask($context, 'java')['status']);
        $this->assertSame('ratelimit', $this->ask($context, 'c')['status']);
    }
}
