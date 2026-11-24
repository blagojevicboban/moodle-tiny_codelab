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
 * Unit tests for the tokens of the C# language service (web service tiny_codelab_analysis).
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\external\analysis
 * @covers     \tiny_codelab\local\interactive
 */
final class analysis_test extends \advanced_testcase {
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
     * Ask for a token.
     *
     * @param \context $context
     * @param string $lang
     * @return array
     */
    protected function ask(\context $context, string $lang): array {
        return external_api::clean_returnvalue(analysis::execute_returns(), analysis::execute($context->id, $lang));
    }

    public function test_not_configured(): void {
        $this->resetAfterTest();
        $this->assertSame('notconfigured', $this->ask($this->student_context(), 'csharp')['status']);
    }

    public function test_token(): void {
        global $USER;
        $this->resetAfterTest();
        set_config('runnerurl', 'wss://runner.example.org/', 'tiny_codelab');
        set_config('runnersecret', self::SECRET, 'tiny_codelab');
        set_config('ratelimit', 1, 'tiny_codelab');
        unset_config('languages', 'tiny_codelab');
        $context = $this->student_context();

        $result = $this->ask($context, 'csharp');
        $this->assertSame('ok', $result['status']);
        $this->assertSame('wss://runner.example.org/analysis', $result['url']);
        [$body, $mac] = explode('.', $result['token']);
        $this->assertSame(interactive::base64url(hash_hmac('sha256', $body, self::SECRET, true)), $mac);
        $payload = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
        $this->assertEquals($USER->id, $payload['u']);
        // A token for the language service only, of C#; the runner refuses it for running programs.
        $this->assertSame('analysis', $payload['p']);
        $this->assertSame('csharp', $payload['l']);
        // It is not a run: the rate limit of runs (1 here) does not apply.
        $this->assertSame('ok', $this->ask($context, 'csharp')['status']);
        $this->assertSame('ok', $this->ask($context, 'csharp')['status']);
        // Session tokens have no purpose.
        $session = json_decode(base64_decode(strtr(explode('.', interactive::token(1, 'c'))[0], '-_', '+/')), true);
        $this->assertArrayNotHasKey('p', $session);
    }

    public function test_other_language(): void {
        $this->resetAfterTest();
        set_config('runnerurl', 'wss://runner.example.org/', 'tiny_codelab');
        set_config('runnersecret', self::SECRET, 'tiny_codelab');
        $context = $this->student_context();
        $this->assertSame('nolanguage', $this->ask($context, 'java')['status']);
        // C# turned off on the site.
        set_config('languages', 'c,cpp,python', 'tiny_codelab');
        $this->assertSame('nolanguage', $this->ask($context, 'csharp')['status']);
    }
}
