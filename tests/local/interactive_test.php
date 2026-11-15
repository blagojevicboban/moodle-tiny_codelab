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
 * Unit tests for CodeLab Cloud connection key and runner_client.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\interactive
 * @covers     \tiny_codelab\local\runner_client
 */
final class interactive_test extends \advanced_testcase {
    public function test_cloud_config_overrides_runner_settings(): void {
        $this->resetAfterTest();
        set_config('runnerurl', 'wss://self.example.org/', 'tiny_codelab');
        set_config('runnersecret', 'self-secret-123456', 'tiny_codelab');
        $this->assertSame('wss://self.example.org', interactive::url());
        $this->assertSame('self-secret-123456', interactive::secret());

        $key = base64_encode(json_encode([
            'url' => 'wss://run.codelab.cloud/',
            'site' => 'school-42',
            'secret' => 'cloud-secret-123456',
        ]));
        set_config('cloudkey', $key, 'tiny_codelab');
        $this->assertSame('wss://run.codelab.cloud', interactive::url());
        $this->assertSame('cloud-secret-123456', interactive::secret());
        $this->assertSame('school-42', interactive::site());

        // Invalid key falls back to self-hosted settings.
        set_config('cloudkey', 'not-valid-base64!', 'tiny_codelab');
        $this->assertSame('wss://self.example.org', interactive::url());
        $this->assertSame('self-secret-123456', interactive::secret());
    }

    public function test_runner_client_not_configured_and_signatures(): void {
        $this->resetAfterTest();
        set_config('cloudkey', '', 'tiny_codelab');
        set_config('runnerurl', '', 'tiny_codelab');
        $client = new runner_client(7, 256);
        $this->assertFalse($client->is_configured());
        $result = $client->run('python', 'print(1)');
        $this->assertSame('notconfigured', $result['status']);

        set_config('cloudkey', base64_encode(json_encode([
            'url' => 'wss://run.codelab.cloud',
            'site' => 'site-1',
            'secret' => 'my-secret-0123456789',
        ])), 'tiny_codelab');
        $this->assertTrue($client->is_configured());
        $headers = runner_client::signature_headers('{"lang":"c"}', 1700000000, 'testnonce1234567890');
        $this->assertContains('X-CodeLab-Site: site-1', $headers);
        $this->assertContains('X-CodeLab-Time: 1700000000', $headers);
        $this->assertContains('X-CodeLab-Nonce: testnonce1234567890', $headers);
    }

    public function test_runner_client_passes_the_states_of_the_service(): void {
        $this->resetAfterTest();
        set_config('cloudkey', base64_encode(json_encode([
            'url' => 'wss://run.codelab.cloud',
            'site' => 'site-1',
            'secret' => 'my-secret-0123456789',
        ])), 'tiny_codelab');
        $client = new runner_client();
        foreach (['quota', 'suspended', 'expired', 'busy'] as $status) {
            \curl::mock_response(json_encode(['status' => $status, 'stdout' => '', 'stderr' => '', 'cmpinfo' => '']));
            $this->assertSame($status, $client->run('python', 'print(1)')['status']);
        }
        // A status this version does not know, and an answer that is not JSON, are plain errors.
        \curl::mock_response(json_encode(['status' => 'unauthorized', 'stdout' => '', 'stderr' => '', 'cmpinfo' => '']));
        $this->assertSame('error', $client->run('python', 'print(1)')['status']);
        \curl::mock_response('<html>Bad gateway</html>');
        $result = $client->run('python', 'print(1)');
        $this->assertSame('error', $result['status']);
        $this->assertStringContainsString('CodeLab runner', $result['stderr']);
    }

    public function test_usage_html_warns_about_a_key_that_is_not_valid(): void {
        $this->resetAfterTest();
        set_config('cloudkey', '', 'tiny_codelab');
        set_config('runnerurl', '', 'tiny_codelab');
        $this->assertSame('', interactive::usage_html());
        set_config('cloudkey', 'half-of-a-key', 'tiny_codelab');
        $this->assertStringContainsString(get_string('cloudkeyinvalid', 'tiny_codelab'), interactive::usage_html());

        set_config('cloudkey', base64_encode(json_encode([
            'url' => 'wss://run.codelab.cloud',
            'site' => 'site-1',
            'secret' => 'my-secret-0123456789',
        ])), 'tiny_codelab');
        \curl::mock_response(json_encode(['site' => 'site-1', 'plan' => 'school', 'status' => 'active', 'used' => 120,
            'quota' => 150000, 'expires' => '2027-01-15']));
        $html = interactive::usage_html();
        $this->assertStringContainsString('school', $html);
        $this->assertStringContainsString('120 / 150000', $html);
    }
}
