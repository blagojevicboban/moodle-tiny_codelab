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

/**
 * Unit tests for the web service tiny_codelab_run (without a Jobe server).
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\external\run
 */
final class run_test extends \advanced_testcase {
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

    public function test_not_configured(): void {
        $this->resetAfterTest();
        set_config('jobeserver', '', 'tiny_codelab');
        $context = $this->student_context();
        $result = run::execute($context->id, 'c', 'int main(void) { return 0; }', '');
        $result = external_api::clean_returnvalue(run::execute_returns(), $result);
        $this->assertSame('notconfigured', $result['status']);
    }

    public function test_too_large(): void {
        $this->resetAfterTest();
        $context = $this->student_context();
        $result = run::execute($context->id, 'python', str_repeat('x', 70000), '');
        $this->assertSame('toolarge', $result['status']);
    }

    public function test_unknown_language(): void {
        $this->resetAfterTest();
        $context = $this->student_context();
        $this->expectException(\invalid_parameter_exception::class);
        run::execute($context->id, 'cobol', 'DISPLAY "X".', '');
    }

    public function test_rate_limit(): void {
        $this->resetAfterTest();
        set_config('ratelimit', 2, 'tiny_codelab');
        set_config('jobeserver', '', 'tiny_codelab');
        $context = $this->student_context();
        $this->assertSame('notconfigured', run::execute($context->id, 'c', 'int x;', '')['status']);
        $this->assertSame('notconfigured', run::execute($context->id, 'c', 'int x;', '')['status']);
        $this->assertSame('ratelimit', run::execute($context->id, 'c', 'int x;', '')['status']);

        set_config('ratelimit', 0, 'tiny_codelab');
        $this->assertSame('notconfigured', run::execute($context->id, 'c', 'int x;', '')['status']);
    }

    public function test_guest_cannot_run(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $this->setGuestUser();
        $this->expectException(\Exception::class);
        run::execute(\context_course::instance($course->id)->id, 'c', 'int x;', '');
    }
}
