---
type: notes
title: "W3 · DSA · Complexity Analysis and the First Hash Set"
slug: w03-dsa-complexity-and-hash-sets
topic: Complexity Analysis
subject: dsa
minutes: 40
description: Big-O notation, time versus space, best, average and worst case, how to analyse loops, ten snippets to practise on, and using sets and dicts to solve Contains Duplicate, Valid Anagram and Majority Element.
---
# DSA stream · Week 3: complexity analysis

Two programs can both be correct while one finishes in a second and the other takes an hour. **Complexity analysis**
lets you predict that difference before running anything, and interviewers expect you to state it for every solution.

## Big-O in one idea

Big-O describes **how the amount of work grows as the input size `n` grows**, ignoring constant factors and smaller
terms. We count basic steps (comparisons, assignments, arithmetic), not seconds.

- A loop over `n` items doing constant work each time: about `n` steps → **O(n)**.
- `3n + 5` steps → still **O(n)**: drop constants and lower terms.
- `n² + n` steps → **O(n²)**: the biggest term wins as `n` grows.

| Big-O | Name | Typical code | n = 1,000 → roughly |
|---|---|---|---|
| O(1) | constant | index a list, dict lookup, arithmetic | 1 step |
| O(log n) | logarithmic | halve the problem each step (binary search) | 10 steps |
| O(n) | linear | one loop over the input | 1,000 steps |
| O(n log n) | linearithmic | good sorting (`sorted`) | 10,000 steps |
| O(n²) | quadratic | a loop inside a loop over the same input | 1,000,000 steps |
| O(2ⁿ) | exponential | trying every subset | far too many |

A practical rule of thumb: a typical judge runs on the order of 10⁷–10⁸ simple operations per second, and Python
is slower than C++ or Java. If `n` can be 10⁵, an O(n²) solution (10¹⁰ steps) will time out; you need O(n) or
O(n log n).

## Time versus space

**Time complexity** counts steps. **Space complexity** counts the **extra** memory your algorithm uses beyond the input.

- Reversing a list in place with two indexes: O(1) extra space.
- Building a set of all items: O(n) extra space.

Many of the best solutions **trade space for time**: spend O(n) memory on a set or dict to avoid an O(n²) nested loop.

## Best, average and worst case

The same algorithm can do different amounts of work on different inputs of the same size. Searching a list for `x`
one item at a time:

| Case | When | Steps |
|---|---|---|
| Best | `x` is the first item | O(1) |
| Average | `x` is somewhere in the middle | about n/2 → O(n) |
| Worst | `x` is last or absent | O(n) |

Unless told otherwise, **state the worst case**; it is the guarantee.

## How to analyse loops

1. **Sequential blocks add**: a loop of `n` followed by another loop of `n` is O(n + n) = O(n).
2. **Nested loops multiply**: a loop of `n` inside a loop of `n` is O(n × n) = O(n²).
3. **Halving gives log**: a loop where `i` doubles (or `n` halves) each time runs about log₂ n times.
4. **Know the cost of built-ins**: they are not free.

| Operation | Cost |
|---|---|
| `lst[i]`, `lst.append(x)`, `lst.pop()` | O(1) |
| `x in lst`, `lst.index(x)`, `lst.count(x)`, `lst.insert(0, x)`, `lst.pop(0)` | O(n) |
| `x in s` (set), `d[k]`, `k in d` (dict) | O(1) on average |
| `sorted(lst)`, `lst.sort()` | O(n log n) |
| `s[a:b]` slicing, `lst.copy()` | O(length of the result) |

So `for x in nums: if x in other_list:` is O(n × m), even though it looks like one loop.

## Ten snippets to analyse

Work these out before reading the answers. Assume `n = len(nums)`.

