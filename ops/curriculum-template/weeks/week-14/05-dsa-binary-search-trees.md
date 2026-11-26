---
type: notes
title: "W14 · DSA · Binary Search Trees: Ordering, Bounds and Inorder"
slug: w14-dsa-binary-search-trees
topic: Binary Search Trees
subject: dsa
minutes: 35
description: The BST property, search and insert in O(h), validating a BST by passing bounds down, inorder traversal as a sorted sequence, kth smallest, lowest common ancestor and building a balanced BST from a sorted array.
---
# DSA stream · Week 14: binary search trees

A **binary search tree (BST)** is a binary tree with one extra rule that turns tree problems into binary search
problems. This week combines Week 9 (halving the search space) with Week 13 (recursion on trees).

## Pattern card

- **Signal:** "BST", "sorted order", "kth smallest", "valid", "closest value", "range".
- **Core move:** left < node < right, so at each node you go **one way only**; an **inorder** traversal visits the
  values in sorted order.
- **Builds on:** Week 9 binary search; Week 13 traversals and passing values down.
- **Trap:** checking only a node and its direct children; the **whole** left subtree must be smaller.

## The BST property

For every node: all values in its left subtree are smaller, and all values in its right subtree are larger (LeetCode
BST problems usually assume distinct values).

```text
        8
       / \
      3   10
     / \    \
    1   6    14
       / \   /
      4   7 13
```

Inorder (left, node, right) gives `1 3 4 6 7 8 10 13 14`: sorted. That single fact solves a surprising number of
problems.

## Search and insert: O(h)

Searching compares with the node and discards half of the remaining tree, exactly like binary search on an array:

```python
def search_bst(node, target):
    while node and node.val != target:
        node = node.left if target < node.val else node.right
    return node            # the node, or None if absent
```

Insert walks the same path and attaches the new node at the empty spot where the search ended:

```python
def insert_into_bst(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_into_bst(root.left, val)
    else:
        root.right = insert_into_bst(root.right, val)
    return root
```

Both cost **O(h)** where h is the height. For a balanced tree h is about log₂ n; inserting already-sorted values
(1, 2, 3, 4, …) produces a "stick" where h = n and everything becomes O(n). Self-balancing trees (AVL, red–black)
keep h logarithmic; you only need to know they exist and why.

| Operation | Balanced BST | Degenerate BST | Sorted array |
|---|---|---|---|
| Search | O(log n) | O(n) | O(log n) |
| Insert / delete | O(log n) | O(n) | O(n) (shifting) |
| Sorted output | O(n) inorder | O(n) | O(n) |

## Worked approach: Validate BST (pass bounds down)

The trap: this tree passes a "check each node against its children" test, but it is **not** a BST, because of 9:

```text
        8
       / \
      3   10
       \
        9        ← 9 > 3 (fine for its parent) but 9 > 8, and it sits in 8's LEFT subtree
```

Each node must lie inside a **range** inherited from all its ancestors. Pass the range down (like Path Sum in
Week 13):

```python
def is_valid_bst(root):
    def check(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return check(node.left, low, node.val) and check(node.right, node.val, high)

    return check(root, float('-inf'), float('inf'))
```

Going left tightens the upper bound to the node's value; going right tightens the lower bound. Time O(n), space O(h).

An equivalent approach: do an inorder traversal and check that every value is strictly greater than the previous one.

## Worked approach: Kth Smallest (inorder with early stop)

Inorder visits values in ascending order, so the kth value visited is the answer. Use the iterative inorder from
Week 13 and stop as soon as you reach it:

```python
def kth_smallest(root, k):
    stack, node = [], root
    while node or stack:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right
```

This costs O(h + k) rather than O(n), because it never visits nodes after the kth.

## Worked approach: Lowest Common Ancestor of a BST

The **lowest common ancestor** of p and q is the deepest node that has both in its subtree. In a BST, start at the
root: if both values are smaller, the LCA is on the left; if both are larger, it is on the right; otherwise the
values **split** here (or one of them is this node), so this node is the answer.

```python
def lowest_common_ancestor(root, p, q):
    node = root
    while node:
        if p.val < node.val and q.val < node.val:
            node = node.left
        elif p.val > node.val and q.val > node.val:
            node = node.right
        else:
            return node
```

In the example tree, the LCA of 4 and 7 is 6; the LCA of 4 and 14 is 8; the LCA of 3 and 4 is 3.

## Worked approach: Sorted Array to a balanced BST

The middle element becomes the root, so half the values go left and half go right: Week 9 halving in reverse.

```python
def sorted_array_to_bst(nums):
    def build(lo, hi):
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        return TreeNode(nums[mid], build(lo, mid - 1), build(mid + 1, hi))

    return build(0, len(nums) - 1)
```

Passing indices instead of slicing (`nums[:mid]`) avoids copying the array at every level.

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Search in a Binary Search Tree (LC 700)](https://leetcode.com/problems/search-in-a-binary-search-tree/) | Warm-up | Go one way only |
| [Insert into a Binary Search Tree (LC 701)](https://leetcode.com/problems/insert-into-a-binary-search-tree/) | Lab | Search, then attach at the empty spot |
| [Validate Binary Search Tree (LC 98)](https://leetcode.com/problems/validate-binary-search-tree/) | Lab | Pass `(low, high)` bounds down |
| [Minimum Absolute Difference in BST (LC 530)](https://leetcode.com/problems/minimum-absolute-difference-in-bst/) | Twist | Inorder is sorted: compare neighbours |
| [Kth Smallest Element in a BST (LC 230)](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) | Lab | Inorder with a counter; stop early |
| [Lowest Common Ancestor of a BST (LC 235)](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) | Lab | Find the split point |
| [Convert Sorted Array to BST (LC 108)](https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/) | Lab | Middle element is the root |
| [Lowest Common Ancestor of a Binary Tree (LC 236)](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) | Combine | No ordering: return what each side found |
| [Binary Search Tree Iterator (LC 173)](https://leetcode.com/problems/binary-search-tree-iterator/) | Combine | Iterative inorder, one step per `next()` |
| [Time Based Key-Value Store (LC 981)](https://leetcode.com/problems/time-based-key-value-store/) | Revisit | Week 9 "last value at or before" inside a hash map |
| [Construct Binary Tree from Preorder and Inorder (LC 105)](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) | Stretch | Preorder gives the root; inorder splits left from right |

## Practice beyond class

Work through Week 14 of the **Pattern Path** sheet in DSA Practice. For each BST problem, first ask: "Can I go one
way only?" (search-style) or "Do I need sorted order?" (inorder-style). Write the answer as a comment before coding.
