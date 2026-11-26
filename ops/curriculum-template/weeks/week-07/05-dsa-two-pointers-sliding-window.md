---
type: notes
title: "W7 · DSA · Two Pointers and Sliding Window"
slug: w07-dsa-two-pointers-sliding-window
topic: Two Pointers & Sliding Window
subject: dsa
minutes: 40
description: Opposite-end pointers on sorted data, the grow-and-shrink sliding window for substrings and subarrays, fixed-size windows with frequency counts, worked solutions for Container With Most Water, 3Sum and Longest Substring, and this week's problems.
---
# DSA stream · Week 7: two pointers and sliding window

## Pattern card

- **Signal:** "sorted array", "pair" or "triplet", "longest / shortest substring", "subarray with sum at least k",
  "contains a permutation".
- **Core move:** move one pointer per step based on a rule. A window grows on the right and shrinks on the left.
- **Builds on:** Week 5 two indexes (Valid Palindrome); Week 6 Two Sum and frequency maps; Week 4 write index.
- **Trap:** shrinking a window with `if` instead of `while`. One step of shrinking is often not enough.

Both techniques replace a nested loop over all pairs or all subarrays (O(n²) or worse) with a single pass (O(n)),
because each pointer only ever moves forward.

## Part 1: opposite-end pointers

Start `left` at 0 and `right` at the end. At each step, a rule tells you which pointer to move. This needs a reason
why the discarded options cannot be the answer, which usually comes from the data being **sorted**.

### Warm-up: Two Sum II (LC 167, sorted input)

```python
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left + 1, right + 1]      # the problem uses 1-based indexes
        if s < target:
            left += 1                         # need a bigger sum
        else:
            right -= 1                        # need a smaller sum
    return []

print(two_sum_sorted([2, 7, 11, 15], 9))   # [1, 2]
```

No hash map needed (O(1) space), because sorting tells us which way to move.

### Worked approach: Container With Most Water (LC 11)

Lines at each index have height `h[i]`. Pick two lines to hold the most water: `width × min(height)`.

Rule: **move the shorter line inwards**. Why is that safe? The area is limited by the shorter line. Moving the taller
one can only reduce the width while the height stays capped by the shorter line, so it can never help. Moving the
shorter one at least gives a chance of a taller line.

```python
def max_area(h: list[int]) -> int:
    left, right = 0, len(h) - 1
    best = 0
    while left < right:
        best = max(best, (right - left) * min(h[left], h[right]))
        if h[left] < h[right]:
            left += 1
        else:
            right -= 1
    return best

print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))   # 49
```

### Worked approach: 3Sum (LC 15)

Find all **unique** triplets that sum to zero. Sort, fix the first number, then run Two Sum II on the rest. Skip
duplicates at every position so the same triplet is not reported twice.

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                                  # same first number as before
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s < 0:
                left += 1
            elif s > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1                         # skip duplicate second numbers
    return result

print(three_sum([-1, 0, 1, 2, -1, -4]))   # [[-1, -1, 2], [-1, 0, 1]]
```

Time O(n²): an O(n) pass for each of n first numbers. That beats the O(n³) brute force.

## Part 2: the sliding window

A window is a contiguous range `[left, right]`. The template for a **variable-size** window:

```text
left = 0
for right in range(len(data)):
    add data[right] to the window
    while the window is invalid (or: while it is still valid, for "shortest"):
        remove data[left] from the window
        left += 1
    update the answer
