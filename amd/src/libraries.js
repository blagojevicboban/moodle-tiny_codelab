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

/**
 * What the typing help of CodeLab knows about each language: keywords, snippets, library functions and members of
 * common types. Signatures are written as in the language, so they need no translation.
 *
 * Functions: 'name(parameters)' or a property 'NAME'; groups give the header, module or class they come from.
 * Snippets: [label, body in Monaco snippet syntax].
 *
 * @module     tiny_codelab/libraries
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const C_KEYWORDS = ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
    'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
    'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'];

const C_FUNCTIONS = {
    'stdio.h': ['printf(const char *format, ...)', 'scanf(const char *format, ...)', 'getchar()', 'putchar(int c)',
        'puts(const char *s)', 'fgets(char *s, int n, FILE *stream)', 'fopen(const char *filename, const char *mode)',
        'fclose(FILE *stream)', 'fprintf(FILE *stream, const char *format, ...)',
        'fscanf(FILE *stream, const char *format, ...)', 'sprintf(char *s, const char *format, ...)',
        'sscanf(const char *s, const char *format, ...)', 'feof(FILE *stream)'],
    'math.h': ['sqrt(double x)', 'pow(double x, double y)', 'fabs(double x)', 'floor(double x)', 'ceil(double x)',
        'round(double x)', 'sin(double x)', 'cos(double x)', 'tan(double x)', 'log(double x)', 'log10(double x)',
        'exp(double x)', 'fmod(double x, double y)'],
    'string.h': ['strlen(const char *s)', 'strcpy(char *dest, const char *src)',
        'strncpy(char *dest, const char *src, size_t n)', 'strcat(char *dest, const char *src)',
        'strcmp(const char *s1, const char *s2)', 'strncmp(const char *s1, const char *s2, size_t n)',
        'strchr(const char *s, int c)', 'strstr(const char *haystack, const char *needle)',
        'memset(void *s, int c, size_t n)', 'memcpy(void *dest, const void *src, size_t n)'],
    'stdlib.h': ['malloc(size_t size)', 'calloc(size_t count, size_t size)', 'realloc(void *ptr, size_t size)',
        'free(void *ptr)', 'abs(int x)', 'rand()', 'srand(unsigned int seed)', 'atoi(const char *s)',
        'atof(const char *s)', 'exit(int status)',
        'qsort(void *base, size_t count, size_t size, int (*compare)(const void *, const void *))'],
    'ctype.h': ['isdigit(int c)', 'isalpha(int c)', 'isalnum(int c)', 'isspace(int c)', 'isupper(int c)',
        'islower(int c)', 'toupper(int c)', 'tolower(int c)'],
    'time.h': ['time(time_t *t)'],
};

const C_SNIPPETS = [
    ['main', 'int main(void)\n{\n\t$0\n\treturn 0;\n}'],
    ['for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}'],
    ['while', 'while (${1:condition}) {\n\t$0\n}'],
    ['do', 'do {\n\t$0\n} while (${1:condition});'],
    ['if', 'if (${1:condition}) {\n\t$0\n}'],
    ['ifelse', 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}'],
    ['switch', 'switch (${1:value}) {\ncase ${2:1}:\n\t$0\n\tbreak;\ndefault:\n\tbreak;\n}'],
    ['printf', 'printf("${1:%d}\\n", ${2:x});'],
    ['scanf', 'scanf("${1:%d}", &${2:x});'],
    ['include', '#include <${1:stdio.h}>'],
];

const CPP_KEYWORDS = C_KEYWORDS.concat(['bool', 'catch', 'class', 'delete', 'false', 'friend', 'inline', 'namespace',
    'new', 'nullptr', 'operator', 'override', 'private', 'protected', 'public', 'template', 'this', 'throw', 'true',
    'try', 'typename', 'using', 'virtual']);

const PY_KEYWORDS = ['False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
    'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or',
    'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];

const JAVA_KEYWORDS = ['abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue', 'default',
    'do', 'double', 'else', 'enum', 'extends', 'false', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import',
    'instanceof', 'int', 'interface', 'long', 'new', 'null', 'package', 'private', 'protected', 'public', 'return',
    'short', 'static', 'super', 'switch', 'this', 'throw', 'throws', 'true', 'try', 'void', 'while'];

const CS_KEYWORDS = ['abstract', 'as', 'base', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue',
    'decimal', 'default', 'do', 'double', 'else', 'enum', 'false', 'finally', 'float', 'for', 'foreach', 'if', 'in',
    'int', 'interface', 'internal', 'is', 'long', 'namespace', 'new', 'null', 'object', 'out', 'override', 'private',
    'protected', 'public', 'readonly', 'ref', 'return', 'sealed', 'static', 'string', 'struct', 'switch', 'this',
    'throw', 'true', 'try', 'using', 'var', 'virtual', 'void', 'while'];

const JS_KEYWORDS = ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do',
    'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
    'null', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var',
    'void', 'while', 'yield'];

const PAS_KEYWORDS = ['and', 'array', 'begin', 'boolean', 'case', 'char', 'const', 'div', 'do', 'downto', 'else', 'end',
    'false', 'for', 'function', 'if', 'integer', 'longint', 'mod', 'not', 'of', 'or', 'procedure', 'program', 'real',
    'record', 'repeat', 'string', 'then', 'to', 'true', 'type', 'until', 'uses', 'var', 'while', 'with'];

const PHP_KEYWORDS = ['array', 'as', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else',
    'elseif', 'false', 'finally', 'fn', 'for', 'foreach', 'function', 'if', 'match', 'new', 'null', 'private',
    'protected', 'public', 'return', 'static', 'switch', 'throw', 'true', 'try', 'while', 'STDIN', 'PHP_EOL'];

const JAVA_STRING = ['length()', 'charAt(int index)', 'substring(int begin, int end)', 'indexOf(String str)',
    'equals(Object other)', 'equalsIgnoreCase(String other)', 'compareTo(String other)', 'toUpperCase()',
    'toLowerCase()', 'trim()', 'split(String regex)', 'contains(CharSequence s)', 'replace(CharSequence a, CharSequence b)',
    'isEmpty()', 'toCharArray()'];
const JAVA_LIST = ['add(E element)', 'get(int index)', 'set(int index, E element)', 'size()', 'remove(int index)',
    'contains(Object o)', 'indexOf(Object o)', 'isEmpty()', 'clear()'];
const CS_STRING = ['Length', 'Substring(int startIndex, int length)', 'IndexOf(string value)', 'ToUpper()', 'ToLower()',
    'Trim()', 'Split(params char[] separator)', 'Contains(string value)', 'Replace(string oldValue, string newValue)',
    'StartsWith(string value)', 'EndsWith(string value)', 'ToCharArray()', 'CompareTo(string other)'];
const CS_LIST = ['Add(T item)', 'Count', 'Remove(T item)', 'RemoveAt(int index)', 'Contains(T item)',
    'IndexOf(T item)', 'Insert(int index, T item)', 'Clear()', 'Sort()', 'ToArray()'];

/**
 * @type {Object<string, {keywords: string[], functions: Object<string, string[]>, members: Object<string, string[]>,
 *     snippets: Array<string[]>, headers?: string[], declaration?: RegExp}>}
 */
