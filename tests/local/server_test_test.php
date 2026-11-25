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
 * Tests of the test of the servers (test.php).
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\server_test
 */
final class server_test_test extends \advanced_testcase {
    public function test_servers_not_set_up(): void {
        global $OUTPUT;
        $this->resetAfterTest();
        foreach (['jobeserver', 'runnerurl', 'cloudkey'] as $name) {
            set_config($name, '', 'tiny_codelab');
        }
        $context = server_test::run();
        $this->assertCount(2, $context['servers']);
        $this->assertFalse($context['servers'][0]['configured']);
        $this->assertFalse($context['servers'][1]['configured']);
        $html = $OUTPUT->render_from_template('tiny_codelab/servertest', $context);
        $this->assertStringContainsString(get_string('servertest_notset', 'tiny_codelab'), $html);
    }

    public function test_hosted_runner_is_named_with_its_site_and_server(): void {
        $this->resetAfterTest();
        set_config('jobeserver', '', 'tiny_codelab');
        $this->assertSame(get_string('servertest_runner', 'tiny_codelab'), server_test::run(0)['servers'][1]['name']);
        set_config('cloudkey', base64_encode(json_encode(['url' => 'wss://trial.example.org', 'site' => 'school-1',
            'secret' => 'hosted-secret-123456'])), 'tiny_codelab');
        \curl::mock_response(json_encode(['ok' => true, 'languages' => [], 'version' => '0.21.0']));
        $name = server_test::run(0)['servers'][1]['name'];
        $this->assertSame(get_string('servertest_cloud', 'tiny_codelab', (object) ['site' => 'school-1',
            'server' => 'trial.example.org']), $name);
    }

    public function test_server_that_does_not_answer(): void {
        $this->resetAfterTest();
        set_config('jobeserver', 'http://127.0.0.1:9', 'tiny_codelab');
        $result = server_test::server('Jobe', new jobe(), 0);
        $this->assertTrue($result['configured']);
        $this->assertFalse($result['ok']);
        $this->assertNotSame('', $result['error']);
    }

    public function test_every_language_has_a_sample(): void {
        foreach (languages::all() as $lang) {
            $this->assertArrayHasKey($lang, server_test::SAMPLES, $lang);
        }
    }
}
