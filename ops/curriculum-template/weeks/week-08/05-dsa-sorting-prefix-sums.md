---
type: notes
title: "W8 · DSA · Sorting Algorithms and Prefix Sums"
slug: w08-dsa-sorting-prefix-sums
topic: Sorting & Prefix Sums
subject: dsa
minutes: 45
description: Bubble, selection, insertion, merge and quick sort implemented and compared, stability, the sort-first pattern for intervals, prefix and suffix arrays for range sums and Product of Array Except Self, and this week's problems.
---
# DSA stream · Week 8: sorting algorithms and prefix sums

## Pattern card

- **Signal:** "intervals", "merge", "range sum", "except self", "already sorted", "in place with three values".
- **Core move:** sorting first makes the rest one pass; a prefix array answers any range sum in O(1).
- **Builds on:** Week 7 pointers (merging two sorted lists); Week 1 running sums; Week 3 Big-O.
- **Trap:** sorting intervals by end when the problem needs start, or the reverse.

## Part 1: five sorting algorithms

You will almost always call `sorted()` or `list.sort()` in real code (Python uses Timsort, O(n log n) and stable).
Interviews still ask you to implement and compare the classic algorithms, because they teach loop invariants and
divide and conquer.

### Bubble sort

Repeatedly swap adjacent elements that are out of order. After pass `i`, the largest `i + 1` elements are in their
final place at the end.

```python
def bubble_sort(a: list[int]) -> list[int]:
    a = a[:]
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:          # no swaps: already sorted, stop early
            break
    return a
```

### Selection sort

Find the minimum of the unsorted part and swap it into the next position.

```python
def selection_sort(a: list[int]) -> list[int]:
    a = a[:]
    n = len(a)
    for i in range(n - 1):
        smallest = i
        for j in range(i + 1, n):
            if a[j] < a[smallest]:
                smallest = j
        a[i], a[smallest] = a[smallest], a[i]
    return a
```

### Insertion sort

Take the next element and slide it left into place within the sorted prefix, like sorting playing cards in your hand.

```python
def insertion_sort(a: list[int]) -> list[int]:
    a = a[:]
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]          # shift bigger elements right
            j -= 1
        a[j + 1] = key
    return a
```

Insertion sort is fast on **nearly sorted** data: each element moves only a little, so it approaches O(n).

### Merge sort

Divide the list in half, sort each half recursively, then **merge** the two sorted halves with two pointers (the Week 7
move).

```python
def merge_sort(a: list[int]) -> list[int]:
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:      # <= keeps equal elements in order: stable
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged
```

There are about log n levels of halving, and each level does O(n) merging work, so the total is O(n log n) in every
case, at the cost of O(n) extra memory.

### Quick sort

Pick a **pivot**, partition the elements into "smaller" and "larger" around it, then sort each side recursively. A
readable version:

```python
import random

def quick_sort(a: list[int]) -> list[int]:
    if len(a) <= 1:
        return a
    pivot = random.choice(a)
    smaller = [x for x in a if x < pivot]
    equal = [x for x in a if x == pivot]
    larger = [x for x in a if x > pivot]
    return quick_sort(smaller) + equal + quick_sort(larger)

data = [5, 2, 9, 1, 5, 6, 0]
for sort in (bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort):
    print(sort.__name__, sort(data))
```

This version uses extra lists for clarity. The in-place version (Lomuto or Hoare partitioning) swaps elements within
the array; be ready to write it if asked. A random pivot makes the O(n²) worst case (always picking the smallest or
largest element) very unlikely.

### Comparison

| Algorithm | Best | Average | Worst | Extra space | Stable? |
|---|---|---|---|---|---|
| Bubble | O(n) with early exit | O(n²) | O(n²) | O(1) | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick (in place) | O(n log n) | O(n log n) | O(n²) | O(log n) stack | No |

**Stable** means equal elements keep their original relative order. It matters when you sort by one key after another:
sort students by name, then stably by department, and each department stays in name order.

## Part 2: sort first, then one pass

### Merge Intervals (LC 56)

```python
def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    intervals.sort(key=lambda iv: iv[0])        # by START
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:   # overlaps the last merged interval
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

print(merge_intervals([[1, 3], [8, 10], [2, 6], [15, 18]]))   # [[1, 6], [8, 10], [15, 18]]
print(merge_intervals([[1, 4], [4, 5]]))                      # [[1, 5]]
```

