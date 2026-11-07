// Practice problems written by RMS Careers for the first weeks of the Pattern Path (syllabus DSA Labs 1-3, 8, 10
// and 20). Unlike the problem bank, these have no LeetCode page, so each record carries its own full statement,
// examples and constraints, and no externalUrl. Slugs never collide with LeetCode slugs. Keep slugs stable: they key
// student progress and XP rewards.
import type { DSAQuestion, Difficulty } from '@/lib/types/dsa';

interface RmsProblemInput {
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  problemStatement: string;
  examples: DSAQuestion['examples'];
  constraints: string[];
  hints: [string, string];
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
}

function rmsProblem(input: RmsProblemInput): DSAQuestion {
  return { id: `q-${input.slug}`, ...input };
}

export const RMS_PRACTICE_QUESTIONS: DSAQuestion[] = [
  rmsProblem({
    slug: 'largest-of-three-numbers',
    title: 'Largest of Three Numbers',
    difficulty: 'easy',
    pattern: 'Basics',
    problemStatement:
      'Read three integers a, b and c and print the largest of them. If two or more are equal and largest, print that value once.',
    examples: [
      { input: 'a = 4, b = 9, c = 2', output: '9' },
      { input: 'a = -3, b = -7, c = -3', output: '-3', explanation: 'Two values tie for the largest; print it once.' }
    ],
    constraints: ['-10^9 <= a, b, c <= 10^9', 'Do not use a built-in max function for the first version.'],
    hints: [
      'Compare a with b first, then compare the winner with c.',
      'Use >= rather than > so ties do not fall through every branch.'
    ],
    approach:
      'Keep the first number as the best so far, then replace it whenever a later number is larger. The same "best so far" idea returns in Week 4 arrays.',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)'
  }),
  rmsProblem({
    slug: 'sum-and-reverse-of-digits',
    title: 'Sum and Reverse of Digits',
    difficulty: 'easy',
    pattern: 'Basics',
    problemStatement:
      'Read a non-negative integer n. Print the sum of its digits and the number formed by its digits in reverse order, without converting n to a string.',
    examples: [
      { input: 'n = 4072', output: 'sum = 13, reverse = 2704' },
      { input: 'n = 1200', output: 'sum = 3, reverse = 21', explanation: 'Leading zeros of the reverse disappear.' }
    ],
    constraints: ['0 <= n <= 10^9', 'Use arithmetic (% and //), not string functions.'],
    hints: ['n % 10 is the last digit; n // 10 removes it.', 'Build the reverse with reverse = reverse * 10 + digit.'],
    approach:
      'Loop while n > 0: take the last digit, add it to the sum, append it to the reverse, then drop it from n. Handle n = 0 separately.',
    timeComplexity: 'O(number of digits)',
    spaceComplexity: 'O(1)'
  }),
  rmsProblem({
    slug: 'star-and-number-pyramids',
    title: 'Star and Number Pyramids',
    difficulty: 'easy',
    pattern: 'Basics',
    problemStatement:
      'Read a height n and print five patterns, each n rows tall: (1) a right-angled star triangle, (2) the same triangle upside down, (3) a centred star pyramid, (4) rows of increasing numbers 1, 1 2, 1 2 3, ..., (5) Floyd\'s triangle of consecutive numbers.',
    examples: [
      { input: 'n = 3, pattern 1', output: '*\n**\n***' },
      { input: 'n = 3, pattern 3', output: '  *\n ***\n*****' },
      { input: 'n = 3, pattern 5', output: '1\n2 3\n4 5 6' }
    ],
    constraints: ['1 <= n <= 20', 'Build each line with loops, not by multiplying strings, for at least one pattern.'],
    hints: [
      'The outer loop picks the row; the inner loop prints that row, and its length depends on the row number.',
      'For the centred pyramid, row i has n - i spaces and 2i - 1 stars.'
    ],
    approach:
      'For each pattern write the number of spaces and symbols on row i as a formula in i and n, then loop. These row-dependent nested loops are the O(n^2) shape analysed in Week 3.',
    timeComplexity: 'O(n^2)',
    spaceComplexity: 'O(1)'
  }),
  rmsProblem({
    slug: 'gcd-and-lcm',
    title: 'GCD and LCM (Euclid)',
    difficulty: 'easy',
    pattern: 'Math & Geometry',
    problemStatement:
      'Read two positive integers a and b. Print their greatest common divisor (GCD) and least common multiple (LCM), computing the GCD with Euclid\'s algorithm.',
    examples: [
      { input: 'a = 12, b = 18', output: 'gcd = 6, lcm = 36' },
      { input: 'a = 7, b = 5', output: 'gcd = 1, lcm = 35' }
    ],
    constraints: ['1 <= a, b <= 10^9', 'Do not use math.gcd.'],
    hints: ['gcd(a, b) = gcd(b, a % b), and gcd(a, 0) = a.', 'lcm(a, b) = a // gcd(a, b) * b (divide first to keep numbers small).'],
    approach:
      'Repeat (a, b) = (b, a % b) until b is 0; a is the GCD. Then compute the LCM from the GCD. Compare with trying every divisor up to min(a, b).',
    timeComplexity: 'O(log min(a, b))',
    spaceComplexity: 'O(1)'
  }),
  rmsProblem({
    slug: 'armstrong-numbers',
    title: 'Armstrong Numbers',
    difficulty: 'easy',
    pattern: 'Math & Geometry',
    problemStatement:
      'A number with k digits is an Armstrong number when the sum of each digit raised to the power k equals the number (153 = 1^3 + 5^3 + 3^3). Print every Armstrong number from 1 to n.',
    examples: [
      { input: 'n = 200', output: '1 2 3 4 5 6 7 8 9 153' },
      { input: 'n = 500', output: '1 2 3 4 5 6 7 8 9 153 370 371 407' }
    ],
    constraints: ['1 <= n <= 10^6'],
    hints: ['Count the digits first: k is needed before summing.', 'Reuse the digit loop from Sum and Reverse of Digits.'],
    approach:
      'For each number, count its digits k, then sum digit^k with the digit loop and compare with the number.',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(1)'
  }),
  rmsProblem({
    slug: 'big-o-snippet-drill',
    title: 'Big-O Snippet Drill',
    difficulty: 'easy',
    pattern: 'Complexity Analysis',
    problemStatement:
      'For each of the ten code snippets in the examples, state its time complexity in Big-O terms and give a one-line reason. Write your answers in your notes before opening the expected answers below each snippet.',
    examples: [
      { input: 'for i in range(n): total += i', output: 'O(n)', explanation: 'One loop of n steps.' },
      { input: 'for i in range(n):\n    for j in range(n): count += 1', output: 'O(n^2)', explanation: 'n steps inside n steps.' },
      { input: 'for i in range(n):\n    for j in range(i): count += 1', output: 'O(n^2)', explanation: '0 + 1 + ... + (n - 1) = n(n - 1)/2 steps: the pyramid shape.' },
      { input: 'i = 1\nwhile i < n: i *= 2', output: 'O(log n)', explanation: 'i doubles, so it reaches n after log2(n) steps.' },
      { input: 'while n > 0: n //= 10', output: 'O(log n)', explanation: 'One step per digit.' },
      { input: 'for i in range(n): pass\nfor j in range(n): pass', output: 'O(n)', explanation: 'Two loops one after the other add up: 2n is O(n).' },
      { input: 'for i in range(100): print(i)', output: 'O(1)', explanation: 'The work does not grow with n.' },
      { input: 'for i in range(n):\n    j = 1\n    while j < n: j *= 2', output: 'O(n log n)', explanation: 'A log n loop inside an n loop.' },
      { input: 'if x in my_list: ...', output: 'O(n)', explanation: 'Searching a list checks items one by one; the same check on a set is O(1) on average.' },
      { input: 'for i in range(n):\n    if i in seen_set: ...\n    seen_set.add(i)', output: 'O(n)', explanation: 'n set lookups and inserts, each O(1) on average.' }
    ],
    constraints: ['Give the tightest bound you can justify, and drop constants and smaller terms.'],
    hints: [
      'Count how many times the innermost line runs as a function of n.',
      'Loops one after another add; loops inside each other multiply.'
    ],
    approach:
      'For each snippet, write the number of times the innermost statement runs, simplify it, and keep the fastest-growing term.',
    timeComplexity: 'Not applicable (analysis exercise)',
    spaceComplexity: 'Not applicable (analysis exercise)'
  }),
  rmsProblem({
    slug: 'implement-sorting-algorithms',
    title: 'Implement Five Sorting Algorithms',
    difficulty: 'medium',
    pattern: 'Sorting',
    problemStatement:
      'Implement bubble sort, selection sort, insertion sort, merge sort and quick sort as functions that sort a list of integers in ascending order. Test each on an empty list, one element, an already-sorted list, a reversed list and a list with duplicates, then time all five on 5,000 random integers.',
    examples: [
      { input: '[5, 2, 9, 1, 5]', output: '[1, 2, 5, 5, 9]' },
      { input: '[]', output: '[]' }
    ],
    constraints: ['Do not use sorted() or list.sort() inside your implementations.', '0 <= length <= 10^5 for merge and quick sort.'],
    hints: [
      'Bubble, selection and insertion sort are nested loops (O(n^2)); merge and quick sort split the list (O(n log n) on average).',
      'Merge sort needs a merge step that walks two sorted halves with two pointers.'
    ],
    approach:
      'Write each algorithm, check it against sorted() on random inputs, then compare timings and explain the difference using their Big-O.',
    timeComplexity: 'O(n^2) for bubble, selection, insertion; O(n log n) for merge; O(n log n) average for quick',
    spaceComplexity: 'O(1) for the in-place ones; O(n) for merge sort'
  }),
  rmsProblem({
    slug: 'power-and-factorial-recursion',
    title: 'Power and Factorial with Recursion',
    difficulty: 'easy',
    pattern: 'Recursion',
    problemStatement:
      'Write recursive functions factorial(n), power(x, n) for a non-negative integer n, sum_digits(n) and fibonacci(n). For each, state the base case and the smaller call it trusts.',
    examples: [
      { input: 'factorial(5)', output: '120' },
      { input: 'power(2, 10)', output: '1024' },
      { input: 'sum_digits(4072)', output: '13' }
    ],
    constraints: ['0 <= n <= 20 for factorial and fibonacci', 'No loops inside these functions.'],
    hints: [
      'Every recursive function needs a case it can answer without recursing.',
      'Trust that the call on a smaller input is correct, and build the answer from it.'
    ],
    approach:
      'factorial(n) = n * factorial(n - 1) with factorial(0) = 1; power(x, n) = x * power(x, n - 1) with power(x, 0) = 1; draw the call tree for fibonacci(5) and count repeated calls, which motivates memoisation in Week 19.',
    timeComplexity: 'O(n) for factorial, power and sum_digits; O(2^n) for naive fibonacci',
    spaceComplexity: 'O(n) call stack'
  }),
  rmsProblem({
    slug: 'knapsack-0-1',
    title: '0/1 Knapsack',
    difficulty: 'medium',
    pattern: 'DP - 2D',
    problemStatement:
      'You have n items, each with a weight and a value, and a bag that holds at most W weight. Each item can be taken at most once. Find the largest total value that fits in the bag.',
    examples: [
      {
        input: 'weights = [1, 3, 4, 5], values = [1, 4, 5, 7], W = 7',
        output: '9',
        explanation: 'Take the items of weight 3 and 4 (values 4 + 5).'
      },
      { input: 'weights = [5], values = [10], W = 4', output: '0' }
    ],
    constraints: ['1 <= n <= 100', '1 <= W <= 10^4', '1 <= weight, value <= 10^4'],
    hints: [
      'For each item you either take it (if it fits) or skip it, like House Robber.',
      'dp[w] = best value with capacity w; loop w downwards so each item is used once.'
    ],
    approach:
      'dp[i][w] = max(dp[i - 1][w], value[i] + dp[i - 1][w - weight[i]]) when the item fits. Compress to one row by iterating w from W down to weight[i].',
    timeComplexity: 'O(n x W)',
    spaceComplexity: 'O(W)'
  })
];