```

`right` moves forward once per loop; `left` only ever moves forward too. Each element enters and leaves the window at
most once, so the total work is O(n) despite the inner `while`.

### Worked approach: Longest Substring Without Repeating Characters (LC 3)

Keep a set of the characters inside the window. When the new character is already inside, shrink from the left until
it is not.

```python
def length_of_longest_substring(s: str) -> int:
    inside = set()
    left = 0
    best = 0
    for right, ch in enumerate(s):
        while ch in inside:               # while, not if
            inside.remove(s[left])
            left += 1
        inside.add(ch)
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring("abcabcbb"))   # 3  ("abc")
print(length_of_longest_substring("pwwkew"))     # 3  ("wke")
print(length_of_longest_substring(""))           # 0
```

Trace `"pwwkew"`: at the second `w`, the window `"pw"` must drop **both** `p` and `w`; an `if` would drop only `p` and
leave a duplicate inside.

### Shortest window: Minimum Size Subarray Sum (LC 209)

Smallest length of a subarray with sum ≥ `target` (all numbers positive). Grow until the window is valid, then shrink
**while it stays valid**, recording the length each time.

```python
def min_sub_array_len(target: int, nums: list[int]) -> int:
    left = 0
    total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best

print(min_sub_array_len(7, [2, 3, 1, 2, 4, 3]))   # 2  ([4, 3])
```

This relies on the numbers being positive: adding always increases the sum and removing always decreases it. With
negative numbers you need Week 6's prefix-sum map instead.

### Fixed-size window: Permutation in String (LC 567)

Does `s2` contain a permutation of `s1`? Slide a window of length `len(s1)` across `s2` and compare letter counts
(Week 3's Valid Anagram) at each position, updating the counts in O(1) as the window moves.

```python
def check_inclusion(s1: str, s2: str) -> bool:
    k = len(s1)
    if k > len(s2):
        return False
    need = [0] * 26
    window = [0] * 26
    for ch in s1:
        need[ord(ch) - 97] += 1
    for i, ch in enumerate(s2):
        window[ord(ch) - 97] += 1
        if i >= k:
            window[ord(s2[i - k]) - 97] -= 1      # the character that left the window
        if window == need:
            return True
    return False

print(check_inclusion("ab", "eidbaooo"))   # True  ("ba")
print(check_inclusion("ab", "eidboaoo"))   # False
```

Comparing two 26-element lists is constant work, so the whole scan is O(n).

## Choosing between the patterns

| Problem says | Try |
|---|---|
| Sorted input, find a pair/triplet | Opposite-end pointers |
| Longest substring/subarray with a property | Variable window, shrink while invalid |
| Shortest subarray reaching a target | Variable window, shrink while valid |
| Substring of a fixed length (anagram, permutation) | Fixed window with counts |
| Subarray sum with negative numbers | Not a window: prefix sums + hash map (Week 6) |

## This week's problems

| Problem | Where | Pattern | Hint |
|---|---|---|---|
| [Two Sum II (LC 167)](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) | Pattern Path warm-up | opposite ends | move by comparing the sum |
| [Remove Duplicates from Sorted Array II (LC 80)](https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/) | Pattern Path twist | write index | compare with `nums[write - 2]` |
| [Container With Most Water (LC 11)](https://leetcode.com/problems/container-with-most-water/) | Lab | opposite ends | move the shorter line |
| [3Sum (LC 15)](https://leetcode.com/problems/3sum/) | Lab | sort + Two Sum II | skip duplicates |
| [Longest Substring Without Repeating Characters (LC 3)](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | Lab | variable window + set | shrink with `while` |
| [Minimum Size Subarray Sum (LC 209)](https://leetcode.com/problems/minimum-size-subarray-sum/) | Lab | shortest valid window | record inside the shrink loop |
| [Permutation in String (LC 567)](https://leetcode.com/problems/permutation-in-string/) | Lab | fixed window + counts | add the new character, remove the old one |
| [Longest Repeating Character Replacement (LC 424)](https://leetcode.com/problems/longest-repeating-character-replacement/) | Pattern Path stretch | variable window | valid while `size - max_count <= k` |
| [Minimum Window Substring (LC 76)](https://leetcode.com/problems/minimum-window-substring/) | Pattern Path stretch | grow until valid, shrink while valid | track how many required letters are satisfied |

## Practice beyond class

Solve the Week 7 group of the **Pattern Path** sheet in DSA Practice. For each window problem, write in your tracker
what makes the window **invalid** and what you store about its contents. Those two lines are the whole solution.
