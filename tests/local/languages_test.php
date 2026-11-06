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
 * Unit tests for the languages of the Jobe server and the languages offered to teachers.
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\languages
 * @covers     \tiny_codelab\local\jobe::parse_languages
 */
final class languages_test extends \advanced_testcase {
    /**
     * Set a Jobe server and put its answer in the cache, as if it had been asked.
     *
     * @param array $versions CodeLab language => version
     * @param bool $ok whether the server answered
     */
    protected function server_has(array $versions, bool $ok = true): void {
        set_config('jobeserver', 'https://jobe.example.org', 'tiny_codelab');
        set_config('jobeapikey', 'secret', 'tiny_codelab');
        $info = ['ok' => $ok, 'versions' => $versions, 'error' => $ok ? '' : 'HTTP 403', 'time' => time()];
        \cache::make('tiny_codelab', 'languages')->set((new jobe())->cache_key(), $info);
    }

    public function test_parse_languages(): void {
        $body = json_encode([['c', '13.3.0'], ['python3', '3.12.3'], ['nodejs', '20.20.2'], ['octave', '8.4']]);
        $info = jobe::parse_languages(200, $body);
        $this->assertTrue($info['ok']);
        $this->assertSame(['c' => '13.3.0', 'python' => '3.12.3', 'javascript' => '20.20.2'], $info['versions']);

        $this->assertFalse(jobe::parse_languages(403, '')['ok']);
        $this->assertSame('HTTP 403', jobe::parse_languages(403, '')['error']);
    }

    public function test_offered_follows_the_server(): void {
        $this->resetAfterTest();
        set_config('browserpython', 0, 'tiny_codelab');
        $this->server_has(['c' => '13.3.0', 'java' => '21']);
        $this->assertSame(['c', 'java'], languages::offered());
        $this->assertTrue(languages::on_server('c'));
        $this->assertFalse(languages::on_server('pascal'));
        // The language of the example or question being edited stays.
        $this->assertSame(['c', 'java', 'php'], languages::offered('php'));

        // Python runs in the browser even when the server has no Python.
        set_config('browserpython', 1, 'tiny_codelab');
        $this->assertSame(['c', 'python', 'java'], languages::offered());

        // The administrator's choice.
        set_config('languages', 'c,python', 'tiny_codelab');
        $this->assertSame(['c', 'python'], languages::offered());
    }

    public function test_server_that_does_not_answer(): void {
        $this->resetAfterTest();
        $this->server_has([], false);
        // Nothing is left out: the run is tried and fails with its own error.
        $this->assertSame(array_keys(jobe::LANGUAGES), languages::offered());
        $this->assertTrue(languages::on_server('pascal'));
        $this->assertStringContainsString('HTTP 403', languages::status_html());
    }

    public function test_no_server(): void {
        $this->resetAfterTest();
        set_config('jobeserver', '', 'tiny_codelab');
        $this->assertSame(array_keys(jobe::LANGUAGES), languages::offered());
        $this->assertStringContainsString(get_string('jobestatus_notset', 'tiny_codelab'), languages::status_html());
    }

    public function test_status_lists_missing_languages(): void {
        $this->resetAfterTest();
        $this->server_has(['c' => '13.3.0']);
        $html = languages::status_html();
        $this->assertStringContainsString('C 13.3.0', $html);
        $this->assertStringContainsString('Pascal', $html);
        $this->assertStringContainsString('alert-warning', $html);
    }
}
