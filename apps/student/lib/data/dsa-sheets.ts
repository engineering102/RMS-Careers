// DSA Sheet: the DSA Practice catalog's original sheet, 150 problems in day-by-day roadmap order (source:
// LeetCode_150_Roadmap.xlsx). It replaced the earlier curated starter sheets; every problem from those is here under
// the same slug, so existing progress and XP carry over. Titles, difficulty, pattern and problem links come from the
// roadmap; summaries, hints, approaches and complexities are original RMS Careers write-ups. The full statement,
// examples and constraints live on LeetCode (externalUrl). Keep problem slugs stable: they key student progress and
// XP rewards.
import type { DSASheet, DSAQuestion } from '@/lib/types/dsa';
import { EXTRA_DSA_QUESTIONS } from './dsa-problem-bank';
import { CURATED_SHEET_DEFINITIONS, resolveSheet } from './dsa-curated-sheets';

export const DSA_SHEET: DSASheet = {
  id: 'sheet-dsa',
  slug: 'dsa-sheet',
  title: 'DSA Sheet',
  shortDescription: '150 core interview problems across 18 patterns, in day-by-day roadmap order.',
  category: 'general',
  description:
    'A structured path through 150 widely practised interview problems, grouped by pattern from arrays and hashing through trees, graphs and dynamic programming to bit manipulation. Each problem has a short summary, two hints, an approach outline and the target complexity; open it on LeetCode for the full statement, examples and constraints.',
  // About one focused hour per problem.
  estimatedHours: 150,
  patternCount: 18,
  questions: [
    {
      id: 'q-contains-duplicate',
      slug: 'contains-duplicate',
      title: 'Contains Duplicate',
      difficulty: 'easy',
      pattern: 'Arrays',
      problemStatement:
        'You get a list of integers. Report whether some value occurs more than once anywhere in the list; if every value is unique, report that instead.',
      examples: [],
      constraints: [],
      hints: [
        'Sorting puts equal values next to each other, but you can avoid the O(N log N) cost.',
        'Keep a set of values seen so far and stop the moment a value is already in it.'
      ],
      approach:
        'Scan once, inserting each value into a hash set. If a value is already present, a duplicate exists; if the scan finishes, all values are distinct.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/contains-duplicate/'
    },
    {
      id: 'q-product-of-array-except-self',
      slug: 'product-of-array-except-self',
      title: 'Product of Array Except Self',
      difficulty: 'medium',
      pattern: 'Arrays',
      problemStatement:
        'Given an integer array, build a new array where each position holds the product of all the other elements. Do it in linear time and without using division.',
      examples: [],
      constraints: [],
      hints: [
        'The answer at i is (product of everything left of i) times (product of everything right of i).',
        'You can store the left products in the output array, then sweep from the right with a running product.'
      ],
      approach:
        'Prefix/suffix products: first pass writes the running product of elements to the left of each index; second pass, right to left, multiplies in a running product of elements to the right.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) extra (output excluded)',
      externalUrl: 'https://leetcode.com/problems/product-of-array-except-self/'
    },
    {
      id: 'q-valid-sudoku',
      slug: 'valid-sudoku',
      title: 'Valid Sudoku',
      difficulty: 'medium',
      pattern: 'Arrays',
      problemStatement:
        'Check a partially filled 9x9 Sudoku grid. It is valid if no digit repeats within any row, any column, or any of the nine 3x3 boxes. Empty cells are ignored, and the grid does not need to be solvable.',
      examples: [],
      constraints: [],
      hints: [
        'Track which digits you have already seen for each row, column and box separately.',
        'The box for cell (r, c) can be numbered as (r / 3) * 3 + c / 3.'
      ],
      approach:
        'One pass over the 81 cells with 27 sets (9 rows, 9 columns, 9 boxes). For each filled cell, fail if its digit is already in its row, column or box set; otherwise record it.',
      timeComplexity: 'O(1) (fixed 81 cells)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/valid-sudoku/'
    },
    {
      id: 'q-valid-anagram',
      slug: 'valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'easy',
      pattern: 'Hashing',
      problemStatement:
        'Given two strings, decide whether one is a rearrangement of the other, meaning both contain exactly the same characters with the same counts.',
      examples: [],
      constraints: [],
      hints: [
        'Strings of different lengths can never be anagrams.',
        'Count characters in the first string and cancel them out with the second.'
      ],
      approach:
        'Frequency counting: increment counts for the first string and decrement for the second; the strings are anagrams exactly when every count ends at zero.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) for a fixed alphabet',
      externalUrl: 'https://leetcode.com/problems/valid-anagram/'
    },
    {
      id: 'q-two-sum',
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      pattern: 'Hashing',
      problemStatement:
        'You are given an integer array and a target value. Find two different positions whose values add up to the target and return those two indices. Exactly one such pair exists.',
      examples: [],
      constraints: [],
      hints: [
        'Checking every pair works but costs O(N^2).',
        'For each value, the partner you need is target minus that value. Can you look it up instantly?'
      ],
      approach:
        'Single-pass hash map from value to index: for each element, check whether its complement is already in the map; if so, return both indices, otherwise store the current element.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/two-sum/'
    },
    {
      id: 'q-group-anagrams',
      slug: 'group-anagrams',
      title: 'Group Anagrams',
      difficulty: 'medium',
      pattern: 'Hashing',
      problemStatement:
        'Given a list of words, collect the words that are anagrams of each other into groups and return all the groups in any order.',
      examples: [],
      constraints: [],
      hints: [
        'Anagrams share a canonical form, such as their letters in sorted order.',
        'Use that canonical form as a hash map key.'
      ],
      approach:
        "Map each word to a key (its sorted letters, or a 26-count signature) and append the word to the list stored under that key; the map's values are the groups.",
      timeComplexity: 'O(N * K log K), or O(N * K) with a count key',
      spaceComplexity: 'O(N * K)',
      externalUrl: 'https://leetcode.com/problems/group-anagrams/'
    },
    {
      id: 'q-top-k-frequent-elements',
      slug: 'top-k-frequent-elements',
      title: 'Top K Frequent Elements',
      difficulty: 'medium',
      pattern: 'Hashing',
      problemStatement:
        'Given an integer array and a number k, return the k values that appear most often. The answer is guaranteed to be unique and may be in any order.',
      examples: [],
      constraints: [],
      hints: [
        'Start by counting how often each value appears.',
        'Frequencies are at most N, so you can bucket values by frequency instead of sorting.'
      ],
      approach:
        'Count with a hash map, then place values into buckets indexed by frequency and read buckets from highest to lowest until k values are collected (a size-k min-heap also works in O(N log k)).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/top-k-frequent-elements/'
    },
    {
      id: 'q-longest-consecutive-sequence',
      slug: 'longest-consecutive-sequence',
      title: 'Longest Consecutive Sequence',
      difficulty: 'medium',
      pattern: 'Hashing',
      problemStatement:
        'Given an unsorted integer array, find the length of the longest run of consecutive integers (like 4, 5, 6, 7) that can be formed from its values. Aim for linear time.',
      examples: [],
      constraints: [],
      hints: [
        'Put all values in a hash set for O(1) membership checks.',
        'Only start counting from a value whose predecessor is not in the set.'
      ],
      approach:
        'Build a set; for each value that has no value-1 in the set, walk upward while value+1 exists and track the longest run. Each value is visited a constant number of times.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/longest-consecutive-sequence/'
    },
    {
      id: 'q-subarray-sum-equals-k',
      slug: 'subarray-sum-equals-k',
      title: 'Subarray Sum Equals K',
      difficulty: 'medium',
      pattern: 'Hashing',
      problemStatement:
        'Given an integer array (values may be negative) and a target k, count how many contiguous subarrays have elements that sum to exactly k.',
      examples: [],
      constraints: [],
      hints: [
        'The sum of a subarray (i, j] equals prefix[j] - prefix[i].',
        'While scanning, ask how many earlier prefix sums equal the current prefix minus k.'
      ],
      approach:
        'Prefix sums with a hash map of counts, seeded with {0: 1}: at each step add count[prefix - k] to the answer, then record the current prefix. A sliding window fails here because of negative numbers.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/subarray-sum-equals-k/'
    },
    {
      id: 'q-valid-palindrome',
      slug: 'valid-palindrome',
      title: 'Valid Palindrome',
      difficulty: 'easy',
      pattern: 'Two Pointers',
      problemStatement:
        'Decide whether a string reads the same forwards and backwards once you ignore every character that is not a letter or digit and treat uppercase and lowercase letters as equal.',
      examples: [],
      constraints: [],
      hints: [
        'You do not need to build a cleaned copy of the string.',
        'Move two indices toward each other, skipping non-alphanumeric characters.'
      ],
      approach:
        'Two pointers from both ends: skip characters that are not alphanumeric, compare the rest case-insensitively, and fail on the first mismatch.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/valid-palindrome/'
    },
    {
      id: 'q-two-sum-ii-sorted-array',
      slug: 'two-sum-ii-sorted-array',
      title: 'Two Sum II - Input Array Is Sorted',
      difficulty: 'medium',
      pattern: 'Two Pointers',
      problemStatement:
        'An integer array is already sorted in ascending order. Find two different elements that add up to a target and return their positions using 1-based indexing, using only constant extra space.',
      examples: [],
      constraints: [],
      hints: [
        'Because the array is sorted, the sum of the two ends tells you which end to move.',
        'Too small a sum means the left pointer must move right; too large means the right pointer moves left.'
      ],
      approach:
        'Two pointers at both ends: compare their sum with the target and move the left pointer up when the sum is too small, or the right pointer down when it is too big, until it matches.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/'
    },
    {
      id: 'q-sort-colors',
      slug: 'sort-colors',
      title: 'Sort Colors',
      difficulty: 'medium',
      pattern: 'Two Pointers',
      problemStatement:
        'An array contains only the values 0, 1 and 2. Sort it in place so all 0s come first, then 1s, then 2s, without using a library sort, ideally in a single pass.',
      examples: [],
      constraints: [],
      hints: [
        'Think of three regions: a zone of 0s at the front, 2s at the back, and an unknown middle.',
        'When you swap a 2 to the back, do not advance the scanning pointer, because the swapped-in value is still unexamined.'
      ],
      approach:
        'Dutch national flag partitioning with low, mid and high pointers: a 0 swaps to low (advance low and mid), a 1 just advances mid, and a 2 swaps to high (shrink high only).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/sort-colors/'
    },
    {
      id: 'q-3sum',
      slug: '3sum',
      title: '3Sum',
      difficulty: 'medium',
      pattern: 'Two Pointers',
      problemStatement:
        'Given an integer array, find every distinct triple of values (from three different positions) whose sum is zero. The result must not contain the same triple twice.',
      examples: [],
      constraints: [],
      hints: [
        'Sort the array first so duplicates sit next to each other.',
        'Fix one element, then solve a sorted two-sum on the rest with two pointers.'
      ],
      approach:
        'Sort, then for each index i (skipping repeated values) run two pointers on the remaining suffix to find pairs summing to -nums[i], skipping duplicates after each match.',
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(1) extra (ignoring sort and output)',
      externalUrl: 'https://leetcode.com/problems/3sum/'
    },
    {
      id: 'q-container-with-most-water',
      slug: 'container-with-most-water',
      title: 'Container With Most Water',
      difficulty: 'medium',
      pattern: 'Two Pointers',
      problemStatement:
        'You are given heights of vertical lines placed at equal spacing. Choose two lines that, together with the x-axis, hold the most water, and return that maximum area.',
      examples: [],
      constraints: [],
      hints: [
        'Area is the shorter height times the distance between the lines.',
        'Moving the taller line inward can never help, so always move the shorter one.'
      ],
      approach:
        'Two pointers at both ends: compute the area, record the maximum, then move whichever pointer has the shorter line inward.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/container-with-most-water/'
    },
    {
      id: 'q-trapping-rain-water',
      slug: 'trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: 'hard',
      pattern: 'Two Pointers',
      problemStatement:
        'An elevation map is given as an array of bar heights, each one unit wide. Work out how many units of rainwater stay trapped between the bars after it rains.',
      examples: [],
      constraints: [],
      hints: [
        'Water above a bar is min(highest bar to its left, highest bar to its right) minus its own height.',
        'You can avoid prefix arrays by moving two pointers and keeping the left and right maximums.'
      ],
      approach:
        'Two pointers with running leftMax and rightMax: always process the side with the smaller max, adding (max - height) for that position, then move that pointer inward.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/trapping-rain-water/'
    },
    {
      id: 'q-best-time-to-buy-and-sell-stock',
      slug: 'best-time-to-buy-and-sell-stock',
      title: 'Best Time to Buy and Sell Stock',
      difficulty: 'easy',
      pattern: 'Sliding Window',
      problemStatement:
        "You are given a stock's price for each day. Choose one day to buy and a later day to sell to make the biggest profit, and return that profit, or 0 if no profitable trade exists.",
      examples: [],
      constraints: [],
      hints: [
        'For each day, the best sale on that day uses the lowest price seen before it.',
        'One pass with a running minimum is enough.'
      ],
      approach:
        'Track the minimum price seen so far; on each day compute price - minimum and keep the largest such difference.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/'
    },
    {
      id: 'q-longest-substring-without-repeating-characters',
      slug: 'longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'medium',
      pattern: 'Sliding Window',
      problemStatement:
        'Find the length of the longest contiguous part of a string in which no character appears more than once.',
      examples: [],
      constraints: [],
      hints: [
        'Grow a window to the right and shrink it from the left whenever a character repeats.',
        "Remembering each character's last index lets you jump the left edge directly."
      ],
      approach:
        'Sliding window with a map of last-seen indices: when the current character was seen inside the window, move the left edge just past that position; track the maximum window length.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(min(N, alphabet size))',
      externalUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/'
    },
    {
      id: 'q-longest-repeating-character-replacement',
      slug: 'longest-repeating-character-replacement',
      title: 'Longest Repeating Character Replacement',
      difficulty: 'medium',
      pattern: 'Sliding Window',
      problemStatement:
        'Given an uppercase string and a number k, you may change at most k characters to any other uppercase letter. Return the length of the longest substring of identical letters you can produce.',
      examples: [],
      constraints: [],
      hints: [
        'A window is fixable if its length minus the count of its most frequent letter is at most k.',
        'The tracked maximum count never needs to decrease for the answer to stay correct.'
      ],
      approach:
        'Sliding window with letter counts and the best frequency seen: expand right, and while (window length - maxCount) > k, shrink from the left. The largest valid window is the answer.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) (26 letters)',
      externalUrl: 'https://leetcode.com/problems/longest-repeating-character-replacement/'
    },
    {
      id: 'q-permutation-in-string',
      slug: 'permutation-in-string',
      title: 'Permutation in String',
      difficulty: 'medium',
      pattern: 'Sliding Window',
      problemStatement:
        'Given strings s1 and s2, decide whether some contiguous substring of s2 is a rearrangement of s1.',
      examples: [],
      constraints: [],
      hints: [
        'Any matching substring has exactly the length of s1.',
        'Slide a fixed-size window over s2 and compare letter counts with those of s1.'
      ],
      approach:
        'Fixed-size sliding window with two 26-letter count arrays, updated as one character enters and one leaves; keeping a count of matching letters makes each comparison O(1).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/permutation-in-string/'
    },
    {
      id: 'q-find-all-anagrams-in-a-string',
      slug: 'find-all-anagrams-in-a-string',
      title: 'Find All Anagrams in a String',
      difficulty: 'medium',
      pattern: 'Sliding Window',
      problemStatement:
        'Given a string s and a pattern p, return every starting index in s where a substring of length |p| is an anagram of p.',
      examples: [],
      constraints: [],
      hints: [
        'This is the same window check as Permutation in String, but you collect every match.',
        'Maintain counts incrementally rather than recounting each window.'
      ],
      approach:
        "Slide a window of length |p| across s while maintaining character counts (or a 'still needed' counter), and record the window's start index whenever the counts match p's.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) for a fixed alphabet',
      externalUrl: 'https://leetcode.com/problems/find-all-anagrams-in-a-string/'
    },
    {
      id: 'q-minimum-window-substring',
      slug: 'minimum-window-substring',
      title: 'Minimum Window Substring',
      difficulty: 'hard',
      pattern: 'Sliding Window',
      problemStatement:
        'Given strings s and t, find the shortest contiguous substring of s that contains every character of t, counting repeats. Return an empty string if no such substring exists.',
      examples: [],
      constraints: [],
      hints: [
        'Expand the right edge until the window covers t, then shrink from the left as far as it stays valid.',
        'Track how many required characters are currently satisfied so each validity check is O(1).'
      ],
      approach:
        "Variable sliding window with required counts and a 'formed' counter: extend right; when every requirement is met, record the window and advance left while it remains valid.",
      timeComplexity: 'O(|s| + |t|)',
      spaceComplexity: 'O(alphabet size)',
      externalUrl: 'https://leetcode.com/problems/minimum-window-substring/'
    },
    {
      id: 'q-sliding-window-maximum',
      slug: 'sliding-window-maximum',
      title: 'Sliding Window Maximum',
      difficulty: 'hard',
      pattern: 'Sliding Window',
      problemStatement:
        'Given an array and a window size k, slide the window from left to right one step at a time and report the maximum value inside the window at each position.',
      examples: [],
      constraints: [],
      hints: [
        'A value smaller than a newer value to its right can never be a window maximum again.',
        'Keep candidate indices in a deque whose values are decreasing from front to back.'
      ],
      approach:
        'Monotonic deque of indices: pop from the back while the incoming value is larger, drop the front when it leaves the window, and read the front once the window reaches size k.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(k)',
      externalUrl: 'https://leetcode.com/problems/sliding-window-maximum/'
    },
    {
      id: 'q-valid-parentheses',
      slug: 'valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: 'easy',
      pattern: 'Stack',
      problemStatement:
        'A string contains only the bracket characters ( ) [ ] { }. Decide whether every bracket is closed by the same type of bracket in the correct nesting order.',
      examples: [],
      constraints: [],
      hints: [
        'The most recently opened bracket must be closed first.',
        'Push opening brackets; on a closing bracket, the top of the stack must be its partner.'
      ],
      approach:
        'Stack of opening brackets: push openers; for each closer, pop and check it matches. The string is valid if no mismatch occurs and the stack ends empty.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/valid-parentheses/'
    },
    {
      id: 'q-implement-queue-using-stacks',
      slug: 'implement-queue-using-stacks',
      title: 'Implement Queue using Stacks',
      difficulty: 'easy',
      pattern: 'Stack',
      problemStatement:
        'Build a first-in-first-out queue (push, pop, peek, empty) using only two stacks and their standard operations.',
      examples: [],
      constraints: [],
      hints: [
        "Reversing a stack's contents turns LIFO order into FIFO order.",
        'Only move elements from the input stack to the output stack when the output stack is empty.'
      ],
      approach:
        "Input and output stacks: push onto input; for pop and peek, refill output from input only when output is empty, then use output's top. Each element moves at most once.",
      timeComplexity: 'O(1) amortised per operation',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/implement-queue-using-stacks/'
    },
    {
      id: 'q-min-stack',
      slug: 'min-stack',
      title: 'Min Stack',
      difficulty: 'medium',
      pattern: 'Stack',
      problemStatement:
        'Design a stack that supports push, pop, top and returning the current minimum element, all in constant time.',
      examples: [],
      constraints: [],
      hints: [
        'The minimum can change after a pop, so you need history, not a single variable.',
        'Store, alongside each element, the minimum of the stack at the time it was pushed.'
      ],
      approach:
        'Keep a second stack (or pairs) holding the running minimum: on push store min(value, current min); pop both together; getMin reads the top of the minimum stack.',
      timeComplexity: 'O(1) per operation',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/min-stack/'
    },
    {
      id: 'q-evaluate-reverse-polish-notation',
      slug: 'evaluate-reverse-polish-notation',
      title: 'Evaluate Reverse Polish Notation',
      difficulty: 'medium',
      pattern: 'Stack',
      problemStatement:
        'Evaluate an arithmetic expression written in postfix form as a list of tokens (integers and + - * /). Division truncates toward zero, and the expression is always valid.',
      examples: [],
      constraints: [],
      hints: [
        'Operands appear before their operator.',
        'When you meet an operator, the two most recent operands are the ones it applies to.'
      ],
      approach:
        'Stack of numbers: push integers; on an operator pop b then a, push a op b (truncating division toward zero). The final stack top is the result.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/'
    },
    {
      id: 'q-daily-temperatures',
      slug: 'daily-temperatures',
      title: 'Daily Temperatures',
      difficulty: 'medium',
      pattern: 'Stack',
      problemStatement:
        'Given daily temperatures, return for each day how many days you must wait for a strictly warmer day, or 0 if no warmer day comes later.',
      examples: [],
      constraints: [],
      hints: [
        'Days that are still waiting for a warmer day form a decreasing sequence.',
        'When a warmer day arrives, it resolves every colder day waiting on the stack.'
      ],
      approach:
        'Monotonic decreasing stack of indices: for each day, pop every index with a lower temperature and set its answer to the index difference, then push the current day.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/daily-temperatures/'
    },
    {
      id: 'q-generate-parentheses',
      slug: 'generate-parentheses',
      title: 'Generate Parentheses',
      difficulty: 'medium',
      pattern: 'Stack',
      problemStatement: 'Given n, produce every string of n pairs of parentheses that is correctly balanced.',
      examples: [],
      constraints: [],
      hints: [
        'You may add an opening bracket while fewer than n have been used.',
        'You may add a closing bracket only while it would not exceed the number of open ones.'
      ],
      approach:
        "Backtracking with counts of opened and closed brackets: extend with '(' if open < n and with ')' if closed < open, recording strings that reach length 2n.",
      timeComplexity: 'O(4^n / sqrt(n)) (Catalan number of results)',
      spaceComplexity: 'O(n) recursion depth',
      externalUrl: 'https://leetcode.com/problems/generate-parentheses/'
    },
    {
      id: 'q-car-fleet',
      slug: 'car-fleet',
      title: 'Car Fleet',
      difficulty: 'medium',
      pattern: 'Stack',
      problemStatement:
        'Cars on a one-lane road drive toward a target, each with a starting position and speed. A faster car that catches a slower one ahead then moves at the slower speed as a single fleet. Count how many fleets reach the target.',
      examples: [],
      constraints: [],
      hints: [
        'Compute the time each car would need to reach the target on its own.',
        'Process cars from closest to the target to farthest; a car that would arrive no later than the fleet ahead joins it.'
      ],
      approach:
        "Sort by position descending and compute arrival times; keep the arrival time of the current leading fleet and start a new fleet whenever a car's time is strictly greater.",
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/car-fleet/'
    },
    {
      id: 'q-largest-rectangle-in-histogram',
      slug: 'largest-rectangle-in-histogram',
      title: 'Largest Rectangle in Histogram',
      difficulty: 'hard',
      pattern: 'Stack',
      problemStatement:
        'Bars of width 1 have the given heights. Find the area of the largest rectangle that fits entirely within the histogram.',
      examples: [],
      constraints: [],
      hints: [
        'For each bar, the widest rectangle of its height spans until the first shorter bar on each side.',
        'A stack of increasing heights reveals those boundaries as you pop.'
      ],
      approach:
        'Monotonic increasing stack of indices: when a shorter bar arrives, pop taller bars and compute height * (current index - new stack top - 1); use a sentinel 0 at the end to flush the stack.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/largest-rectangle-in-histogram/'
    },
    {
      id: 'q-binary-search',
      slug: 'binary-search',
      title: 'Binary Search',
      difficulty: 'easy',
      pattern: 'Binary Search',
      problemStatement:
        'Search for a target in an ascending sorted array of distinct integers and return its index, or -1 if it is not present, in logarithmic time.',
      examples: [],
      constraints: [],
      hints: [
        'Compare the target with the middle element to discard half of the range.',
        'Compute the middle as lo + (hi - lo) / 2 to avoid overflow.'
      ],
      approach:
        'Classic binary search on [lo, hi]: return mid on a match, otherwise move lo to mid + 1 or hi to mid - 1 depending on the comparison.',
      timeComplexity: 'O(log N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/binary-search/'
    },
    {
      id: 'q-find-first-and-last-position-of-element-in-sorted-array',
      slug: 'find-first-and-last-position-of-element-in-sorted-array',
      title: 'Find First and Last Position in Sorted Array',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'In an ascending array that may contain duplicates, return the first and last index of a target value, or [-1, -1] if it does not occur, in logarithmic time.',
      examples: [],
      constraints: [],
      hints: [
        'Run binary search twice: once biased left, once biased right.',
        'On a match, record the index and keep searching toward the side you are looking for.'
      ],
      approach:
        'Two binary searches: a lower-bound search for the first index of target and an upper-bound search for the last, each continuing past a match in its chosen direction.',
      timeComplexity: 'O(log N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/'
    },
    {
      id: 'q-search-a-2d-matrix',
      slug: 'search-a-2d-matrix',
      title: 'Search a 2D Matrix',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'A matrix has rows sorted left to right, and each row starts with a value larger than the last value of the previous row. Determine whether a target value is present.',
      examples: [],
      constraints: [],
      hints: [
        'Read row by row, the matrix is one sorted list.',
        'Index k of that list is cell (k / columns, k % columns).'
      ],
      approach:
        'Binary search over the virtual flattened range [0, rows * cols - 1], converting each mid index to row and column.',
      timeComplexity: 'O(log(m * n))',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/search-a-2d-matrix/'
    },
    {
      id: 'q-koko-eating-bananas',
      slug: 'koko-eating-bananas',
      title: 'Koko Eating Bananas',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'There are piles of bananas and h hours. Each hour Koko picks one pile and eats up to k bananas from it. Find the smallest whole-number eating speed k that lets her finish every pile within h hours.',
      examples: [],
      constraints: [],
      hints: [
        'If a speed works, every faster speed works too, so the answer can be binary searched.',
        'At speed k, a pile of size p takes ceil(p / k) hours.'
      ],
      approach:
        'Binary search the speed over [1, max pile]: for each candidate compute total hours as the sum of ceil(p / k), and shrink toward the smallest speed that fits within h.',
      timeComplexity: 'O(N log M), M = largest pile',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/koko-eating-bananas/'
    },
    {
      id: 'q-find-minimum-in-rotated-sorted-array',
      slug: 'find-minimum-in-rotated-sorted-array',
      title: 'Find Minimum in Rotated Sorted Array',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'A sorted array of distinct values has been rotated at an unknown pivot. Find its minimum element in logarithmic time.',
      examples: [],
      constraints: [],
      hints: [
        'Compare the middle element with the rightmost element.',
        'If mid is greater than the right end, the minimum lies strictly to the right of mid.'
      ],
      approach:
        'Binary search: if nums[mid] > nums[hi], set lo = mid + 1; otherwise set hi = mid. When lo meets hi, it points at the minimum.',
      timeComplexity: 'O(log N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'
    },
    {
      id: 'q-search-in-rotated-sorted-array',
      slug: 'search-in-rotated-sorted-array',
      title: 'Search in Rotated Sorted Array',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'Search for a target in a sorted array of distinct values that has been rotated at an unknown pivot. Return its index or -1, in logarithmic time.',
      examples: [],
      constraints: [],
      hints: [
        'At any mid, at least one half of the range is sorted.',
        'Check whether the target lies within that sorted half to decide where to search.'
      ],
      approach:
        'Modified binary search: determine which half around mid is sorted, keep the half whose bounds contain the target, otherwise search the other half.',
      timeComplexity: 'O(log N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/'
    },
    {
      id: 'q-time-based-key-value-store',
      slug: 'time-based-key-value-store',
      title: 'Time Based Key-Value Store',
      difficulty: 'medium',
      pattern: 'Binary Search',
      problemStatement:
        'Design a store that keeps several timestamped values per key. set(key, value, timestamp) records a value; get(key, timestamp) returns the value with the largest timestamp not exceeding the given one, or an empty string.',
      examples: [],
      constraints: [],
      hints: [
        "Timestamps for a key arrive in increasing order, so each key's list stays sorted.",
        'A get is then a binary search for the rightmost timestamp <= the query.'
      ],
      approach:
        'Hash map from key to a list of (timestamp, value) pairs appended in order; answer get with an upper-bound binary search on that list.',
      timeComplexity: 'set O(1), get O(log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/time-based-key-value-store/'
    },
    {
      id: 'q-median-of-two-sorted-arrays',
      slug: 'median-of-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: 'hard',
      pattern: 'Binary Search',
      problemStatement:
        'Given two sorted arrays, return the median of all their elements combined, in logarithmic time with respect to the array sizes.',
      examples: [],
      constraints: [],
      hints: [
        'Split both arrays so the left halves together hold half of all elements.',
        'A split is correct when every value on the left is no larger than every value on the right; binary search the split in the shorter array.'
      ],
      approach:
        'Binary search a partition index in the smaller array, derive the other partition, and adjust until maxLeftA <= minRightB and maxLeftB <= minRightA; the median comes from the border values.',
      timeComplexity: 'O(log(min(m, n)))',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/'
    },
    {
      id: 'q-reverse-linked-list',
      slug: 'reverse-linked-list',
      title: 'Reverse Linked List',
      difficulty: 'easy',
      pattern: 'Linked List',
      problemStatement: 'Reverse a singly linked list so the last node becomes the head, and return the new head.',
      examples: [],
      constraints: [],
      hints: [
        'You need to remember the previous node before redirecting a pointer.',
        'Save the next node first so you do not lose the rest of the list.'
      ],
      approach:
        'Iterate with prev, curr and next pointers: store next, point curr back to prev, then advance prev and curr. prev ends as the new head.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/reverse-linked-list/'
    },
    {
      id: 'q-merge-two-sorted-lists',
      slug: 'merge-two-sorted-lists',
      title: 'Merge Two Sorted Lists',
      difficulty: 'easy',
      pattern: 'Linked List',
      problemStatement:
        'Combine two sorted linked lists into one sorted list by splicing their existing nodes together, and return the head of the result.',
      examples: [],
      constraints: [],
      hints: [
        'A dummy head node removes special cases for the first node.',
        'Repeatedly attach the smaller of the two current nodes.'
      ],
      approach:
        'Dummy node plus tail pointer: attach the smaller current node, advance in that list, and finally append whichever list still has nodes.',
      timeComplexity: 'O(N + M)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/'
    },
    {
      id: 'q-linked-list-cycle',
      slug: 'linked-list-cycle',
      title: 'Linked List Cycle',
      difficulty: 'easy',
      pattern: 'Linked List',
      problemStatement:
        'Decide whether a singly linked list contains a cycle, meaning following next pointers would eventually revisit a node.',
      examples: [],
      constraints: [],
      hints: [
        'A hash set of visited nodes works but uses extra memory.',
        'Two pointers moving at different speeds will meet only if there is a loop.'
      ],
      approach:
        "Floyd's tortoise and hare: slow moves one step and fast moves two. If fast reaches the end there is no cycle; if they meet, there is one.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/linked-list-cycle/'
    },
    {
      id: 'q-palindrome-linked-list',
      slug: 'palindrome-linked-list',
      title: 'Palindrome Linked List',
      difficulty: 'easy',
      pattern: 'Linked List',
      problemStatement:
        'Decide whether the values of a singly linked list read the same from head to tail as from tail to head.',
      examples: [],
      constraints: [],
      hints: [
        'Find the middle with slow and fast pointers.',
        'Reverse the second half and compare it with the first half.'
      ],
      approach:
        'Locate the middle, reverse the second half in place, compare the two halves node by node, and optionally restore the list afterwards.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/palindrome-linked-list/'
    },
    {
      id: 'q-reorder-list',
      slug: 'reorder-list',
      title: 'Reorder List',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'Rearrange a linked list in place from L0, L1, ..., Ln into the order L0, Ln, L1, Ln-1, L2, ..., changing links rather than node values.',
      examples: [],
      constraints: [],
      hints: [
        'The result interleaves the first half with the reversed second half.',
        'This combines three basic linked-list routines.'
      ],
      approach: 'Find the middle, reverse the second half, then merge the two halves by alternating nodes.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/reorder-list/'
    },
    {
      id: 'q-remove-nth-node-from-end-of-list',
      slug: 'remove-nth-node-from-end-of-list',
      title: 'Remove Nth Node From End of List',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'Remove the n-th node counted from the end of a linked list and return the head of the modified list, ideally in a single pass.',
      examples: [],
      constraints: [],
      hints: [
        'Move one pointer n steps ahead, then move both together.',
        'Starting from a dummy node handles removal of the head.'
      ],
      approach:
        'Two pointers separated by n nodes, starting at a dummy head: when the leading pointer hits the last node, the trailing pointer is just before the node to delete.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/'
    },
    {
      id: 'q-find-the-duplicate-number',
      slug: 'find-the-duplicate-number',
      title: 'Find the Duplicate Number',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'An array of n + 1 integers contains values in the range 1..n, so at least one value repeats; exactly one value is duplicated (possibly several times). Find it without modifying the array and using constant extra space.',
      examples: [],
      constraints: [],
      hints: [
        'Treat each value as a pointer to the index with that number.',
        'Following those pointers forms a linked list with a cycle whose entry is the duplicate.'
      ],
      approach:
        "Floyd's cycle detection on i -> nums[i]: find a meeting point with slow and fast pointers, then restart one pointer from the start and advance both one step until they meet at the duplicate.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/find-the-duplicate-number/'
    },
    {
      id: 'q-add-two-numbers',
      slug: 'add-two-numbers',
      title: 'Add Two Numbers',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'Two non-negative integers are stored as linked lists of digits in reverse order (least significant digit first). Return their sum as a linked list in the same format.',
      examples: [],
      constraints: [],
      hints: [
        'Add digit by digit like long addition, carrying into the next position.',
        'Do not forget a final carry after both lists end.'
      ],
      approach:
        'Walk both lists together with a carry: each new node holds (a + b + carry) % 10, and the carry becomes the sum / 10. Continue while either list or the carry remains.',
      timeComplexity: 'O(max(N, M))',
      spaceComplexity: 'O(max(N, M)) for the result',
      externalUrl: 'https://leetcode.com/problems/add-two-numbers/'
    },
    {
      id: 'q-copy-list-with-random-pointer',
      slug: 'copy-list-with-random-pointer',
      title: 'Copy List with Random Pointer',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'Each node of a linked list has a next pointer and a random pointer that may point to any node or be null. Build a deep copy whose nodes are all new but mirror both pointers.',
      examples: [],
      constraints: [],
      hints: [
        'A map from original node to its copy lets you wire both pointers.',
        'To avoid the map, interleave each copy right after its original.'
      ],
      approach:
        'Hash map approach: first pass creates a copy for every node; second pass sets copy.next = map[node.next] and copy.random = map[node.random]. (The interleaving trick achieves O(1) extra space.)',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N), or O(1) with interleaving',
      externalUrl: 'https://leetcode.com/problems/copy-list-with-random-pointer/'
    },
    {
      id: 'q-lru-cache',
      slug: 'lru-cache',
      title: 'LRU Cache',
      difficulty: 'medium',
      pattern: 'Linked List',
      problemStatement:
        'Design a fixed-capacity cache with get and put operations in O(1) time. When it is full and a new key arrives, evict the least recently used key.',
      examples: [],
      constraints: [],
      hints: ['You need O(1) lookup and O(1) reordering by recency.', 'Combine a hash map with a doubly linked list.'],
      approach:
        'Hash map from key to list node plus a doubly linked list ordered by recency: on access move the node to the front; on overflow remove the node at the back and its map entry.',
      timeComplexity: 'O(1) per operation',
      spaceComplexity: 'O(capacity)',
      externalUrl: 'https://leetcode.com/problems/lru-cache/'
    },
    {
      id: 'q-merge-k-sorted-lists',
      slug: 'merge-k-sorted-lists',
      title: 'Merge K Sorted Lists',
      difficulty: 'hard',
      pattern: 'Linked List',
      problemStatement: 'Merge k sorted linked lists into a single sorted linked list and return its head.',
      examples: [],
      constraints: [],
      hints: [
        'At every step the next node is the smallest of the k current heads.',
        'A min-heap gives you that smallest head quickly.'
      ],
      approach:
        "Push each list's head into a min-heap; repeatedly pop the smallest, append it to the result, and push its next node. Pairwise divide-and-conquer merging also works.",
      timeComplexity: 'O(N log k)',
      spaceComplexity: 'O(k)',
      externalUrl: 'https://leetcode.com/problems/merge-k-sorted-lists/'
    },
    {
      id: 'q-reverse-nodes-in-k-group',
      slug: 'reverse-nodes-in-k-group',
      title: 'Reverse Nodes in K-Group',
      difficulty: 'hard',
      pattern: 'Linked List',
      problemStatement:
        'Reverse the nodes of a linked list in consecutive groups of k; if fewer than k nodes remain at the end, leave them as they are. Only links may change, not node values.',
      examples: [],
      constraints: [],
      hints: [
        'Before reversing a group, check that k nodes actually remain.',
        "Track the node before each group so you can reconnect it to the reversed group's new head."
      ],
      approach:
        "Use a dummy head and a groupPrev pointer: find the k-th node, reverse the nodes between groupPrev.next and it, reconnect both ends, and move groupPrev to the group's new tail.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/reverse-nodes-in-k-group/'
    },
    {
      id: 'q-invert-binary-tree',
      slug: 'invert-binary-tree',
      title: 'Invert Binary Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement: 'Mirror a binary tree by swapping the left and right child of every node, and return the root.',
      examples: [],
      constraints: [],
      hints: [
        'Inverting a tree means inverting both subtrees and then swapping them.',
        "Any traversal order works as long as every node's children get swapped."
      ],
      approach:
        'Recursive DFS (or BFS with a queue): at each node swap its left and right children, then process both children.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H) recursion, H = tree height',
      externalUrl: 'https://leetcode.com/problems/invert-binary-tree/'
    },
    {
      id: 'q-maximum-depth-of-binary-tree',
      slug: 'maximum-depth-of-binary-tree',
      title: 'Maximum Depth of Binary Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement: 'Return the number of nodes on the longest path from the root down to a leaf of a binary tree.',
      examples: [],
      constraints: [],
      hints: ['The depth of a node is 1 plus the larger depth of its two subtrees.', 'An empty tree has depth 0.'],
      approach:
        'Recursive DFS returning 1 + max(depth(left), depth(right)); level-order BFS counting levels also works.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/'
    },
    {
      id: 'q-same-tree',
      slug: 'same-tree',
      title: 'Same Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement:
        'Decide whether two binary trees are identical: the same shape with the same value at every corresponding node.',
      examples: [],
      constraints: [],
      hints: [
        'Compare the roots, then compare the left subtrees and the right subtrees.',
        'Handle cases where one node is null and the other is not.'
      ],
      approach:
        'Recursive comparison: both null is true; exactly one null or different values is false; otherwise both subtree pairs must match.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/same-tree/'
    },
    {
      id: 'q-diameter-of-binary-tree',
      slug: 'diameter-of-binary-tree',
      title: 'Diameter of Binary Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement:
        'The diameter of a binary tree is the number of edges on the longest path between any two nodes; the path need not pass through the root. Compute it.',
      examples: [],
      constraints: [],
      hints: [
        'The longest path through a node is its left height plus its right height.',
        'Compute heights bottom-up and update a global best along the way.'
      ],
      approach:
        "Post-order DFS that returns each subtree's height while updating the answer with leftHeight + rightHeight at every node.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/diameter-of-binary-tree/'
    },
    {
      id: 'q-balanced-binary-tree',
      slug: 'balanced-binary-tree',
      title: 'Balanced Binary Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement:
        'A binary tree is height-balanced if at every node the heights of the two subtrees differ by at most one. Decide whether a given tree is balanced.',
      examples: [],
      constraints: [],
      hints: [
        'Checking the height separately at every node repeats work.',
        'Return a sentinel such as -1 as soon as an unbalanced subtree is found.'
      ],
      approach:
        'Single post-order DFS that returns the subtree height, or -1 to signal imbalance, propagating -1 upward immediately.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/balanced-binary-tree/'
    },
    {
      id: 'q-subtree-of-another-tree',
      slug: 'subtree-of-another-tree',
      title: 'Subtree of Another Tree',
      difficulty: 'easy',
      pattern: 'Trees',
      problemStatement:
        'Given binary trees root and subRoot, decide whether root contains a node whose entire subtree is identical in shape and values to subRoot.',
      examples: [],
      constraints: [],
      hints: ['At each node of root, ask whether the tree starting there equals subRoot.', 'Reuse a same-tree check.'],
      approach:
        'DFS over root; at each node run an isSameTree comparison against subRoot and return true on the first match. Serialising both trees and string matching is an O(N + M) alternative.',
      timeComplexity: 'O(N * M) (O(N + M) via serialisation)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/subtree-of-another-tree/'
    },
    {
      id: 'q-lowest-common-ancestor-of-a-binary-search-tree',
      slug: 'lowest-common-ancestor-of-a-binary-search-tree',
      title: 'Lowest Common Ancestor of a BST',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement:
        'In a binary search tree, find the lowest node that has both of two given nodes as descendants (a node counts as a descendant of itself).',
      examples: [],
      constraints: [],
      hints: [
        'Use the BST ordering instead of searching both subtrees.',
        'The answer is the first node whose value lies between the two targets.'
      ],
      approach:
        'Walk down from the root: if both values are smaller go left, if both are larger go right, otherwise the current node is the split point and the answer.',
      timeComplexity: 'O(H)',
      spaceComplexity: 'O(1) iterative',
      externalUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/'
    },
    {
      id: 'q-binary-tree-level-order-traversal',
      slug: 'binary-tree-level-order-traversal',
      title: 'Binary Tree Level Order Traversal',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement: 'Return the values of a binary tree level by level, left to right, as a list of lists.',
      examples: [],
      constraints: [],
      hints: [
        'A queue naturally processes nodes in breadth-first order.',
        "Record the queue's size at the start of each level so you know where the level ends."
      ],
      approach:
        'BFS with a queue: for each level pop exactly levelSize nodes, collect their values, and enqueue their children.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(W), W = maximum level width',
      externalUrl: 'https://leetcode.com/problems/binary-tree-level-order-traversal/'
    },
    {
      id: 'q-binary-tree-right-side-view',
      slug: 'binary-tree-right-side-view',
      title: 'Binary Tree Right Side View',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement:
        'Imagine standing to the right of a binary tree. Return the values of the nodes you can see, ordered from top to bottom.',
      examples: [],
      constraints: [],
      hints: [
        'You see exactly one node per level: the rightmost one.',
        'BFS level by level, or DFS visiting right children first.'
      ],
      approach:
        'Level-order BFS keeping the last node of each level, or DFS (right subtree first) that records a node when its depth is reached for the first time.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H) for DFS, O(W) for BFS',
      externalUrl: 'https://leetcode.com/problems/binary-tree-right-side-view/'
    },
    {
      id: 'q-count-good-nodes-in-binary-tree',
      slug: 'count-good-nodes-in-binary-tree',
      title: 'Count Good Nodes in Binary Tree',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement:
        'A node is good if no node on the path from the root to it has a greater value. Count the good nodes in a binary tree.',
      examples: [],
      constraints: [],
      hints: [
        'Pass the maximum value seen so far down each path.',
        'A node is good when its value is at least that running maximum.'
      ],
      approach:
        'DFS carrying maxSoFar: count the node if node.val >= maxSoFar, then recurse into both children with max(maxSoFar, node.val).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/count-good-nodes-in-binary-tree/'
    },
    {
      id: 'q-validate-binary-search-tree',
      slug: 'validate-binary-search-tree',
      title: 'Validate Binary Search Tree',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement:
        "Decide whether a binary tree is a valid binary search tree: every node's left subtree holds only smaller values, its right subtree only larger values, and both subtrees are themselves valid.",
      examples: [],
      constraints: [],
      hints: [
        'Comparing a node only with its children is not enough.',
        'Pass down the allowed (low, high) range for each subtree, or check that an in-order traversal is strictly increasing.'
      ],
      approach:
        'DFS with bounds: each node must lie strictly between low and high; recurse left with high = node.val and right with low = node.val.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/validate-binary-search-tree/'
    },
    {
      id: 'q-kth-smallest-element-in-a-bst',
      slug: 'kth-smallest-element-in-a-bst',
      title: 'Kth Smallest Element in a BST',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement: 'Return the k-th smallest value (1-indexed) in a binary search tree.',
      examples: [],
      constraints: [],
      hints: [
        'An in-order traversal of a BST visits values in ascending order.',
        'Stop as soon as you have visited k nodes.'
      ],
      approach:
        'Iterative in-order traversal with a stack, decrementing k at each visited node and returning when k reaches zero.',
      timeComplexity: 'O(H + k)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/'
    },
    {
      id: 'q-construct-binary-tree-from-preorder-and-inorder-traversal',
      slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
      title: 'Construct Binary Tree from Preorder and Inorder',
      difficulty: 'medium',
      pattern: 'Trees',
      problemStatement:
        'Rebuild a binary tree from its preorder and inorder traversals. All values in the tree are unique.',
      examples: [],
      constraints: [],
      hints: [
        'The first preorder value is the root.',
        "The root's position in the inorder list separates the left subtree from the right subtree."
      ],
      approach:
        'Recursion with a hash map of inorder indices: take the next preorder value as the root, split the inorder range at its index, and build the left and right subtrees in that order.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/'
    },
    {
      id: 'q-binary-tree-maximum-path-sum',
      slug: 'binary-tree-maximum-path-sum',
      title: 'Binary Tree Maximum Path Sum',
      difficulty: 'hard',
      pattern: 'Trees',
      problemStatement:
        'A path is any sequence of connected nodes, each used at most once, and it need not include the root. Find the largest possible sum of node values along a non-empty path. Values may be negative.',
      examples: [],
      constraints: [],
      hints: [
        'For each node, compute the best downward path starting there and ignore negative branches.',
        'A path can bend at a node, using both its left and right downward gains.'
      ],
      approach:
        'Post-order DFS returning node.val + max(0, left gain, right gain) upward, while updating a global best with node.val + max(0, left) + max(0, right).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(H)',
      externalUrl: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/'
    },
    {
      id: 'q-serialize-and-deserialize-binary-tree',
      slug: 'serialize-and-deserialize-binary-tree',
      title: 'Serialize and Deserialize Binary Tree',
      difficulty: 'hard',
      pattern: 'Trees',
      problemStatement:
        'Design a pair of functions: one turns a binary tree into a string, the other rebuilds exactly the same tree from that string.',
      examples: [],
      constraints: [],
      hints: [
        "Preorder traversal plus explicit null markers fully describes a tree's shape.",
        'When deserialising, consume tokens in the same order you produced them.'
      ],
      approach:
        "Serialise with preorder DFS writing values and a null marker (e.g. '#') separated by commas; deserialise by reading tokens recursively in the same preorder.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/'
    },
    {
      id: 'q-kth-largest-element-in-a-stream',
      slug: 'kth-largest-element-in-a-stream',
      title: 'Kth Largest Element in a Stream',
      difficulty: 'easy',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Design a class that receives numbers one at a time and, after each new number, returns the k-th largest value seen so far.',
      examples: [],
      constraints: [],
      hints: [
        'You only need to remember the k largest values.',
        'In a min-heap of size k, the top is the k-th largest.'
      ],
      approach:
        "Maintain a min-heap capped at size k: push each new value, pop when the size exceeds k, and return the heap's top.",
      timeComplexity: 'O(log k) per add',
      spaceComplexity: 'O(k)',
      externalUrl: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/'
    },
    {
      id: 'q-last-stone-weight',
      slug: 'last-stone-weight',
      title: 'Last Stone Weight',
      difficulty: 'easy',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Each turn, take the two heaviest stones and smash them together: equal stones both vanish, otherwise the lighter one vanishes and the heavier one keeps the difference. Return the weight of the last remaining stone, or 0 if none remain.',
      examples: [],
      constraints: [],
      hints: ['You repeatedly need the two largest values.', 'A max-heap gives you those in logarithmic time.'],
      approach:
        'Max-heap simulation: pop the two largest stones, push back their difference if it is non-zero, and repeat until at most one stone remains.',
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/last-stone-weight/'
    },
    {
      id: 'q-k-closest-points-to-origin',
      slug: 'k-closest-points-to-origin',
      title: 'K Closest Points to Origin',
      difficulty: 'medium',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Given points on a plane, return the k points closest to the origin (0, 0) using Euclidean distance. The answer may be in any order.',
      examples: [],
      constraints: [],
      hints: [
        'Compare squared distances; you never need the square root.',
        'Keep the k best candidates in a max-heap, or use quickselect.'
      ],
      approach:
        'Max-heap of size k keyed by squared distance: push each point and pop when the size exceeds k. Quickselect gives average O(N).',
      timeComplexity: 'O(N log k)',
      spaceComplexity: 'O(k)',
      externalUrl: 'https://leetcode.com/problems/k-closest-points-to-origin/'
    },
    {
      id: 'q-kth-largest-element-in-an-array',
      slug: 'kth-largest-element-in-an-array',
      title: 'Kth Largest Element in an Array',
      difficulty: 'medium',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Find the k-th largest element of an unsorted array (by sorted position, not k-th distinct value), ideally without fully sorting it.',
      examples: [],
      constraints: [],
      hints: [
        'A min-heap holding the k largest values works.',
        'Quickselect partitions around a pivot and recurses into only one side.'
      ],
      approach: 'Size-k min-heap whose top is the answer, or quickselect for average linear time.',
      timeComplexity: 'O(N log k), or O(N) average with quickselect',
      spaceComplexity: 'O(k), or O(1) for quickselect',
      externalUrl: 'https://leetcode.com/problems/kth-largest-element-in-an-array/'
    },
    {
      id: 'q-task-scheduler',
      slug: 'task-scheduler',
      title: 'Task Scheduler',
      difficulty: 'medium',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Tasks are letters, and each takes one time unit. Two identical tasks must be separated by at least n time units, which may be filled with other tasks or idle time. Find the minimum total time to finish every task.',
      examples: [],
      constraints: [],
      hints: [
        'The most frequent task determines the shape of the schedule.',
        'Lay it out as (maxCount - 1) blocks of size n + 1, plus the number of tasks that share the maximum count.'
      ],
      approach:
        'Formula: answer = max(total tasks, (maxCount - 1) * (n + 1) + numberOfTasksWithMaxCount). A max-heap simulation with a cooldown queue reaches the same result.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) (26 letters)',
      externalUrl: 'https://leetcode.com/problems/task-scheduler/'
    },
    {
      id: 'q-design-twitter',
      slug: 'design-twitter',
      title: 'Design Twitter',
      difficulty: 'medium',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Design a simplified social feed: users post tweets, follow and unfollow others, and request a news feed of the 10 most recent tweets from themselves and the people they follow.',
      examples: [],
      constraints: [],
      hints: [
        "Store each user's tweets with a global increasing timestamp.",
        "Building the feed is a k-way merge of the followed users' recent tweets."
      ],
      approach:
        "Hash maps for follows (sets) and tweets (lists of [time, id]); getNewsFeed pushes each followed user's latest tweet into a max-heap and pops up to 10, pushing that user's previous tweet each time.",
      timeComplexity: 'getNewsFeed O(F log F), F = users followed',
      spaceComplexity: 'O(users + tweets + follows)',
      externalUrl: 'https://leetcode.com/problems/design-twitter/'
    },
    {
      id: 'q-find-median-from-data-stream',
      slug: 'find-median-from-data-stream',
      title: 'Find Median from Data Stream',
      difficulty: 'hard',
      pattern: 'Heap / Priority Queue',
      problemStatement:
        'Design a structure that accepts numbers one at a time and can return the median of all numbers added so far at any moment.',
      examples: [],
      constraints: [],
      hints: [
        'Split the numbers into a lower half and an upper half.',
        'A max-heap for the lower half and a min-heap for the upper half expose the middle values.'
      ],
      approach:
        'Two heaps kept balanced (sizes differ by at most one): add to the lower max-heap, move its top to the upper min-heap, rebalance, and read the median from the heap tops.',
      timeComplexity: 'add O(log N), median O(1)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/find-median-from-data-stream/'
    },
    {
      id: 'q-subsets',
      slug: 'subsets',
      title: 'Subsets',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Given an array of distinct integers, return every possible subset (the power set), with no duplicate subsets.',
      examples: [],
      constraints: [],
      hints: ['Each element is either included or excluded.', 'Backtracking or bitmasks enumerate all 2^N choices.'],
      approach:
        'Backtracking: at each index, record the current subset, then for each later element add it, recurse and remove it again.',
      timeComplexity: 'O(N * 2^N)',
      spaceComplexity: 'O(N) recursion (excluding output)',
      externalUrl: 'https://leetcode.com/problems/subsets/'
    },
    {
      id: 'q-subsets-ii',
      slug: 'subsets-ii',
      title: 'Subsets II',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Return every distinct subset of an integer array that may contain duplicates; the result must not contain the same subset twice.',
      examples: [],
      constraints: [],
      hints: [
        'Sort the array so duplicates are adjacent.',
        'At one recursion depth, skip a value equal to the one just tried.'
      ],
      approach: 'Sort, then backtrack like Subsets, skipping index i when i > start and nums[i] == nums[i - 1].',
      timeComplexity: 'O(N * 2^N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/subsets-ii/'
    },
    {
      id: 'q-combination-sum',
      slug: 'combination-sum',
      title: 'Combination Sum',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Given distinct positive candidates and a target, return every unique combination of candidates that sums to the target. A candidate may be used any number of times.',
      examples: [],
      constraints: [],
      hints: [
        'After choosing a candidate you may choose it again, so recurse without advancing the index.',
        'Stop exploring a branch once the remaining target becomes negative.'
      ],
      approach:
        'Backtracking from a start index: subtract a candidate, recurse with the same start (allowing reuse), and record the path when the remainder reaches 0. Sorting enables early cut-offs.',
      timeComplexity: 'O(N^(T/M)), T = target, M = smallest candidate',
      spaceComplexity: 'O(T/M)',
      externalUrl: 'https://leetcode.com/problems/combination-sum/'
    },
    {
      id: 'q-combination-sum-ii',
      slug: 'combination-sum-ii',
      title: 'Combination Sum II',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Given candidates that may contain duplicates and a target, return every unique combination that sums to the target, using each candidate at most once.',
      examples: [],
      constraints: [],
      hints: [
        'Sort the candidates first.',
        'Skip duplicate values at the same recursion level, and advance the index after each choice.'
      ],
      approach:
        'Sort, then backtrack with start index i + 1 after choosing nums[i], skipping nums[i] when it equals nums[i - 1] at the same level, and pruning once a value exceeds the remaining target.',
      timeComplexity: 'O(2^N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/combination-sum-ii/'
    },
    {
      id: 'q-permutations',
      slug: 'permutations',
      title: 'Permutations',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement: 'Given an array of distinct integers, return every possible ordering of its elements.',
      examples: [],
      constraints: [],
      hints: [
        'Build each permutation one position at a time.',
        'Track which elements are already used, or swap elements into place.'
      ],
      approach:
        'Backtracking with a used[] array: at each depth try every unused element, mark it, recurse, and unmark it; record the path when its length reaches N.',
      timeComplexity: 'O(N * N!)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/permutations/'
    },
    {
      id: 'q-word-search',
      slug: 'word-search',
      title: 'Word Search',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Given a grid of letters and a word, decide whether the word can be traced through horizontally or vertically adjacent cells, using each cell at most once.',
      examples: [],
      constraints: [],
      hints: [
        'Start a DFS from every cell that matches the first letter.',
        'Temporarily mark a cell as visited while it is on the current path.'
      ],
      approach:
        'DFS backtracking from each cell: match the current character, mark the cell, explore the four neighbours for the next character, then restore the cell.',
      timeComplexity: 'O(R * C * 3^L), L = word length',
      spaceComplexity: 'O(L)',
      externalUrl: 'https://leetcode.com/problems/word-search/'
    },
    {
      id: 'q-palindrome-partitioning',
      slug: 'palindrome-partitioning',
      title: 'Palindrome Partitioning',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Split a string into pieces so that every piece is a palindrome, and return every possible way of doing so.',
      examples: [],
      constraints: [],
      hints: [
        'Choose the first piece as any palindromic prefix, then partition the rest.',
        'Precomputing a table of which substrings are palindromes avoids repeated checks.'
      ],
      approach:
        'Backtracking over cut positions: for each end index where s[start..end] is a palindrome, add that piece and recurse from end + 1; record the path when start reaches the end.',
      timeComplexity: 'O(N * 2^N)',
      spaceComplexity: 'O(N^2) with the palindrome table',
      externalUrl: 'https://leetcode.com/problems/palindrome-partitioning/'
    },
    {
      id: 'q-letter-combinations-of-a-phone-number',
      slug: 'letter-combinations-of-a-phone-number',
      title: 'Letter Combinations of a Phone Number',
      difficulty: 'medium',
      pattern: 'Backtracking',
      problemStatement:
        'Each digit from 2 to 9 maps to letters as on a phone keypad. Given a string of such digits, return every letter string it could represent (an empty input gives an empty list).',
      examples: [],
      constraints: [],
      hints: [
        'Each digit adds one letter choice.',
        'Backtracking (or iterative expansion) builds the strings position by position.'
      ],
      approach:
        'Backtracking over the digits: for the digit at the current index, append each of its mapped letters and recurse; record the string when it reaches the input length.',
      timeComplexity: 'O(4^N * N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/'
    },
    {
      id: 'q-n-queens',
      slug: 'n-queens',
      title: 'N-Queens',
      difficulty: 'hard',
      pattern: 'Backtracking',
      problemStatement:
        'Place n chess queens on an n x n board so that no two share a row, column or diagonal, and return every distinct valid board.',
      examples: [],
      constraints: [],
      hints: [
        'Place exactly one queen per row.',
        'Keep sets of used columns, diagonals (r - c) and anti-diagonals (r + c).'
      ],
      approach:
        'Row-by-row backtracking: for each column in the current row that is free in all three sets, place a queen, recurse to the next row, then remove it.',
      timeComplexity: 'O(N!)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/n-queens/'
    },
    {
      id: 'q-implement-trie-prefix-tree',
      slug: 'implement-trie-prefix-tree',
      title: 'Implement Trie (Prefix Tree)',
      difficulty: 'medium',
      pattern: 'Tries',
      problemStatement:
        'Build a trie (prefix tree) supporting insert(word), search(word) for an exact match, and startsWith(prefix) for whether any stored word begins with the prefix.',
      examples: [],
      constraints: [],
      hints: ['Each node maps a character to a child node.', 'Mark the nodes where a complete word ends.'],
      approach:
        "Nodes with a children map (or a 26-slot array) and an isEnd flag: insert walks and creates nodes, search requires the final node's isEnd flag, and startsWith only needs the path to exist.",
      timeComplexity: 'O(L) per operation',
      spaceComplexity: 'O(total characters inserted)',
      externalUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/'
    },
    {
      id: 'q-design-add-and-search-words-data-structure',
      slug: 'design-add-and-search-words-data-structure',
      title: 'Design Add and Search Words Data Structure',
      difficulty: 'medium',
      pattern: 'Tries',
      problemStatement:
        "Design a word dictionary supporting addWord(word) and search(word), where the search pattern may contain '.' that matches any single letter.",
      examples: [],
      constraints: [],
      hints: ['Store words in a trie.', "On a '.', explore every child at that position."],
      approach:
        "Trie for storage; search is a DFS that follows the exact child for a letter and branches into all children for '.', succeeding when it ends on a word-end node.",
      timeComplexity: 'add O(L); search O(26^dots * L) worst case',
      spaceComplexity: 'O(total characters)',
      externalUrl: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/'
    },
    {
      id: 'q-word-search-ii',
      slug: 'word-search-ii',
      title: 'Word Search II',
      difficulty: 'hard',
      pattern: 'Tries',
      problemStatement:
        'Given a letter grid and a list of words, return every word that can be traced through adjacent cells (horizontal or vertical), using each cell at most once per word.',
      examples: [],
      constraints: [],
      hints: [
        'Searching each word separately repeats a lot of work.',
        'Put all words in a trie and run one DFS per cell that follows trie edges.'
      ],
      approach:
        'Build a trie of the words; DFS from each cell while the path is a trie prefix, collect words when a word-end node is reached, and prune trie branches once their words are found.',
      timeComplexity: 'O(R * C * 4 * 3^(L - 1)) worst case',
      spaceComplexity: 'O(total characters in words)',
      externalUrl: 'https://leetcode.com/problems/word-search-ii/'
    },
    {
      id: 'q-number-of-islands',
      slug: 'number-of-islands',
      title: 'Number of Islands',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        "A grid contains '1' for land and '0' for water. Count the islands, where an island is a group of land cells connected horizontally or vertically.",
      examples: [],
      constraints: [],
      hints: [
        'Every unvisited land cell you find starts a new island.',
        'Flood-fill that island so its cells are not counted again.'
      ],
      approach:
        "Scan the grid; on each unvisited '1', increment the count and run DFS/BFS (or union-find) to mark every connected land cell as visited.",
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C) worst case',
      externalUrl: 'https://leetcode.com/problems/number-of-islands/'
    },
    {
      id: 'q-max-area-of-island',
      slug: 'max-area-of-island',
      title: 'Max Area of Island',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'In a grid of 0s (water) and 1s (land), return the size of the largest island, counting cells connected horizontally or vertically, or 0 if there is no land.',
      examples: [],
      constraints: [],
      hints: [
        "This is Number of Islands, but measuring each island's size.",
        'Have the DFS return how many cells it visited.'
      ],
      approach:
        'Flood-fill each unvisited land cell with a DFS that marks cells and returns 1 + the sizes from its four neighbours; keep the maximum.',
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C)',
      externalUrl: 'https://leetcode.com/problems/max-area-of-island/'
    },
    {
      id: 'q-clone-graph',
      slug: 'clone-graph',
      title: 'Clone Graph',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'Given a reference to one node of a connected undirected graph, return a deep copy of the whole graph, where every node keeps a value and a list of neighbours.',
      examples: [],
      constraints: [],
      hints: [
        'Map each original node to its clone so shared and cyclic references are reused.',
        'Create the clone before visiting neighbours to handle cycles.'
      ],
      approach:
        'DFS or BFS with a hash map from original node to clone: create the clone on first visit, then link clones of all neighbours (creating them as needed).',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      externalUrl: 'https://leetcode.com/problems/clone-graph/'
    },
    {
      id: 'q-number-of-provinces',
      slug: 'number-of-provinces',
      title: 'Number of Provinces',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'Given an n x n adjacency matrix showing which cities are directly connected, count the provinces: groups of cities connected directly or indirectly.',
      examples: [],
      constraints: [],
      hints: [
        'Count the connected components of an undirected graph.',
        'DFS from every unvisited city, or use union-find.'
      ],
      approach:
        'For each city not yet visited, run a DFS over its connections and increment the province count. Union-find merging connected pairs also works.',
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/number-of-provinces/'
    },
    {
      id: 'q-rotting-oranges',
      slug: 'rotting-oranges',
      title: 'Rotting Oranges',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'In a grid, 0 is empty, 1 is a fresh orange and 2 is a rotten orange. Every minute, fresh oranges next to a rotten one (up, down, left or right) become rotten. Return the minutes until no fresh orange remains, or -1 if that never happens.',
      examples: [],
      constraints: [],
      hints: [
        'All rotten oranges spread at the same time: start BFS from all of them together.',
        'Count fresh oranges so you can tell whether any remain unreachable.'
      ],
      approach:
        'Multi-source BFS seeded with every rotten orange, processing level by level (one level = one minute) and decrementing the fresh count; return the levels used, or -1 if fresh oranges remain.',
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C)',
      externalUrl: 'https://leetcode.com/problems/rotting-oranges/'
    },
    {
      id: 'q-pacific-atlantic-water-flow',
      slug: 'pacific-atlantic-water-flow',
      title: 'Pacific Atlantic Water Flow',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'A grid of heights borders the Pacific Ocean on its top and left edges and the Atlantic on its bottom and right edges. Water flows to a neighbour of equal or lower height. Return every cell from which water can reach both oceans.',
      examples: [],
      constraints: [],
      hints: [
        "Reverse the direction: search uphill from each ocean's border.",
        'Cells reachable from both searches are the answer.'
      ],
      approach:
        'Run DFS/BFS from all Pacific border cells and from all Atlantic border cells, moving only to neighbours of greater or equal height; return the intersection of the two visited sets.',
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C)',
      externalUrl: 'https://leetcode.com/problems/pacific-atlantic-water-flow/'
    },
    {
      id: 'q-surrounded-regions',
      slug: 'surrounded-regions',
      title: 'Surrounded Regions',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        "A board contains 'X' and 'O' cells. Flip to 'X' every region of 'O' cells that is completely enclosed by 'X', meaning it is not connected to the board's edge.",
      examples: [],
      constraints: [],
      hints: [
        'Regions touching the border can never be captured.',
        "Mark the safe 'O' cells first, starting from the edges."
      ],
      approach:
        "DFS/BFS from every border 'O' to mark its region as safe; then flip all unmarked 'O' cells to 'X' and restore the marked cells to 'O'.",
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C)',
      externalUrl: 'https://leetcode.com/problems/surrounded-regions/'
    },
    {
      id: 'q-course-schedule',
      slug: 'course-schedule',
      title: 'Course Schedule',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'There are numCourses courses and a list of prerequisite pairs [a, b], meaning b must be taken before a. Decide whether it is possible to finish every course.',
      examples: [],
      constraints: [],
      hints: [
        'Model courses as a directed graph.',
        'All courses can be finished exactly when that graph has no cycle.'
      ],
      approach:
        "Kahn's topological sort: repeatedly take courses with in-degree 0 and reduce their neighbours' in-degrees; succeed if every course is processed. DFS with three-colour cycle detection also works.",
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V + E)',
      externalUrl: 'https://leetcode.com/problems/course-schedule/'
    },
    {
      id: 'q-course-schedule-ii',
      slug: 'course-schedule-ii',
      title: 'Course Schedule II',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'With the same prerequisite rules as Course Schedule, return one valid order in which to take all courses, or an empty list if no such order exists.',
      examples: [],
      constraints: [],
      hints: [
        'The answer is a topological ordering of the course graph.',
        'If a cycle exists, not every course can be placed in the order.'
      ],
      approach:
        "Kahn's algorithm: queue courses with in-degree 0, append each one to the order as it is processed, and return the order only if it contains all courses.",
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V + E)',
      externalUrl: 'https://leetcode.com/problems/course-schedule-ii/'
    },
    {
      id: 'q-redundant-connection',
      slug: 'redundant-connection',
      title: 'Redundant Connection',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'A graph started as a tree with n nodes, then one extra edge was added. Given the edges, return an edge whose removal makes it a tree again; if several work, return the one that appears last in the input.',
      examples: [],
      constraints: [],
      hints: [
        'The extra edge is the first one that connects two nodes already connected.',
        'Union-find detects exactly that.'
      ],
      approach:
        'Process edges in order with union-find (path compression and union by rank); the first edge whose endpoints already share a root is the redundant edge.',
      timeComplexity: 'O(N * alpha(N))',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/redundant-connection/'
    },
    {
      id: 'q-word-ladder',
      slug: 'word-ladder',
      title: 'Word Ladder',
      difficulty: 'hard',
      pattern: 'Graphs',
      problemStatement:
        'Given a begin word, an end word and a word list, find the length of the shortest transformation sequence from begin to end that changes one letter at a time, where every intermediate word must be in the list. Return 0 if it is impossible.',
      examples: [],
      constraints: [],
      hints: ['Each word is a node; words one letter apart are connected.', 'BFS finds the shortest number of steps.'],
      approach:
        'BFS from beginWord: for each word try every single-letter change (or use wildcard buckets such as h*t), enqueue unvisited list words, and return the level when endWord is reached.',
      timeComplexity: 'O(N * L^2) with 26 letters per position',
      spaceComplexity: 'O(N * L)',
      externalUrl: 'https://leetcode.com/problems/word-ladder/'
    },
    {
      id: 'q-network-delay-time',
      slug: 'network-delay-time',
      title: 'Network Delay Time',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'A directed network has n nodes and weighted edges giving travel times. A signal starts at node k. Return the time until every node has received it, or -1 if some node can never be reached.',
      examples: [],
      constraints: [],
      hints: [
        'You need the shortest travel time from k to every node.',
        "With non-negative weights, Dijkstra's algorithm applies; the answer is the largest of those times."
      ],
      approach:
        'Dijkstra with a min-heap from k; after it finishes, return the maximum shortest distance, or -1 if any node is unreached.',
      timeComplexity: 'O(E log V)',
      spaceComplexity: 'O(V + E)',
      externalUrl: 'https://leetcode.com/problems/network-delay-time/'
    },
    {
      id: 'q-min-cost-to-connect-all-points',
      slug: 'min-cost-to-connect-all-points',
      title: 'Min Cost to Connect All Points',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'Points lie on a 2D grid, and connecting two points costs their Manhattan distance. Return the minimum total cost to connect all points so that every pair is linked by some path.',
      examples: [],
      constraints: [],
      hints: [
        'This asks for a minimum spanning tree.',
        "With a dense, implicit graph, Prim's algorithm avoids listing every edge."
      ],
      approach:
        "Prim's algorithm: keep the cheapest known connection cost to every unvisited point, repeatedly add the cheapest point, and update the costs of the others.",
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/min-cost-to-connect-all-points/'
    },
    {
      id: 'q-cheapest-flights-within-k-stops',
      slug: 'cheapest-flights-within-k-stops',
      title: 'Cheapest Flights Within K Stops',
      difficulty: 'medium',
      pattern: 'Graphs',
      problemStatement:
        'Given flights with prices between n cities, find the cheapest price from a source city to a destination city using at most k intermediate stops, or return -1 if no such route exists.',
      examples: [],
      constraints: [],
      hints: [
        'The stop limit makes plain Dijkstra incorrect unless the number of stops is part of the state.',
        'Bellman-Ford limited to k + 1 rounds fits this directly.'
      ],
      approach:
        "Bellman-Ford for k + 1 iterations, relaxing every flight using a copy of the previous round's prices so each round adds at most one more flight.",
      timeComplexity: 'O(K * E)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/cheapest-flights-within-k-stops/'
    },
    {
      id: 'q-swim-in-rising-water',
      slug: 'swim-in-rising-water',
      title: 'Swim in Rising Water',
      difficulty: 'hard',
      pattern: 'Graphs',
      problemStatement:
        'In an n x n grid, each cell holds an elevation. At time t the water level is t, and you can move between adjacent cells when both elevations are at most t. Find the earliest time you can travel from the top-left to the bottom-right corner.',
      examples: [],
      constraints: [],
      hints: [
        "A path's cost is the highest elevation along it.",
        'Minimise that highest elevation with a Dijkstra-style search.'
      ],
      approach:
        'Min-heap keyed by the maximum elevation on the path so far: expand from (0, 0), and return the key when the target cell is popped. Binary search on t with a BFS also works.',
      timeComplexity: 'O(N^2 log N)',
      spaceComplexity: 'O(N^2)',
      externalUrl: 'https://leetcode.com/problems/swim-in-rising-water/'
    },
    {
      id: 'q-reconstruct-itinerary',
      slug: 'reconstruct-itinerary',
      title: 'Reconstruct Itinerary',
      difficulty: 'hard',
      pattern: 'Graphs',
      problemStatement:
        "Given a list of airline tickets [from, to], build the itinerary that starts at 'JFK' and uses every ticket exactly once. If several itineraries are valid, return the one that is smallest in lexical order.",
      examples: [],
      constraints: [],
      hints: [
        'Using every edge exactly once is an Eulerian path.',
        'Visit destinations in lexical order, and add an airport to the route only after its outgoing tickets are used up.'
      ],
      approach:
        "Hierholzer's algorithm: sort each airport's destinations, DFS from JFK consuming tickets, append an airport after exhausting its edges, and reverse the result at the end.",
      timeComplexity: 'O(E log E)',
      spaceComplexity: 'O(E)',
      externalUrl: 'https://leetcode.com/problems/reconstruct-itinerary/'
    },
    {
      id: 'q-climbing-stairs',
      slug: 'climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: 'easy',
      pattern: 'DP - 1D',
      problemStatement:
        'You climb a staircase of n steps, taking either 1 or 2 steps at a time. Count the number of distinct ways to reach the top.',
      examples: [],
      constraints: [],
      hints: [
        'To stand on step n, your last move came from step n - 1 or step n - 2.',
        'The counts follow the Fibonacci pattern.'
      ],
      approach:
        'DP with two rolling variables: ways(n) = ways(n - 1) + ways(n - 2), starting from ways(1) = 1 and ways(2) = 2.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/climbing-stairs/'
    },
    {
      id: 'q-min-cost-climbing-stairs',
      slug: 'min-cost-climbing-stairs',
      title: 'Min Cost Climbing Stairs',
      difficulty: 'easy',
      pattern: 'DP - 1D',
      problemStatement:
        'Each step has a cost you pay when you step on it. You may start on step 0 or step 1 and climb 1 or 2 steps at a time. Find the minimum total cost to get past the last step.',
      examples: [],
      constraints: [],
      hints: [
        'The cheapest way to reach step i comes from step i - 1 or step i - 2.',
        'The top is one position past the last step.'
      ],
      approach:
        'DP: dp[i] = cost[i] + min(dp[i - 1], dp[i - 2]); the answer is min(dp[n - 1], dp[n - 2]). Two rolling variables suffice.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/min-cost-climbing-stairs/'
    },
    {
      id: 'q-house-robber',
      slug: 'house-robber',
      title: 'House Robber',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Houses along a street hold given amounts of money, and robbing two adjacent houses triggers an alarm. Return the most money you can take without robbing neighbours.',
      examples: [],
      constraints: [],
      hints: [
        'At each house you either skip it or rob it and skip the previous one.',
        'Only the best totals up to the previous two houses are needed.'
      ],
      approach: 'DP: best(i) = max(best(i - 1), best(i - 2) + nums[i]), tracked with two variables.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/house-robber/'
    },
    {
      id: 'q-house-robber-ii',
      slug: 'house-robber-ii',
      title: 'House Robber II',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'The same as House Robber, except the houses are arranged in a circle, so the first and last houses are also neighbours.',
      examples: [],
      constraints: [],
      hints: ['You can never rob both the first and the last house.', 'Solve the straight-line version twice.'],
      approach:
        'Return max(rob(houses[0..n-2]), rob(houses[1..n-1])) using the linear House Robber DP, handling a single house separately.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/house-robber-ii/'
    },
    {
      id: 'q-longest-palindromic-substring',
      slug: 'longest-palindromic-substring',
      title: 'Longest Palindromic Substring',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Return the longest contiguous substring of a string that reads the same forwards and backwards.',
      examples: [],
      constraints: [],
      hints: [
        'Every palindrome mirrors around a centre.',
        'There are 2N - 1 possible centres: each character and each gap between characters.'
      ],
      approach:
        "Expand around each centre (odd and even lengths) while the characters on both sides match, and keep the longest span. Manacher's algorithm achieves O(N).",
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/longest-palindromic-substring/'
    },
    {
      id: 'q-palindromic-substrings',
      slug: 'palindromic-substrings',
      title: 'Palindromic Substrings',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Count how many contiguous substrings of a string are palindromes, counting substrings at different positions separately.',
      examples: [],
      constraints: [],
      hints: [
        'Every palindromic substring has a centre.',
        'Expanding from a centre, each successful step finds one more palindrome.'
      ],
      approach: 'Expand around all 2N - 1 centres, adding one to the count for each step where both sides match.',
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/palindromic-substrings/'
    },
    {
      id: 'q-decode-ways',
      slug: 'decode-ways',
      title: 'Decode Ways',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        "Letters are encoded as numbers ('A' = 1 through 'Z' = 26). Given a string of digits, count how many ways it can be decoded back into letters. Codes with leading zeros, such as '06', are invalid.",
      examples: [],
      constraints: [],
      hints: [
        "The last character decodes either alone (if it is not '0') or together with the previous digit (if the pair is 10 to 26).",
        'This gives a recurrence over prefixes, much like Climbing Stairs.'
      ],
      approach:
        "DP over prefixes: dp[i] adds dp[i - 1] when s[i - 1] != '0' and adds dp[i - 2] when s[i-2..i-1] is between 10 and 26; two rolling variables suffice.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/decode-ways/'
    },
    {
      id: 'q-coin-change',
      slug: 'coin-change',
      title: 'Coin Change',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Given coin denominations and an amount, return the fewest coins needed to make that amount exactly, or -1 if it cannot be made. Each coin type may be used any number of times.',
      examples: [],
      constraints: [],
      hints: ['Greedy picking of the largest coin can fail.', 'dp[x] = 1 + min over coins c of dp[x - c].'],
      approach:
        'Bottom-up DP over amounts 0..amount, with dp[0] = 0 and unreachable amounts marked as infinity; return dp[amount], or -1 if it stays infinite.',
      timeComplexity: 'O(amount * coins)',
      spaceComplexity: 'O(amount)',
      externalUrl: 'https://leetcode.com/problems/coin-change/'
    },
    {
      id: 'q-maximum-product-subarray',
      slug: 'maximum-product-subarray',
      title: 'Maximum Product Subarray',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Find the contiguous subarray with the largest product in an integer array that may contain negatives and zeros, and return that product.',
      examples: [],
      constraints: [],
      hints: [
        'A negative number turns the smallest product into the largest.',
        'Track both the maximum and minimum product of a subarray ending at each index.'
      ],
      approach:
        'At each element, compute the new max and min from (num, num * prevMax, num * prevMin), and keep the overall maximum seen.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/maximum-product-subarray/'
    },
    {
      id: 'q-word-break',
      slug: 'word-break',
      title: 'Word Break',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Given a string and a dictionary of words, decide whether the string can be split into a sequence of one or more dictionary words, reusing words as often as needed.',
      examples: [],
      constraints: [],
      hints: [
        'dp[i] says whether the first i characters can be split.',
        'dp[i] is true if some dictionary word ends at i and dp[start of that word] is true.'
      ],
      approach:
        'Bottom-up DP with dp[0] = true; for each i, check dictionary words (or substrings up to the maximum word length) that end at i using a hash set.',
      timeComplexity: 'O(N * L) with a length bound, or O(N^2) checks',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/word-break/'
    },
    {
      id: 'q-longest-increasing-subsequence',
      slug: 'longest-increasing-subsequence',
      title: 'Longest Increasing Subsequence',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Return the length of the longest strictly increasing subsequence of an array; the elements need not be adjacent but must keep their order.',
      examples: [],
      constraints: [],
      hints: [
        'The O(N^2) DP is dp[i] = 1 + max dp[j] for j < i with nums[j] < nums[i].',
        'For O(N log N), keep the smallest possible tail value for each subsequence length.'
      ],
      approach:
        "Patience-sorting tails array: for each value, binary search the first tail >= value and replace it, or append if none exists; the array's length is the answer.",
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/longest-increasing-subsequence/'
    },
    {
      id: 'q-partition-equal-subset-sum',
      slug: 'partition-equal-subset-sum',
      title: 'Partition Equal Subset Sum',
      difficulty: 'medium',
      pattern: 'DP - 1D',
      problemStatement:
        'Decide whether an array of positive integers can be divided into two groups whose sums are equal.',
      examples: [],
      constraints: [],
      hints: [
        'An odd total can never be split evenly.',
        'Otherwise, ask whether some subset sums to half the total, a 0/1 knapsack.'
      ],
      approach:
        'Boolean DP over sums up to total / 2: for each number, update dp[s] |= dp[s - num] iterating s downwards so each number is used at most once.',
      timeComplexity: 'O(N * sum)',
      spaceComplexity: 'O(sum)',
      externalUrl: 'https://leetcode.com/problems/partition-equal-subset-sum/'
    },
    {
      id: 'q-unique-paths',
      slug: 'unique-paths',
      title: 'Unique Paths',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'A robot starts at the top-left of an m x n grid and can only move right or down. Count the distinct paths to the bottom-right corner.',
      examples: [],
      constraints: [],
      hints: [
        'The paths into a cell come from the cell above it and the cell to its left.',
        'The answer is also a binomial coefficient.'
      ],
      approach:
        'DP with one row: row[j] += row[j - 1] for each cell, starting from a row of 1s; alternatively compute C(m + n - 2, m - 1).',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(n)',
      externalUrl: 'https://leetcode.com/problems/unique-paths/'
    },
    {
      id: 'q-longest-common-subsequence',
      slug: 'longest-common-subsequence',
      title: 'Longest Common Subsequence',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'Given two strings, return the length of the longest sequence of characters that appears in both in the same relative order, not necessarily contiguously.',
      examples: [],
      constraints: [],
      hints: [
        'Compare the strings prefix by prefix.',
        'If the current characters match, extend the diagonal value; otherwise take the better of skipping a character from either string.'
      ],
      approach:
        '2D DP where dp[i][j] = dp[i - 1][j - 1] + 1 on a match, else max(dp[i - 1][j], dp[i][j - 1]); it can be reduced to one row.',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(min(m, n))',
      externalUrl: 'https://leetcode.com/problems/longest-common-subsequence/'
    },
    {
      id: 'q-coin-change-ii',
      slug: 'coin-change-ii',
      title: 'Coin Change II',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'Given coin denominations and an amount, count the number of distinct combinations of coins (order does not matter) that add up to the amount, with unlimited coins of each type.',
      examples: [],
      constraints: [],
      hints: ['Count combinations, not orderings.', 'Loop over coins in the outer loop and amounts in the inner loop.'],
      approach:
        'Unbounded knapsack counting: dp[0] = 1; for each coin, for amounts from coin up to the target, dp[a] += dp[a - coin].',
      timeComplexity: 'O(amount * coins)',
      spaceComplexity: 'O(amount)',
      externalUrl: 'https://leetcode.com/problems/coin-change-ii/'
    },
    {
      id: 'q-target-sum',
      slug: 'target-sum',
      title: 'Target Sum',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'Assign a + or - sign to every number in an array, then count how many sign assignments make the resulting expression equal a target value.',
      examples: [],
      constraints: [],
      hints: [
        'Split the numbers into a positive set P and a negative set N, so P - N = target and P + N = total.',
        'That makes it count the subsets that sum to (total + target) / 2.'
      ],
      approach:
        'Check that total + target is non-negative and even, then count subsets summing to (total + target) / 2 with a 0/1 knapsack DP (iterating sums downwards).',
      timeComplexity: 'O(N * sum)',
      spaceComplexity: 'O(sum)',
      externalUrl: 'https://leetcode.com/problems/target-sum/'
    },
    {
      id: 'q-best-time-to-buy-and-sell-stock-with-cooldown',
      slug: 'best-time-to-buy-and-sell-stock-with-cooldown',
      title: 'Best Time to Buy and Sell Stock with Cooldown',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'Given daily stock prices, make as many buy-then-sell transactions as you like, holding at most one share at a time. After selling, you must wait one day before buying again. Return the maximum profit.',
      examples: [],
      constraints: [],
      hints: [
        'Model three states each day: holding a share, just sold (cooling down), and resting without a share.',
        "Each state's value depends only on the previous day's states."
      ],
      approach:
        'State-machine DP: hold = max(hold, rest - price); sold = hold + price; rest = max(rest, previous sold), updated together each day; the answer is max(sold, rest).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/'
    },
    {
      id: 'q-edit-distance',
      slug: 'edit-distance',
      title: 'Edit Distance',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        'Return the minimum number of single-character insertions, deletions and substitutions needed to transform one word into another.',
      examples: [],
      constraints: [],
      hints: [
        'dp[i][j] is the cost of converting the first i characters into the first j characters.',
        'If the characters match, carry over the diagonal; otherwise take 1 + the minimum of the three operations.'
      ],
      approach:
        '2D DP with base cases dp[i][0] = i and dp[0][j] = j; dp[i][j] = dp[i - 1][j - 1] on a match, else 1 + min(insert, delete, replace).',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(min(m, n)) with rolling rows',
      externalUrl: 'https://leetcode.com/problems/edit-distance/'
    },
    {
      id: 'q-interleaving-string',
      slug: 'interleaving-string',
      title: 'Interleaving String',
      difficulty: 'medium',
      pattern: 'DP - 2D',
      problemStatement:
        "Decide whether string s3 can be formed by interleaving s1 and s2, taking all characters of both while keeping each string's own character order.",
      examples: [],
      constraints: [],
      hints: [
        'If the lengths do not add up, the answer is immediately false.',
        'dp[i][j] says whether the first i characters of s1 and j of s2 can form the first i + j characters of s3.'
      ],
      approach:
        '2D (or 1D) DP: dp[i][j] = (dp[i - 1][j] and s1[i - 1] == s3[i + j - 1]) or (dp[i][j - 1] and s2[j - 1] == s3[i + j - 1]).',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(n)',
      externalUrl: 'https://leetcode.com/problems/interleaving-string/'
    },
    {
      id: 'q-longest-increasing-path-in-a-matrix',
      slug: 'longest-increasing-path-in-a-matrix',
      title: 'Longest Increasing Path in a Matrix',
      difficulty: 'hard',
      pattern: 'DP - 2D',
      problemStatement:
        'In a matrix of integers, find the length of the longest path that moves up, down, left or right to strictly larger values at every step.',
      examples: [],
      constraints: [],
      hints: ['Strictly increasing moves can never form a cycle.', 'Memoise the longest path starting from each cell.'],
      approach:
        'DFS with memoisation: longest(cell) = 1 + max longest(neighbour) over neighbours with a larger value; the answer is the best over all cells.',
      timeComplexity: 'O(R * C)',
      spaceComplexity: 'O(R * C)',
      externalUrl: 'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/'
    },
    {
      id: 'q-distinct-subsequences',
      slug: 'distinct-subsequences',
      title: 'Distinct Subsequences',
      difficulty: 'hard',
      pattern: 'DP - 2D',
      problemStatement:
        'Count how many distinct subsequences of string s are equal to string t; two subsequences differ if they use different positions.',
      examples: [],
      constraints: [],
      hints: [
        'dp[i][j] counts the ways the first j characters of t appear in the first i characters of s.',
        'When s[i - 1] matches t[j - 1] you may use it or skip it; otherwise you must skip it.'
      ],
      approach:
        'DP with dp[i][0] = 1: dp[i][j] = dp[i - 1][j] + (s[i - 1] == t[j - 1] ? dp[i - 1][j - 1] : 0); one row updated right to left is enough.',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(n)',
      externalUrl: 'https://leetcode.com/problems/distinct-subsequences/'
    },
    {
      id: 'q-burst-balloons',
      slug: 'burst-balloons',
      title: 'Burst Balloons',
      difficulty: 'hard',
      pattern: 'DP - 2D',
      problemStatement:
        'Balloons carry numbers. Bursting balloon i earns the product of its number and the numbers of its current left and right neighbours (missing neighbours count as 1). Choose the bursting order that earns the most coins.',
      examples: [],
      constraints: [],
      hints: [
        'Choosing which balloon to burst first makes subproblems depend on each other.',
        "Instead choose which balloon in an interval is burst last; its neighbours are then the interval's fixed boundaries."
      ],
      approach:
        'Interval DP on the array padded with 1 at both ends: dp[l][r] = max over k in (l, r) of dp[l][k] + dp[k][r] + v[l] * v[k] * v[r].',
      timeComplexity: 'O(N^3)',
      spaceComplexity: 'O(N^2)',
      externalUrl: 'https://leetcode.com/problems/burst-balloons/'
    },
    {
      id: 'q-regular-expression-matching',
      slug: 'regular-expression-matching',
      title: 'Regular Expression Matching',
      difficulty: 'hard',
      pattern: 'DP - 2D',
      problemStatement:
        "Implement matching of a whole string against a pattern in which '.' matches any single character and '*' means zero or more of the character before it.",
      examples: [],
      constraints: [],
      hints: [
        "Handle the '*' case separately: use zero copies of the preceding element, or consume one matching character and stay on the pattern.",
        'Memoise over (position in string, position in pattern).'
      ],
      approach:
        "DP over (i, j): match the current characters ('.' matches anything); if the next pattern character is '*', the result is dp(i, j + 2) or (first characters match and dp(i + 1, j)).",
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(m * n)',
      externalUrl: 'https://leetcode.com/problems/regular-expression-matching/'
    },
    {
      id: 'q-maximum-subarray',
      slug: 'maximum-subarray',
      title: 'Maximum Subarray',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'Find the contiguous, non-empty subarray of an integer array with the largest sum, and return that sum.',
      examples: [],
      constraints: [],
      hints: [
        'A running sum that has gone negative can only drag down whatever follows it.',
        'At each element, either extend the current subarray or start a new one there.'
      ],
      approach: "Kadane's algorithm: current = max(num, current + num), and track the best value of current seen.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/maximum-subarray/'
    },
    {
      id: 'q-jump-game',
      slug: 'jump-game',
      title: 'Jump Game',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'Each array element is the maximum jump length from that position. Starting at index 0, decide whether you can reach the last index.',
      examples: [],
      constraints: [],
      hints: [
        'Track the furthest index reachable so far.',
        'If you ever stand beyond that furthest index, you are stuck.'
      ],
      approach:
        'Greedy scan: for each index i not beyond the current reach, update reach = max(reach, i + nums[i]); succeed once reach covers the last index.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/jump-game/'
    },
    {
      id: 'q-jump-game-ii',
      slug: 'jump-game-ii',
      title: 'Jump Game II',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'As in Jump Game, each element is a maximum jump length, and the last index is always reachable. Return the minimum number of jumps needed to reach it.',
      examples: [],
      constraints: [],
      hints: [
        'Think of BFS levels: every index reachable with j jumps forms a range.',
        'When you pass the end of the current range, you must spend another jump.'
      ],
      approach:
        'Greedy range expansion: track the current range end and the furthest reach; when i reaches the current end, increment jumps and set the end to the furthest reach.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/jump-game-ii/'
    },
    {
      id: 'q-gas-station',
      slug: 'gas-station',
      title: 'Gas Station',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'Gas stations sit on a circular route, each giving some fuel and costing some fuel to reach the next one. Starting with an empty tank, find the station index from which you can complete the full circle, or -1 if none works (the answer is unique when it exists).',
      examples: [],
      constraints: [],
      hints: [
        'If total fuel is less than total cost, no start works.',
        'If the tank goes negative after station i, no station between the current start and i can be the start.'
      ],
      approach:
        'One pass: accumulate total and current balance; whenever the current balance drops below 0, reset it and set the start to i + 1. Return the start if the total is non-negative, otherwise -1.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/gas-station/'
    },
    {
      id: 'q-hand-of-straights',
      slug: 'hand-of-straights',
      title: 'Hand of Straights',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'Given a hand of card values and a group size, decide whether the cards can be arranged into groups of exactly that size where each group is a run of consecutive values.',
      examples: [],
      constraints: [],
      hints: [
        'The smallest remaining card must start a group.',
        'Use counts and take the smallest value first, with a sorted map or a min-heap.'
      ],
      approach:
        'Count the cards; repeatedly take the smallest value with a positive count and try to consume groupSize consecutive values from it, failing if any value is missing.',
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/hand-of-straights/'
    },
    {
      id: 'q-merge-triplets-to-form-target-triplet',
      slug: 'merge-triplets-to-form-target-triplet',
      title: 'Merge Triplets to Form Target Triplet',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'You have a list of triplets and a target triplet. One operation replaces a triplet with the element-wise maximum of it and another triplet. Decide whether the target can appear among the triplets.',
      examples: [],
      constraints: [],
      hints: [
        'Any triplet with a value greater than the target in some position can never be used.',
        'Among the usable triplets, you need each target value to be matched by at least one of them.'
      ],
      approach:
        'Ignore triplets exceeding the target in any coordinate; for the rest, record which coordinates exactly equal the target, and succeed if all three coordinates are covered.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/merge-triplets-to-form-target-triplet/'
    },
    {
      id: 'q-partition-labels',
      slug: 'partition-labels',
      title: 'Partition Labels',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        'Split a string into as many pieces as possible so that each letter appears in at most one piece, and return the lengths of the pieces.',
      examples: [],
      constraints: [],
      hints: [
        'Record the last position of every letter.',
        'A piece can end only when the scan reaches the furthest last position of the letters seen in it.'
      ],
      approach:
        "Store each letter's last index; scan, extending the current end to max(end, last[c]), and close a piece when i equals end.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) (26 letters)',
      externalUrl: 'https://leetcode.com/problems/partition-labels/'
    },
    {
      id: 'q-valid-parenthesis-string',
      slug: 'valid-parenthesis-string',
      title: 'Valid Parenthesis String',
      difficulty: 'medium',
      pattern: 'Greedy',
      problemStatement:
        "A string contains '(', ')' and '*', where '*' may act as '(', as ')' or as nothing. Decide whether some interpretation makes the brackets balanced.",
      examples: [],
      constraints: [],
      hints: [
        'Track a range of possible open-bracket counts instead of a single count.',
        'Never let the low end of the range drop below zero.'
      ],
      approach:
        "Greedy with lo and hi bounds: '(' increments both, ')' decrements both, and '*' decrements lo and increments hi; fail if hi < 0, clamp lo at 0, and succeed if lo == 0 at the end.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/valid-parenthesis-string/'
    },
    {
      id: 'q-insert-interval',
      slug: 'insert-interval',
      title: 'Insert Interval',
      difficulty: 'medium',
      pattern: 'Intervals',
      problemStatement:
        'Given a sorted list of non-overlapping intervals and a new interval, insert the new one and merge wherever necessary so the list stays sorted and non-overlapping.',
      examples: [],
      constraints: [],
      hints: [
        'Intervals ending before the new one starts are untouched, and so are those starting after it ends.',
        'Every interval in between overlaps and merges into one.'
      ],
      approach:
        'Three phases in a single pass: add intervals entirely before the new one, merge overlapping intervals by widening its bounds, add the merged interval, then add the remainder.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N) for the output',
      externalUrl: 'https://leetcode.com/problems/insert-interval/'
    },
    {
      id: 'q-merge-intervals',
      slug: 'merge-intervals',
      title: 'Merge Intervals',
      difficulty: 'medium',
      pattern: 'Intervals',
      problemStatement:
        'Merge every set of overlapping intervals in a list and return the resulting non-overlapping intervals.',
      examples: [],
      constraints: [],
      hints: [
        'Sort by start time first.',
        'Then each interval either overlaps the last merged one or starts a new one.'
      ],
      approach:
        "Sort by start; extend the last merged interval's end when the current start is no greater than it, otherwise append the current interval.",
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/merge-intervals/'
    },
    {
      id: 'q-non-overlapping-intervals',
      slug: 'non-overlapping-intervals',
      title: 'Non-overlapping Intervals',
      difficulty: 'medium',
      pattern: 'Intervals',
      problemStatement:
        'Return the minimum number of intervals to remove so that the remaining intervals do not overlap (intervals that only touch at an endpoint are fine).',
      examples: [],
      constraints: [],
      hints: [
        'Keeping the interval that ends earliest leaves the most room for the rest.',
        'This is the classic activity-selection greedy.'
      ],
      approach:
        'Sort by end time; keep an interval when its start is at or after the last kept end, otherwise count it as removed.',
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(1) extra',
      externalUrl: 'https://leetcode.com/problems/non-overlapping-intervals/'
    },
    {
      id: 'q-minimum-interval-to-include-each-query',
      slug: 'minimum-interval-to-include-each-query',
      title: 'Minimum Interval to Include Each Query',
      difficulty: 'hard',
      pattern: 'Intervals',
      problemStatement:
        'Given intervals and a list of query points, answer each query with the size of the smallest interval that contains it (size = right - left + 1), or -1 if none does.',
      examples: [],
      constraints: [],
      hints: [
        'Process the queries in increasing order (remember their original positions).',
        'Keep the intervals that have started in a min-heap by size, and discard those that have already ended.'
      ],
      approach:
        'Sort intervals by start and queries by value; for each query push every interval with left <= query keyed by size, pop from the heap while the top ends before the query, and read the top.',
      timeComplexity: 'O((N + Q) log N)',
      spaceComplexity: 'O(N + Q)',
      externalUrl: 'https://leetcode.com/problems/minimum-interval-to-include-each-query/'
    },
    {
      id: 'q-rotate-image',
      slug: 'rotate-image',
      title: 'Rotate Image',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement: 'Rotate a square matrix 90 degrees clockwise, modifying it in place.',
      examples: [],
      constraints: [],
      hints: [
        'A clockwise rotation equals a transpose followed by reversing every row.',
        'Alternatively, rotate four cells at a time, layer by layer.'
      ],
      approach: 'Transpose the matrix in place (swap [i][j] with [j][i] for j > i), then reverse each row.',
      timeComplexity: 'O(N^2)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/rotate-image/'
    },
    {
      id: 'q-spiral-matrix',
      slug: 'spiral-matrix',
      title: 'Spiral Matrix',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement:
        'Return all elements of an m x n matrix in spiral order, going clockwise from the top-left corner inwards.',
      examples: [],
      constraints: [],
      hints: [
        'Keep four boundaries: top, bottom, left and right.',
        'After walking one side, move that boundary inwards and check that the range is still valid.'
      ],
      approach:
        'Boundary shrinking: walk the top row, right column, bottom row and left column in turn, shrinking each boundary and stopping once the boundaries cross.',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(1) extra',
      externalUrl: 'https://leetcode.com/problems/spiral-matrix/'
    },
    {
      id: 'q-set-matrix-zeroes',
      slug: 'set-matrix-zeroes',
      title: 'Set Matrix Zeroes',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement: 'Whenever a cell of a matrix is 0, set its entire row and column to 0, in place.',
      examples: [],
      constraints: [],
      hints: [
        'Marking cells as you go would wrongly spread zeros.',
        'Use the first row and first column as marker storage, with two flags for those lines themselves.'
      ],
      approach:
        'Record whether row 0 and column 0 contain a zero; mark other zeros in the first row and column; zero cells based on the markers; finally zero row 0 and column 0 if flagged.',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/set-matrix-zeroes/'
    },
    {
      id: 'q-happy-number',
      slug: 'happy-number',
      title: 'Happy Number',
      difficulty: 'easy',
      pattern: 'Math & Geometry',
      problemStatement:
        'Repeatedly replace a positive integer with the sum of the squares of its digits. The number is happy if this process reaches 1. Decide whether a given number is happy.',
      examples: [],
      constraints: [],
      hints: [
        'If the process never reaches 1, it falls into a repeating cycle.',
        'Detect that cycle with a set, or with fast and slow pointers.'
      ],
      approach:
        "Apply the digit-square step with Floyd's cycle detection (or a seen set); the number is happy when the sequence reaches 1 before a repeat.",
      timeComplexity: 'O(log N) per step',
      spaceComplexity: 'O(1) with Floyd',
      externalUrl: 'https://leetcode.com/problems/happy-number/'
    },
    {
      id: 'q-plus-one',
      slug: 'plus-one',
      title: 'Plus One',
      difficulty: 'easy',
      pattern: 'Math & Geometry',
      problemStatement:
        'A non-negative integer is stored as an array of digits, most significant first. Add one to it and return the resulting digits.',
      examples: [],
      constraints: [],
      hints: ['Start from the last digit and carry leftwards.', 'Only an all-9s number grows by one digit.'],
      approach:
        'Walk from the end: if a digit is below 9, increment it and return; otherwise set it to 0 and continue. If every digit was 9, prepend a 1.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1) (O(N) only when the length grows)',
      externalUrl: 'https://leetcode.com/problems/plus-one/'
    },
    {
      id: 'q-powx-n',
      slug: 'powx-n',
      title: 'Pow(x, n)',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement:
        'Compute x raised to an integer power n, where n may be negative or very large, faster than multiplying x by itself n times.',
      examples: [],
      constraints: [],
      hints: [
        'x^n = (x^2)^(n / 2), with one extra factor of x when n is odd.',
        'Handle a negative exponent by inverting x, taking care with the most negative integer.'
      ],
      approach:
        'Exponentiation by squaring: while n > 0, multiply the result by x when the low bit of n is set, square x, and halve n. Convert n to a 64-bit positive value first.',
      timeComplexity: 'O(log N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/powx-n/'
    },
    {
      id: 'q-multiply-strings',
      slug: 'multiply-strings',
      title: 'Multiply Strings',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement:
        'Multiply two non-negative integers given as decimal strings and return the product as a string, without converting the whole strings to numbers.',
      examples: [],
      constraints: [],
      hints: [
        'The product of digits i and j contributes to positions i + j and i + j + 1 of the result.',
        'Allocate m + n result digits and propagate carries as you go.'
      ],
      approach:
        'Grade-school multiplication into an array of length m + n, adding each digit product at the right offset and carrying, then strip leading zeros.',
      timeComplexity: 'O(m * n)',
      spaceComplexity: 'O(m + n)',
      externalUrl: 'https://leetcode.com/problems/multiply-strings/'
    },
    {
      id: 'q-detect-squares',
      slug: 'detect-squares',
      title: 'Detect Squares',
      difficulty: 'medium',
      pattern: 'Math & Geometry',
      problemStatement:
        'Design a structure that stores points (duplicates allowed) and, for a query point, counts the ways to choose three stored points that form an axis-aligned square of positive area with it.',
      examples: [],
      constraints: [],
      hints: [
        'Fix the query point and choose a stored point that would be its diagonal corner.',
        'The other two corners are then fixed; multiply the counts of all three stored corners.'
      ],
      approach:
        'Keep a counter of points; for a query (x, y), iterate stored points (px, py) with |px - x| == |py - y| > 0 and add count(px, py) * count(x, py) * count(px, y).',
      timeComplexity: 'add O(1), count O(distinct points)',
      spaceComplexity: 'O(N)',
      externalUrl: 'https://leetcode.com/problems/detect-squares/'
    },
    {
      id: 'q-single-number',
      slug: 'single-number',
      title: 'Single Number',
      difficulty: 'easy',
      pattern: 'Bit Manipulation',
      problemStatement:
        'In a non-empty array, every value appears exactly twice except one value that appears once. Find it in linear time using constant extra space.',
      examples: [],
      constraints: [],
      hints: ['XOR-ing a number with itself gives 0.', 'XOR is commutative, so the pairs cancel out in any order.'],
      approach: 'XOR all elements together; every pair cancels and the remaining value is the single number.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/single-number/'
    },
    {
      id: 'q-number-of-1-bits',
      slug: 'number-of-1-bits',
      title: 'Number of 1 Bits',
      difficulty: 'easy',
      pattern: 'Bit Manipulation',
      problemStatement:
        'Return how many bits are set to 1 in the binary representation of an unsigned integer (its Hamming weight).',
      examples: [],
      constraints: [],
      hints: ['n & (n - 1) clears the lowest set bit.', 'Count how many times you can do that before n becomes 0.'],
      approach: 'Loop while n != 0: n &= n - 1 and increment the count (or check each of the 32 bits).',
      timeComplexity: 'O(number of set bits)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/number-of-1-bits/'
    },
    {
      id: 'q-counting-bits',
      slug: 'counting-bits',
      title: 'Counting Bits',
      difficulty: 'easy',
      pattern: 'Bit Manipulation',
      problemStatement:
        'For every integer i from 0 to n, compute how many 1 bits it has, and return the counts as an array.',
      examples: [],
      constraints: [],
      hints: ['i >> 1 has the same bits as i, minus the lowest bit.', 'So bits[i] = bits[i >> 1] + (i & 1).'],
      approach: 'DP over i using bits[i] = bits[i >> 1] + (i & 1) (or bits[i & (i - 1)] + 1).',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N) for the output',
      externalUrl: 'https://leetcode.com/problems/counting-bits/'
    },
    {
      id: 'q-reverse-bits',
      slug: 'reverse-bits',
      title: 'Reverse Bits',
      difficulty: 'easy',
      pattern: 'Bit Manipulation',
      problemStatement: 'Reverse the order of the bits of a 32-bit unsigned integer and return the resulting value.',
      examples: [],
      constraints: [],
      hints: [
        'Peel off the lowest bit of the input and push it into the result from the right.',
        'Repeat exactly 32 times, including leading zeros.'
      ],
      approach:
        'Loop 32 times: result = (result << 1) | (n & 1), then n >>= 1, keeping the result as an unsigned 32-bit value.',
      timeComplexity: 'O(1) (32 iterations)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/reverse-bits/'
    },
    {
      id: 'q-missing-number',
      slug: 'missing-number',
      title: 'Missing Number',
      difficulty: 'easy',
      pattern: 'Bit Manipulation',
      problemStatement:
        'An array holds n distinct numbers taken from the range 0..n, so exactly one number in that range is missing. Find it.',
      examples: [],
      constraints: [],
      hints: [
        'The sum of 0..n is known in closed form.',
        'XOR-ing every index and every value also leaves only the missing number.'
      ],
      approach: "Return n * (n + 1) / 2 minus the array's sum, or XOR all indices 0..n with all values.",
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/missing-number/'
    },
    {
      id: 'q-sum-of-two-integers',
      slug: 'sum-of-two-integers',
      title: 'Sum of Two Integers',
      difficulty: 'medium',
      pattern: 'Bit Manipulation',
      problemStatement: 'Return the sum of two integers without using the + or - operators.',
      examples: [],
      constraints: [],
      hints: [
        'XOR adds bits without carrying; AND shifted left by one gives the carries.',
        'Repeat until there is no carry left, masking to 32 bits in languages with arbitrary-size integers.'
      ],
      approach:
        'Loop: carry = (a & b) << 1, a = a ^ b, b = carry, until b is 0; in Python, mask with 0xFFFFFFFF and convert back to a signed value.',
      timeComplexity: 'O(1) (at most 32 iterations)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/sum-of-two-integers/'
    },
    {
      id: 'q-reverse-integer',
      slug: 'reverse-integer',
      title: 'Reverse Integer',
      difficulty: 'medium',
      pattern: 'Bit Manipulation',
      problemStatement:
        'Reverse the decimal digits of a signed 32-bit integer, keeping its sign. If the reversed value falls outside the signed 32-bit range, return 0. Assume you cannot store 64-bit integers.',
      examples: [],
      constraints: [],
      hints: [
        'Pop the last digit with % 10 and push it onto the result with * 10.',
        'Check for overflow before each push, against INT_MAX / 10 and INT_MIN / 10.'
      ],
      approach:
        'Digit-by-digit reversal with a pre-multiplication overflow check against the 32-bit limits, preserving the sign.',
      timeComplexity: 'O(log |x|)',
      spaceComplexity: 'O(1)',
      externalUrl: 'https://leetcode.com/problems/reverse-integer/'
    }
  ]
};

