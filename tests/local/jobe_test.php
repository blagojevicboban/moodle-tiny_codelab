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
 * Unit tests for the Jobe client.
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_codelab\local\jobe
 */
final class jobe_test extends \advanced_testcase {
    public function test_runs_url(): void {
        $url = (new jobe('https://jobe.example.org/'))->runs_url();
        $this->assertSame('https://jobe.example.org/jobe/index.php/restapi/runs', $url);
        $this->assertSame('http://jobe.local/jobe/index.php/restapi/runs', (new jobe('jobe.local'))->runs_url());
    }

    public function test_source_file_name(): void {
        $this->assertSame('prog.c', jobe::source_file_name('c', 'int main(void) { return 0; }'));
        $this->assertSame('Zbir.java', jobe::source_file_name('java', "import java.util.*;\npublic class Zbir {\n}"));
        $this->assertSame('Main.java', jobe::source_file_name('java', 'class Helper {}'));
        $this->assertSame('prog.cs', jobe::source_file_name('csharp', 'class Program {}'));
        $this->assertSame('prog.js', jobe::source_file_name('javascript', 'console.log(1);'));
        $this->assertSame('prog.pas', jobe::source_file_name('pascal', 'begin end.'));
        $this->assertSame('prog.php', jobe::source_file_name('php', '<?php echo 1;'));
    }

    public function test_run_spec(): void {
        $spec = (new jobe('https://jobe.example.org', '', 7))->run_spec('python', 'print(input())', "5\n")['run_spec'];
        $this->assertSame('python3', $spec['language_id']);
        $this->assertSame('prog.py', $spec['sourcefilename']);
        $this->assertSame("5\n", $spec['input']);
        $this->assertSame(7, $spec['parameters']['cputime']);
        $this->assertArrayNotHasKey('linkargs', $spec['parameters']);

        // C: warnings do not stop the program (Jobe takes any compiler message as an error), math.h is linked.
        $c = (new jobe('https://jobe.example.org'))->run_spec('c', 'int main(void) { return 0; }')['run_spec'];
        $this->assertContains('-w', $c['parameters']['compileargs']);
        // Visual Studio's scanf_s is mapped to scanf.
        $this->assertContains('-Dscanf_s=scanf', $c['parameters']['compileargs']);
        $this->assertSame(['-lm'], $c['parameters']['linkargs']);

        // Node.js on Jobe: the id is nodejs, and V8 needs more memory than Jobe's default limit.
        $js = (new jobe('https://jobe.example.org'))->run_spec('javascript', 'console.log(1);')['run_spec'];
        $this->assertSame('nodejs', $js['language_id']);
        $this->assertSame(1000, $js['parameters']['memorylimit']);
        $this->assertSame('pascal', (new jobe('x'))->run_spec('pascal', 'begin end.')['run_spec']['language_id']);
    }

    public function test_parse_response(): void {
        $ok = jobe::parse_response(200, json_encode(['outcome' => 15, 'cmpinfo' => '', 'stdout' => "5\n", 'stderr' => '']));
        $this->assertSame('ok', $ok['status']);
        $this->assertSame("5\n", $ok['stdout']);

        $compile = jobe::parse_response(200, json_encode(['outcome' => 11, 'cmpinfo' => 'error: x undeclared']));
        $this->assertSame('compile', $compile['status']);
        $this->assertSame('error: x undeclared', $compile['cmpinfo']);

        $this->assertSame('time', jobe::parse_response(200, '{"outcome": 13}')['status']);
        $this->assertSame('error', jobe::parse_response(200, '{"outcome": 99}')['status']);

        $denied = jobe::parse_response(403, 'Unknown API key');
        $this->assertSame('error', $denied['status']);
        $this->assertStringContainsString('API key', $denied['stderr']);
        $this->assertSame('error', jobe::parse_response(500, 'not json')['status']);
    }

    public function test_not_configured(): void {
        $this->resetAfterTest();
        set_config('jobeserver', '', 'tiny_codelab');
        $result = (new jobe())->run('c', 'int main(void) { return 0; }');
        $this->assertSame('notconfigured', $result['status']);
    }

    public function test_unknown_language(): void {
        $this->expectException(\invalid_parameter_exception::class);
        (new jobe('https://jobe.example.org'))->run('cobol', 'DISPLAY "X".');
    }
}
