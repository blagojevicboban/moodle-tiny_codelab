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
 * Templates of the CodeLab dialog: small complete programs of school programming (reading an array, sorting, binary
 * search, a matrix, records, recursion) for each language, with an input that fits them. The names of the templates
 * are lang strings tpl_<key>; the code itself is the same in every language of the interface.
 *
 * @module     tiny_codelab/codetemplates
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Order of the templates in the list. */
export const TEMPLATE_KEYS = ['readarray', 'bubble', 'binary', 'matrix', 'record', 'recursion'];

const ARRAY_IN = '5\n3 8 1 9 4\n';
const BINARY_IN = '7\n2 5 8 12 16 23 38\n16\n';
const MATRIX_IN = '2 3\n1 2 3\n4 5 6\n';

/** @type {Object<string, Object<string, {code: string, stdin: string}>>} */
export const TEMPLATES = {
    c: {
        readarray: {stdin: ARRAY_IN, code: String.raw`#include <stdio.h>

int main(void)
{
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    int sum = 0, min = a[0], max = a[0];
    for (int i = 0; i < n; i++) {
        sum += a[i];
        if (a[i] < min) {
            min = a[i];
        }
        if (a[i] > max) {
            max = a[i];
        }
    }
    printf("%d %d %d\n", sum, min, max);
    return 0;
}
`},
        bubble: {stdin: ARRAY_IN, code: String.raw`#include <stdio.h>

int main(void)
{
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\n");
    return 0;
}
`},
        binary: {stdin: BINARY_IN, code: String.raw`#include <stdio.h>

int main(void)
{
    int n, x;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    scanf("%d", &x);
    int low = 0, high = n - 1, found = -1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (a[mid] == x) {
            found = mid;
            break;
        } else if (a[mid] < x) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    printf("%d\n", found);
    return 0;
}
`},
        matrix: {stdin: MATRIX_IN, code: String.raw`#include <stdio.h>

int main(void)
{
    int rows, cols;
    scanf("%d %d", &rows, &cols);
    int m[10][10];
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            scanf("%d", &m[i][j]);
        }
    }
    for (int i = 0; i < rows; i++) {
        int sum = 0;
        for (int j = 0; j < cols; j++) {
            sum += m[i][j];
        }
        printf("%d\n", sum);
    }
    return 0;
}
`},
        record: {stdin: '', code: String.raw`#include <stdio.h>

struct student {
    char name[20];
    double grade;
};

int main(void)
{
    struct student s[3] = {{"Ana", 4.5}, {"Marko", 3.8}, {"Jelena", 4.9}};
    int best = 0;
    for (int i = 1; i < 3; i++) {
        if (s[i].grade > s[best].grade) {
            best = i;
        }
    }
    printf("%s %.1f\n", s[best].name, s[best].grade);
    return 0;
}
`},
        recursion: {stdin: '5\n', code: String.raw`#include <stdio.h>

long factorial(int n)
{
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main(void)
{
    int n;
    scanf("%d", &n);
    printf("%ld\n", factorial(n));
    return 0;
}
`},
    },
    cpp: {
        readarray: {stdin: ARRAY_IN, code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main()
{
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    int sum = 0, mn = a[0], mx = a[0];
    for (int x : a) {
        sum += x;
        mn = min(mn, x);
        mx = max(mx, x);
    }
    cout << sum << " " << mn << " " << mx << endl;
    return 0;
}
`},
        bubble: {stdin: ARRAY_IN, code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main()
{
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
            }
        }
    }
    for (int x : a) {
        cout << x << " ";
    }
    cout << endl;
    return 0;
}
`},
        binary: {stdin: BINARY_IN, code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main()
{
    int n, x;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    cin >> x;
    int low = 0, high = n - 1, found = -1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (a[mid] == x) {
            found = mid;
            break;
        } else if (a[mid] < x) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    cout << found << endl;
    return 0;
}
`},
        matrix: {stdin: MATRIX_IN, code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main()
{
    int rows, cols;
    cin >> rows >> cols;
    vector<vector<int>> m(rows, vector<int>(cols));
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            cin >> m[i][j];
        }
    }
    for (int i = 0; i < rows; i++) {
        int sum = 0;
        for (int j = 0; j < cols; j++) {
            sum += m[i][j];
        }
        cout << sum << endl;
    }
    return 0;
}
`},
        record: {stdin: '', code: String.raw`#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Student {
    string name;
    double grade;
};

int main()
{
    vector<Student> s = {{"Ana", 4.5}, {"Marko", 3.8}, {"Jelena", 4.9}};
    Student best = s[0];
    for (const Student &x : s) {
        if (x.grade > best.grade) {
            best = x;
        }
    }
    cout << best.name << " " << best.grade << endl;
    return 0;
}
`},
        recursion: {stdin: '5\n', code: String.raw`#include <iostream>
using namespace std;

long long factorial(int n)
{
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main()
{
    int n;
    cin >> n;
    cout << factorial(n) << endl;
    return 0;
}
`},
    },
    python: {
        readarray: {stdin: ARRAY_IN, code: String.raw`n = int(input())
a = list(map(int, input().split()))
print(sum(a), min(a), max(a))
`},
        bubble: {stdin: ARRAY_IN, code: String.raw`n = int(input())
a = list(map(int, input().split()))
for i in range(n - 1):
    for j in range(n - 1 - i):
        if a[j] > a[j + 1]:
            a[j], a[j + 1] = a[j + 1], a[j]
print(*a)
`},
        binary: {stdin: BINARY_IN, code: String.raw`n = int(input())
a = list(map(int, input().split()))
x = int(input())
low, high, found = 0, n - 1, -1
while low <= high:
    mid = (low + high) // 2
    if a[mid] == x:
        found = mid
        break
    elif a[mid] < x:
        low = mid + 1
    else:
        high = mid - 1
print(found)
`},
        matrix: {stdin: MATRIX_IN, code: String.raw`rows, cols = map(int, input().split())
m = [list(map(int, input().split())) for _ in range(rows)]
for row in m:
    print(sum(row))
`},
        record: {stdin: '', code: String.raw`class Student:
    def __init__(self, name, grade):
        self.name = name
        self.grade = grade


students = [Student("Ana", 4.5), Student("Marko", 3.8), Student("Jelena", 4.9)]
best = max(students, key=lambda s: s.grade)
print(best.name, best.grade)
`},
        recursion: {stdin: '5\n', code: String.raw`def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)


n = int(input())
print(factorial(n))
`},
    },
    java: {
        readarray: {stdin: ARRAY_IN, code: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) {
            a[i] = in.nextInt();
        }
        int sum = 0, min = a[0], max = a[0];
        for (int x : a) {
            sum += x;
            min = Math.min(min, x);
            max = Math.max(max, x);
        }
        System.out.println(sum + " " + min + " " + max);
    }
}
`},
        bubble: {stdin: ARRAY_IN, code: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) {
            a[i] = in.nextInt();
        }
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }
        StringBuilder out = new StringBuilder();
        for (int x : a) {
            out.append(x).append(' ');
        }
        System.out.println(out.toString().trim());
    }
}
`},
        binary: {stdin: BINARY_IN, code: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) {
            a[i] = in.nextInt();
        }
        int x = in.nextInt();
        int low = 0, high = n - 1, found = -1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (a[mid] == x) {
                found = mid;
                break;
            } else if (a[mid] < x) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        System.out.println(found);
    }
}
`},
        matrix: {stdin: MATRIX_IN, code: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int rows = in.nextInt(), cols = in.nextInt();
        int[][] m = new int[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                m[i][j] = in.nextInt();
            }
        }
        for (int[] row : m) {
            int sum = 0;
            for (int x : row) {
                sum += x;
            }
            System.out.println(sum);
        }
    }
}
`},
        record: {stdin: '', code: String.raw`public class Main {
    static class Student {
        String name;
        double grade;

        Student(String name, double grade) {
            this.name = name;
            this.grade = grade;
        }
    }

    public static void main(String[] args) {
        Student[] s = {new Student("Ana", 4.5), new Student("Marko", 3.8), new Student("Jelena", 4.9)};
        Student best = s[0];
        for (Student x : s) {
            if (x.grade > best.grade) {
                best = x;
            }
        }
        System.out.println(best.name + " " + best.grade);
    }
}
`},
        recursion: {stdin: '5\n', code: String.raw`import java.util.Scanner;

public class Main {
    static long factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        System.out.println(factorial(n));
    }
}
`},
    },
    csharp: {
        readarray: {stdin: ARRAY_IN, code: String.raw`using System;
using System.Linq;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        int[] a = Console.ReadLine().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
        Console.WriteLine($"{a.Sum()} {a.Min()} {a.Max()}");
    }
}
`},
        bubble: {stdin: ARRAY_IN, code: String.raw`using System;
using System.Linq;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        int[] a = Console.ReadLine().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
        for (int i = 0; i < n - 1; i++)
        {
            for (int j = 0; j < n - 1 - i; j++)
            {
                if (a[j] > a[j + 1])
                {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }
        Console.WriteLine(string.Join(" ", a));
    }
}
`},
        binary: {stdin: BINARY_IN, code: String.raw`using System;
using System.Linq;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        int[] a = Console.ReadLine().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
        int x = int.Parse(Console.ReadLine());
        int low = 0, high = n - 1, found = -1;
        while (low <= high)
        {
            int mid = (low + high) / 2;
            if (a[mid] == x)
            {
                found = mid;
                break;
            }
            else if (a[mid] < x)
            {
                low = mid + 1;
            }
            else
            {
                high = mid - 1;
            }
        }
        Console.WriteLine(found);
    }
}
`},
        matrix: {stdin: MATRIX_IN, code: String.raw`using System;
using System.Linq;

class Program
{
    static void Main()
    {
        int[] size = Console.ReadLine().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
        int rows = size[0], cols = size[1];
        int[,] m = new int[rows, cols];
        for (int i = 0; i < rows; i++)
        {
            int[] row = Console.ReadLine().Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
            for (int j = 0; j < cols; j++)
            {
                m[i, j] = row[j];
            }
        }
        for (int i = 0; i < rows; i++)
        {
            int sum = 0;
            for (int j = 0; j < cols; j++)
            {
                sum += m[i, j];
            }
            Console.WriteLine(sum);
        }
    }
}
`},
        record: {stdin: '', code: String.raw`using System;

class Student
{
    public string Name;
    public double Grade;

    public Student(string name, double grade)
    {
        Name = name;
        Grade = grade;
    }
}

class Program
{
    static void Main()
    {
        Student[] s = { new Student("Ana", 4.5), new Student("Marko", 3.8), new Student("Jelena", 4.9) };
        Student best = s[0];
        foreach (Student x in s)
        {
            if (x.Grade > best.Grade)
            {
                best = x;
            }
        }
        Console.WriteLine(best.Name + " " + best.Grade);
    }
}
`},
        recursion: {stdin: '5\n', code: String.raw`using System;

class Program
{
    static long Factorial(int n)
    {
        if (n <= 1)
        {
            return 1;
        }
        return n * Factorial(n - 1);
    }

    static void Main()
    {
        int n = int.Parse(Console.ReadLine());
        Console.WriteLine(Factorial(n));
    }
}
`},
    },
    javascript: {
        readarray: {stdin: ARRAY_IN, code: String.raw`const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const a = lines[1].trim().split(/\s+/).slice(0, n).map(Number);
const sum = a.reduce((s, x) => s + x, 0);
console.log(sum, Math.min(...a), Math.max(...a));
`},
        recursion: {stdin: '5\n', code: String.raw`const n = Number(require('fs').readFileSync(0, 'utf8').trim());

function factorial(k) {
    if (k <= 1) {
        return 1;
    }
    return k * factorial(k - 1);
}

console.log(factorial(n));
`},
    },
    php: {
        readarray: {stdin: ARRAY_IN, code: String.raw`<?php
$n = (int) trim(fgets(STDIN));
$a = array_map('intval', preg_split('/\s+/', trim(fgets(STDIN))));
echo array_sum($a), " ", min($a), " ", max($a), "\n";
`},
        recursion: {stdin: '5\n', code: String.raw`<?php
function factorial($n)
{
    if ($n <= 1) {
        return 1;
    }
    return $n * factorial($n - 1);
}

$n = (int) trim(fgets(STDIN));
echo factorial($n), "\n";
`},
    },
    pascal: {
        readarray: {stdin: ARRAY_IN, code: String.raw`program ReadArray;

var
    a: array[1..100] of integer;
    n, i, sum, min, max: integer;

begin
    readln(n);
    for i := 1 to n do
        read(a[i]);
    sum := 0;
    min := a[1];
    max := a[1];
    for i := 1 to n do
    begin
        sum := sum + a[i];
        if a[i] < min then
            min := a[i];
        if a[i] > max then
            max := a[i];
    end;
    writeln(sum, ' ', min, ' ', max);
end.
`},
        recursion: {stdin: '5\n', code: String.raw`program Factorial;

function fact(n: integer): longint;
begin
    if n <= 1 then
        fact := 1
    else
        fact := n * fact(n - 1);
end;

var
    n: integer;

begin
    readln(n);
    writeln(fact(n));
end.
`},
    },
};

/**
 * The templates of a language, in their order.
 *
 * @param {string} lang
 * @returns {Array<{key: string, code: string, stdin: string}>}
 */
export const templatesFor = (lang) => TEMPLATE_KEYS.filter((key) => TEMPLATES[lang]?.[key])
    .map((key) => ({key, ...TEMPLATES[lang][key]}));
