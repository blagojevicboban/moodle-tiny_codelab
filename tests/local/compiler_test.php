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
 * Unit tests for C/C++ compiler profiles, standards and Jobe/runner mapping.
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\compiler
 */
final class compiler_test extends \advanced_testcase {
    public function test_normalize_and_site_default(): void {
        $this->resetAfterTest();
        set_config('compiler', 'gcc', 'tiny_codelab');
        $this->assertSame(['compiler' => 'gcc', 'std' => 'c11'], compiler::normalize('c'));
        $this->assertSame(['compiler' => 'msvc', 'std' => 'c17'], compiler::normalize('c', 'c-msvc', '17'));
        $this->assertSame(['compiler' => 'clang', 'std' => 'c++20'], compiler::normalize('cpp', 'clang', 'cpp20'));
        $this->assertSame(['compiler' => '', 'std' => ''], compiler::normalize('python', 'msvc', 'c17'));

        // Site default applies when no compiler is specified.
        set_config('compiler', 'msvc', 'tiny_codelab');
        $this->assertSame(['compiler' => 'msvc', 'std' => 'c11'], compiler::normalize('c'));
        // Arbitrary flags are rejected and fall back to defaults.
        $this->assertSame(['compiler' => 'msvc', 'std' => 'c11'], compiler::normalize('c', 'gcc -O3', 'evil'));
    }

    public function test_jobe_run_spec_msvc_includes_headers_and_flag(): void {
        $this->resetAfterTest();
        $jobe = new jobe('https://jobe.invalid', '', 5);
        $spec = $jobe->run_spec('c', 'int main(){}', '', [], 'msvc', 'c17');
        $args = $spec['run_spec']['parameters']['compileargs'];
        $this->assertContains('-std=c17', $args);
        $this->assertContains('-include', $args);
        $this->assertContains('codelab_msvc.h', $args);
        $names = array_column($spec['run_spec']['file_list'], 1);
        $this->assertContains('codelab_msvc.h', $names);
        $this->assertContains('conio.h', $names);
        $this->assertContains('windows.h', $names);
    }

    public function test_runner_client_sends_compiler_and_std(): void {
        $this->resetAfterTest();
        set_config('runnerurl', 'wss://runner.example.org', 'tiny_codelab');
        set_config('runnersecret', 'my-secret-0123456789', 'tiny_codelab');
        $client = new runner_client();
        $req = $client->request('cpp', 'int main(){}', '', [], 'msvc', 'c++20');
        $body = json_decode($req['body'], true);
        $this->assertSame('msvc', $body['compiler']);
        $this->assertSame('c++20', $body['std']);
    }
}
