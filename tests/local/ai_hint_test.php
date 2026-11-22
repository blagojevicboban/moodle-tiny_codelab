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
 * Tests of the AI help: when it is offered, the limit per hour and the prompt.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\ai_hint
 */
final class ai_hint_test extends \advanced_testcase {
    public function test_off_by_default_and_never_in_a_quiz(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $page = $this->getDataGenerator()->create_module('page', ['course' => $course->id]);
        $quiz = $this->getDataGenerator()->create_module('quiz', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($student);
        $pagecontext = \context_module::instance($page->cmid);
        $quizcontext = \context_module::instance($quiz->cmid);
        $this->assertFalse(ai_hint::available($pagecontext));
        $this->assertFalse(ai_hint::in_quiz($pagecontext));
        $this->assertTrue(ai_hint::in_quiz($quizcontext));
        $this->assertFalse(ai_hint::in_quiz(\context_course::instance($course->id)));
        // On, but in a quiz: still not offered.
        set_config('aihints', 1, 'tiny_codelab');
        $this->assertFalse(ai_hint::available($quizcontext));
    }

    public function test_limit_per_hour(): void {
        $this->resetAfterTest();
        set_config('aihintlimit', 2, 'tiny_codelab');
        $this->assertTrue(ai_hint::take_request(5));
        $this->assertTrue(ai_hint::take_request(5));
        $this->assertFalse(ai_hint::take_request(5));
        $this->assertTrue(ai_hint::take_request(6));
        set_config('aihintlimit', 0, 'tiny_codelab');
        $this->assertTrue(ai_hint::take_request(5));
    }

    public function test_prompt(): void {
        $prompt = ai_hint::prompt('C', "int main() {\n  int x\n}", "prog.c:2:8: error: expected ';'", 'Serbian (Latin script)');
        $this->assertStringContainsString('programming in C', $prompt);
        $this->assertStringContainsString('answer in Serbian (Latin script)', $prompt);
        $this->assertStringContainsString('Do not write the corrected program', $prompt);
        $this->assertStringContainsString("Messages:\nprog.c:2:8: error: expected ';'", $prompt);
        $long = ai_hint::prompt('Python', str_repeat('x', ai_hint::MAX_CODE + 500), 'e', 'English');
        $this->assertLessThan(ai_hint::MAX_CODE + 1500, strlen($long));
    }
}
