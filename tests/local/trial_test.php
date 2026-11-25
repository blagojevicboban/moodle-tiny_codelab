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
 * Unit tests for the free trial of the hosted runner.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\trial
 */
final class trial_test extends \advanced_testcase {
    public function test_check_accepts_only_the_nonce_of_this_site_for_ten_minutes(): void {
        $this->resetAfterTest();
        $nonce = str_repeat('a', 48);
        $this->assertFalse(trial::check($nonce), 'nothing asked for');
        set_config('trialnonce', $nonce . ':1000', 'tiny_codelab');
        $this->assertTrue(trial::check($nonce, 1000 + trial::NONCE_TIME));
        $this->assertFalse(trial::check($nonce, 1001 + trial::NONCE_TIME), 'too old');
        $this->assertFalse(trial::check(str_repeat('b', 48), 1000));
        $this->assertFalse(trial::check('', 1000));
    }

    public function test_request_sets_the_connection_key(): void {
        global $CFG;
        $this->resetAfterTest();
        $this->assertTrue(trial::offered());
        $key = base64_encode(json_encode(['url' => 'wss://trial.example.org', 'site' => 'school-edu',
            'secret' => 'trial-secret-0123456789']));
        \curl::mock_response(json_encode(['ok' => true, 'key' => $key, 'site' => 'school-edu', 'plan' => 'trial',
            'expires' => '2026-12-25']));
        $result = trial::request('admin@school.edu');
        $this->assertTrue($result['ok']);
        $this->assertSame('school-edu', $result['site']);
        $this->assertSame('2026-12-25', $result['expires']);
        $this->assertSame($key, get_config('tiny_codelab', 'cloudkey'));
        $this->assertSame('wss://trial.example.org', interactive::url());
        $this->assertFalse(get_config('tiny_codelab', 'trialnonce'), 'the nonce is not kept after the answer');
        $this->assertFalse(trial::offered());
        $this->assertNotEmpty($CFG->wwwroot);
    }

    public function test_request_reports_the_error_of_the_server(): void {
        $this->resetAfterTest();
        foreach (['used', 'verify', 'busy', 'invalid'] as $error) {
            \curl::mock_response(json_encode(['ok' => false, 'error' => $error]));
            $this->assertSame($error, trial::request('admin@school.edu')['error']);
        }
        \curl::mock_response(json_encode(['ok' => false, 'error' => 'something new']));
        $this->assertSame('failed', trial::request('admin@school.edu')['error']);
        \curl::mock_response('<html>Bad gateway</html>');
        $this->assertSame('connect', trial::request('admin@school.edu')['error']);
        // A key that is not valid is not kept.
        \curl::mock_response(json_encode(['ok' => true, 'key' => 'not-a-key']));
        $this->assertSame('failed', trial::request('admin@school.edu')['error']);
        $this->assertTrue(trial::offered());
        foreach (['used', 'verify', 'busy', 'invalid', 'connect', 'failed'] as $error) {
            $this->assertNotEmpty(get_string('trial_error_' . $error, 'tiny_codelab'));
        }
    }
}
