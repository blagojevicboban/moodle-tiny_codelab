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

/**
 * Tests of the web service tiny_codelab_ai_hint with a stand-in for the AI manager of Moodle (no provider, no network).
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\external\ai_hint
 */
final class ai_hint_test extends \advanced_testcase {
    /** @var ?string the prompt the stand-in got */
    private ?string $prompt = null;

    /**
     * A course page, a student who accepted the AI policy, AI help on, and the stand-in manager.
     *
     * @param bool $success whether the stand-in AI answers
     * @return \context_module the page
     */
    private function setup_page(bool $success = true): \context_module {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $page = $this->getDataGenerator()->create_module('page', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($student);
        \core_ai\manager::user_policy_accepted($student->id, \context_system::instance()->id);
        set_config('aihints', 1, 'tiny_codelab');
        set_config('aihintlimit', 2, 'tiny_codelab');
        $manager = $this->createMock(\core_ai\manager::class);
        $manager->method('is_action_available')->willReturn(true);
        // Moodle 5.1 and newer only (ai_hint::available() checks for it too).
        if (method_exists(\core_ai\manager::class, 'is_action_enabled_in_context')) {
            $manager->method('is_action_enabled_in_context')->willReturn(true);
        }
        $manager->method('process_action')->willReturnCallback(function ($action) use ($success) {
            $this->prompt = $action->get_configuration('prompttext');
            $response = new \core_ai\aiactions\responses\response_generate_text(success: $success);
            if ($success) {
                $response->set_response_data(['generatedcontent' => '  The semicolon is missing on line 2.  ']);
            }
            return $response;
        });
        \core\di::set(\core_ai\manager::class, $manager);
        return \context_module::instance($page->cmid);
    }

    public function test_explains_with_the_program_and_the_messages(): void {
        $context = $this->setup_page();
        $result = ai_hint::execute($context->id, 'c', "int main() {\n  return 0\n}", "prog.c:2:11: error: expected ';'");
        $result = \core_external\external_api::clean_returnvalue(ai_hint::execute_returns(), $result);
        $this->assertSame('The semicolon is missing on line 2.', $result['text']);
        $this->assertStringContainsString('programming in C.', $this->prompt);
        $this->assertStringContainsString('return 0', $this->prompt);
        $this->assertStringContainsString("expected ';'", $this->prompt);
    }

    public function test_limit_per_hour(): void {
        $context = $this->setup_page();
        ai_hint::execute($context->id, 'python', 'print(x)', 'NameError');
        ai_hint::execute($context->id, 'python', 'print(x)', 'NameError');
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('aihintlimitreached', 'tiny_codelab', 2));
        ai_hint::execute($context->id, 'python', 'print(x)', 'NameError');
    }

    public function test_off_and_failures(): void {
        $context = $this->setup_page(false);
        try {
            ai_hint::execute($context->id, 'c', 'int main() {}', 'error');
            $this->fail('A failed answer must throw');
        } catch (\moodle_exception $e) {
            $this->assertSame('aihintfailed', $e->errorcode);
        }
        set_config('aihints', 0, 'tiny_codelab');
        $this->expectException(\moodle_exception::class);
        ai_hint::execute($context->id, 'c', 'int main() {}', 'error');
    }
}
