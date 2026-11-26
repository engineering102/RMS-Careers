---
type: notes
title: "W18 · DSA · Greedy Algorithms"
slug: w18-dsa-greedy-algorithms
topic: Greedy
subject: dsa
minutes: 35
description: What makes a greedy choice safe, how to test it with counter-examples, the sort-then-scan and reach-tracking templates, worked solutions to Jump Game, Non-overlapping Intervals and Gas Station, and this week's problem ladder.
---
# DSA stream · Week 18: greedy algorithms

A **greedy algorithm** builds the answer one step at a time, always taking the choice that looks best **right now**,
and never going back. When it works, it is usually the simplest and fastest solution. When it does not, it is
confidently wrong, so the skill this week is knowing **when** a greedy choice is safe.

## Pattern card

- **Signal:** "minimum number of …", "maximum you can …", "can you reach …", intervals, scheduling.
- **Core move:** make the locally best choice, and be able to say why it never hurts later.
- **Builds on:** Week 8 sorting and intervals; Week 4 Kadane-style resets; Week 16 BFS levels.
- **Trap:** using greedy where it fails. Try to break your rule with a small counter-example **before** coding.

## When is greedy safe?

A greedy rule is correct when you can argue an **exchange**: take any optimal answer that does not use your greedy
choice; swap in your choice; the answer is no worse. Then some optimal answer agrees with greedy at every step.

**Example where it fails:** coins `[1, 3, 4]`, amount `6`. Greedy takes the largest coin first: 4 + 1 + 1 = 3 coins.
The optimum is 3 + 3 = 2 coins. Coin Change therefore needs dynamic programming (Week 19). (For some coin
sets, such as 1, 2, 5 and 10, largest-first happens to work; it is the coin set, not greed itself, that makes it safe.)

Habit: before trusting a greedy idea, try three or four tiny inputs by hand, including awkward ones.

## Template 1: sort, then scan

Many greedy problems become obvious after sorting by the right key.

### Worked approach: Assign Cookies (LC 455)

Children have greed `g[i]`; cookies have size `s[j]`; a child is content if given a cookie with `s[j] >= g[i]`.
Maximise content children. Sort both; give each cookie, smallest first, to the least greedy child it can satisfy.

```python
def find_content_children(g, s):
    g.sort()
    s.sort()
    child = 0
    for size in s:
        if child < len(g) and size >= g[child]:
            child += 1
    return child
```

Why safe: using a small cookie on the least greedy child it fits never blocks a better assignment; larger cookies stay
free for greedier children. O(n log n) for the sorts.

### Worked approach: Non-overlapping Intervals (LC 435)

Remove the minimum number of intervals so the rest do not overlap. Equivalently, **keep the maximum** number of
non-overlapping intervals.

**Greedy choice:** sort by **end** time, and keep an interval whenever it starts at or after the end of the last kept
one. Finishing earliest leaves the most room for everything after.

```python
def erase_overlap_intervals(intervals):
    intervals.sort(key=lambda iv: iv[1])
    kept, last_end = 0, float("-inf")
    for start, end in intervals:
        if start >= last_end:           # touching at a point is allowed in this problem
            kept += 1
            last_end = end
    return len(intervals) - kept
```

Sorting by **start** fails: `[[1, 100], [2, 3], [4, 5]]` would keep `[1, 100]` and remove the other two, when
removing only `[1, 100]` is optimal. Compare Merge Intervals (Week 8), where sorting by start is correct because you
merge rather than choose.

## Template 2: track the furthest reach

### Worked approach: Jump Game (LC 55)

`nums[i]` is the maximum jump length from index `i`. Can you reach the last index?

**Greedy state:** the furthest index reachable so far. Walk left to right; if you ever stand on an index beyond that
reach, you are stuck.

```python
def can_jump(nums):
    reach = 0
    for i, jump in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + jump)
    return True
```

O(n) time, O(1) space. Jump Game II (minimum jumps) extends this by treating each range of indices reachable with `j`
jumps as one BFS level (Week 16), without a queue.

## Template 3: reset when it goes negative

### Worked approach: Gas Station (LC 134)

Stations in a circle; `gas[i]` is fuel gained and `cost[i]` is fuel to reach the next station. Find the start index
for a complete loop, or -1.

Two facts give a one-pass solution:

1. If total gas < total cost, no start works.
2. If you start at `s` and run out before reaching station `i + 1`, then **no station from `s` to `i`** can be the
   start, because each of them would arrive at `i` with no more fuel than you had. So restart from `i + 1`, exactly
   like Kadane's reset in Week 4.

```python
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start, tank = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start, tank = i + 1, 0
    return start
```

## Template 4: last occurrence map

Partition Labels (LC 763): record each letter's **last index** (a hash map, Week 6). Scan, extending the current
part's end to the last index of every letter seen; when `i` equals that end, cut.

```python
def partition_labels(s):
    last = {ch: i for i, ch in enumerate(s)}
    sizes, start, end = [], 0, 0
    for i, ch in enumerate(s):
        end = max(end, last[ch])
        if i == end:
            sizes.append(end - start + 1)
            start = i + 1
    return sizes
```

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Assign Cookies (LC 455)](https://leetcode.com/problems/assign-cookies/) | Lab | sort both; two pointers |
| [Lemonade Change (LC 860)](https://leetcode.com/problems/lemonade-change/) | Warm-up | for a 20, give 10 + 5 before 5 + 5 + 5 |
| [Jump Game (LC 55)](https://leetcode.com/problems/jump-game/) | Lab | furthest reach so far |
| [Jump Game II (LC 45)](https://leetcode.com/problems/jump-game-ii/) | Twist | BFS levels without a queue |
| [Gas Station (LC 134)](https://leetcode.com/problems/gas-station/) | Lab | total check, then reset when the tank goes negative |
| [Non-overlapping Intervals (LC 435)](https://leetcode.com/problems/non-overlapping-intervals/) | Lab | sort by end |
| [Minimum Number of Arrows to Burst Balloons (LC 452)](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/) | Twist | same sort-by-end; here touching balloons share an arrow |
| [Partition Labels (LC 763)](https://leetcode.com/problems/partition-labels/) | Lab | last-index map; cut when `i == end` |
| [Hand of Straights (LC 846)](https://leetcode.com/problems/hand-of-straights/) | Combine | counts + always start a group from the smallest card |
| [Candy (LC 135)](https://leetcode.com/problems/candy/) | Stretch | a left pass and a right pass |

## Practice beyond class

These match Week 18 of the **Pattern Path** sheet. For each greedy solution, write one line in your tracker: the
greedy rule, and why it is safe (or the counter-example that killed your first idea). Revise the interval problems on
the **Blind 75** sheet.