/** Every problem any sheet can list, keyed by slug: the DSA Sheet's problems plus the extra problem bank. */
export const DSA_PROBLEM_BANK: ReadonlyMap<string, DSAQuestion> = new Map(
  [...DSA_SHEET.questions, ...EXTRA_DSA_QUESTIONS].map((q) => [q.slug, q])
);

/** The DSA Practice catalog, in display order. The DSA Sheet stays first; curated sheets follow. */
export const STUDENT_DSA_SHEETS: DSASheet[] = [
  DSA_SHEET,
  ...CURATED_SHEET_DEFINITIONS.map((definition) => resolveSheet(definition, DSA_PROBLEM_BANK))
];

export function getAllDsaSheets(): DSASheet[] {
  return STUDENT_DSA_SHEETS;
}

export function getDsaSheetBySlug(slug: string): DSASheet | null {
  return STUDENT_DSA_SHEETS.find((s) => s.slug === slug) || null;
}

/** A problem by its progress slug, with the first sheet (in catalog order) that lists it. */
export function getDsaQuestionBySlug(problemSlug: string): { question: DSAQuestion; sheet: DSASheet } | null {
  for (const sheet of STUDENT_DSA_SHEETS) {
    const question = sheet.questions.find((q) => q.slug === problemSlug);
    if (question) {
      return { question, sheet };
    }
  }
  return null;
}
