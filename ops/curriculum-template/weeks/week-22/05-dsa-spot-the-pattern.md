---
type: notes
title: "W22 · DSA · Spot the Pattern: Mixed Revision and the Mock Contest"
slug: w22-dsa-spot-the-pattern
topic: Mixed-Pattern Revision
subject: dsa
minutes: 40
description: A one-table recap of every pattern from Weeks 1–21 with its signals, a routine for diagnosing an unlabelled problem, two worked think-aloud solutions, this week's unlabelled problems and a plan for the 90-minute mock contest.
---
# DSA stream · Week 22: spot the pattern

For 21 weeks every problem came with its pattern name. Interviews and online tests do not. This week the labels come
off: before you write code for any problem, you write **one line**:

> This is pattern **X** because of signal **Y**.

That sentence is the skill being tested. The code you already know how to write.

## Every pattern so far, by signal

| Signal in the problem | Pattern to try first | Week |
|---|---|---|
| "Have we seen this before?", duplicates, counts, pairs summing to a target | Hash set / hash map | 3, 6 |
| Sorted array, "pair" or "triplet", reverse in place, palindrome | Two pointers | 5, 7 |
| "Longest / shortest substring or subarray with…", a window that grows and shrinks | Sliding window | 7 |
| Many range-sum queries, "subarray sum equals k" | Prefix sums (often + hash map) | 8 |
| Sorted input, or "minimum value that works" with a yes/no check | Binary search (on index or on the answer) | 9 |
| "All combinations / permutations / subsets", place items under rules | Recursion and backtracking | 10 |
| Linked list: cycle, middle, k-th from end, reverse | Fast/slow pointers, pointer rewiring | 11 |
| Matching brackets, "next greater element", undo | Stack (monotonic stack) | 12 |
| Level by level, shortest steps in an unweighted structure | Queue / BFS | 12, 16 |
| Tree: depth, path, "for every node" | Recursive DFS that returns a value | 13 |
| BST, sorted order from a tree, k-th smallest | In-order traversal | 14 |
| "k largest / smallest", "top k", merging sorted streams | Heap | 15 |
| Grid of cells, islands, connected regions, dependencies | Graph BFS / DFS | 16 |
| "Order of tasks with prerequisites", connectivity queries | Topological sort, union–find | 17 |
| "Maximum number of non-overlapping…", a locally best choice that is provably safe | Greedy (often after sorting) | 18 |
| "Number of ways", "minimum cost", "can you reach", overlapping choices | Dynamic programming (1-D) | 19 |
| Grid paths, two strings, subset with sum or capacity | Dynamic programming (2-D, knapsack) | 20 |
| Prefixes of many words; XOR, "appears once", bit counts | Trie; bit manipulation | 21 |

When two patterns both seem to fit, check the constraints: `n ≤ 20` suggests backtracking is acceptable;
`n ≤ 10^5` means you need roughly `O(n)` or `O(n log n)`, which rules out nested loops.

## A five-question diagnosis routine

Ask these in order. Most problems are identified by question 3.

1. **What is the input shape?** Array, string, linked list, tree, grid, graph, list of intervals?
2. **Is it sorted, or could sorting help?** Sorting unlocks two pointers, binary search and many greedy solutions.
3. **What does the question ask for?** One answer, a count, all combinations, a min/max, a yes/no?
4. **What do the constraints allow?** Work out the largest acceptable complexity from `n`.
5. **What is the brute force, and what does it repeat?** The repeated work tells you what to store: seen values (hash
   map), a running window, sub-answers (DP).

## Worked think-aloud 1: Longest Substring Without Repeating Characters

**Problem** ([LeetCode 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/)): given a
string, find the length of the longest substring with no repeated characters.

- Input: a string. Asked: the **longest substring** with a condition. Signal: "longest substring with…".
- Brute force: check every substring for repeats, about `O(n³)` or `O(n²)`. It repeatedly re-checks characters already
  known to be unique.
- Diagnosis: **This is a sliding window because the answer is a contiguous substring whose validity changes as it
  grows and shrinks.** A hash map remembers where each character was last seen.

