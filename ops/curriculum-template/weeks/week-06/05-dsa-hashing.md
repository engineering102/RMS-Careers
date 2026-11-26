---
type: notes
title: "W6 · DSA · Hashing: Hash Maps and Sets"
slug: w06-dsa-hashing-maps-sets
topic: Hashing
subject: dsa
minutes: 40
description: How hash maps and sets give O(1) average lookups, the "remember what you have seen" pattern, worked solutions for Two Sum, Group Anagrams and Subarray Sum Equals K, and this week's problem table.
---
# DSA stream · Week 6: hashing

## Pattern card

- **Signal:** "pair that sums to", "group", "frequency", "most common", "consecutive", "in O(n)".
- **Core move:** store what you have seen so far, so that the answer to "have I seen the thing I need?" is one lookup.
- **Builds on:** Week 3 sets and counting; Week 5 character maps (Isomorphic Strings); Week 1 running sums.
- **Trap:** inserting the current element **before** looking up its partner. In Two Sum that pairs an element with
  itself.

## How hashing works (enough for interviews)

A hash table stores keys in an array of buckets. A **hash function** turns the key into a bucket number, so finding a
key means computing its hash and looking in one bucket instead of scanning everything.

| Operation | `dict` / `set` average | Worst case | List equivalent |
|---|---|---|---|
| Insert | O(1) | O(n) | `append` O(1) |
| Lookup `x in s` | O(1) | O(n) | O(n) scan |
| Delete | O(1) | O(n) | O(n) |

The worst case happens when many keys land in the same bucket (**collisions**); good hash functions and automatic
resizing make it rare. Keys must be **hashable** (immutable): `int`, `str` and `tuple` are fine; `list` and `dict`
are not. That is why Group Anagrams uses a sorted **string** or a **tuple** of counts as the key.

Python tools you will use:

```python
from collections import Counter, defaultdict

counts = Counter("banana")              # Counter({'a': 3, 'n': 2, 'b': 1})
print(counts.most_common(1))            # [('a', 3)]

groups = defaultdict(list)              # missing keys start as []
groups["even"].append(4)

seen = {}
seen[10] = 0
print(seen.get(7, -1))                  # -1 when the key is missing
```

The trade: hashing usually turns an O(n²) "compare every pair" solution into O(n) time, at the cost of O(n) extra
memory.

## Worked approach: Two Sum (LC 1)

Find the indexes of two numbers that add up to `target`. Brute force checks every pair: O(n²).

With a map from **value → index** of the numbers seen so far, each number asks one question: "Have I already seen
`target - x`?"

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}                                 # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:                      # look up FIRST
            return [seen[need], i]
        seen[x] = i                           # then remember x
    return []

print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
print(two_sum([3, 3], 6))           # [0, 1]
print(two_sum([3, 2, 4], 6))        # [1, 2], not [0, 0]
```

The last test is the trap: if you stored `3` before looking up `6 - 3 = 3`, you would pair index 0 with itself.

## Worked approach: Group Anagrams (LC 49)

Anagrams have the same letters in a different order, so they share a **signature**. Use the signature as a map key.

```python
from collections import defaultdict

def group_anagrams(words: list[str]) -> list[list[str]]:
    groups = defaultdict(list)
    for w in words:
        key = "".join(sorted(w))              # "eat" -> "aet"
        groups[key].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
```

Sorting each word costs O(k log k) for a word of length k. A faster key is the tuple of 26 letter counts, which is
O(k) per word:

```python
def signature(w: str) -> tuple[int, ...]:
    counts = [0] * 26
    for ch in w:
        counts[ord(ch) - ord("a")] += 1
    return tuple(counts)                      # tuples are hashable; lists are not
