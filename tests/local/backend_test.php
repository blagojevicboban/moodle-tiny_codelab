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
 * Tests of the choice of the server that runs and grades programs.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\backend
 * @covers     \tiny_codelab\local\jobe
 */
final class backend_test extends \advanced_testcase {
    /**
     * Jobe and the runner both set up.
     */
    private function both(): void {
        set_config('jobeserver', 'https://jobe.example.org', 'tiny_codelab');
        set_config('runnerurl', 'wss://runner.example.org', 'tiny_codelab');
        set_config('runnersecret', 'runner-secret-0123456789', 'tiny_codelab');
        set_config('cloudkey', '', 'tiny_codelab');
    }

    public function test_modes(): void {
        $this->resetAfterTest();
        $this->both();
        $this->assertSame(backend::AUTO, backend::mode());
        $this->assertFalse(backend::on_runner('c'));
        $this->assertTrue(backend::on_runner('mysql'));
        $this->assertTrue(backend::fallback());
        $this->assertNotInstanceOf(runner_client::class, backend::languages_client());

        set_config('backend', backend::RUNNER, 'tiny_codelab');
        $this->assertTrue(backend::on_runner('c'));
        $this->assertFalse(backend::fallback());
        $this->assertInstanceOf(runner_client::class, backend::languages_client());

        set_config('backend', backend::JOBE, 'tiny_codelab');
        $this->assertFalse(backend::on_runner('python'));
        $this->assertTrue(backend::on_runner('mysql'));
        $this->assertFalse(backend::fallback());

        // Automatic without Jobe: everything on the runner.
        set_config('backend', backend::AUTO, 'tiny_codelab');
        set_config('jobeserver', '', 'tiny_codelab');
        $this->assertTrue(backend::on_runner('java'));
        set_config('backend', 'something old', 'tiny_codelab');
        $this->assertSame(backend::AUTO, backend::mode());
    }

    public function test_a_run_goes_to_the_runner_when_jobe_cannot_be_reached(): void {
        $this->resetAfterTest();
        // Nothing listens on these ports: the connections are refused at once.
        set_config('jobeserver', 'http://127.0.0.1:9', 'tiny_codelab');
        set_config('runnerurl', 'ws://127.0.0.1:9', 'tiny_codelab');
        set_config('runnersecret', 'runner-secret-0123456789', 'tiny_codelab');
        set_config('cloudkey', '', 'tiny_codelab');

        // Automatic: Jobe fails, the runner is tried (and fails too, so its message is the answer).
        $result = (new jobe())->run('python', 'print(42)');
        $this->assertSame('error', $result['status']);
        $this->assertStringStartsWith('CodeLab runner:', $result['stderr']);

        // Jobe only: the error of Jobe stays.
        set_config('backend', backend::JOBE, 'tiny_codelab');
        $result = (new jobe())->run('python', 'print(42)');
        $this->assertStringStartsWith('Jobe:', $result['stderr']);

        // Automatic without a runner: the error of Jobe.
        set_config('backend', backend::AUTO, 'tiny_codelab');
        set_config('runnerurl', '', 'tiny_codelab');
        $result = (new jobe())->run('python', 'print(42)');
        $this->assertStringStartsWith('Jobe:', $result['stderr']);
    }
}