```python
def length_of_longest_substring(s: str) -> int:
    last_seen: dict[str, int] = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1          # jump past the earlier copy
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring("abcabcbb"))  # 3  ("abc")
print(length_of_longest_substring("bbbbb"))     # 1
print(length_of_longest_substring("pwwkew"))    # 3  ("wke")
```

`O(n)` time: each index enters the window once, and `left` only moves forward.

## Worked think-aloud 2: Number of Islands

**Problem** ([LeetCode 200](https://leetcode.com/problems/number-of-islands/)): a grid of `"1"` (land) and `"0"`
(water); count the islands, where land connects up, down, left and right.

- Input: a grid. Asked: a **count of connected regions**. Signal: "grid" + "connected".
- Diagnosis: **This is graph traversal (BFS/DFS) because each island is a connected component of land cells.** Start a
  traversal from every unvisited land cell, mark the whole island, and count the starts.

```python
from collections import deque

def num_islands(grid: list[list[str]]) -> int:
    rows, cols = len(grid), len(grid[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1":
                continue
            count += 1
            grid[r][c] = "0"                   # mark visited
            queue = deque([(r, c)])
            while queue:
                cr, cc = queue.popleft()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                        grid[nr][nc] = "0"
                        queue.append((nr, nc))
    return count

grid = [list("11000"), list("11000"), list("00100"), list("00011")]
print(num_islands(grid))   # 3
```

`O(rows × cols)`: every cell is visited at most once. BFS avoids Python's recursion limit on very large grids.

## This week's problems (unlabelled)

Write your one-line diagnosis **before** opening an editor. Check it with your tutor or peer group afterwards.

| # | Problem | Your diagnosis: "pattern X because of signal Y" |
|---|---|---|
| 1 | [Valid Sudoku (LeetCode 36)](https://leetcode.com/problems/valid-sudoku/) | |
| 2 | [Find the Duplicate Number (LeetCode 287)](https://leetcode.com/problems/find-the-duplicate-number/) | |
| 3 | [Rotate Image (LeetCode 48)](https://leetcode.com/problems/rotate-image/) | |
| 4 | [Spiral Matrix (LeetCode 54)](https://leetcode.com/problems/spiral-matrix/) | |
| 5 | [Copy List with Random Pointer (LeetCode 138)](https://leetcode.com/problems/copy-list-with-random-pointer/) | |
| 6 | [Count Good Nodes in Binary Tree (LeetCode 1448)](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) | |
| 7 | [Palindromic Substrings (LeetCode 647)](https://leetcode.com/problems/palindromic-substrings/) | |
| 8 | [Merge Triplets to Form Target Triplet (LeetCode 1899)](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/) | |

Some problems have more than one valid pattern. If you find two, write both and compare their complexity.

## The mock contest: 4 problems in 90 minutes

The lab this week is a **timed mock contest**: four unseen problems, one each from arrays/hashing, two pointers, trees
and dynamic programming. The tutor sets the problems; you do not know which is which.

| Time | Do |
|---|---|
| 0–8 min | Read **all four** problems. Write the one-line diagnosis for each. Rank them easiest to hardest |
| 8–30 min | Solve the easiest one fully, including edge cases |
| 30–55 min | Solve the second easiest |
| 55–80 min | Attempt the third; if stuck for 10 minutes, write a correct brute force |
| 80–90 min | Re-check edge cases (empty input, one element, duplicates, negatives) on everything submitted |

Contest habits:

- **A correct brute force beats an unfinished optimal solution.** Partial marks usually come from passing tests.
- **Do not get stuck on problem order.** Problem 1 is not always the easiest.
- **Test before you submit**: the examples, plus one edge case you invented.
- **After the contest**, write a short review: which diagnoses were right, which were wrong, and why. Wrong diagnoses
  tell you which pattern cards to revise before the interview sets in Weeks 23–26.

## Practice beyond class

Work through the **Pattern Path** Week 22 group ("Spot the pattern"). Keep a personal list of signals you missed; it
becomes your revision sheet for the capstone weeks.
