---
type: notes
title: "W26 · DSA · Final Mock: Four Problems in 90 Minutes"
slug: w26-dsa-final-mock
topic: Final DSA Assessment
subject: dsa
minutes: 30
description: How to sit a timed four-problem coding exam, worked solutions for Reverse Linked List II and Combination Sum II, approaches for Detect Squares and Sort List, and how to keep your DSA habit going after the programme.
---
# DSA stream · Week 26: the final mock

The final week's DSA work is the **coding section of the Final Placement Readiness Exam**, and a practice version of it:
four problems in one 90-minute sitting. Nothing here is new. Every problem uses a pattern you met on the Pattern Path;
the challenge is recognising it fast and writing correct code under time pressure.

## Exam plan for 90 minutes and four problems

| Time | Action |
|---|---|
| 0–8 min | Read all four problems. For each, write "pattern X because of signal Y" and a rough difficulty |
| 8–35 min | Solve the one you are most confident about; test edge cases; submit |
| 35–60 min | Second most confident |
| 60–80 min | Third; if a problem stalls for 15 minutes, submit a brute force and move on |
| 80–90 min | Return to anything partial; re-check edge cases |

Partial credit is real: a brute force that passes half the test cases beats a perfect idea with no code.

## Worked approach 1: Reverse Linked List II

Reverse the nodes from position `left` to position `right` (1-indexed) in one pass.

**Signals:** linked list, "reverse a section". Two tools from Week 11 combine here: a **dummy node** (so reversing from
position 1 needs no special case) and **head insertion** (repeatedly move the next node to the front of the section).

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_between(head: ListNode | None, left: int, right: int) -> ListNode | None:
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(left - 1):          # stop just before the section
        prev = prev.next
    curr = prev.next                   # first node of the section; ends up last
    for _ in range(right - left):
        nxt = curr.next                # node to move
        curr.next = nxt.next           # unlink it
        nxt.next = prev.next           # insert it at the front of the section
        prev.next = nxt
    return dummy.next


def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(node):
    out = []
    while node:
        out.append(node.val)
        node = node.next
    return out


print(to_list(reverse_between(build([1, 2, 3, 4, 5]), 2, 4)))  # [1, 4, 3, 2, 5]
print(to_list(reverse_between(build([5]), 1, 1)))              # [5]
```

Time O(n), space O(1). Trace `[1, 2, 3, 4, 5]` with `left = 2`, `right = 4` on paper: after the first move the list is
`1, 3, 2, 4, 5`; after the second it is `1, 4, 3, 2, 5`.

## Worked approach 2: Combination Sum II

Find all unique combinations of candidates that sum to the target; each number may be used once, and the input may
contain duplicates.

**Signals:** "all combinations" → **backtracking** (Week 10). "Unique" with duplicate input → **sort, then skip equal
values at the same depth**.

```python
def combination_sum2(candidates: list[int], target: int) -> list[list[int]]:
    candidates = sorted(candidates)
    result, path = [], []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if i > start and candidates[i] == candidates[i - 1]:
                continue                       # same value already tried at this depth
            if candidates[i] > remaining:
                break                          # sorted: every later value is too big as well
            path.append(candidates[i])
            backtrack(i + 1, remaining - candidates[i])   # i + 1: each number used once
            path.pop()

    backtrack(0, target)
    return result


print(combination_sum2([10, 1, 2, 7, 6, 1, 5], 8))
# [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
```

The key line is `i > start`: it skips a duplicate only when it would start the **same branch again at the same level**,
while still allowing `[1, 1, 6]`, where the second `1` is used one level deeper.

## Approach 3: Detect Squares (hashing)

Store a **count of each point** in a hash map. For a query point `(x, y)`, treat every stored point `(px, py)` with
`|px − x| = |py − y| ≠ 0` as the diagonal corner of a square. The square exists as many times as
`count[(px, py)] × count[(x, py)] × count[(px, y)]`. Add these up. Adding a point is O(1); a query is O(number of
distinct points).

## Approach 4: Sort List (merge sort on a linked list)

Sort a linked list in O(n log n) time. Merge sort suits linked lists because merging needs no extra array:

1. Split the list in half with **slow and fast pointers** (fast starts one node ahead so the halves balance).
2. Recursively sort each half.
3. **Merge** the two sorted halves with a dummy node, exactly as in Merge Two Sorted Lists.

Remember to cut the link between the halves (`slow.next = None`) before recursing; forgetting it causes infinite
recursion.

## This week's problems (final mock set)

| # | Problem | Difficulty | Pattern |
|---|---|---|---|
| 1 | [Detect Squares (LC 2013)](https://leetcode.com/problems/detect-squares/) | Medium | hashing: count points |
| 2 | [Reverse Linked List II (LC 92)](https://leetcode.com/problems/reverse-linked-list-ii/) | Medium | linked list: dummy node + head insertion |
| 3 | [Combination Sum II (LC 40)](https://leetcode.com/problems/combination-sum-ii/) | Medium | backtracking with duplicate skipping |
| 4 | [Sort List (LC 148)](https://leetcode.com/problems/sort-list/) | Medium | merge sort on a linked list |

Sit them together in one 90-minute block, under exam conditions, before or after the Final Placement Readiness Exam
as your tutor schedules.

## After the programme

Your DSA tracker should now be close to the scorecard target of **150+ problems** across all patterns. To keep the
skill sharp through placement season:

- Solve **one problem a day**, alternating patterns; use the **LeetCode 150** sheet and revisit problems you marked.
- Once a week, do a **timed set of 3–4 problems** in 90 minutes.
- Before each company's online assessment, re-read your pattern cards and the "pattern because signal" notes in your
  tracker.
