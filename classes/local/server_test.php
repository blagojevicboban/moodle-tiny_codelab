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
 * Test of the servers for the administrator (test.php): does each server answer, does each of its languages run a
 * small program right, and how fast are runs that come together (as when a class checks its answers at once).
 *
 * @package    tiny_codelab
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class server_test {
    /** Programs that read 21 and print 42, one per language. */
    const SAMPLES = [
        'c' => "#include <stdio.h>\nint main(void) { int x; scanf(\"%d\", &x); printf(\"%d\\n\", 2 * x); return 0; }\n",
        'cpp' => "#include <iostream>\nint main() { int x; std::cin >> x; std::cout << 2 * x << std::endl; }\n",
        'python' => "print(2 * int(input()))\n",
        'java' => "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] a) {\n" .
            "        System.out.println(2 * new Scanner(System.in).nextInt());\n    }\n}\n",
        'csharp' => "using System;\nclass Program {\n    static void Main() {\n" .
            "        Console.WriteLine(2 * int.Parse(Console.ReadLine()));\n    }\n}\n",
        'javascript' => "console.log(2 * parseInt(require('fs').readFileSync(0, 'utf8')));\n",
        'pascal' => "var x: integer;\nbegin\n  readln(x);\n  writeln(2 * x);\nend.\n",
        'php' => "<?php echo 2 * (int) trim(fgets(STDIN)), \"\\n\";\n",
        'mysql' => "SELECT 2 * 21 AS answer;\n",
        'typescript' => "import {readFileSync} from 'node:fs';\n" .
            "const x: number = parseInt(readFileSync(0, 'utf8'), 10);\nconsole.log(2 * x);\n",
        'bash' => "read x\necho \$((2 * x))\n",
        'go' => "package main\nimport \"fmt\"\nfunc main() { var x int; fmt.Scan(&x); fmt.Println(2 * x) }\n",
        'rust' => "use std::io;\nfn main() {\n    let mut s = String::new();\n" .
            "    io::stdin().read_line(&mut s).unwrap();\n" .
            "    let x: i32 = s.trim().parse().unwrap();\n    println!(\"{}\", 2 * x);\n}\n",
        'r' => "x <- as.integer(readLines(\"stdin\", n = 1))\ncat(2 * x, \"\\n\", sep = \"\")\n",
        'ruby' => "puts gets.to_i * 2\n",
        'lua' => "print(tonumber(io.read()) * 2)\n",
        'kotlin' => "fun main() { println(readln().toInt() * 2) }\n",
        'perl' => "my \$x = <STDIN>; chomp \$x; print \$x * 2, \"\\n\";\n",
        'octave' => "x = scanf(\"%d\", 1); printf(\"%d\\n\", 2 * x);\n",
        'julia' => "x = parse(Int, strip(readline()))\nprintln(2 * x)\n",
        'scheme' => "(display (* 2 (read))) (newline)\n",
        'dart' => "import 'dart:io';\nvoid main() { print(int.parse(stdin.readLineSync()!.trim()) * 2); }\n",
        'scala' => "object Main extends App { println(scala.io.StdIn.readInt() * 2) }\n",
        'elixir' => "IO.gets(\"\") |> String.trim() |> String.to_integer() |> Kernel.*(2) |> IO.puts()\n",
        'swift' => "if let s = readLine(), let x = Int(s) { print(x * 2) }\n",
        'haskell' => "main = do\n    s <- getLine\n    print (2 * (read s :: Int))\n",
    ];

    /** Runs sent together in the benchmark. */
    const BURST = 10;

    /**
     * Test every server that is set up.
     *
     * @param int $burst runs sent together (0: no benchmark)
     * @return array context of the template tiny_codelab/servertest
     */
    public static function run(int $burst = self::BURST): array {
        $servers = [];
        $jobe = new jobe();
        $servers[] = self::server(get_string('servertest_jobe', 'tiny_codelab'), $jobe, $burst);
        $servers[] = self::server(get_string('servertest_runner', 'tiny_codelab'), new runner_client(), $burst);
        $mode = backend::mode();
        return [
            'servers' => $servers,
            'backend' => get_string('backend_' . $mode, 'tiny_codelab'),
            'burst' => $burst,
        ];
    }

    /**
     * Test one server.
     *
     * @param string $name
     * @param jobe $client
     * @param int $burst
     * @return array
     */
    public static function server(string $name, jobe $client, int $burst): array {
        $result = ['name' => $name, 'configured' => $client->is_configured(), 'ok' => false, 'error' => '',
            'languages' => [], 'hasbenchmark' => false];
        if (!$result['configured']) {
            return $result;
        }
        $start = microtime(true);
        $info = $client->languages();
        $result['answerms'] = self::ms($start);
        if (!$info['ok']) {
            $result['error'] = (string) $info['error'];
            return $result;
        }
        $result['ok'] = true;
        foreach (array_keys($info['versions']) as $lang) {
            if (!isset(self::SAMPLES[$lang]) || ($lang === 'mysql' && !($client instanceof runner_client))) {
                continue;
            }
            $start = microtime(true);
            $run = $client->run($lang, self::SAMPLES[$lang], "21\n");
            $right = $run['status'] === 'ok' && strpos($run['stdout'], '42') !== false;
            $result['languages'][] = [
                'name' => get_string('lang_' . $lang, 'tiny_codelab'),
                'version' => (string) $info['versions'][$lang],
                'right' => $right,
                'status' => self::status_text($run['status']),
                'ms' => self::ms($start),
                'detail' => $right ? '' : shorten_text(trim($run['cmpinfo'] . ' ' . $run['stderr'] . ' ' . $run['stdout']), 200),
            ];
        }
        $lang = isset($info['versions']['c']) ? 'c' : (isset($info['versions']['python']) ? 'python' : '');
        if ($burst > 0 && $lang !== '') {
            $result['hasbenchmark'] = true;
            $result['benchmark'] = self::benchmark($client, $lang, $burst) +
                ['language' => get_string('lang_' . $lang, 'tiny_codelab')];
        }
        return $result;
    }

    /**
     * Send runs together and time them. Each program is a little different, so none comes from a compile cache.
     *
     * @param jobe $client
     * @param string $lang
     * @param int $count
     * @return array runs, right, seconds, median, slowest (ms), perminute
     */
    public static function benchmark(jobe $client, string $lang, int $count): array {
        $comment = $lang === 'python' ? '#' : '//';
        // Moodle's HTTP client keeps the proxy settings and the blocked hosts of the site; the runs go out together.
        // As in runner_client, the CodeLab runner may sit on a local address that the site's blocked hosts list stops.
        $http = new \core\http_client(['http_errors' => false, 'timeout' => 120, 'connect_timeout' => 10,
            'ignoresecurity' => $client instanceof runner_client]);
        $times = [];
        $promises = [];
        for ($i = 0; $i < $count; $i++) {
            $code = self::SAMPLES[$lang] . "$comment benchmark " . random_string(8) . " $i\n";
            $request = $client->request($lang, $code, "21\n");
            $promises[] = $http->postAsync($request['url'], [
                'headers' => self::header_map($request['headers']),
                'body' => $request['body'],
                'on_stats' => function (\GuzzleHttp\TransferStats $stats) use (&$times): void {
                    $times[] = (int) round(($stats->getTransferTime() ?? 0) * 1000);
                },
            ]);
        }
        $start = microtime(true);
        $results = \GuzzleHttp\Promise\Utils::settle($promises)->wait();
        $seconds = microtime(true) - $start;
        $right = 0;
        foreach ($results as $result) {
            if ($result['state'] !== 'fulfilled') {
                continue;
            }
            $response = $result['value'];
            $run = $client->parse($response->getStatusCode(), (string) $response->getBody());
            $right += $run['status'] === 'ok' && strpos($run['stdout'], '42') !== false ? 1 : 0;
        }
        sort($times);
        return [
            'runs' => $count,
            'right' => $right,
            'allright' => $right === $count,
            'seconds' => format_float($seconds, 1),
            'median' => $times[intdiv(count($times), 2)] ?? 0,
            'slowest' => end($times) ?: 0,
            'perminute' => $seconds > 0 ? (int) round($right / $seconds * 60) : 0,
        ];
    }

    /**
     * Turn header lines (Name: value) into the map that the HTTP client takes.
     *
     * @param string[] $lines
     * @return array name => value
     */
    public static function header_map(array $lines): array {
        $headers = [];
        foreach ($lines as $line) {
            [$name, $value] = array_pad(explode(':', $line, 2), 2, '');
            $headers[trim($name)] = trim($value);
        }
        return $headers;
    }

    /**
     * Milliseconds since a start.
     *
     * @param float $start
     * @return int
     */
    protected static function ms(float $start): int {
        return (int) round((microtime(true) - $start) * 1000);
    }

    /**
     * The text of a run status.
     *
     * @param string $status
     * @return string
     */
    protected static function status_text(string $status): string {
        $manager = get_string_manager();
        return $manager->string_exists('status_' . $status, 'tiny_codelab')
            ? get_string('status_' . $status, 'tiny_codelab') : $status;
    }
}
