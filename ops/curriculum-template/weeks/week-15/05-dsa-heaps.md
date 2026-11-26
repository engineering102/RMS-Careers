---
type: notes
title: "W15 · DSA · Heaps and Priority Queues: Top K, Closest and Merge K"
slug: w15-dsa-heaps-priority-queues
topic: Heaps & Priority Queues
subject: dsa
minutes: 35
description: What a binary heap is and why push and pop cost O(log n), Python's heapq as a min-heap, the size-k heap pattern for top-k problems, max-heaps by negation, tie-breaking, and merging k sorted lists.
---
# DSA stream · Week 15: heaps and priority queues

Whenever a problem keeps asking "what is the smallest (or largest) **right now**?" while items keep arriving or
leaving, sorting everything again each time is wasteful. A **heap** answers that question in O(1) and updates in
O(log n).

## Pattern card

- **Signal:** "k largest / smallest", "top k", "k closest", "merge k sorted", "running median", "always process
  the most urgent next".
- **Core move:** keep a heap of size **k** so the answer is always on top. In Python, `heapq` is a **min-heap**.
- **Builds on:** Week 6 frequency maps; Week 11 Merge Two Sorted Lists; Week 8 sorting (what the heap avoids).
- **Trap:** pushing everything into the heap when a size-k heap is enough.

## What a heap is

A **binary heap** is a complete binary tree (every level full except possibly the last, filled left to right) with
the **heap property**: in a min-heap, every parent is ≤ its children, so the minimum is at the root. It is stored in a
plain array; for the node at index `i`, the children are at `2i + 1` and `2i + 2`, and the parent at `(i - 1) // 2`.

```text
array: [1, 3, 2, 7, 4, 5]            tree:        1
                                               /     \
                                              3       2
                                             / \     /
                                            7   4   5
```

| Operation | How | Cost |
|---|---|---|
| Peek min | `heap[0]` | O(1) |
| Push | Append at the end, **sift up** while smaller than the parent | O(log n) |
| Pop min | Move the last item to the root, **sift down** to the smaller child | O(log n) |
| Build from a list | `heapify` | O(n) |

A **priority queue** is the abstract idea ("give me the highest-priority item next"); a heap is the usual way to
build one. Java has `PriorityQueue`, C++ has `std::priority_queue` (a max-heap by default), Python has `heapq`.

## Python's heapq

```python
import heapq

nums = [5, 1, 8, 3]
heapq.heapify(nums)          # in place, O(n): nums is now a valid min-heap
heapq.heappush(nums, 2)
print(heapq.heappop(nums))   # 1
print(nums[0])               # 2: the new minimum, peeked without removing
```

Two tricks you will use constantly:

- **Max-heap by negation**: push `-x`, and negate again when you pop.
- **Tuples for priorities**: `(priority, tiebreaker, item)`. Tuples compare element by element, so add a unique
  tiebreaker (such as an index) when items themselves cannot be compared.

## Worked approach: Kth Largest Element (size-k min-heap)

Keep only the k largest values seen so far in a **min-heap**. The smallest of those k, on top, is the kth largest.

```python
import heapq

def find_kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)    # drop the smallest; it cannot be in the top k
    return heap[0]

print(find_kth_largest([3, 2, 1, 5, 6, 4], 2))   # 5
```

| Approach | Time | Space |
|---|---|---|
| Sort, take index `n - k` | O(n log n) | O(n) or O(1) |
| Size-k min-heap | O(n log k) | O(k) |

When k is much smaller than n (top 10 of a million), the heap wins clearly, and it also works on a **stream** where you
never have all the data at once (Kth Largest Element in a Stream).

## Worked approach: Last Stone Weight (max-heap by negation)

Repeatedly smash the two heaviest stones. "Two largest, repeatedly" means a max-heap.

```python
def last_stone_weight(stones):
    heap = [-s for s in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        a = -heapq.heappop(heap)       # heaviest
        b = -heapq.heappop(heap)       # second heaviest
        if a != b:
            heapq.heappush(heap, -(a - b))
    return -heap[0] if heap else 0

print(last_stone_weight([2, 7, 4, 1, 8, 1]))   # 1
```

## Worked approach: K Closest Points to Origin

We want the k **smallest** distances, so keep a size-k **max**-heap (negated distances) and evict the farthest.
Compare squared distances; the square root does not change the order.

```python
def k_closest(points, k):
    heap = []                                  # items: (-dist2, x, y)
    for x, y in points:
        heapq.heappush(heap, (-(x * x + y * y), x, y))
        if len(heap) > k:
            heapq.heappop(heap)                # removes the farthest of the k + 1
    return [[x, y] for _, x, y in heap]

print(k_closest([[3, 3], [5, -1], [-2, 4]], 2))   # [[-2, 4], [3, 3]] in some order
```

## Worked approach: Top K Frequent Words (count, then heap with a tie-break)

Count with a dictionary (Week 6), then take the k "smallest" words under the key
`(-frequency, word)`: higher frequency first, and alphabetical order for ties, as the problem requires.

```python
from collections import Counter

def top_k_frequent(words, k):
    count = Counter(words)
    return heapq.nsmallest(k, count, key=lambda w: (-count[w], w))

print(top_k_frequent(["i", "love", "leetcode", "i", "love", "coding"], 2))   # ['i', 'love']
```

`heapq.nsmallest` uses a size-k heap internally, so this is O(n log k) after counting.

## Worked approach: Merge k Sorted Lists

Week 11 merged two lists by comparing their heads. With k lists, a heap holds the current head of each list and
always gives the smallest in O(log k).

```python
def merge_k_lists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))   # i breaks ties; ListNodes are not comparable
    dummy = tail = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

With N total nodes, each push and pop costs O(log k), so the total is **O(N log k)**, compared with O(N log N) for
collecting everything and sorting.

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Kth Largest Element in a Stream (LC 703)](https://leetcode.com/problems/kth-largest-element-in-a-stream/) | Warm-up | Size-k min-heap kept between calls |
| [Last Stone Weight (LC 1046)](https://leetcode.com/problems/last-stone-weight/) | Lab | Max-heap by negation |
| [Kth Largest Element in an Array (LC 215)](https://leetcode.com/problems/kth-largest-element-in-an-array/) | Lab | Size-k min-heap; compare with sorting |
| [K Closest Points to Origin (LC 973)](https://leetcode.com/problems/k-closest-points-to-origin/) | Lab | Size-k max-heap on squared distance |
| [Top K Frequent Words (LC 692)](https://leetcode.com/problems/top-k-frequent-words/) | Lab | Counter + key `(-count, word)` |
| [Task Scheduler (LC 621)](https://leetcode.com/problems/task-scheduler/) | Twist | Always run the most frequent remaining task next |
| [Merge k Sorted Lists (LC 23)](https://leetcode.com/problems/merge-k-sorted-lists/) | Lab | Heap of current heads with an index tiebreaker |
| [Find K Pairs with Smallest Sums (LC 373)](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) | Combine | Grow candidates from the smallest pair, like Merge k |
| [Find Median from Data Stream (LC 295)](https://leetcode.com/problems/find-median-from-data-stream/) | Stretch | Two heaps: a max-heap for the low half, a min-heap for the high half |

## Practice beyond class

Work through Week 15 of the **Pattern Path** sheet in DSA Practice. Before each problem, answer two questions in a
comment: "min-heap or max-heap?" and "what is the size limit, if any?". The Phase 3 assessment's DSA problems draw on
linked lists, stacks, trees and BSTs, so also revisit one problem from each of Weeks 11–14 this week.