Note `max(...)`: an interval like `[1, 10]` followed by `[2, 3]` must not shrink the end to 3.

### Sort Colors (LC 75): three pointers in one pass

Sort an array of 0s, 1s and 2s in place without a library sort (the Dutch national flag problem).

```python
def sort_colors(nums: list[int]) -> None:
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1                  # do not move mid: the swapped-in value is unchecked

colors = [2, 0, 2, 1, 1, 0]
sort_colors(colors)
print(colors)                          # [0, 0, 1, 1, 2, 2]
```

### Merge Sorted Array (LC 88)

Merge `nums2` into `nums1`, which has empty space at the end. Fill from the **back**, so nothing in `nums1` is
overwritten before it is read.

```python
def merge(nums1: list[int], m: int, nums2: list[int], n: int) -> None:
    i, j, write = m - 1, n - 1, m + n - 1
    while j >= 0:
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[write] = nums1[i]
            i -= 1
        else:
            nums1[write] = nums2[j]
            j -= 1
        write -= 1

a = [1, 2, 3, 0, 0, 0]
merge(a, 3, [2, 5, 6], 3)
print(a)                               # [1, 2, 2, 3, 5, 6]
```

## Part 3: prefix sums

A prefix array stores running totals: `prefix[i]` is the sum of the first `i` elements, with `prefix[0] = 0`. Then the
sum of `nums[l..r]` (inclusive) is `prefix[r + 1] - prefix[l]`, in O(1) after O(n) preparation.

```python
nums = [3, 1, 4, 1, 5, 9]
prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)
print(prefix)                           # [0, 3, 4, 8, 9, 14, 23]
print(prefix[5] - prefix[2])            # sum of nums[2..4] = 4 + 1 + 5 = 10
```

This is exactly Range Sum Query – Immutable (LC 303), and it is the idea behind Week 6's Subarray Sum Equals K.

### Product of Array Except Self (LC 238)

For each index, the product of all other elements, without division. Use a **prefix** pass (product of everything to
the left) and a **suffix** pass (everything to the right).

```python
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = [1] * n
    left = 1
    for i in range(n):
        answer[i] = left               # product of nums[0..i-1]
        left *= nums[i]
    right = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= right             # times product of nums[i+1..n-1]
        right *= nums[i]
    return answer

print(product_except_self([1, 2, 3, 4]))    # [24, 12, 8, 6]
print(product_except_self([0, 1, 2]))       # [2, 0, 0]
```

The second test shows why division is a bad idea: a zero in the input breaks "total product ÷ element".

## This week's problems

| Problem | Where | Pattern | Hint |
|---|---|---|---|
| Implement bubble, selection, insertion, merge and quick sort | Lab | sorting | test each on empty, one-element, sorted, reversed and duplicate inputs |
| [Merge Sorted Array (LC 88)](https://leetcode.com/problems/merge-sorted-array/) | Lab | two pointers from the back | loop while `nums2` has elements |
| [Squares of a Sorted Array (LC 977)](https://leetcode.com/problems/squares-of-a-sorted-array/) | Pattern Path twist | two pointers from both ends | the largest square is at one of the ends |
| [Sort Colors (LC 75)](https://leetcode.com/problems/sort-colors/) | Lab | three pointers | do not advance `mid` after swapping with `high` |
| [Range Sum Query – Immutable (LC 303)](https://leetcode.com/problems/range-sum-query-immutable/) | Pattern Path warm-up | prefix sums | `prefix[r + 1] - prefix[l]` |
| [Product of Array Except Self (LC 238)](https://leetcode.com/problems/product-of-array-except-self/) | Lab | prefix and suffix products | no division |
| [Merge Intervals (LC 56)](https://leetcode.com/problems/merge-intervals/) | Lab | sort by start, one pass | extend the end with `max` |
| [Find All Anagrams in a String (LC 438)](https://leetcode.com/problems/find-all-anagrams-in-a-string/) | Pattern Path revisit | Week 7 fixed window | collect every matching start |
| [Insert Interval (LC 57)](https://leetcode.com/problems/insert-interval/) | Pattern Path stretch | intervals | the list is already sorted |

## Practice beyond class

Solve the Week 8 group of the **Pattern Path** sheet. Then look back: Weeks 5–8 gave you two indexes, hash maps,
windows, sorting and prefix sums. The Phase 2 test's DSA section draws on all four weeks, so re-solve one problem from
each week without notes.
