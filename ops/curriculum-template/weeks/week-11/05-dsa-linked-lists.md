---
type: notes
title: "W11 · DSA · Linked Lists: Pointers, Dummy Heads and Fast/Slow"
slug: w11-dsa-linked-lists
topic: Linked Lists
subject: dsa
minutes: 35
description: How singly linked lists work, why you draw boxes and arrows, and the three core techniques — reversing with three pointers, the dummy head, and fast/slow pointers — applied to this week's problems.
---
# DSA stream · Week 11: linked lists

## What a linked list is

An array stores items side by side in memory, so `arr[i]` is instant. A **linked list** stores each item in a
separate **node** that points to the next one:

```text
head
 │
 ▼
[1 | •]──►[2 | •]──►[3 | •]──►[4 | None]
```

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next
```

(This is the same `ListNode` class LeetCode gives you.)

| Operation | Array | Linked list |
|---|---|---|
| Access the i-th item | O(1) | O(n): walk from the head |
| Insert/delete at the front | O(n): shift everything | O(1): change one pointer |
| Insert/delete after a node you already have | O(n) | O(1) |
| Extra memory | none | one pointer per node |

Linked lists appear in interviews because they test **careful pointer handling**, not because you will hand-write
them often.

### Helpers for testing locally

```python
def build(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head: ListNode | None) -> list[int]:
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out
```

## The golden rule

**Draw the boxes and arrows, and save `next` before you change it.** Most linked list bugs come from overwriting
`node.next` and losing the rest of the list. Always ask: "after this line, can I still reach every node I need?"

## Technique 1: reverse with three pointers (LC 206)

Walk the list once, turning each arrow around:

```text
prev   curr
None   [1]──►[2]──►[3]──►None

step:  nxt = curr.next      (save the rest)
       curr.next = prev     (turn the arrow)
       prev = curr          (move both forward)
       curr = nxt

None◄──[1]   [2]──►[3]──►None
       prev  curr
```

```python
def reverse_list(head: ListNode | None) -> ListNode | None:
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev                       # prev is the new head

print(to_list(reverse_list(build([1, 2, 3, 4, 5]))))   # [5, 4, 3, 2, 1]
```

O(n) time, O(1) extra space.

## Technique 2: the dummy head (LC 21)

When the head itself might change, or you are building a new list, start with a **dummy** node. You never need a
special case for "the list is empty so far", and the answer is `dummy.next`.

Merge Two Sorted Lists is Merge Sorted Array from Week 8, with nodes:

```python
def merge_two_lists(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    dummy = ListNode()
    tail = dummy
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b                # attach whatever is left
    return dummy.next

print(to_list(merge_two_lists(build([1, 2, 4]), build([1, 3, 4]))))   # [1, 1, 2, 3, 4, 4]
```

## Technique 3: fast and slow pointers

Two pointers moving at different speeds reveal the structure of a list in one pass with O(1) memory.

### Middle of the Linked List (LC 876)

`slow` moves one step, `fast` moves two. When `fast` reaches the end, `slow` is in the middle.

```python
def middle_node(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

print(middle_node(build([1, 2, 3, 4, 5])).val)      # 3
print(middle_node(build([1, 2, 3, 4, 5, 6])).val)   # 4 (the second middle, as LC 876 asks)
```

### Linked List Cycle (LC 141)

If the list has a cycle, the fast pointer eventually laps the slow one, like a faster runner on a circular track.
If there is no cycle, `fast` falls off the end. This is Floyd's cycle detection, and it replaces the `set` you used
for Happy Number in Week 3.

```python
def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:              # same node object, not just the same value
            return True
    return False
```

### Remove Nth Node From End of List (LC 19)

Move `fast` n steps ahead, then move both until `fast` reaches the last node. `slow` is then just **before** the node
to remove. Start both at a dummy so removing the head works too.

```python
def remove_nth_from_end(head: ListNode | None, n: int) -> ListNode | None:
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next        # skip the target node
    return dummy.next

print(to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)))   # [1, 2, 3, 5]
print(to_list(remove_nth_from_end(build([1]), 1)))               # []
```

## Edge cases to test every time

| Case | Why |
|---|---|
| empty list (`None`) | loops must not touch `None.next` |
| one node | head and tail are the same |
| two nodes | the smallest case where pointers move |
| change at the head | is a dummy node needed? |
| change at the tail | is the last `next` set to `None`? |

## This week's problems

| Problem | Technique | Hint |
|---|---|---|
| [Middle of the Linked List (LeetCode 876)](https://leetcode.com/problems/middle-of-the-linked-list/) | fast/slow | loop while `fast and fast.next` |
| [Remove Duplicates from Sorted List (LeetCode 83)](https://leetcode.com/problems/remove-duplicates-from-sorted-list/) | walk and relink | warm-up: skip `next` while it repeats |
| [Reverse Linked List (LeetCode 206)](https://leetcode.com/problems/reverse-linked-list/) | three pointers | save `next` first |
| [Merge Two Sorted Lists (LeetCode 21)](https://leetcode.com/problems/merge-two-sorted-lists/) | dummy head | attach the leftover list at the end |
| [Linked List Cycle (LeetCode 141)](https://leetcode.com/problems/linked-list-cycle/) | fast/slow | compare nodes with `is` |
| [Remove Nth Node From End of List (LeetCode 19)](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) | gap of n + dummy | stop `slow` one before the target |

Solve Reverse Linked List twice: once iteratively as above, once recursively (recursion from Week 10). Explain both
aloud.

## Practice beyond class

Week 11 of the **Pattern Path** sheet adds Palindrome Linked List and Reorder List, which combine middle, reverse and
merge. If you can do those three moves without looking, you can handle most linked list interview questions.