export default {
    c: {
        keywords: C_KEYWORDS,
        functions: C_FUNCTIONS,
        members: {},
        snippets: C_SNIPPETS,
        headers: Object.keys(C_FUNCTIONS).concat(['stdbool.h', 'limits.h']),
    },
    cpp: {
        keywords: CPP_KEYWORDS,
        functions: Object.assign({}, C_FUNCTIONS, {
            'iostream': ['cout', 'cin', 'endl', 'cerr'],
            'string': ['getline(istream &is, string &str)', 'to_string(int value)', 'stoi(const string &str)',
                'stod(const string &str)'],
            'algorithm': ['sort(RandomIt first, RandomIt last)', 'reverse(BidirIt first, BidirIt last)',
                'max(const T &a, const T &b)', 'min(const T &a, const T &b)', 'swap(T &a, T &b)',
                'find(InputIt first, InputIt last, const T &value)'],
            'cmath': ['sqrt(double x)', 'pow(double x, double y)', 'abs(double x)'],
        }),
        members: {
            string: ['size()', 'length()', 'substr(size_t pos, size_t len)', 'find(const string &str)',
                'push_back(char c)', 'empty()', 'c_str()', 'append(const string &str)', 'erase(size_t pos, size_t len)'],
            vector: ['push_back(const T &value)', 'pop_back()', 'size()', 'empty()', 'clear()', 'front()', 'back()',
                'begin()', 'end()', 'at(size_t pos)', 'resize(size_t count)', 'insert(iterator pos, const T &value)'],
        },
        declaration: /\b(string|vector)\s*(?:<[^>;]*>)?\s+([A-Za-z_]\w*)/g,
        snippets: [
            ['main', '#include <iostream>\nusing namespace std;\n\nint main()\n{\n\t$0\n\treturn 0;\n}'],
            ['for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}'],
            ['while', 'while (${1:condition}) {\n\t$0\n}'],
            ['if', 'if (${1:condition}) {\n\t$0\n}'],
            ['ifelse', 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}'],
            ['class', 'class ${1:Name} {\npublic:\n\t${1:Name}() {}\n\t$0\n};'],
            ['cout', 'cout << ${1:x} << endl;'],
            ['cin', 'cin >> ${1:x};'],
        ],
        headers: ['iostream', 'string', 'vector', 'algorithm', 'cmath', 'iomanip', 'fstream'],
    },
    python: {
        keywords: PY_KEYWORDS,
        functions: {
            builtins: ['print(*values, sep=" ", end="\\n")', 'input(prompt="")', 'int(x)', 'float(x)', 'str(x)',
                'len(s)', 'range(start, stop, step)', 'abs(x)', 'min(iterable)', 'max(iterable)', 'sum(iterable)',
                'sorted(iterable, key=None, reverse=False)', 'round(number, ndigits)', 'list(iterable)', 'dict()',
                'set(iterable)', 'tuple(iterable)', 'enumerate(iterable, start=0)', 'zip(*iterables)',
                'map(function, iterable)', 'filter(function, iterable)', 'open(file, mode="r")', 'type(obj)',
                'isinstance(obj, classinfo)', 'ord(c)', 'chr(i)', 'divmod(a, b)', 'bool(x)'],
        },
        members: {
            math: ['sqrt(x)', 'pow(x, y)', 'floor(x)', 'ceil(x)', 'gcd(a, b)', 'factorial(n)', 'sin(x)', 'cos(x)',
                'log(x, base)', 'pi', 'e', 'inf'],
            random: ['randint(a, b)', 'random()', 'choice(seq)', 'shuffle(x)'],
            str: ['split(sep=None)', 'join(iterable)', 'strip()', 'upper()', 'lower()', 'replace(old, new)',
                'find(sub)', 'count(sub)', 'startswith(prefix)', 'endswith(suffix)', 'isdigit()', 'format(*args)'],
            list: ['append(x)', 'extend(iterable)', 'insert(i, x)', 'remove(x)', 'pop(i=-1)', 'index(x)', 'count(x)',
                'sort(key=None, reverse=False)', 'reverse()', 'clear()'],
        },
        snippets: [
            ['def', 'def ${1:name}(${2:params}):\n\t${0:pass}'],
            ['for', 'for ${1:i} in range(${2:n}):\n\t${0:pass}'],
            ['while', 'while ${1:condition}:\n\t${0:pass}'],
            ['if', 'if ${1:condition}:\n\t${0:pass}'],
            ['ifelse', 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${0:pass}'],
            ['class', 'class ${1:Name}:\n\tdef __init__(self${2}):\n\t\t${0:pass}'],
            ['try', 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${0:print(e)}'],
            ['main', 'def main():\n\t${0:pass}\n\n\nif __name__ == "__main__":\n\tmain()'],
            ['input', '${1:x} = int(input())'],
        ],
    },
    java: {
        keywords: JAVA_KEYWORDS,
        functions: {},
        members: {
            'System.out': ['println(Object x)', 'print(Object x)', 'printf(String format, Object... args)'],
            'System': ['out', 'in', 'exit(int status)', 'currentTimeMillis()'],
            'Math': ['sqrt(double a)', 'abs(int a)', 'pow(double a, double b)', 'max(int a, int b)', 'min(int a, int b)',
                'round(double a)', 'floor(double a)', 'ceil(double a)', 'random()', 'PI'],
            'Integer': ['parseInt(String s)', 'valueOf(int i)', 'toString(int i)', 'MAX_VALUE', 'MIN_VALUE'],
            'Double': ['parseDouble(String s)', 'valueOf(double d)'],
            'String': ['valueOf(Object obj)', 'format(String format, Object... args)',
                'join(CharSequence delimiter, CharSequence... elements)'],
            'Arrays': ['sort(int[] a)', 'toString(int[] a)', 'fill(int[] a, int val)', 'asList(T... a)'],
            'Scanner': ['nextInt()', 'nextDouble()', 'nextLine()', 'next()', 'hasNext()', 'hasNextInt()', 'close()'],
            'string': JAVA_STRING,
            'ArrayList': JAVA_LIST,
            'List': JAVA_LIST,
        },
        // Scanner in = ..., String s = ..., ArrayList<Integer> list = ...: members of the variable's type.
        declaration: /\b(Scanner|String|ArrayList|List)\s*(?:<[^>;]*>)?\s+([A-Za-z_]\w*)/g,
        typeAlias: {String: 'string'},
        snippets: [
            ['main', 'public static void main(String[] args) {\n\t$0\n}'],
            ['class', 'public class ${1:Main} {\n\tpublic static void main(String[] args) {\n\t\t$0\n\t}\n}'],
            ['sout', 'System.out.println(${1:x});'],
            ['scanner', 'Scanner ${1:in} = new Scanner(System.in);'],
            ['for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}'],
            ['foreach', 'for (${1:int} ${2:x} : ${3:array}) {\n\t$0\n}'],
            ['while', 'while (${1:condition}) {\n\t$0\n}'],
            ['if', 'if (${1:condition}) {\n\t$0\n}'],
            ['ifelse', 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}'],
            ['try', 'try {\n\t$1\n} catch (${2:Exception} e) {\n\t$0\n}'],
        ],
    },
    csharp: {
        keywords: CS_KEYWORDS,
        functions: {},
        members: {
            'Console': ['WriteLine(object value)', 'Write(object value)', 'ReadLine()', 'ReadKey()', 'Clear()'],
            'Math': ['Sqrt(double d)', 'Abs(int value)', 'Pow(double x, double y)', 'Max(int a, int b)',
                'Min(int a, int b)', 'Round(double a, int digits)', 'Floor(double d)', 'Ceiling(double d)', 'PI'],
            'int': ['Parse(string s)', 'TryParse(string s, out int result)', 'MaxValue', 'MinValue'],
            'double': ['Parse(string s)', 'TryParse(string s, out double result)'],
            'Convert': ['ToInt32(object value)', 'ToDouble(object value)', 'ToString(object value)',
                'ToBoolean(object value)'],
            'String': ['Join(string separator, IEnumerable<string> values)', 'IsNullOrEmpty(string value)',
                'Format(string format, params object[] args)'],
            'Array': ['Sort(Array array)', 'Reverse(Array array)', 'IndexOf(Array array, object value)'],
            'File': ['ReadAllText(string path)', 'ReadAllLines(string path)', 'WriteAllText(string path, string contents)',
                'AppendAllText(string path, string contents)', 'Exists(string path)'],
            'string': CS_STRING,
            'List': CS_LIST,
        },
        declaration: /\b(string|List)\s*(?:<[^>;]*>)?\s+([A-Za-z_]\w*)/g,
        snippets: [
            ['main', 'static void Main(string[] args)\n{\n\t$0\n}'],
            ['cw', 'Console.WriteLine(${1:x});'],
            ['readint', 'int ${1:x} = int.Parse(Console.ReadLine());'],
            ['for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++)\n{\n\t$0\n}'],
            ['foreach', 'foreach (${1:var} ${2:item} in ${3:collection})\n{\n\t$0\n}'],
            ['while', 'while (${1:condition})\n{\n\t$0\n}'],
            ['if', 'if (${1:condition})\n{\n\t$0\n}'],
            ['ifelse', 'if (${1:condition})\n{\n\t$2\n}\nelse\n{\n\t$0\n}'],
            ['class', 'class ${1:Name}\n{\n\tpublic ${1:Name}()\n\t{\n\t\t$0\n\t}\n}'],
            ['prop', 'public ${1:int} ${2:Name} { get; set; }'],
            ['try', 'try\n{\n\t$1\n}\ncatch (${2:Exception} e)\n{\n\t$0\n}'],
        ],
    },
    javascript: {
        keywords: JS_KEYWORDS,
        functions: {
            global: ['parseInt(string, radix)', 'parseFloat(string)', 'isNaN(value)', 'Number(value)', 'String(value)',
                'require(id)'],
        },
        members: {
            'console': ['log(...data)', 'error(...data)'],
            'Math': ['sqrt(x)', 'abs(x)', 'pow(x, y)', 'max(...values)', 'min(...values)', 'round(x)', 'floor(x)',
                'ceil(x)', 'trunc(x)', 'random()', 'PI'],
            'Number': ['isInteger(value)', 'parseInt(string)', 'parseFloat(string)', 'MAX_SAFE_INTEGER'],
            'Array': ['from(arrayLike)', 'isArray(value)'],
            'Object': ['keys(obj)', 'values(obj)', 'entries(obj)'],
            'JSON': ['stringify(value)', 'parse(text)'],
            'process': ['stdin', 'stdout', 'exit(code)', 'argv'],
            'process.stdout': ['write(text)'],
        },
        snippets: [
            ['input', "const ${1:lines} = require('fs').readFileSync(0, 'utf8').split('\\n');"],
            ['log', 'console.log(${1:x});'],
            ['function', 'function ${1:name}(${2:params}) {\n\t$0\n}'],
            ['arrow', '(${1:params}) => ${0:{}}'],
            ['for', 'for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}'],
            ['forof', 'for (const ${1:x} of ${2:array}) {\n\t$0\n}'],
            ['while', 'while (${1:condition}) {\n\t$0\n}'],
            ['if', 'if (${1:condition}) {\n\t$0\n}'],
            ['ifelse', 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}'],
            ['class', 'class ${1:Name} {\n\tconstructor(${2}) {\n\t\t$0\n\t}\n}'],
        ],
    },
    pascal: {
        keywords: PAS_KEYWORDS,
        functions: {
            system: ['writeln(args)', 'write(args)', 'readln(var args)', 'read(var args)', 'abs(x)', 'sqr(x)', 'sqrt(x)',
                'round(x)', 'trunc(x)', 'odd(x)', 'ord(x)', 'chr(x)', 'length(s)', 'copy(s, index, count)',
                'pos(substr, s)', 'inc(var x)', 'dec(var x)', 'random(range)', 'randomize()', 'sin(x)', 'cos(x)',
                'ln(x)', 'exp(x)', 'upcase(c)', 'str(x, var s)', 'val(s, var x, var code)', 'high(x)', 'low(x)'],
        },
        members: {},
        snippets: [
            ['program', 'program ${1:Main};\n\nvar\n\t${2:x}: ${3:integer};\n\nbegin\n\t$0\nend.'],
            ['for', 'for ${1:i} := ${2:1} to ${3:n} do\nbegin\n\t$0\nend;'],
            ['while', 'while ${1:condition} do\nbegin\n\t$0\nend;'],
            ['repeat', 'repeat\n\t$0\nuntil ${1:condition};'],
            ['if', 'if ${1:condition} then\nbegin\n\t$0\nend;'],
            ['ifelse', 'if ${1:condition} then\nbegin\n\t$2\nend\nelse\nbegin\n\t$0\nend;'],
            ['procedure', 'procedure ${1:Name}(${2:x: integer});\nbegin\n\t$0\nend;'],
            ['function', 'function ${1:Name}(${2:x: integer}): ${3:integer};\nbegin\n\t$0\nend;'],
        ],
    },
    php: {
        keywords: PHP_KEYWORDS,
        functions: {
            core: ['echo', 'print(string $arg)', 'printf(string $format, mixed ...$values)', 'fgets(resource $stream)',
                'fscanf(resource $stream, string $format, mixed &...$vars)', 'trim(string $string)',
                'intval(mixed $value)', 'floatval(mixed $value)', 'strlen(string $string)', 'count(array $value)',
                'explode(string $separator, string $string)', 'implode(string $separator, array $array)',
                'str_repeat(string $string, int $times)', 'strtoupper(string $string)', 'strtolower(string $string)',
                'substr(string $string, int $offset, ?int $length = null)', 'strpos(string $haystack, string $needle)',
                'str_replace(mixed $search, mixed $replace, mixed $subject)', 'sprintf(string $format, mixed ...$values)',
                'number_format(float $num, int $decimals = 0)', 'abs(int|float $num)', 'sqrt(float $num)',
                'pow(mixed $num, mixed $exponent)', 'max(mixed ...$values)', 'min(mixed ...$values)',
                'round(int|float $num, int $precision = 0)', 'floor(int|float $num)', 'ceil(int|float $num)',
                'intdiv(int $num1, int $num2)', 'rand(int $min, int $max)', 'array_sum(array $array)',
                'array_map(?callable $callback, array $array)', 'array_filter(array $array, ?callable $callback = null)',
                'in_array(mixed $needle, array $haystack)', 'sort(array &$array)', 'rsort(array &$array)',
                'array_push(array &$array, mixed ...$values)', 'array_keys(array $array)', 'range(mixed $start, mixed $end)',
                'var_dump(mixed $value)', 'print_r(mixed $value)', 'isset(mixed $var)', 'is_numeric(mixed $value)'],
        },
        members: {},
        snippets: [
            ['php', '<?php\n\n$0'],
            ['input', '\\$${1:n} = (int) trim(fgets(STDIN));'],
            ['for', 'for (\\$${1:i} = 0; \\$${1:i} < ${2:\\$n}; \\$${1:i}++) {\n\t$0\n}'],
            ['foreach', 'foreach (\\$${1:array} as \\$${2:x}) {\n\t$0\n}'],
            ['while', 'while (${1:condition}) {\n\t$0\n}'],
            ['if', 'if (${1:condition}) {\n\t$0\n}'],
            ['ifelse', 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}'],
            ['function', 'function ${1:name}(${2:\\$x}) {\n\t$0\n}'],
        ],
    },
};
