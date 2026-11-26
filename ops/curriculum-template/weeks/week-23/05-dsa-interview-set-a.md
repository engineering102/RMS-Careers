---
type: notes
title: "W23 · DSA · Interview Set A: Arrays, Strings, Hashing and Two Pointers"
slug: w23-dsa-interview-set-a
topic: Interview Problem Sets
subject: dsa
minutes: 30
description: How to tackle unlabelled interview-style problems, a 90-minute contest routine, worked solutions for Trapping Rain Water and Set Matrix Zeroes, and this week's company-style set A.
---
# DSA stream · Week 23: interview set A

From this week the problems come **without a pattern label**, the way they do in online assessments and interviews.
Set A revisits the earliest patterns: arrays, strings, hashing and two pointers. They look easy, but interviewers use
them to check whether your code is clean and your edge cases are covered.

## From "which pattern?" to a plan

When a problem has no label, read it for **signals**:

| Signal in the problem | Pattern to try first |
|---|---|
| "sorted array", "pair that sums to", "from both ends" | Two pointers |
| "have we seen this before?", "count occurrences", "group by" | Hash map / hash set |
| "contiguous subarray / substring", "longest window" | Sliding window |
| "sum of a range", "running total" | Prefix sums |
| "in place", "O(1) extra space" on a matrix or array | Reuse part of the input as storage |
| "convert", "simulate", "zigzag", "spiral" | Careful simulation with indices |

Write one line before coding: **"This is pattern X because of signal Y."** If you cannot fill in Y, solve a brute
force first and look for the repeated work it does.

## The 90-minute contest routine

This week's timed contest is 90 minutes for a set of problems. Use the time deliberately:

1. **First 5 minutes**: read every problem. Rank them from easiest to hardest for *you*.
2. **Solve in that order.** An easy problem fully solved beats a hard one half-done.
3. **Cap your time.** If a problem has taken 30 minutes with no plan, move on and come back.
4. **Test before submitting.** Run the empty input, one element, all equal values and the largest values.
5. **Last 10 minutes**: improve partial solutions; a brute force that passes some test cases still scores.

## Worked approach 1: Trapping Rain Water (two pointers)

Given bar heights, how much water is trapped after rain? Water above bar `i` is
`min(max height to the left, max height to the right) - height[i]`.

**Brute force**: for every bar, scan left and right for the maxima, giving O(n²).

**Prefix/suffix maxima**: precompute `left_max[i]` and `right_max[i]` in two passes, giving O(n) time and O(n) space.

**Two pointers**: keep one pointer at each end. Whichever side has the **lower** bar is limited by its own side's
maximum, because the other side already has something at least that tall. So we can settle that bar now.

```python
def trap(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            water += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]
            right -= 1
    return water


print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
print(trap([]))                                     # 0
```

Time O(n), space O(1). In an interview, present the O(n²) idea, then the O(n)-space version, then this one. Showing
the path is worth as much as the final code.

## Worked approach 2: Set Matrix Zeroes (in-place markers)

If a cell is 0, set its whole row and column to 0, in place. Using two sets of "zero rows" and "zero columns" is
O(m + n) extra space and a perfectly good first answer. The O(1)-space follow-up **uses the first row and first column
as the marker arrays**, after remembering whether they themselves contained a zero.

```python
def set_zeroes(matrix: list[list[int]]) -> None:
    rows, cols = len(matrix), len(matrix[0])
    first_row_zero = any(matrix[0][c] == 0 for c in range(cols))
    first_col_zero = any(matrix[r][0] == 0 for r in range(rows))

    # 1. Mark: record zeros in the first row/column
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][c] == 0:
                matrix[r][0] = 0
                matrix[0][c] = 0

    # 2. Fill the inner cells from the markers
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][0] == 0 or matrix[0][c] == 0:
                matrix[r][c] = 0

    # 3. Finally fix the first row and column themselves
    if first_row_zero:
        for c in range(cols):
            matrix[0][c] = 0
    if first_col_zero:
        for r in range(rows):
            matrix[r][0] = 0


grid = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
set_zeroes(grid)
print(grid)  # [[1, 0, 1], [0, 0, 0], [1, 0, 1]]
```

The order matters: if you zero the first row before step 2, every column would be wiped. Mentioning that trap in an
interview shows you understand the solution rather than remember it.

## Quick approach: Summary Ranges

Walk the sorted array once; start a run at `nums[i]` and extend it while the next number is exactly one more.

```python
def summary_ranges(nums: list[int]) -> list[str]:
    result, i = [], 0
    while i < len(nums):
        start = nums[i]
        while i + 1 < len(nums) and nums[i + 1] == nums[i] + 1:
            i += 1
        result.append(str(start) if start == nums[i] else f"{start}->{nums[i]}")
        i += 1
    return result


print(summary_ranges([0, 1, 2, 4, 5, 7]))  # ['0->2', '4->5', '7']
```

## This week's problems (company-style set A)

| # | Problem | Difficulty | Hint |
|---|---|---|---|
| 1 | [Summary Ranges (LC 228)](https://leetcode.com/problems/summary-ranges/) | Easy | one pass, close each run |
| 2 | [Find the Index of the First Occurrence in a String (LC 28)](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) | Easy | compare the needle at each start index |
| 3 | [Integer to Roman (LC 12)](https://leetcode.com/problems/integer-to-roman/) | Medium | greedy over a value table that includes 900, 400, 90, 40, 9, 4 |
| 4 | [Zigzag Conversion (LC 6)](https://leetcode.com/problems/zigzag-conversion/) | Medium | one string per row; flip direction at the top and bottom |
| 5 | [H-Index (LC 274)](https://leetcode.com/problems/h-index/) | Medium | sort descending, or count papers per citation value |
| 6 | [Set Matrix Zeroes (LC 73)](https://leetcode.com/problems/set-matrix-zeroes/) | Medium | first row and column as markers |
| 7 | [Trapping Rain Water (LC 42)](https://leetcode.com/problems/trapping-rain-water/) | Hard | two pointers, move the lower side |

Weekly timed contest: 90 minutes, run by your tutor.

## Practice beyond class

Open the **LeetCode 150** sheet in DSA Practice. It is an interview-style revision list; use it for the final weeks
alongside the Pattern Path. For each problem you solve, write the one-line "pattern because signal" note in your
tracker. Count your total: the placement scorecard target is **150+ problems** across all patterns.
