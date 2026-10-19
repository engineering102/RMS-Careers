// Curated problem sheets for the DSA Practice catalog. A sheet is a membership list: ordered groups of problem slugs
// drawn from the shared problem bank (the DSA Sheet plus dsa-problem-bank.ts), so a problem in several sheets is one
// record with one progress row. Each sheet keeps its own grouping; the group name becomes the problem's pattern within
// that sheet only.
//
// To add a sheet, append a definition here (any new problems go in dsa-problem-bank.ts first). Company sheets use
// category 'company' and a `company` label, and must come from a verified source the content team can stand behind:
// never publish an invented list as a company's real interview questions.
import type { DSAQuestion, DSASheet, DsaSheetCategory } from '@/lib/types/dsa';

export interface SheetGroupDefinition {
  pattern: string;
  slugs: string[];
}

export interface SheetDefinition {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: DsaSheetCategory;
  company?: string;
  groups: SheetGroupDefinition[];
}

export const CURATED_SHEET_DEFINITIONS: SheetDefinition[] = [
  {
    slug: 'blind-75',
    title: 'Blind 75',
    shortDescription: 'The widely shared list of 75 essential interview problems, grouped by its original categories.',
    description:
      'A compact, high-yield set of 75 problems that covers the core interview topics, grouped the way the original list is: arrays, binary, dynamic programming, graphs, intervals, linked lists, matrices, strings, trees and heaps. A good fit when time is short. Problems shared with other sheets keep the same progress and notes.',
    category: 'interview',
    groups: [
      {
        pattern: 'Array',
        slugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          'contains-duplicate',
          'product-of-array-except-self',
          'maximum-subarray',
          'maximum-product-subarray',
          'find-minimum-in-rotated-sorted-array',
          'search-in-rotated-sorted-array',
          '3sum',
          'container-with-most-water'
        ]
      },
      {
        pattern: 'Binary',
        slugs: ['sum-of-two-integers', 'number-of-1-bits', 'counting-bits', 'missing-number', 'reverse-bits']
      },
      {
        pattern: 'Dynamic Programming',
        slugs: [
          'climbing-stairs',
          'coin-change',
          'longest-increasing-subsequence',
          'longest-common-subsequence',
          'word-break',
          'combination-sum-iv',
          'house-robber',
          'house-robber-ii',
          'decode-ways',
          'unique-paths',
          'jump-game'
        ]
      },
      {
        pattern: 'Graph',
        slugs: [
          'clone-graph',
          'course-schedule',
          'pacific-atlantic-water-flow',
          'number-of-islands',
          'longest-consecutive-sequence',
          'alien-dictionary',
          'graph-valid-tree',
          'number-of-connected-components-in-an-undirected-graph'
        ]
      },
      {
        pattern: 'Interval',
        slugs: ['insert-interval', 'merge-intervals', 'non-overlapping-intervals', 'meeting-rooms', 'meeting-rooms-ii']
      },
      {
        pattern: 'Linked List',
        slugs: [
          'reverse-linked-list',
          'linked-list-cycle',
          'merge-two-sorted-lists',
          'merge-k-sorted-lists',
          'remove-nth-node-from-end-of-list',
          'reorder-list'
        ]
      },
      {
        pattern: 'Matrix',
        slugs: ['set-matrix-zeroes', 'spiral-matrix', 'rotate-image', 'word-search']
      },
      {
        pattern: 'String',
        slugs: [
          'longest-substring-without-repeating-characters',
          'longest-repeating-character-replacement',
          'minimum-window-substring',
          'valid-anagram',
          'group-anagrams',
          'valid-parentheses',
          'valid-palindrome',
          'longest-palindromic-substring',
          'palindromic-substrings',
          'encode-and-decode-strings'
        ]
      },
      {
        pattern: 'Tree',
        slugs: [
          'maximum-depth-of-binary-tree',
          'same-tree',
          'invert-binary-tree',
          'binary-tree-maximum-path-sum',
          'binary-tree-level-order-traversal',
          'serialize-and-deserialize-binary-tree',
          'subtree-of-another-tree',
          'construct-binary-tree-from-preorder-and-inorder-traversal',
          'validate-binary-search-tree',
          'kth-smallest-element-in-a-bst',
          'lowest-common-ancestor-of-a-binary-search-tree',
          'implement-trie-prefix-tree',
          'design-add-and-search-words-data-structure',
          'word-search-ii'
        ]
      },
      {
        // Merge k Sorted Lists is also listed here in the original; it appears once, under Linked List.
        pattern: 'Heap',
        slugs: ['top-k-frequent-elements', 'find-median-from-data-stream']
      }
    ]
  },
  {
    slug: 'leetcode-150',
    title: 'LeetCode 150',
    shortDescription: "LeetCode's Top Interview 150 study plan: a broad, 150-problem interview preparation path.",
    description:
      "A broader interview preparation path following the sections of LeetCode's Top Interview 150 study plan, from arrays and strings through trees, graphs, binary search and heaps to multidimensional dynamic programming. Problems shared with other sheets keep the same progress and notes.",
    category: 'interview',
    groups: [
      {
        pattern: 'Array / String',
        slugs: [
          'merge-sorted-array',
          'remove-element',
          'remove-duplicates-from-sorted-array',
          'remove-duplicates-from-sorted-array-ii',
          'majority-element',
          'rotate-array',
          'best-time-to-buy-and-sell-stock',
          'best-time-to-buy-and-sell-stock-ii',
          'jump-game',
          'jump-game-ii',
          'h-index',
          'insert-delete-getrandom-o1',
          'product-of-array-except-self',
          'gas-station',
          'candy',
          'trapping-rain-water',
          'roman-to-integer',
          'integer-to-roman',
          'length-of-last-word',
          'longest-common-prefix',
          'reverse-words-in-a-string',
          'zigzag-conversion',
          'find-the-index-of-the-first-occurrence-in-a-string',
          'text-justification'
        ]
      },
      {
        pattern: 'Two Pointers',
        slugs: ['valid-palindrome', 'is-subsequence', 'two-sum-ii-sorted-array', 'container-with-most-water', '3sum']
      },
      {
        pattern: 'Sliding Window',
        slugs: [
          'minimum-size-subarray-sum',
          'longest-substring-without-repeating-characters',
          'substring-with-concatenation-of-all-words',
          'minimum-window-substring'
        ]
      },
      {
        pattern: 'Matrix',
        slugs: ['valid-sudoku', 'spiral-matrix', 'rotate-image', 'set-matrix-zeroes', 'game-of-life']
      },
      {
        pattern: 'Hashmap',
        slugs: [
          'ransom-note',
          'isomorphic-strings',
          'word-pattern',
          'valid-anagram',
          'group-anagrams',
          'two-sum',
          'happy-number',
          'contains-duplicate-ii',
          'longest-consecutive-sequence'
        ]
      },
      {
        pattern: 'Intervals',
        slugs: ['summary-ranges', 'merge-intervals', 'insert-interval', 'minimum-number-of-arrows-to-burst-balloons']
      },
      {
        pattern: 'Stack',
        slugs: ['valid-parentheses', 'simplify-path', 'min-stack', 'evaluate-reverse-polish-notation', 'basic-calculator']
      },
      {
        pattern: 'Linked List',
        slugs: [
          'linked-list-cycle',
          'add-two-numbers',
          'merge-two-sorted-lists',
          'copy-list-with-random-pointer',
          'reverse-linked-list-ii',
          'reverse-nodes-in-k-group',
          'remove-nth-node-from-end-of-list',
          'remove-duplicates-from-sorted-list-ii',
          'rotate-list',
          'partition-list',
          'lru-cache'
        ]
      },
      {
        pattern: 'Binary Tree General',
        slugs: [
          'maximum-depth-of-binary-tree',
          'same-tree',
          'invert-binary-tree',
          'symmetric-tree',
          'construct-binary-tree-from-preorder-and-inorder-traversal',
          'construct-binary-tree-from-inorder-and-postorder-traversal',
          'populating-next-right-pointers-in-each-node-ii',
          'flatten-binary-tree-to-linked-list',
          'path-sum',
          'sum-root-to-leaf-numbers',
          'binary-tree-maximum-path-sum',
          'binary-search-tree-iterator',
          'count-complete-tree-nodes',
          'lowest-common-ancestor-of-a-binary-tree'
        ]
      },
      {
        pattern: 'Binary Tree BFS',
        slugs: [
          'binary-tree-right-side-view',
          'average-of-levels-in-binary-tree',
          'binary-tree-level-order-traversal',
          'binary-tree-zigzag-level-order-traversal'
        ]
      },
      {
        pattern: 'Binary Search Tree',
        slugs: ['minimum-absolute-difference-in-bst', 'kth-smallest-element-in-a-bst', 'validate-binary-search-tree']
      },
      {
        pattern: 'Graph General',
        slugs: [
          'number-of-islands',
          'surrounded-regions',
          'clone-graph',
          'evaluate-division',
          'course-schedule',
          'course-schedule-ii'
        ]
      },
      {
        pattern: 'Graph BFS',
        slugs: ['snakes-and-ladders', 'minimum-genetic-mutation', 'word-ladder']
      },
      {
        pattern: 'Trie',
        slugs: ['implement-trie-prefix-tree', 'design-add-and-search-words-data-structure', 'word-search-ii']
      },
      {
        pattern: 'Backtracking',
        slugs: [
          'letter-combinations-of-a-phone-number',
          'combinations',
          'permutations',
          'combination-sum',
          'n-queens-ii',
          'generate-parentheses',
          'word-search'
        ]
      },
      {
        pattern: 'Divide & Conquer',
        slugs: ['convert-sorted-array-to-binary-search-tree', 'sort-list', 'construct-quad-tree', 'merge-k-sorted-lists']
      },
      {
        pattern: "Kadane's Algorithm",
        slugs: ['maximum-subarray', 'maximum-sum-circular-subarray']
      },
      {
        pattern: 'Binary Search',
        slugs: [
          'search-insert-position',
          'search-a-2d-matrix',
          'find-peak-element',
          'search-in-rotated-sorted-array',
          'find-first-and-last-position-of-element-in-sorted-array',
          'find-minimum-in-rotated-sorted-array',
          'median-of-two-sorted-arrays'
        ]
      },
      {
        pattern: 'Heap',
        slugs: ['kth-largest-element-in-an-array', 'ipo', 'find-k-pairs-with-smallest-sums', 'find-median-from-data-stream']
      },
      {
        pattern: 'Bit Manipulation',
        slugs: ['add-binary', 'reverse-bits', 'number-of-1-bits', 'single-number', 'single-number-ii', 'bitwise-and-of-numbers-range']
      },
      {
        pattern: 'Math',
        slugs: ['palindrome-number', 'plus-one', 'factorial-trailing-zeroes', 'sqrtx', 'powx-n', 'max-points-on-a-line']
      },
      {
        pattern: '1D DP',
        slugs: ['climbing-stairs', 'house-robber', 'word-break', 'coin-change', 'longest-increasing-subsequence']
      },
      {
        pattern: 'Multidimensional DP',
        slugs: [
          'triangle',
          'minimum-path-sum',
          'unique-paths-ii',
          'longest-palindromic-substring',
          'interleaving-string',
          'edit-distance',
          'best-time-to-buy-and-sell-stock-iii',
          'best-time-to-buy-and-sell-stock-iv',
          'maximal-square'
        ]
      }
    ]
  }
];

/**
 * Resolves a definition against the problem bank. Each problem keeps its record (same slug, so the same progress)
 * and takes the sheet's group name as its pattern. Unknown slugs fail loudly: a sheet must never silently lose a
 * problem.
 */
export function resolveSheet(definition: SheetDefinition, bank: ReadonlyMap<string, DSAQuestion>): DSASheet {
  const questions = definition.groups.flatMap((group) =>
    group.slugs.map((slug) => {
      const question = bank.get(slug);
      if (!question) throw new Error(`DSA sheet "${definition.slug}" lists unknown problem "${slug}"`);
      return { ...question, pattern: group.pattern };
    })
  );
  return {
    id: `sheet-${definition.slug}`,
    slug: definition.slug,
    title: definition.title,
    shortDescription: definition.shortDescription,
    description: definition.description,
    category: definition.category,
    company: definition.company,
    // Same rule as the DSA Sheet: about one focused hour per problem.
    estimatedHours: questions.length,
    patternCount: definition.groups.length,
    questions
  };
}
