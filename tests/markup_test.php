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

namespace tiny_codelab;

/**
 * The markup of a CodeLab block survives Moodle's cleaning of HTML: the settings, the input and the files are classes
 * of pre elements, because data-* attributes are removed.
 *
 * @package    tiny_codelab
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @coversNothing
 */
final class markup_test extends \advanced_testcase {
    public function test_files_survive_clean_text(): void {
        $html = '<pre class="codelab codelab-lang-python codelab-run codelab-id-ab12cd34">' .
            'with open("input.txt") as f:' . "\n" . '    print(f.read())</pre>' .
            '<pre class="codelab-stdin">3</pre>' .
            '<pre class="codelab-file codelab-file-input-txt">first &lt;line&gt;' . "\n" . 'second</pre>' .
            '<pre class="codelab-file codelab-file-my_data-csv">a,b</pre>';
        $clean = clean_text($html, FORMAT_HTML);
        $this->assertStringContainsString('<pre class="codelab-file codelab-file-input-txt">first &lt;line&gt;' . "\n" .
            'second</pre>', $clean);
        $this->assertStringContainsString('<pre class="codelab-file codelab-file-my_data-csv">a,b</pre>', $clean);
        $this->assertStringContainsString('<pre class="codelab-stdin">3</pre>', $clean);
        $this->assertStringContainsString('class="codelab codelab-lang-python codelab-run codelab-id-ab12cd34"', $clean);
        // A data attribute would not survive: that is why the name is a class.
        $this->assertStringNotContainsString('data-name', clean_text('<pre class="codelab-file" data-name="a.txt">a</pre>'));
    }
}
