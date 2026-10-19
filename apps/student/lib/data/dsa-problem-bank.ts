// Problems used by the curated sheets (Blind 75, LeetCode 150) that are not in the DSA Sheet. Together with the DSA
// Sheet's 150 problems they form the problem bank every sheet draws from: a problem is defined once and keyed by its
// slug, so a student's progress, notes and XP for it are shared by every sheet it appears in. Same conventions as
// the DSA Sheet: titles, difficulty and links follow LeetCode; summaries, hints, approaches and complexities are
// original RMS Careers write-ups, and the full statement lives on LeetCode (externalUrl). Keep slugs stable.
import type { DSAQuestion, Difficulty } from '@/lib/types/dsa';

function problem(
  slug: string,
  title: string,
  difficulty: Difficulty,
  pattern: string,
  problemStatement: string,
  hints: [string, string],
  approach: string,
  timeComplexity: string,
  spaceComplexity: string
): DSAQuestion {
  return {
    id: `q-${slug}`,
    slug,
    title,
    difficulty,
    pattern,
    problemStatement,
    examples: [],
    constraints: [],
    hints,
    approach,
    timeComplexity,
    spaceComplexity,
    externalUrl: `https://leetcode.com/problems/${slug}/`
  };
}

export const EXTRA_DSA_QUESTIONS: DSAQuestion[] = [
  // Arrays and strings
  problem(
    'merge-sorted-array',
    'Merge Sorted Array',
    'easy',
    'Arrays',
    'Two sorted arrays are given; the first has spare slots at its end. Merge the second into the first in place so the result is one sorted array.',
    ['Filling from the front would overwrite values you still need.', 'Write from the back: compare the largest remaining values of both arrays.'],
    'Three pointers from the ends: place the larger of the two current tails at the write position and move that pointer left. When the second array is exhausted, the rest is already in place.',
    'O(M + N)',
    'O(1)'
  ),
  problem(
    'remove-element',
    'Remove Element',
    'easy',
    'Two Pointers',
    'Remove every occurrence of a given value from an array in place and report how many elements remain. Order of the kept elements may change.',
    ['You only need the first k slots to hold the kept values.', 'Use a write index that advances only when you keep a value.'],
    'Scan with a read pointer; whenever the value differs from the target, copy it to the write pointer and advance it. The write pointer is the new length.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'remove-duplicates-from-sorted-array',
    'Remove Duplicates from Sorted Array',
    'easy',
    'Two Pointers',
    'A sorted array may contain repeats. Rearrange it in place so each distinct value appears once at the front, and report how many distinct values there are.',
    ['In a sorted array, duplicates sit next to each other.', 'Keep a value only when it differs from the last value you kept.'],
    'Write pointer starts at 1; for each element compare it to the last kept element and copy it forward if it is new.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'remove-duplicates-from-sorted-array-ii',
    'Remove Duplicates from Sorted Array II',
    'medium',
    'Two Pointers',
    'Like removing duplicates from a sorted array, but each value may stay up to twice. Compact the array in place and report the resulting length.',
    ['Compare with the element two positions behind the write pointer.', 'If it equals that one, keeping it would make a third copy.'],
    'Write pointer w; keep nums[i] when w < 2 or nums[i] != nums[w - 2], copying it to w and advancing.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'majority-element',
    'Majority Element',
    'easy',
    'Arrays',
    'An array has one value that occurs more than half the time. Find that value, ideally in linear time and constant extra space.',
    ['A hash map of counts works, but you can do better on space.', 'Pairing off different values never eliminates the majority completely.'],
    'Boyer-Moore voting: keep a candidate and a counter; increment on a match, decrement otherwise, and adopt the current value when the counter is zero.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'rotate-array',
    'Rotate Array',
    'medium',
    'Arrays',
    'Shift every element of an array k positions to the right, wrapping around the end, modifying the array in place.',
    ['Reduce k modulo the length first.', 'Reversing the whole array and then its two parts gives the rotation.'],
    'Reverse the full array, then reverse the first k elements and the remaining n - k elements separately.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'best-time-to-buy-and-sell-stock-ii',
    'Best Time to Buy and Sell Stock II',
    'medium',
    'Greedy',
    'Given daily prices, you may buy and sell as many times as you like but hold at most one share at a time. Find the maximum total profit.',
    ['Any rising stretch can be split into consecutive daily gains.', 'You never lose by taking every positive day-to-day difference.'],
    'Sum max(0, price[i] - price[i - 1]) over all days.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'h-index',
    'H-Index',
    'medium',
    'Arrays',
    "A researcher's citation counts are given per paper. Find the largest h such that at least h papers have h or more citations each.",
    ['Sorting by citations makes the condition easy to check.', 'Counting papers per citation value (capped at n) avoids the sort.'],
    'Bucket counts of min(citations, n), then walk from n down accumulating papers until the running total is at least the current index.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'insert-delete-getrandom-o1',
    'Insert Delete GetRandom O(1)',
    'medium',
    'Design',
    'Design a set supporting insert, remove and returning a uniformly random element, each in average constant time.',
    ['An array gives O(1) random access; a hash map gives O(1) lookup.', 'To delete from the array in O(1), swap the element with the last one first.'],
    'Keep values in an array and a map from value to index. Remove by moving the last element into the removed slot, updating its index, then popping.',
    'O(1) average per operation',
    'O(N)'
  ),
  problem(
    'candy',
    'Candy',
    'hard',
    'Greedy',
    'Children stand in a line with ratings. Each gets at least one candy, and a child with a higher rating than a neighbour must get more than that neighbour. Find the minimum total.',
    ['Handle the left-neighbour rule and the right-neighbour rule separately.', 'A second pass from the right fixes what the first pass from the left missed.'],
    'Left-to-right pass: give one more than the left neighbour when rated higher. Right-to-left pass: raise to one more than the right neighbour when needed, taking the max. Sum the result.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'roman-to-integer',
    'Roman to Integer',
    'easy',
    'Strings',
    'Convert a Roman numeral string into its integer value, including the subtractive forms such as IV and CM.',
    ['A symbol is subtracted when a larger symbol follows it.', 'Scan once and compare each value with the next one.'],
    'For each symbol, add its value unless the next symbol is larger, in which case subtract it.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'integer-to-roman',
    'Integer to Roman',
    'medium',
    'Strings',
    'Convert an integer between 1 and 3999 into a Roman numeral, using the standard subtractive forms.',
    ['List every symbol, including the two-letter subtractive ones, from largest to smallest.', 'Greedily take the largest value that still fits.'],
    'Walk a table of 13 value/symbol pairs from 1000 down to 1, appending a symbol and subtracting its value while it fits.',
    'O(1)',
    'O(1)'
  ),
  problem(
    'length-of-last-word',
    'Length of Last Word',
    'easy',
    'Strings',
    'A string holds words separated by spaces, possibly with trailing spaces. Report the length of the last word.',
    ['Scanning from the end avoids splitting the whole string.', 'Skip trailing spaces first, then count letters.'],
    'From the end, skip spaces, then count non-space characters until a space or the start.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'longest-common-prefix',
    'Longest Common Prefix',
    'easy',
    'Strings',
    'Find the longest string that every word in a list starts with, or the empty string when there is none.',
    ['The answer cannot be longer than the shortest word.', 'Compare column by column across all words.'],
    'Vertical scan: for each index of the first word, check that every other word has the same character there; stop at the first mismatch.',
    'O(S) for S total characters',
    'O(1)'
  ),
  problem(
    'reverse-words-in-a-string',
    'Reverse Words in a String',
    'medium',
    'Strings',
    'Reverse the order of the words in a string, collapsing extra spaces so words are separated by exactly one space with none at the ends.',
    ['Splitting on whitespace and filtering empties handles the spacing.', 'In place: reverse the whole string, then each word.'],
    'Split into words, drop empty pieces, reverse the list and join with single spaces.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'zigzag-conversion',
    'Zigzag Conversion',
    'medium',
    'Strings',
    'Write a string in a zigzag across a given number of rows, then read it row by row. Return the row-by-row reading.',
    ['Track which row each character lands in.', 'The row index moves down, then up, bouncing at the first and last rows.'],
    'Keep one buffer per row and a direction flag; append each character to the current row, flipping direction at the edges. Concatenate the rows.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'find-the-index-of-the-first-occurrence-in-a-string',
    'Find the Index of the First Occurrence in a String',
    'easy',
    'Strings',
    'Return the first index at which a needle string appears inside a haystack string, or -1 if it never does.',
    ['Try every starting position and compare.', 'KMP avoids re-checking characters after a partial match.'],
    'Brute force compares the needle at each start; KMP precomputes the longest proper prefix-suffix table to scan the haystack once.',
    'O(N * M) brute force, O(N + M) with KMP',
    'O(1) or O(M)'
  ),
  problem(
    'text-justification',
    'Text Justification',
    'hard',
    'Strings',
    'Lay out words into lines of an exact width: pack as many words per line as fit, spread extra spaces evenly with the left gaps taking any remainder, and left-justify the last line.',
    ['First decide which words go on each line greedily.', 'Then distribute width minus letters across the gaps, giving earlier gaps one extra while the remainder lasts.'],
    'Greedy line packing, then per line compute base spaces and remainder per gap; single-word and last lines are left-justified and padded on the right.',
    'O(S) for S total characters',
    'O(S)'
  ),
  problem(
    'is-subsequence',
    'Is Subsequence',
    'easy',
    'Two Pointers',
    'Decide whether one string can be obtained from another by deleting some characters without reordering the rest.',
    ['Match characters of the short string in order.', 'Advance in the short string only on a match.'],
    'Two pointers over both strings; the answer is whether the short-string pointer reaches its end.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'minimum-size-subarray-sum',
    'Minimum Size Subarray Sum',
    'medium',
    'Sliding Window',
    'Given positive integers and a target, find the length of the shortest contiguous subarray whose sum is at least the target, or 0 if none exists.',
    ['All values are positive, so growing a window only increases its sum.', 'Shrink from the left while the sum still meets the target.'],
    'Variable sliding window: extend the right edge, and while the sum is at least the target record the length and drop the left element.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'substring-with-concatenation-of-all-words',
    'Substring with Concatenation of All Words',
    'hard',
    'Sliding Window',
    'Given a string and a list of equal-length words, find every start index where some ordering of all the words appears back to back.',
    ['Every candidate is made of word-sized chunks, so slide in word-length steps.', 'Run one window per offset from 0 to word length - 1.'],
    'For each offset, slide a window of word-sized chunks with a frequency map, shrinking when a word is over-used; record the start whenever the window holds exactly all words.',
    'O(N * L) for word length L',
    'O(K) for K words'
  ),
  problem(
    'game-of-life',
    'Game of Life',
    'medium',
    'Matrix',
    "Advance Conway's Game of Life by one generation on a grid of live and dead cells, updating the grid in place.",
    ['Every cell must see the old state of its neighbours.', 'Encode the next state in spare bits so the old state is still readable.'],
    'Count live neighbours using the low bit, store the next state in the second bit, then shift every cell right by one.',
    'O(M * N)',
    'O(1)'
  ),
  // Hashing
  problem(
    'ransom-note',
    'Ransom Note',
    'easy',
    'Hashing',
    'Decide whether a note can be built from the letters of a magazine, using each magazine letter at most once.',
    ['Only letter counts matter.', 'Count the magazine, then spend counts for the note.'],
    'Count the 26 letters of the magazine, decrement for each note letter, and fail if any count goes negative.',
    'O(N + M)',
    'O(1)'
  ),
  problem(
    'isomorphic-strings',
    'Isomorphic Strings',
    'easy',
    'Hashing',
    'Decide whether the characters of one string can be replaced, consistently and one-to-one, to produce another string of the same length.',
    ['A mapping in one direction is not enough: two letters cannot map to the same one.', 'Keep maps in both directions.'],
    'Walk both strings together, recording s->t and t->s mappings, and fail on any conflict.',
    'O(N)',
    'O(1) for a fixed alphabet'
  ),
  problem(
    'word-pattern',
    'Word Pattern',
    'easy',
    'Hashing',
    'Check whether a string of words follows a letter pattern: each letter corresponds to exactly one word and each word to exactly one letter.',
    ['The number of words must equal the pattern length.', 'Use a bijection check like isomorphic strings.'],
    'Split into words, then maintain letter->word and word->letter maps, failing on any mismatch.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'contains-duplicate-ii',
    'Contains Duplicate II',
    'easy',
    'Hashing',
    'Decide whether two equal values in an array sit at most k positions apart.',
    ['Remember the last index each value was seen at.', 'Alternatively keep a set of the last k values as a window.'],
    'Map value -> last index; when a value repeats within k of its last index, report true.',
    'O(N)',
    'O(min(N, K))'
  ),
  problem(
    'encode-and-decode-strings',
    'Encode and Decode Strings',
    'medium',
    'Strings',
    'Design a way to turn a list of strings into one string and back again, for strings that may contain any characters, including your delimiter.',
    ['A plain delimiter fails when it appears inside a string.', 'Prefix each string with its length.'],
    'Encode each string as length + "#" + string. Decode by reading digits up to "#", then taking exactly that many characters.',
    'O(N) total characters',
    'O(N)'
  ),
  // Intervals
  problem(
    'summary-ranges',
    'Summary Ranges',
    'easy',
    'Intervals',
    'Given a sorted list of distinct integers, describe it as the smallest list of ranges, written as "a->b" or just "a" for single values.',
    ['A range continues while each value is one more than the previous.', 'Close the range when the run breaks.'],
    'Scan, remembering where the current run started; emit it when the next value is not consecutive or the input ends.',
    'O(N)',
    'O(1) extra'
  ),
  problem(
    'minimum-number-of-arrows-to-burst-balloons',
    'Minimum Number of Arrows to Burst Balloons',
    'medium',
    'Intervals',
    'Balloons span horizontal intervals; a vertical arrow bursts every balloon it passes through. Find the fewest arrows that burst them all.',
    ['Sort balloons by where they end.', 'Shoot at the end of the first unburst balloon; it hits everything that starts before that point.'],
    'Sort by end coordinate; fire an arrow at the first end, then fire again only when a balloon starts after the last arrow.',
    'O(N log N)',
    'O(1) extra'
  ),
  problem(
    'meeting-rooms',
    'Meeting Rooms',
    'easy',
    'Intervals',
    'Given meeting time intervals, decide whether one person could attend all of them, that is, whether any two overlap.',
    ['Sorting by start time puts potential overlaps next to each other.', 'Check each meeting against the previous one.'],
    'Sort by start; if any meeting starts before the previous one ends, they overlap.',
    'O(N log N)',
    'O(1) extra'
  ),
  problem(
    'meeting-rooms-ii',
    'Meeting Rooms II',
    'medium',
    'Intervals',
    'Given meeting time intervals, find the minimum number of rooms needed so that no two overlapping meetings share a room.',
    ['The answer is the maximum number of meetings running at once.', 'A min-heap of end times tells you when a room frees up.'],
    'Sort by start; keep a min-heap of end times, popping when the earliest end is at or before the next start; the largest heap size is the answer.',
    'O(N log N)',
    'O(N)'
  ),
  // Stack
  problem(
    'simplify-path',
    'Simplify Path',
    'medium',
    'Stack',
    'Convert an absolute Unix-style file path into its canonical form, resolving ".", ".." and repeated slashes.',
    ['Split on "/" and handle each part.', 'A stack of directory names makes ".." a pop.'],
    'Push real names, pop on "..", ignore "" and "."; join the stack with "/" after a leading slash.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'basic-calculator',
    'Basic Calculator',
    'hard',
    'Stack',
    'Evaluate an arithmetic expression string with +, -, parentheses, spaces and unary minus, without using a built-in evaluator.',
    ['Without * and /, only signs matter.', 'On "(", save the running result and sign; on ")", fold the inner result back in.'],
    'Scan with a running result, current number and sign; push (result, sign) at "(" and combine at ")".',
    'O(N)',
    'O(N)'
  ),
  // Linked list
  problem(
    'reverse-linked-list-ii',
    'Reverse Linked List II',
    'medium',
    'Linked List',
    'Reverse the nodes of a singly linked list between two given positions, leaving the rest of the list as it was.',
    ['A dummy head simplifies reversing from the first node.', 'Move each node after the start of the segment to the front of the segment.'],
    'Walk to the node before the segment, then repeatedly unlink the next node and insert it right after that anchor, (right - left) times.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'remove-duplicates-from-sorted-list-ii',
    'Remove Duplicates from Sorted List II',
    'medium',
    'Linked List',
    'From a sorted linked list, delete every value that appears more than once, keeping only values that were unique.',
    ['The head itself may be removed, so use a dummy node.', 'When you find a run of duplicates, skip the whole run.'],
    'With a dummy and a predecessor pointer, skip past any run of equal values and link the predecessor beyond it; otherwise advance the predecessor.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'rotate-list',
    'Rotate List',
    'medium',
    'Linked List',
    'Rotate a linked list to the right by k places, moving the last k nodes to the front.',
    ['k can exceed the length; reduce it modulo the length.', 'Making the list circular turns rotation into choosing a new break point.'],
    'Find the length and tail, connect tail to head, then break the ring after length - k % length steps.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'partition-list',
    'Partition List',
    'medium',
    'Linked List',
    'Rearrange a linked list so nodes less than x come before nodes greater than or equal to x, keeping the original order within each part.',
    ['Build two separate lists as you scan.', 'Dummy heads make appending simple.'],
    'Append each node to a "less" or "rest" list, then link the end of "less" to the start of "rest" and terminate the tail.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'sort-list',
    'Sort List',
    'medium',
    'Linked List',
    'Sort a linked list in ascending order, aiming for O(N log N) time.',
    ['Merge sort suits linked lists: merging needs no extra arrays.', 'Find the middle with slow and fast pointers.'],
    'Recursively split at the middle, sort each half, and merge the two sorted halves.',
    'O(N log N)',
    'O(log N) recursion'
  ),
  // Trees
  problem(
    'symmetric-tree',
    'Symmetric Tree',
    'easy',
    'Trees',
    'Decide whether a binary tree is a mirror image of itself around its centre.',
    ['Compare the left subtree with the right subtree, mirrored.', 'Outer children pair with outer children, inner with inner.'],
    'Recursive mirror check: two nodes match when values are equal, a.left mirrors b.right and a.right mirrors b.left.',
    'O(N)',
    'O(H)'
  ),
  problem(
    'construct-binary-tree-from-inorder-and-postorder-traversal',
    'Construct Binary Tree from Inorder and Postorder Traversal',
    'medium',
    'Trees',
    'Rebuild a binary tree with distinct values from its inorder and postorder traversals.',
    ['The last postorder value is the root.', 'Its position in the inorder list splits the left and right subtrees.'],
    'Map value -> inorder index; consume postorder from the end, building the right subtree before the left.',
    'O(N)',
    'O(N)'
  ),
  problem(
    'populating-next-right-pointers-in-each-node-ii',
    'Populating Next Right Pointers in Each Node II',
    'medium',
    'Trees',
    'In a binary tree (not necessarily perfect), set each node\'s next pointer to the node immediately to its right on the same level, or null at the end of the level.',
    ['A level-order traversal makes this easy with a queue.', 'For O(1) space, use the next pointers already set on the current level to wire the level below.'],
    'Walk each level through its next pointers while building the next level with a dummy head and tail pointer.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'flatten-binary-tree-to-linked-list',
    'Flatten Binary Tree to Linked List',
    'medium',
    'Trees',
    'Flatten a binary tree in place into a right-leaning chain that follows preorder, with every left pointer null.',
    ['The left subtree belongs between the node and its right subtree.', 'Attach the right subtree to the rightmost node of the left subtree.'],
    'For each node with a left child, find the rightmost node of the left subtree, hang the right subtree there, move the left subtree to the right, and continue down.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'path-sum',
    'Path Sum',
    'easy',
    'Trees',
    'Decide whether a binary tree has a root-to-leaf path whose values add up to a target.',
    ['Subtract each node from the target as you go down.', 'Only check the remainder at leaves.'],
    'DFS passing target - node.val; at a leaf, succeed when the remainder is zero.',
    'O(N)',
    'O(H)'
  ),
  problem(
    'sum-root-to-leaf-numbers',
    'Sum Root to Leaf Numbers',
    'medium',
    'Trees',
    'Each root-to-leaf path of digits forms a number. Return the sum of all those numbers.',
    ['Carry the number built so far down the tree.', 'Going one level deeper multiplies by ten and adds the digit.'],
    'DFS with current = current * 10 + val; at a leaf add current to the total.',
    'O(N)',
    'O(H)'
  ),
  problem(
    'binary-search-tree-iterator',
    'Binary Search Tree Iterator',
    'medium',
    'Trees',
    'Build an iterator over a binary search tree that returns values in ascending order, with next and hasNext in average O(1) time and O(H) memory.',
    ['An inorder traversal visits values in sorted order.', 'Simulate it with a stack of the left spine.'],
    'Push the left spine; next pops a node, then pushes the left spine of its right child.',
    'O(1) amortised',
    'O(H)'
  ),
  problem(
    'count-complete-tree-nodes',
    'Count Complete Tree Nodes',
    'easy',
    'Trees',
    'Count the nodes of a complete binary tree in less than linear time.',
    ['If the leftmost and rightmost depths match, the tree is perfect: 2^h - 1 nodes.', 'Otherwise recurse into both children; one of them is perfect.'],
    'Compare left and right spine heights; return 2^h - 1 when equal, else 1 + count(left) + count(right).',
    'O(log^2 N)',
    'O(log N)'
  ),
  problem(
    'lowest-common-ancestor-of-a-binary-tree',
    'Lowest Common Ancestor of a Binary Tree',
    'medium',
    'Trees',
    'Find the lowest node in a binary tree (not a search tree) that has both of two given nodes as descendants, where a node counts as its own descendant.',
    ['Search both subtrees for either target.', 'If both sides report a find, the current node is the answer.'],
    'Post-order DFS: return the node if it is a target; otherwise return the non-null result of the two subtrees, or the node itself when both are non-null.',
    'O(N)',
    'O(H)'
  ),
  problem(
    'average-of-levels-in-binary-tree',
    'Average of Levels in Binary Tree',
    'easy',
    'Trees',
    'Return the average node value of each level of a binary tree, from top to bottom.',
    ['Process the tree level by level.', 'Queue size at the start of a level is that level\'s node count.'],
    'BFS; for each level sum the values of the nodes currently in the queue and divide by their count.',
    'O(N)',
    'O(W) for max width W'
  ),
  problem(
    'binary-tree-zigzag-level-order-traversal',
    'Binary Tree Zigzag Level Order Traversal',
    'medium',
    'Trees',
    'Return the values of a binary tree level by level, alternating left-to-right and right-to-left on successive levels.',
    ['Do a normal level-order traversal.', 'Reverse every other level, or insert at the front on those levels.'],
    'BFS collecting each level, reversing the collected values on odd levels.',
    'O(N)',
    'O(W)'
  ),
  problem(
    'minimum-absolute-difference-in-bst',
    'Minimum Absolute Difference in BST',
    'easy',
    'Trees',
    'Find the smallest difference between the values of any two nodes in a binary search tree.',
    ['Inorder traversal of a BST is sorted.', 'In a sorted list, the closest pair is adjacent.'],
    'Inorder traversal remembering the previous value; track the minimum of current - previous.',
    'O(N)',
    'O(H)'
  ),
  problem(
    'convert-sorted-array-to-binary-search-tree',
    'Convert Sorted Array to Binary Search Tree',
    'easy',
    'Trees',
    'Turn a sorted array into a height-balanced binary search tree.',
    ['The middle element makes a balanced root.', 'Each half becomes a subtree the same way.'],
    'Recursively build: root = middle of the range, left from the left half, right from the right half.',
    'O(N)',
    'O(log N) recursion'
  ),
  problem(
    'construct-quad-tree',
    'Construct Quad Tree',
    'medium',
    'Trees',
    'Build a quad tree for a square grid of 0s and 1s: a region of uniform value becomes a leaf, otherwise it splits into four quadrants.',
    ['Recursion on quadrants mirrors the definition.', 'If all four children are leaves with the same value, merge them into one leaf.'],
    'Divide the grid into four quadrants recursively; a quadrant of size one is a leaf; combine four identical leaves into one.',
    'O(N^2 log N) naive, O(N^2) with merging',
    'O(log N) recursion'
  ),
  // Graphs
  problem(
    'evaluate-division',
    'Evaluate Division',
    'medium',
    'Graphs',
    'Given equations like a / b = 2.0, answer queries x / y using the known ratios, or -1.0 when the answer cannot be determined.',
    ['Treat variables as nodes and ratios as weighted edges.', 'A query is a path whose edge weights multiply together.'],
    'Build a graph with edges a->b (k) and b->a (1/k); answer each query with a DFS or BFS that multiplies weights along the path.',
    'O(Q * (V + E))',
    'O(V + E)'
  ),
  problem(
    'snakes-and-ladders',
    'Snakes and Ladders',
    'medium',
    'Graphs',
    'On a boustrophedon-numbered board with snakes and ladders, find the fewest dice rolls to reach the last square, or -1 if impossible.',
    ['Each roll is an edge to up to six squares.', 'BFS finds the fewest moves in an unweighted graph.'],
    'Convert square numbers to grid coordinates, then BFS from square 1, following any snake or ladder on landing.',
    'O(N^2)',
    'O(N^2)'
  ),
  problem(
    'minimum-genetic-mutation',
    'Minimum Genetic Mutation',
    'medium',
    'Graphs',
    'Find the fewest single-character mutations to turn one 8-letter gene string into another, where every intermediate gene must be in a given bank.',
    ['Each gene is a node; one changed letter is an edge.', 'Use BFS from the start gene.'],
    'BFS over genes, trying all 8 x 4 single-letter changes and enqueueing those in the bank that are unvisited.',
    'O(B * 32)',
    'O(B)'
  ),
  problem(
    'graph-valid-tree',
    'Graph Valid Tree',
    'medium',
    'Graphs',
    'Given n nodes and a list of undirected edges, decide whether they form a valid tree.',
    ['A tree on n nodes has exactly n - 1 edges.', 'With n - 1 edges, it is a tree exactly when it is connected (or has no cycle).'],
    'Check the edge count, then union-find: any edge joining two already-connected nodes means a cycle.',
    'O(N α(N))',
    'O(N)'
  ),
  problem(
    'number-of-connected-components-in-an-undirected-graph',
    'Number of Connected Components in an Undirected Graph',
    'medium',
    'Graphs',
    'Given n nodes and a list of undirected edges, count how many separate connected pieces the graph has.',
    ['Start with n components.', 'Each edge that joins two different components reduces the count by one.'],
    'Union-find with path compression; decrement the count on every successful union.',
    'O(E α(N))',
    'O(N)'
  ),
  problem(
    'alien-dictionary',
    'Alien Dictionary',
    'hard',
    'Graphs',
    'Given words sorted in an unknown alphabet, derive an order of its letters consistent with the sorting, or report that none exists.',
    ['The first differing letter of two adjacent words gives one ordering edge.', 'A prefix appearing after a longer word is invalid.'],
    'Build edges from adjacent word pairs, then topological sort (Kahn or DFS); a cycle means no valid order.',
    'O(C) for C total characters',
    'O(1) for a fixed alphabet'
  ),
  // Backtracking
  problem(
    'combinations',
    'Combinations',
    'medium',
    'Backtracking',
    'List every way to choose k numbers from 1 to n, ignoring order.',
    ['Pick numbers in increasing order to avoid repeats.', 'Stop early when not enough numbers remain.'],
    'Backtrack from a start value, adding each next number and recursing from the one after it; record at size k.',
    'O(C(n, k) * k)',
    'O(k)'
  ),
  problem(
    'n-queens-ii',
    'N-Queens II',
    'hard',
    'Backtracking',
    'Count the ways to place n queens on an n x n board so that no two attack each other.',
    ['Place one queen per row.', 'Track used columns and both diagonals in sets or bitmasks.'],
    'Row-by-row backtracking with column, diagonal (r - c) and anti-diagonal (r + c) occupancy; count completed placements.',
    'O(N!)',
    'O(N)'
  ),
  // Dynamic programming
  problem(
    'combination-sum-iv',
    'Combination Sum IV',
    'medium',
    'DP - 1D',
    'Count the ordered sequences of numbers from a list (reuse allowed) that add up to a target.',
    ['Order matters, so this counts sequences, not sets.', 'ways[t] sums ways[t - x] over every number x.'],
    'Bottom-up DP over totals 0..target with ways[0] = 1, looping totals outside and numbers inside.',
    'O(T * N)',
    'O(T)'
  ),
  problem(
    'maximum-sum-circular-subarray',
    'Maximum Sum Circular Subarray',
    'medium',
    'DP - 1D',
    'Find the largest sum of a non-empty contiguous subarray when the array wraps around at its end.',
    ['A wrapping subarray is the total minus a non-wrapping minimum subarray.', "Run Kadane's for both the maximum and the minimum."],
    'Answer = max(maxSubarray, total - minSubarray), except when every value is negative, where it is maxSubarray.',
    'O(N)',
    'O(1)'
  ),
  problem(
    'triangle',
    'Triangle',
    'medium',
    'DP - 2D',
    'Find the minimum path sum from the top of a number triangle to its bottom row, moving to an adjacent number on the row below each step.',
    ['Working bottom-up removes the boundary cases.', 'Each cell becomes its value plus the smaller of the two below.'],
    'Copy the last row, then for each row upward set dp[j] = row[j] + min(dp[j], dp[j + 1]); dp[0] is the answer.',
    'O(N^2)',
    'O(N)'
  ),
  problem(
    'minimum-path-sum',
    'Minimum Path Sum',
    'medium',
    'DP - 2D',
    'Moving only right or down through a grid of non-negative numbers, find the path from the top-left to the bottom-right with the smallest sum.',
    ['Each cell is reached from above or from the left.', 'One row of DP is enough.'],
    'dp[j] = grid[i][j] + min(dp[j] from above, dp[j - 1] from the left), filling row by row.',
    'O(M * N)',
    'O(N)'
  ),
  problem(
    'unique-paths-ii',
    'Unique Paths II',
    'medium',
    'DP - 2D',
    'Count the right/down paths from the top-left to the bottom-right of a grid where some cells are blocked.',
    ['Blocked cells contribute zero paths.', 'Otherwise paths = from above + from the left.'],
    'Single-row DP: set dp[j] = 0 on an obstacle, else dp[j] += dp[j - 1].',
    'O(M * N)',
    'O(N)'
  ),
  problem(
    'best-time-to-buy-and-sell-stock-iii',
    'Best Time to Buy and Sell Stock III',
    'hard',
    'DP - 2D',
    'Given daily prices, find the maximum profit from at most two buy-sell transactions, never holding more than one share.',
    ['Track the best balance after each of four actions: buy1, sell1, buy2, sell2.', 'Each state depends only on the previous one.'],
    'For each price update buy1 = max(buy1, -p), sell1 = max(sell1, buy1 + p), buy2 = max(buy2, sell1 - p), sell2 = max(sell2, buy2 + p).',
    'O(N)',
    'O(1)'
  ),
  problem(
    'best-time-to-buy-and-sell-stock-iv',
    'Best Time to Buy and Sell Stock IV',
    'hard',
    'DP - 2D',
    'Given daily prices and a limit k, find the maximum profit from at most k buy-sell transactions, never holding more than one share.',
    ['Generalise the two-transaction state machine to k pairs.', 'When k is at least half the days, it is the unlimited-transactions problem.'],
    'Keep buy[j] and sell[j] for j = 1..k and update them for every price; sell[k] is the answer.',
    'O(N * K)',
    'O(K)'
  ),
  problem(
    'maximal-square',
    'Maximal Square',
    'medium',
    'DP - 2D',
    'In a binary matrix, find the area of the largest square containing only 1s.',
    ['A square ending at a cell is limited by its top, left and top-left neighbours.', 'side = 1 + min of those three.'],
    'DP over cells with side[i][j] = 1 + min(top, left, top-left) when the cell is 1; track the largest side and square it.',
    'O(M * N)',
    'O(N)'
  ),
  // Binary search
  problem(
    'search-insert-position',
    'Search Insert Position',
    'easy',
    'Binary Search',
    'In a sorted array of distinct values, return the index of a target, or the index where it would be inserted to keep the order.',
    ['This is the first index whose value is at least the target.', 'Binary search for that lower bound.'],
    'Lower-bound binary search over [0, n): move right past values smaller than the target.',
    'O(log N)',
    'O(1)'
  ),
  problem(
    'find-peak-element',
    'Find Peak Element',
    'medium',
    'Binary Search',
    'Find the index of any element that is strictly greater than its neighbours, treating the outside of the array as minus infinity, in logarithmic time.',
    ['If the slope goes up to the right, a peak lies to the right.', 'Compare mid with mid + 1 to choose a side.'],
    'Binary search: when nums[mid] < nums[mid + 1] move left bound to mid + 1, else move right bound to mid.',
    'O(log N)',
    'O(1)'
  ),
  problem(
    'sqrtx',
    'Sqrt(x)',
    'easy',
    'Binary Search',
    'Return the integer part of the square root of a non-negative integer without using a built-in power or square-root function.',
    ['The answer is the largest m with m * m <= x.', 'Binary search over m, watching for overflow.'],
    'Binary search over [0, x], comparing mid with x / mid to avoid overflow, keeping the last mid that fits.',
    'O(log X)',
    'O(1)'
  ),
  // Heap
  problem(
    'ipo',
    'IPO',
    'hard',
    'Heap / Priority Queue',
    'Starting with some capital, pick at most k projects, each needing a minimum capital and yielding a profit, to maximise final capital.',
    ['Among the projects you can afford, always take the most profitable.', 'Unlock projects in order of required capital.'],
    'Sort projects by capital; for each of k rounds push all newly affordable profits into a max-heap and take the largest.',
    'O(N log N + K log N)',
    'O(N)'
  ),
  problem(
    'find-k-pairs-with-smallest-sums',
    'Find K Pairs with Smallest Sums',
    'medium',
    'Heap / Priority Queue',
    'From two sorted arrays, return the k pairs (one value from each) with the smallest sums.',
    ['The smallest pair is (0, 0).', 'From pair (i, j), the next candidate in that row is (i, j + 1).'],
    'Seed a min-heap with (i, 0) for the first k values of the first array, then pop k times, pushing (i, j + 1) each time.',
    'O(K log K)',
    'O(K)'
  ),
  // Bit manipulation
  problem(
    'add-binary',
    'Add Binary',
    'easy',
    'Bit Manipulation',
    'Add two binary numbers given as strings and return their sum as a binary string.',
    ['Add from the rightmost digits, as on paper.', 'Carry is the sum divided by two.'],
    'Two pointers from the ends with a carry; append sum % 2 and finally reverse.',
    'O(max(M, N))',
    'O(max(M, N))'
  ),
  problem(
    'single-number-ii',
    'Single Number II',
    'medium',
    'Bit Manipulation',
    'Every value in an array appears three times except one, which appears once. Find it in linear time and constant space.',
    ['Count set bits per position modulo three.', 'Two masks can track counts of one and two.'],
    'For each of 32 bit positions sum the bits mod 3 to rebuild the lone value (or use the ones/twos mask trick).',
    'O(N)',
    'O(1)'
  ),
  problem(
    'bitwise-and-of-numbers-range',
    'Bitwise AND of Numbers Range',
    'medium',
    'Bit Manipulation',
    'Return the bitwise AND of every integer in an inclusive range [left, right].',
    ['Any bit that changes inside the range ends up 0.', 'The answer is the common binary prefix of left and right.'],
    'Shift both right until they are equal, counting shifts, then shift the common value back left.',
    'O(log N)',
    'O(1)'
  ),
  // Math
  problem(
    'palindrome-number',
    'Palindrome Number',
    'easy',
    'Math & Geometry',
    'Decide whether an integer reads the same forwards and backwards, without converting it to a string.',
    ['Negative numbers are never palindromes.', 'Reverse only half of the digits and compare.'],
    'Pop digits from x into a reversed half until it is at least the remaining x; compare, ignoring the middle digit for odd lengths.',
    'O(log N)',
    'O(1)'
  ),
  problem(
    'factorial-trailing-zeroes',
    'Factorial Trailing Zeroes',
    'medium',
    'Math & Geometry',
    'Count the trailing zeros of n factorial without computing the factorial.',
    ['Each trailing zero comes from a factor 10 = 2 x 5.', 'Factors of 5 are scarcer than factors of 2.'],
    'Sum floor(n / 5) + floor(n / 25) + floor(n / 125) + ... until the divisor exceeds n.',
    'O(log N)',
    'O(1)'
  ),
  problem(
    'max-points-on-a-line',
    'Max Points on a Line',
    'hard',
    'Math & Geometry',
    'Given points on a plane, find the largest number of them that lie on one straight line.',
    ['Fix one point and group the others by slope to it.', 'Store slopes as reduced fractions to avoid floating-point error.'],
    'For each anchor point, count other points by normalised (dy, dx) using gcd; the best count plus one is a candidate.',
    'O(N^2)',
    'O(N)'
  )
];