```python
# 1
total = 0
for x in nums:
    total += x

# 2
for i in range(n):
    for j in range(n):
        print(i, j)

# 3
for i in range(n):
    for j in range(i + 1, n):
        print(i, j)

# 4
i = 1
while i < n:
    i *= 2

# 5
for x in nums:
    print(x)
for y in nums:
    print(y)

# 6
for i in range(n):
    j = 1
    while j < n:
        j *= 2

# 7
print(nums[0] if nums else None)

# 8
seen = set()
for x in nums:
    if x in seen:
        break
    seen.add(x)

# 9
for x in nums:
    if x in nums[:10]:
        print(x)

# 10
result = []
for x in nums:
    if x not in result:
        result.append(x)
```

| # | Time | Extra space | Why |
|---|---|---|---|
| 1 | O(n) | O(1) | one loop, constant work |
| 2 | O(n²) | O(1) | n × n |
| 3 | O(n²) | O(1) | (n−1) + (n−2) + … + 1 = n(n−1)/2, still quadratic |
| 4 | O(log n) | O(1) | `i` doubles each time |
| 5 | O(n) | O(1) | n + n |
| 6 | O(n log n) | O(1) | an O(log n) loop inside an O(n) loop |
| 7 | O(1) | O(1) | one index |
| 8 | O(n) | O(n) | set lookups are O(1) on average |
| 9 | O(n) | O(1) | the slice is at most 10 items, a constant |
| 10 | O(n²) worst case | O(n) | `x not in result` scans a list |

Snippet 10 is a trap: it looks like one loop, but the `in` check on a list is a hidden second loop. Replacing `result`
with a set (plus a list if order matters) makes it O(n).

## The first hash set: Contains Duplicate

[Contains Duplicate (LeetCode 217)](https://leetcode.com/problems/contains-duplicate/): return `True` if any value
appears at least twice.

**Brute force**: compare every pair. O(n²) time, O(1) space.

```python
def contains_duplicate_slow(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False
```

**With a set**: remember what you have seen. O(n) time, O(n) space.

```python
def contains_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
```

(The one-liner `len(set(nums)) != len(nums)` is also O(n), but it cannot stop early.) For `n = 10⁵`, the first version
does about 5 × 10⁹ comparisons; the second does 10⁵ lookups.

## Frequency maps: Valid Anagram

[Valid Anagram (LeetCode 242)](https://leetcode.com/problems/valid-anagram/): are `s` and `t` made of exactly the same
letters with the same counts?

```python
def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = {}
    for ch in s:
        count[ch] = count.get(ch, 0) + 1
    for ch in t:
        if count.get(ch, 0) == 0:
            return False
        count[ch] -= 1
    return True
```

O(n) time. The extra space is O(k) for `k` distinct characters (at most 26 for lower-case English letters, so
effectively O(1)). Sorting both strings and comparing also works, in O(n log n).

## Majority Element: count map, then Boyer–Moore

[Majority Element (LeetCode 169)](https://leetcode.com/problems/majority-element/): one value appears more than `n/2`
times; return it.

The count-map approach is O(n) time and O(n) space. **Boyer–Moore voting** keeps one candidate and a counter: equal
values vote for the candidate, different values cancel a vote. Because the majority outnumbers everything else
combined, it survives.

```python
def majority_element(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate

assert majority_element([2, 2, 1, 1, 1, 2, 2]) == 2
```

O(n) time, O(1) space. This only works because the problem guarantees a majority exists.

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| Analyse 10 code snippets | complexity | count iterations; watch for hidden loops (`in` on a list) |
| [Contains Duplicate (LeetCode 217)](https://leetcode.com/problems/contains-duplicate/) | hash set | "seen before?" → set |
| [Valid Anagram (LeetCode 242)](https://leetcode.com/problems/valid-anagram/) | frequency map | count up with `s`, count down with `t` |
| [Majority Element (LeetCode 169)](https://leetcode.com/problems/majority-element/) | count map / voting | try both; compare space |

**Pattern Path extras** (optional): [Ransom Note (LeetCode 383)](https://leetcode.com/problems/ransom-note/),
[Happy Number (LeetCode 202)](https://leetcode.com/problems/happy-number/).

## Practice beyond class

From this week on, write the time and space complexity as a comment above every solution you submit, and record it in
your DSA tracker. Continue Week 3 of the Pattern Path in DSA Practice.
