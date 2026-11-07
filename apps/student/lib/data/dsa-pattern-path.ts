// Pattern Path: a 26-week problem ladder that follows the syllabus DSA stream week by week (design:
// docs/plans/dsa-pattern-path-26-weeks.md). Each week is one group with a pattern card, and each problem carries a
// note saying which earlier problem or idea it builds on, so the order reads as a progression rather than a list.
// Weeks 22-26 deliberately have no notes: students practise naming the pattern themselves.
//
// Built from the design doc's week tables. Keep the two in step: a change to a week here belongs in the doc too.
// Every slug comes from the shared problem bank, so progress, notes and XP are shared with every other sheet.
import type { SheetDefinition } from './dsa-curated-sheets';

export const PATTERN_PATH_SHEET: SheetDefinition = {
  slug: 'pattern-path-26-weeks',
  title: 'Pattern Path · 26 Weeks',
  shortDescription: 'One pattern a week, in class order: every problem builds on one you have already solved.',
  description:
    'A 26-week ladder that follows the program\'s DSA labs. Each week opens with a pattern card (the signal words, the core move, what it builds on and the usual trap), then climbs from a warm-up through the lab problems to a twist and a problem that combines the new pattern with an earlier one. Every problem says what it builds on. Earlier patterns come back on purpose, Week 22 hides the pattern names so you practise spotting them, and Weeks 23 to 26 are interview-style mixed sets. Stretch problems are optional.',
  category: 'general',
  groups: [
    {
      pattern: 'Week 1 · Loops and conditions',
      card: {
        signal: '"print", "for each", "repeat until", a pattern of stars or numbers.',
        coreMove: 'Write the loop on paper first: what changes each time, and when does it stop?',
        buildsOn: 'Nothing. This is the start.',
        trap: 'Off-by-one errors in loop bounds. Hand-trace the first and last iteration.'
      },
      slugs: [
        'largest-of-three-numbers',
        'fizz-buzz',
        'sum-and-reverse-of-digits',
        'number-of-steps-to-reduce-a-number-to-zero',
        'star-and-number-pyramids',
        'running-sum-of-1d-array'
      ],
      notes: {
        'largest-of-three-numbers': 'Lab · First if/elif/else: compare and keep the best.',
        'fizz-buzz': 'Lab · Conditions inside a loop; the order of checks matters (15 before 3 and 5).',
        'sum-and-reverse-of-digits': 'Lab · The digit loop: % 10 takes the last digit, // 10 removes it. Used again in Week 2.',
        'number-of-steps-to-reduce-a-number-to-zero': 'Twist · A while loop whose action depends on the current value.',
        'star-and-number-pyramids': 'Lab · Nested loops where the inner bound depends on the row: the shape of every O(n²) loop analysed in Week 3.',
        'running-sum-of-1d-array': 'Combine · Carry a running value across a loop. This exact idea becomes prefix sums in Weeks 6 and 8.'
      }
    },
    {
      pattern: 'Week 2 · Math and digits',
      card: {
        signal: 'Digits, divisibility, primes, "without converting to a string".',
        coreMove: 'The digit loop from Week 1, and Euclid\'s gcd(a, b) = gcd(b, a % b).',
        buildsOn: 'Week 1 loops.',
        trap: 'Forgetting 0, 1 and negative numbers.'
      },
      slugs: [
        'add-digits',
        'gcd-and-lcm',
        'palindrome-number',
        'armstrong-numbers',
        'fibonacci-number',
        'power-of-two',
        'count-primes',
        'plus-one'
      ],
      notes: {
        'add-digits': 'Revisit · Week 1 digit loop, repeated until one digit remains.',
        'gcd-and-lcm': 'Lab · First algorithm that is much faster than trying every number.',
        'palindrome-number': 'Lab · Reverse the digits (Sum and Reverse of Digits, Week 1) and compare.',
        'armstrong-numbers': 'Lab · Digit loop + powers; count digits first.',
        'fibonacci-number': 'Lab · Two running values instead of one (Running Sum, Week 1). Returns as recursion (W10) and DP (W19).',
        'power-of-two': 'Twist · Keep dividing while divisible. Returns as a one-line bit trick in Week 21.',
        'count-primes': 'Lab · The Sieve of Eratosthenes: first time a smarter method beats a fast loop. Sets up Week 3.',
        'plus-one': 'Combine · Digits stored in a list: carry from the right. A bridge to arrays, reused for Add Two Numbers (W11) and Add Binary (W21).'
      }
    },
    {
      pattern: 'Week 3 · Complexity and the first hash set',
      card: {
        signal: '"duplicate", "seen before", "count", "how many times".',
        coreMove: 'Trade memory for time: a set or dict turns "search the whole list" into one lookup.',
        buildsOn: 'Weeks 1–2 loops; Week 2 sieve showed that method beats speed.',
        trap: 'Writing a nested loop when one pass with a set would do.'
      },
      slugs: [
        'big-o-snippet-drill',
        'contains-duplicate',
        'valid-anagram',
        'ransom-note',
        'majority-element',
        'happy-number'
      ],
      notes: {
        'big-o-snippet-drill': 'Lab · Count loop iterations, including the nested pyramids of Week 1.',
        'contains-duplicate': 'Lab · Solve with a nested loop, then with a set; compare O(n²) and O(n).',
        'valid-anagram': 'Lab · A frequency map: count characters in a dict.',
        'ransom-note': 'Twist · Frequency map with subtraction: count up, then spend.',
        'majority-element': 'Lab · Count map first, then Boyer–Moore voting for O(1) space.',
        'happy-number': 'Combine · A set detects when a process repeats. The same question returns as Linked List Cycle (W11).'
      }
    },
    {
      pattern: 'Week 4 · Arrays',
      card: {
        signal: '"in place", "subarray", "rotate", "maximum profit".',
        coreMove: 'One pass with a well-chosen running value (best so far, write position, running sum).',
        buildsOn: 'Week 1 running values; Week 3 complexity thinking.',
        trap: 'Creating a new list when the problem says in place.'
      },
      slugs: [
        'remove-element',
        'remove-duplicates-from-sorted-array',
        'move-zeroes',
        'best-time-to-buy-and-sell-stock',
        'missing-number',
        'rotate-array',
        'maximum-subarray',
        'contains-duplicate-ii',
        'maximum-sum-circular-subarray'
      ],
      notes: {
        'remove-element': 'Warm-up · A write index: copy only the values you keep.',
        'remove-duplicates-from-sorted-array': 'Warm-up · Same write index, now using the fact that the list is sorted.',
        'move-zeroes': 'Lab · Write index again, keeping order.',
        'best-time-to-buy-and-sell-stock': 'Lab · Running minimum (Week 1 running value) and best profit so far.',
        'missing-number': 'Lab · Three ways: Week 2 sum formula, Week 3 set, or XOR (returns in W21).',
        'rotate-array': 'Lab · Reversal trick: reverse all, then each part. First Medium.',
        'maximum-subarray': 'Lab · Kadane: a running sum that resets when it goes negative. Returns in W13, W18, W19.',
        'contains-duplicate-ii': 'Combine · Week 3 set, now remembering the last index: a first look at a "window" (W7).',
        'maximum-sum-circular-subarray': 'Stretch (optional) · Kadane twice: best subarray, or total minus the worst one.'
      }
    },
    {
      pattern: 'Week 5 · Strings',
      card: {
        signal: '"palindrome", "reverse", "prefix", "words".',
        coreMove: 'Two indexes moving towards each other or at different speeds.',
        buildsOn: 'Week 4 write index; Week 3 frequency maps.',
        trap: 'Building strings with += in a loop; Python strings are immutable, so collect parts in a list.'
      },
      slugs: [
        'length-of-last-word',
        'reverse-string',
        'valid-palindrome',
        'longest-common-prefix',
        'is-subsequence',
        'reverse-words-in-a-string',
        'string-compression',
        'isomorphic-strings',
        'best-time-to-buy-and-sell-stock-ii'
      ],
      notes: {
        'length-of-last-word': 'Warm-up · Scan from the end and skip spaces.',
        'reverse-string': 'Lab · Two indexes from both ends, swapping: the first two-pointer problem.',
        'valid-palindrome': 'Lab · Same two pointers, now skipping non-letters.',
        'longest-common-prefix': 'Lab · Compare column by column across all words. Returns with tries (W21).',
        'is-subsequence': 'Twist · Two indexes moving at different speeds.',
        'reverse-words-in-a-string': 'Lab · Split and reverse, then try it with two pointers.',
        'string-compression': 'Lab · Read index + write index (Week 4) on characters.',
        'isomorphic-strings': 'Combine · A map from one character to another: sets up Week 6 hashing.',
        'best-time-to-buy-and-sell-stock-ii': 'Revisit · Best Time to Buy and Sell Stock (Week 4) again, now collecting every rising step.'
      }
    },
    {
      pattern: 'Week 6 · Hashing',
      card: {
        signal: '"pair that sums to", "group", "frequency", "consecutive", "in O(n)".',
        coreMove: 'Store what you have seen so far so the answer is one lookup away.',
        buildsOn: 'Week 3 sets and counts; Week 5 character maps; Week 1 running sums.',
        trap: 'Checking the map after inserting the current element (Two Sum then pairs an element with itself).'
      },
      slugs: [
        'roman-to-integer',
        'word-pattern',
        'two-sum',
        'group-anagrams',
        'top-k-frequent-elements',
        'longest-consecutive-sequence',
        'subarray-sum-equals-k',
        'insert-delete-getrandom-o1'
      ],
      notes: {
        'roman-to-integer': 'Revisit · Week 5 string scan with a lookup table.',
        'word-pattern': 'Warm-up · Two-way map: Isomorphic Strings (W5) with words.',
        'two-sum': 'Lab · Look up target - x among values already seen.',
        'group-anagrams': 'Lab · Valid Anagram (W3) as a key: sorted word or letter counts.',
        'top-k-frequent-elements': 'Lab · Count map + buckets by frequency. Solved again with a heap in W15.',
        'longest-consecutive-sequence': 'Lab · A set; only start counting at numbers that begin a run.',
        'subarray-sum-equals-k': 'Lab · Running Sum (W1) + Two Sum lookup: count earlier prefix sums equal to sum - k.',
        'insert-delete-getrandom-o1': 'Stretch (optional) · A map and a list together, each covering the other\'s weakness.'
      }
    },
    {
      pattern: 'Week 7 · Two pointers and sliding window',
      card: {
        signal: '"sorted", "pair", "triplet", "longest/shortest substring", "subarray with sum".',
        coreMove: 'Move one pointer per step based on a rule; a window grows on the right and shrinks on the left.',
        buildsOn: 'Week 5 two indexes; Week 6 Two Sum; Week 4 write index.',
        trap: 'Shrinking a window with if instead of while.'
      },
      slugs: [
        'two-sum-ii-sorted-array',
        'remove-duplicates-from-sorted-array-ii',
        'container-with-most-water',
        '3sum',
        'longest-substring-without-repeating-characters',
        'minimum-size-subarray-sum',
        'permutation-in-string',
        'longest-repeating-character-replacement',
        'minimum-window-substring'
      ],
      notes: {
        'two-sum-ii-sorted-array': 'Warm-up · Two Sum (W6) on a sorted array: two pointers replace the map, O(1) space.',
        'remove-duplicates-from-sorted-array-ii': 'Twist · Week 4 write index, now allowing each value twice.',
        'container-with-most-water': 'Lab · Always move the shorter side, and why that is safe.',
        '3sum': 'Lab · Sort, fix one number, run Two Sum II on the rest; skip duplicates.',
        'longest-substring-without-repeating-characters': 'Lab · A variable window with a set (W3) of what is inside it.',
        'minimum-size-subarray-sum': 'Lab · Shrink the window while it is still valid.',
        'permutation-in-string': 'Lab · A fixed-size window with a frequency map (Valid Anagram, W3).',
        'longest-repeating-character-replacement': 'Stretch (optional) · Window is valid while size - most frequent count <= k.',
        'minimum-window-substring': 'Stretch (optional) · Longest Substring, Minimum Size Subarray Sum and Permutation in String combined: grow until valid, shrink while valid.'
      }
    },
    {
      pattern: 'Week 8 · Sorting and prefix sums',
      card: {
        signal: '"intervals", "merge", "range sum", "except self", "already sorted".',
        coreMove: 'Sorting first makes the rest one pass; a prefix array answers any range sum in O(1).',
        buildsOn: 'Week 7 pointers (merging); Week 1 running sum.',
        trap: 'Sorting intervals by end when the problem needs start, or the reverse (compare W18).'
      },
      slugs: [
        'implement-sorting-algorithms',
        'merge-sorted-array',
        'squares-of-a-sorted-array',
        'sort-colors',
        'range-sum-query-immutable',
        'product-of-array-except-self',
        'merge-intervals',
        'find-all-anagrams-in-a-string',
        'insert-interval'
      ],
      notes: {
        'implement-sorting-algorithms': 'Lab · Bubble, selection, insertion, merge, quick: compare their Big-O (W3).',
        'merge-sorted-array': 'Lab · Two pointers (W7), filled from the back so nothing is overwritten.',
        'squares-of-a-sorted-array': 'Twist · Two pointers from both ends into a sorted output.',
        'sort-colors': 'Lab · Three pointers in one pass (Dutch national flag).',
        'range-sum-query-immutable': 'Warm-up · The Week 1 running sum, stored so any range is prefix[r+1] - prefix[l].',
        'product-of-array-except-self': 'Lab · A prefix pass and a suffix pass, with products.',
        'merge-intervals': 'Lab · Sort by start, then merge in one pass.',
        'find-all-anagrams-in-a-string': 'Revisit · Week 7 fixed window (Permutation in String), now collecting every start.',
        'insert-interval': 'Stretch (optional) · Merge Intervals when the list is already sorted.'
      }
    },
    {
      pattern: 'Week 9 · Binary search',
      card: {
        signal: '"sorted", "minimum/maximum value such that", "in O(log n)", "rotated".',
        coreMove: 'Keep the answer inside [lo, hi] and halve the range every step; search for the first index where a yes/no test becomes true.',
        buildsOn: 'Week 8 sorted data; Week 2 math (square roots).',
        trap: 'Lo <= hi vs lo < hi and mid + 1 vs mid: pick one template and keep it.'
      },
      slugs: [
        'binary-search',
        'search-insert-position',
        'first-bad-version',
        'sqrtx',
        'find-first-and-last-position-of-element-in-sorted-array',
        'find-minimum-in-rotated-sorted-array',
        'search-in-rotated-sorted-array',
        'koko-eating-bananas',
        'search-a-2d-matrix',
        'median-of-two-sorted-arrays'
      ],
      notes: {
        'binary-search': 'Lab · The template itself.',
        'search-insert-position': 'Lab · What lo means when the loop ends.',
        'first-bad-version': 'Warm-up · Search for the first true: the template every later problem uses.',
        sqrtx: 'Twist · Binary search on the answer, not on an array (Week 2 math).',
        'find-first-and-last-position-of-element-in-sorted-array': 'Lab · Run "first true" twice.',
        'find-minimum-in-rotated-sorted-array': 'Twist · Decide which half is sorted.',
        'search-in-rotated-sorted-array': 'Lab · Find Minimum in Rotated Sorted Array plus a normal search in the sorted half.',
        'koko-eating-bananas': 'Lab · Binary search on the answer with a feasibility check.',
        'search-a-2d-matrix': 'Combine · Treat the matrix as one sorted list: index → (row, column).',
        'median-of-two-sorted-arrays': 'Stretch (optional) · Binary search on a partition point.'
      }
    },
    {
      pattern: 'Week 10 · Recursion and backtracking',
      card: {
        signal: '"all possible", "every combination", "generate", "permutations", "subsets".',
        coreMove: 'At each step, make a choice, recurse, undo the choice. Draw the recursion tree.',
        buildsOn: 'Week 2 Fibonacci and powers; Week 8 sorting (to skip duplicates); Week 7 3Sum\'s duplicate skipping.',
        trap: 'Appending the working list itself instead of a copy, so every saved answer changes later.'
      },
      slugs: [
        'power-and-factorial-recursion',
        'powx-n',
        'subsets',
        'combinations',
        'combination-sum',
        'permutations',
        'subsets-ii',
        'letter-combinations-of-a-phone-number',
        'generate-parentheses',
        'word-search',
        'n-queens'
      ],
      notes: {
        'power-and-factorial-recursion': 'Lab · Base case + "trust the smaller call", on Week 2 problems you already solved with loops.',
        'powx-n': 'Twist · Halve the exponent each call: recursion meets the halving of Week 9.',
        subsets: 'Lab · Include or exclude each element: the first recursion tree.',
        combinations: 'Twist · Subsets with a fixed size: stop early.',
        'combination-sum': 'Lab · Reuse allowed; prune when the sum passes the target.',
        permutations: 'Lab · Choose from the unused elements at each level.',
        'subsets-ii': 'Combine · Sort (W8) and skip duplicates (3Sum, W7) inside the recursion.',
        'letter-combinations-of-a-phone-number': 'Twist · One level per digit, a choice per letter.',
        'generate-parentheses': 'Lab · Choices limited by a rule (open and close counts). Returns with stacks in W12.',
        'word-search': 'Stretch (optional) · Backtracking on a grid: prepares grid DFS in W16.',
        'n-queens': 'Stretch (optional) · Backtracking with three sets for columns and diagonals.'
      }
    },
    {
      pattern: 'Week 11 · Linked lists',
      card: {
        signal: '"node", "next", "in place", "cycle", "middle", "kth from the end".',
        coreMove: 'Draw the boxes and arrows; use a dummy head and fast/slow pointers.',
        buildsOn: 'Week 7 two pointers; Week 3 Happy Number (repeat detection); Week 2 Plus One (carry).',
        trap: 'Losing the rest of the list by changing next before saving it.'
      },
      slugs: [
        'middle-of-the-linked-list',
        'remove-duplicates-from-sorted-list',
        'reverse-linked-list',
        'merge-two-sorted-lists',
        'linked-list-cycle',
        'remove-nth-node-from-end-of-list',
        'palindrome-linked-list',
        'reorder-list',
        'add-two-numbers',
        'lru-cache'
      ],
      notes: {
        'middle-of-the-linked-list': 'Lab · Fast moves two steps, slow moves one.',
        'remove-duplicates-from-sorted-list': 'Warm-up · Walk the list and relink around repeats.',
        'reverse-linked-list': 'Lab · Three pointers: previous, current, next.',
        'merge-two-sorted-lists': 'Lab · Merge Sorted Array (W8) with nodes and a dummy head.',
        'linked-list-cycle': 'Lab · Happy Number (W3) again: fast/slow instead of a set, O(1) space.',
        'remove-nth-node-from-end-of-list': 'Lab · Two pointers with a gap of n.',
        'palindrome-linked-list': 'Combine · Middle of the Linked List + Reverse Linked List + compare.',
        'reorder-list': 'Combine · Middle + reverse + merge: three earlier problems in one.',
        'add-two-numbers': 'Twist · Plus One\'s carry (W2) on lists.',
        'lru-cache': 'Stretch (optional) · A hash map (W6) plus a doubly linked list.'
      }
    },
    {
      pattern: 'Week 12 · Stacks and queues',
      card: {
        signal: '"matching brackets", "next greater", "undo", "most recent", "evaluate".',
        coreMove: 'Push what you might still need; pop when it is resolved. A monotonic stack keeps items in order.',
        buildsOn: 'Week 10 Generate Parentheses; Week 7 windows.',
        trap: 'Popping from an empty stack: check first.'
      },
      slugs: [
        'valid-parentheses',
        'backspace-string-compare',
        'implement-queue-using-stacks',
        'min-stack',
        'evaluate-reverse-polish-notation',
        'simplify-path',
        'daily-temperatures',
        'car-fleet',
        'sliding-window-maximum',
        'largest-rectangle-in-histogram'
      ],
      notes: {
        'valid-parentheses': 'Lab · The rule from Generate Parentheses (W10), checked with a stack.',
        'backspace-string-compare': 'Warm-up · Stack, then two pointers from the back (W7) for O(1) space.',
        'implement-queue-using-stacks': 'Lab · Two stacks make a queue.',
        'min-stack': 'Lab · Store the minimum alongside each item.',
        'evaluate-reverse-polish-notation': 'Lab · Numbers wait on the stack until an operator arrives.',
        'simplify-path': 'Twist · A stack of folder names.',
        'daily-temperatures': 'Lab · Monotonic stack: "next warmer day".',
        'car-fleet': 'Combine · Sort (W8) + monotonic stack.',
        'sliding-window-maximum': 'Stretch (optional) · A Week 7 window kept in a monotonic deque.',
        'largest-rectangle-in-histogram': 'Stretch (optional) · Monotonic stack finding both boundaries.'
      }
    },
    {
      pattern: 'Week 13 · Binary trees',
      card: {
        signal: '"root", "depth", "level", "path", "subtree".',
        coreMove: 'Solve for the left and right children, then combine at the node. Decide: pass a value down, or return one up?',
        buildsOn: 'Week 10 recursion; Week 12 stacks and queues (iterative traversals, level order).',
        trap: 'Forgetting the empty-tree base case.'
      },
      slugs: [
        'binary-tree-inorder-traversal',
        'binary-tree-preorder-traversal',
        'binary-tree-postorder-traversal',
        'maximum-depth-of-binary-tree',
        'same-tree',
        'invert-binary-tree',
        'symmetric-tree',
        'path-sum',
        'binary-tree-level-order-traversal',
        'binary-tree-right-side-view',
        'diameter-of-binary-tree',
        'balanced-binary-tree',
        'binary-tree-maximum-path-sum'
      ],
      notes: {
        'binary-tree-inorder-traversal': 'Lab · Recursion (W10), then iteratively with a stack (W12).',
        'binary-tree-preorder-traversal': 'Lab · Same, node first.',
        'binary-tree-postorder-traversal': 'Lab · Same, node last.',
        'maximum-depth-of-binary-tree': 'Lab · Return a value up: 1 + max(left, right).',
        'same-tree': 'Warm-up · Recurse on two trees at once.',
        'invert-binary-tree': 'Lab · Swap children at every node.',
        'symmetric-tree': 'Twist · Same Tree on a mirrored pair.',
        'path-sum': 'Twist · Pass a value down instead of returning one up.',
        'binary-tree-level-order-traversal': 'Lab · A queue (W12), one level at a time.',
        'binary-tree-right-side-view': 'Twist · Level order, keep the last node of each level.',
        'diameter-of-binary-tree': 'Lab · Return height up, update a best answer on the side.',
        'balanced-binary-tree': 'Combine · The same height-returning trick as Diameter of Binary Tree.',
        'binary-tree-maximum-path-sum': 'Stretch (optional) · Diameter of Binary Tree + Kadane\'s "drop negatives" (W4).'
      }
    },
    {
      pattern: 'Week 14 · Binary search trees',
      card: {
        signal: '"BST", "sorted order", "kth smallest", "valid".',
        coreMove: 'Left < node < right, so go one way only; an inorder traversal visits values in sorted order.',
        buildsOn: 'Week 9 binary search; Week 13 traversals and passing values down.',
        trap: 'Checking only a node and its children; the whole left subtree must be smaller.'
      },
      slugs: [
        'search-in-a-binary-search-tree',
        'insert-into-a-binary-search-tree',
        'validate-binary-search-tree',
        'minimum-absolute-difference-in-bst',
        'kth-smallest-element-in-a-bst',
        'lowest-common-ancestor-of-a-binary-search-tree',
        'convert-sorted-array-to-binary-search-tree',
        'lowest-common-ancestor-of-a-binary-tree',
        'binary-search-tree-iterator',
        'time-based-key-value-store',
        'construct-binary-tree-from-preorder-and-inorder-traversal'
      ],
      notes: {
        'search-in-a-binary-search-tree': 'Warm-up · Binary search (W9) on a tree.',
        'insert-into-a-binary-search-tree': 'Lab · Search, then attach at the empty spot.',
        'validate-binary-search-tree': 'Lab · Pass min/max bounds down (Path Sum, W13).',
        'minimum-absolute-difference-in-bst': 'Twist · Inorder gives a sorted list: compare neighbours.',
        'kth-smallest-element-in-a-bst': 'Lab · Inorder with a counter; stop early.',
        'lowest-common-ancestor-of-a-binary-search-tree': 'Lab · The split point where the two values go different ways.',
        'convert-sorted-array-to-binary-search-tree': 'Lab · The middle element is the root: Week 9 halving.',
        'lowest-common-ancestor-of-a-binary-tree': 'Combine · LCA of a BST without the ordering: return what each side found.',
        'binary-search-tree-iterator': 'Combine · Iterative inorder traversal (W13) with a stack (W12), one step at a time.',
        'time-based-key-value-store': 'Revisit · Week 9 "last value at or before" search, inside a hash map (W6).',
        'construct-binary-tree-from-preorder-and-inorder-traversal': 'Stretch (optional) · Preorder gives the root; inorder splits left from right.'
      }
    },
    {
      pattern: 'Week 15 · Heaps and priority queues',
      card: {
        signal: '"k largest/smallest", "closest", "top k", "merge k", "running median".',
        coreMove: 'Keep a heap of size k so the answer is always on top; heapq is a min-heap.',
        buildsOn: 'Week 6 frequency maps; Week 11 Merge Two Lists; Week 8 sorting (what the heap avoids).',
        trap: 'Pushing everything into the heap when a size-k heap is enough.'
      },
      slugs: [
        'kth-largest-element-in-a-stream',
        'last-stone-weight',
        'kth-largest-element-in-an-array',
        'k-closest-points-to-origin',
        'top-k-frequent-words',
        'task-scheduler',
        'merge-k-sorted-lists',
        'find-k-pairs-with-smallest-sums',
        'find-median-from-data-stream'
      ],
      notes: {
        'kth-largest-element-in-a-stream': 'Warm-up · A min-heap of size k: the top is the kth largest.',
        'last-stone-weight': 'Lab · A max-heap (negate values in Python).',
        'kth-largest-element-in-an-array': 'Lab · Kth Largest Element in a Stream on a fixed array; compare with sorting (W8).',
        'k-closest-points-to-origin': 'Lab · A heap keyed by distance.',
        'top-k-frequent-words': 'Lab · Count map (W6) + heap with a tie-break on the word.',
        'task-scheduler': 'Twist · Always run the most frequent task next.',
        'merge-k-sorted-lists': 'Lab · Merge Two Lists (W11) for k lists: the heap picks the next node.',
        'find-k-pairs-with-smallest-sums': 'Combine · Grow candidates from the smallest pair, like Merge k Sorted Lists.',
        'find-median-from-data-stream': 'Stretch (optional) · Two heaps: the low half and the high half.'
      }
    },
    {
      pattern: 'Week 16 · Graphs I: representation, BFS and DFS',
      card: {
        signal: '"connected", "islands", "grid", "neighbours", "spread", "minimum steps".',
        coreMove: 'Build an adjacency list, keep a visited set, then DFS (recursion) or BFS (queue).',
        buildsOn: 'Week 10 recursion and Word Search; Week 13 level order; Week 3 sets.',
        trap: 'Marking a cell visited when it is popped instead of when it is added, so it is queued many times.'
      },
      slugs: [
        'find-if-path-exists-in-graph',
        'flood-fill',
        'number-of-islands',
        'max-area-of-island',
        'rotting-oranges',
        'shortest-path-in-binary-matrix',
        'clone-graph',
        'surrounded-regions',
        'snakes-and-ladders'
      ],
      notes: {
        'find-if-path-exists-in-graph': 'Lab · Build the adjacency list; DFS with a visited set.',
        'flood-fill': 'Lab · DFS on a grid: neighbours are up, down, left, right.',
        'number-of-islands': 'Lab · Count how many times a new DFS starts.',
        'max-area-of-island': 'Twist · The DFS returns the island size (returning a value up, W13).',
        'rotting-oranges': 'Lab · BFS from many sources at once, level by level (Level Order Traversal, W13).',
        'shortest-path-in-binary-matrix': 'Twist · BFS gives the fewest steps; DFS does not.',
        'clone-graph': 'Lab · DFS + a map from old node to new node (W6).',
        'surrounded-regions': 'Combine · Start DFS from the border and keep what it reaches.',
        'snakes-and-ladders': 'Stretch (optional) · BFS on a board that first needs an index → cell mapping.'
      }
    },
    {
      pattern: 'Week 17 · Graphs II: topological sort, shortest paths, union–find',
      card: {
        signal: '"prerequisites", "order", "cheapest/fastest route", "redundant edge", "groups".',
        coreMove: 'In-degrees for ordering; Dijkstra = BFS with a heap; union–find to merge groups.',
        buildsOn: 'Week 16 BFS/DFS; Week 15 heaps.',
        trap: 'Dijkstra with negative edge weights (it doesn\'t work).'
      },
      slugs: [
        'number-of-provinces',
        'redundant-connection',
        'course-schedule',
        'course-schedule-ii',
        'network-delay-time',
        'pacific-atlantic-water-flow',
        'min-cost-to-connect-all-points',
        'evaluate-division',
        'cheapest-flights-within-k-stops',
        'word-ladder'
      ],
      notes: {
        'number-of-provinces': 'Lab · Count components with DFS (W16), then redo it with union–find.',
        'redundant-connection': 'Lab · Union–find: the edge that joins two already-joined nodes.',
        'course-schedule': 'Lab · Topological sort: is there a cycle among prerequisites?',
        'course-schedule-ii': 'Twist · Same, but output the order.',
        'network-delay-time': 'Lab · Dijkstra: BFS (W16) with a heap (W15).',
        'pacific-atlantic-water-flow': 'Lab · Surrounded Regions\' "start from the border" (W16), from both oceans.',
        'min-cost-to-connect-all-points': 'Combine · Minimum spanning tree with union–find or a heap.',
        'evaluate-division': 'Combine · A weighted graph: multiply along a DFS path.',
        'cheapest-flights-within-k-stops': 'Stretch (optional) · BFS levels limit the stops; relax edges each level.',
        'word-ladder': 'Stretch (optional) · BFS where neighbours are words one letter apart.'
      }
    },
    {
      pattern: 'Week 18 · Greedy algorithms',
      card: {
        signal: '"minimum number of", "maximum you can", "can you reach", intervals again.',
        coreMove: 'Make the locally best choice, and be able to say why it never hurts later.',
        buildsOn: 'Week 8 sorting and intervals; Week 4 Kadane-style resets; Week 16 BFS levels.',
        trap: 'Using greedy where it fails (Coin Change, W19). Look for a counter-example first.'
      },
      slugs: [
        'assign-cookies',
        'lemonade-change',
        'jump-game',
        'jump-game-ii',
        'gas-station',
        'non-overlapping-intervals',
        'minimum-number-of-arrows-to-burst-balloons',
        'partition-labels',
        'hand-of-straights',
        'candy'
      ],
      notes: {
        'assign-cookies': 'Lab · Sort both lists (W8), match with two pointers (W7).',
        'lemonade-change': 'Warm-up · Always give the largest note you can.',
        'jump-game': 'Lab · Track the furthest reachable index.',
        'jump-game-ii': 'Twist · BFS levels (W16) without a queue.',
        'gas-station': 'Lab · Restart when the tank goes negative: Kadane\'s reset (W4).',
        'non-overlapping-intervals': 'Lab · Sort by end, not start (compare Merge Intervals, W8).',
        'minimum-number-of-arrows-to-burst-balloons': 'Twist · The same sort-by-end choice.',
        'partition-labels': 'Lab · Last-index map (W6) + cut when the window closes.',
        'hand-of-straights': 'Combine · Count map (W6) + smallest-first, with sorted keys or a heap (W15).',
        candy: 'Stretch (optional) · A left pass and a right pass, like prefix/suffix (W8).'
      }
    },
    {
      pattern: 'Week 19 · Dynamic programming I',
      card: {
        signal: '"number of ways", "minimum cost", "maximum you can take", and a choice at each step.',
        coreMove: 'Define dp[i], write how it depends on smaller i, fill the table in order.',
        buildsOn: 'Week 2 Fibonacci; Week 10 recursion (memoise first, then turn into a table); Week 4 Kadane.',
        trap: 'Jumping to the table before you can state in one sentence what dp[i] means.'
      },
      slugs: [
        'climbing-stairs',
        'min-cost-climbing-stairs',
        'house-robber',
        'house-robber-ii',
        'decode-ways',
        'coin-change',
        'maximum-product-subarray',
        'word-break',
        'longest-increasing-subsequence',
        'longest-palindromic-substring'
      ],
      notes: {
        'climbing-stairs': 'Lab · Fibonacci (W2) again: recursion → memo → table → two variables.',
        'min-cost-climbing-stairs': 'Lab · The same recurrence with costs: min instead of +.',
        'house-robber': 'Lab · Take or skip, like Subsets (W10), with the best value remembered.',
        'house-robber-ii': 'Twist · Run House Robber twice: without the first house, then without the last.',
        'decode-ways': 'Twist · Climbing Stairs with conditions on each step.',
        'coin-change': 'Lab · Minimum over all choices; and why greedy (W18) fails here.',
        'maximum-product-subarray': 'Combine · Kadane (W4) tracking both the max and the min.',
        'word-break': 'Combine · dp[i] = "the first i letters can be split", with a word set (W6).',
        'longest-increasing-subsequence': 'Lab · O(n²) DP; the O(n log n) version reuses binary search (W9).',
        'longest-palindromic-substring': 'Stretch (optional) · Expand around each centre (two pointers, W5).'
      }
    },
    {
      pattern: 'Week 20 · Dynamic programming II',
      card: {
        signal: 'A grid, two strings, "subset with sum", "capacity".',
        coreMove: 'Dp[i][j] from its neighbours (top, left, diagonal); knapsack = take or skip with a capacity.',
        buildsOn: 'Week 19 1-D DP; Week 1 pyramids (row-by-row thinking); Week 16 grids.',
        trap: 'The wrong loop direction in 1-D knapsack, which reuses an item twice.'
      },
      slugs: [
        'unique-paths',
        'unique-paths-ii',
        'minimum-path-sum',
        'triangle',
        'longest-common-subsequence',
        'knapsack-0-1',
        'partition-equal-subset-sum',
        'coin-change-ii',
        'target-sum',
        'edit-distance',
        'maximal-square',
        'longest-increasing-path-in-a-matrix'
      ],
      notes: {
        'unique-paths': 'Lab · Each cell = top + left.',
        'unique-paths-ii': 'Twist · The same with obstacles.',
        'minimum-path-sum': 'Twist · min instead of +, like Min Cost Climbing Stairs (W19).',
        triangle: 'Combine · Bottom-up row by row: the Week 1 pyramid, solved as DP.',
        'longest-common-subsequence': 'Lab · A table over two strings: match → diagonal + 1.',
        'knapsack-0-1': 'Lab · Take or skip (House Robber) with a weight limit.',
        'partition-equal-subset-sum': 'Lab · Knapsack with target = half the total.',
        'coin-change-ii': 'Twist · Unbounded knapsack, counting ways (compare Coin Change, W19).',
        'target-sum': 'Combine · Rewrite as subset sum (Partition Equal Subset Sum).',
        'edit-distance': 'Lab · The LCS table (Longest Common Subsequence) with three moves.',
        'maximal-square': 'Stretch (optional) · Each cell from three neighbours, taking the minimum.',
        'longest-increasing-path-in-a-matrix': 'Stretch (optional) · Grid DFS (W16) + memo (W19).'
      }
    },
    {
      pattern: 'Week 21 · Tries and bit manipulation',
      card: {
        signal: '"prefix", "autocomplete", "dictionary of words"; "XOR", "bits", "without + or -", "appears once".',
        coreMove: 'A trie is a tree of dicts, one level per letter; XOR cancels equal values.',
        buildsOn: 'Week 13 trees; Week 6 maps; Week 2 Plus One carry; Week 19 DP; Week 10 backtracking.',
        trap: 'Python integers have no fixed width: mask with 0xFFFFFFFF where a problem assumes 32 bits.'
      },
      slugs: [
        'single-number',
        'number-of-1-bits',
        'counting-bits',
        'reverse-bits',
        'add-binary',
        'sum-of-two-integers',
        'implement-trie-prefix-tree',
        'design-add-and-search-words-data-structure',
        'word-search-ii'
      ],
      notes: {
        'single-number': 'Lab · XOR cancels pairs: Missing Number\'s third method (W4).',
        'number-of-1-bits': 'Lab · n & (n - 1) removes the lowest set bit (Power of Two, W2, in one line).',
        'counting-bits': 'Lab · DP (W19) on bits: bits[i] = bits[i >> 1] + (i & 1).',
        'reverse-bits': 'Twist · Shift out on one side, shift in on the other.',
        'add-binary': 'Warm-up · Carry again (Plus One W2, Add Two Numbers W11), in base 2.',
        'sum-of-two-integers': 'Combine · The carry made with & and ^.',
        'implement-trie-prefix-tree': 'Lab · A tree (W13) of maps (W6). Longest Common Prefix (W5) becomes one walk down.',
        'design-add-and-search-words-data-structure': 'Lab · A trie + DFS that branches on ..',
        'word-search-ii': 'Stretch (optional) · Trie + grid backtracking (W10, W16).'
      }
    },
    {
      pattern: 'Week 22 · Spot the pattern',
      slugs: [
        'valid-sudoku',
        'find-the-duplicate-number',
        'rotate-image',
        'spiral-matrix',
        'copy-list-with-random-pointer',
        'count-good-nodes-in-binary-tree',
        'palindromic-substrings',
        'merge-triplets-to-form-target-triplet'
      ]
    },
    {
      pattern: 'Week 23 · Interview set A: arrays, strings, hashing, two pointers',
      slugs: [
        'summary-ranges',
        'find-the-index-of-the-first-occurrence-in-a-string',
        'integer-to-roman',
        'zigzag-conversion',
        'h-index',
        'set-matrix-zeroes',
        'trapping-rain-water'
      ]
    },
    {
      pattern: 'Week 24 · Interview set B: trees, graphs, heaps',
      slugs: [
        'binary-tree-zigzag-level-order-traversal',
        'flatten-binary-tree-to-linked-list',
        'construct-binary-tree-from-inorder-and-postorder-traversal',
        'minimum-genetic-mutation',
        'design-twitter',
        'serialize-and-deserialize-binary-tree',
        'swim-in-rising-water'
      ]
    },
    {
      pattern: 'Week 25 · Interview set C: mixed, including DP',
      slugs: [
        'multiply-strings',
        'game-of-life',
        'valid-parenthesis-string',
        'best-time-to-buy-and-sell-stock-with-cooldown',
        'interleaving-string',
        'minimum-interval-to-include-each-query',
        'distinct-subsequences'
      ]
    },
    {
      pattern: 'Week 26 · Final mock',
      slugs: [
        'detect-squares',
        'reverse-linked-list-ii',
        'combination-sum-ii',
        'sort-list'
      ]
    }
  ]
};