```

## Worked approach: Subarray Sum Equals K (LC 560)

Count the contiguous subarrays whose sum is `k`. The numbers can be negative, so a sliding window does not work.

Key idea: let `prefix` be the running sum up to the current index. A subarray ending here sums to `k` exactly when some
**earlier** running sum equals `prefix - k`. That is Two Sum on running sums: count how many times each running sum has
appeared.

```python
def subarray_sum(nums: list[int], k: int) -> int:
    count_of = {0: 1}           # the empty prefix: lets subarrays that start at index 0 be counted
    prefix = 0
    total = 0
    for x in nums:
        prefix += x
        total += count_of.get(prefix - k, 0)
        count_of[prefix] = count_of.get(prefix, 0) + 1
    return total

print(subarray_sum([1, 1, 1], 2))       # 2
print(subarray_sum([1, 2, 3], 3))       # 2  ([1, 2] and [3])
print(subarray_sum([1, -1, 0], 0))      # 3
```

Trace `[1, 2, 3]`, `k = 3`:

| x | prefix | prefix - k | found earlier | total | map after |
|---|---|---|---|---|---|
| 1 | 1 | -2 | 0 | 0 | {0:1, 1:1} |
| 2 | 3 | 0 | 1 | 1 | {0:1, 1:1, 3:1} |
| 3 | 6 | 3 | 1 | 2 | {0:1, 1:1, 3:1, 6:1} |

Forgetting `{0: 1}` is the classic bug: subarrays that start at index 0 are then missed.

## Longest Consecutive Sequence (LC 128) in one paragraph

Put every number in a set. A number `x` **starts** a run only if `x - 1` is not in the set; from each start, count up
while `x + 1` is present. Each number is visited at most twice overall, so the whole thing is O(n) even though there is
a loop inside a loop. Sorting would be O(n log n).

```python
def longest_consecutive(nums: list[int]) -> int:
    present = set(nums)
    best = 0
    for x in present:
        if x - 1 not in present:          # x starts a run
            length = 1
            while x + length in present:
                length += 1
            best = max(best, length)
    return best

print(longest_consecutive([100, 4, 200, 1, 3, 2]))   # 4  (1, 2, 3, 4)
```

## This week's problems

| Problem | Where | Pattern | Hint |
|---|---|---|---|
| [Roman to Integer (LC 13)](https://leetcode.com/problems/roman-to-integer/) | Pattern Path revisit | lookup table + scan | subtract when a smaller value comes before a larger one |
| [Word Pattern (LC 290)](https://leetcode.com/problems/word-pattern/) | Pattern Path warm-up | two-way map | Isomorphic Strings with words |
| [Two Sum (LC 1)](https://leetcode.com/problems/two-sum/) | Lab | value → index map | look up before inserting |
| [Group Anagrams (LC 49)](https://leetcode.com/problems/group-anagrams/) | Lab | map from signature to list | sorted word or count tuple as key |
| [Top K Frequent Elements (LC 347)](https://leetcode.com/problems/top-k-frequent-elements/) | Lab | count map + buckets | bucket index = frequency, read from the top |
| [Longest Consecutive Sequence (LC 128)](https://leetcode.com/problems/longest-consecutive-sequence/) | Lab | set | only count from run starts |
| [Subarray Sum Equals K (LC 560)](https://leetcode.com/problems/subarray-sum-equals-k/) | Lab | prefix sums + count map | start the map with `{0: 1}` |
| [Insert Delete GetRandom O(1) (LC 380)](https://leetcode.com/problems/insert-delete-getrandom-o1/) | Pattern Path stretch | map + list | delete by swapping with the last element |

## SQL connection

`GROUP BY` and `COUNT(*)` in this week's SQL do the same job as a `Counter`, and a join on a key is a lookup in a hash
table. In fact, PostgreSQL often runs joins as a **hash join**: it builds a hash table from one side and probes it with
the other. You will see "Hash Join" in `EXPLAIN` output next week.

## Practice beyond class

Solve the Week 6 group of the **Pattern Path** sheet in DSA Practice, in order. For each problem, write in your tracker
what the map stores (key → value). If you cannot say that in one line, you have not found the pattern yet.
