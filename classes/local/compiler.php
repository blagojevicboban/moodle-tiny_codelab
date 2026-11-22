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
 * Compiler profiles and language standards for C and C++: whitelisted values shared by Jobe, CodeLab runner,
 * tiny_codelab, filter_codelab and qtype_codelab.
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class compiler {
    /** Allowed compiler profiles for C and C++. */
    const COMPILERS = ['gcc', 'msvc', 'clang'];

    /** Allowed C standards. */
    const C_STANDARDS = ['c99', 'c11', 'c17', 'c23'];

    /** Allowed C++ standards. */
    const CPP_STANDARDS = ['c++11', 'c++14', 'c++17', 'c++20', 'c++23'];

    /** Default standard per language. */
    const DEFAULT_STD = [
        'c' => 'c11',
        'cpp' => 'c++17',
    ];

    /**
     * Site default compiler profile from plugin settings.
     *
     * @return string gcc, msvc or clang
     */
    public static function default_compiler(): string {
        $configured = (string) get_config('tiny_codelab', 'compiler');
        return in_array($configured, self::COMPILERS, true) ? $configured : 'gcc';
    }

    /**
     * Validate and normalise compiler and standard for a language (empty strings for non-C/C++).
     *
     * @param string $lang
     * @param string $compiler
     * @param string $std
     * @return array ['compiler' => string, 'std' => string]
     */
    public static function normalize(string $lang, string $compiler = '', string $std = ''): array {
        if ($lang !== 'c' && $lang !== 'cpp') {
            return ['compiler' => '', 'std' => ''];
        }
        $cc = trim($compiler);
        if (str_starts_with($cc, $lang . '-')) {
            $cc = substr($cc, strlen($lang) + 1);
        }
        if (!in_array($cc, self::COMPILERS, true)) {
            $cc = self::default_compiler();
        }
        $s = trim($std);
        if ($lang === 'c') {
            if (ctype_digit($s)) {
                $s = 'c' . $s;
            }
            if (!in_array($s, self::C_STANDARDS, true)) {
                $s = self::DEFAULT_STD['c'];
            }
        } else {
            if (str_starts_with($s, 'cpp')) {
                $s = 'c++' . substr($s, 3);
            } else if (ctype_digit($s)) {
                $s = 'c++' . $s;
            }
            if (!in_array($s, self::CPP_STANDARDS, true)) {
                $s = self::DEFAULT_STD['cpp'];
            }
        }
        return ['compiler' => $cc, 'std' => $s];
    }

    /**
     * MSVC compatibility shim headers sent as support files when compiling in MSVC mode on Jobe.
     *
     * @return array list of ['name' => string, 'text' => string]
     */
    public static function msvc_headers(): array {
        $dir = __DIR__ . '/msvc';
        $out = [];
        foreach (['codelab_msvc.h', 'conio.h', 'windows.h'] as $name) {
            $path = $dir . '/' . $name;
            if (is_readable($path)) {
                $out[] = ['name' => $name, 'text' => (string) file_get_contents($path)];
            }
        }
        return $out;
    }
}
