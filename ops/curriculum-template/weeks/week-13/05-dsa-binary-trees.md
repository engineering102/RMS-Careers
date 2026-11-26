---
type: notes
title: "W13 · DSA · Binary Trees: Traversals, Depth and the Recursive Trust Step"
slug: w13-dsa-binary-trees
topic: Binary Trees
subject: dsa
minutes: 35
description: Binary tree vocabulary, the four traversals (recursive, iterative and level order), the "solve left, solve right, combine" template, and worked approaches for maximum depth, invert and diameter.
---
# DSA stream · Week 13: binary trees

Trees appear in file systems, HTML (the DOM is a tree), databases (B-tree indexes) and in a large share of interview
questions. The good news: almost every tree problem uses one recursive template.

## Pattern card

- **Signal:** "root", "depth", "height", "level", "path", "subtree", "leaf".
- **Core move:** solve for the left child, solve for the right child, then **combine** at the node. Decide whether
  information is **returned up** (height, sum) or **passed down** (current depth, running total).
- **Builds on:** Week 10 recursion; Week 12 stacks and queues (iterative traversal, level order).
- **Trap:** forgetting the empty-tree base case (`if node is None`).

## Vocabulary

```text
        1          ← root (depth 0)
       / \
      2   3        ← 2 and 3 are children of 1; siblings of each other
     / \   \
    4   5   6      ← leaves (no children)
```

- **Binary tree**: each node has at most two children, `left` and `right`.
- **Height** of a node: edges on the longest path down to a leaf. **Depth**: edges from the root. LeetCode's
  "maximum depth" counts **nodes** on the longest root-to-leaf path (3 for the tree above).
- **Subtree**: a node and everything below it. Every subtree is itself a binary tree, which is why recursion fits.

LeetCode defines nodes like this:

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# build the tree above by hand for testing
root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3, None, TreeNode(6)))
```

## The recursive trust step

When you write `depth(node.left)`, **trust** that it returns the correct answer for the left subtree. Do not trace
it all the way down in your head. Your only job is:

1. **Base case**: what is the answer for an empty tree?
2. **Trust**: assume the calls on `left` and `right` are correct.
3. **Combine**: build this node's answer from the two results and `node.val`.

Say these three lines aloud before coding every tree problem this week.

## Depth-first traversals

The three DFS orders differ only in **when** you visit the node:

| Order | Visit sequence | Tree above gives | Typical use |
|---|---|---|---|
| Preorder | node, left, right | 1 2 4 5 3 6 | Copying or serialising a tree |
| Inorder | left, node, right | 4 2 5 1 3 6 | Sorted order in a BST (Week 14) |
| Postorder | left, right, node | 4 5 2 6 3 1 | Deleting a tree; answers that need both children first |

```python
def inorder(root):
    result = []

    def dfs(node):
        if node is None:
            return
        dfs(node.left)
        result.append(node.val)   # move this line up for preorder, down for postorder
        dfs(node.right)

    dfs(root)
    return result

print(inorder(root))   # [4, 2, 5, 1, 3, 6]
```

### Iterative inorder with a stack

Interviewers often ask for the version without recursion. The stack replaces the call stack (Week 12):

```python
def inorder_iterative(root):
    result, stack, node = [], [], root
    while node or stack:
        while node:                # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()         # the leftmost unvisited node
        result.append(node.val)
        node = node.right          # then explore its right subtree
    return result
```

## Breadth-first: level order with a queue

Level order visits the tree **level by level**, left to right. Use a queue (`collections.deque`) and process one
level per outer loop iteration by fixing the level size first.

```python
from collections import deque

def level_order(root):
    if root is None:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):        # exactly the nodes on this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result

print(level_order(root))   # [[1], [2, 3], [4, 5, 6]]
```

Once you have this, Right Side View is "keep the last value of each level".

## Worked approach: Maximum Depth (return a value up)

1. Base: an empty tree has depth 0.
2. Trust: `left = max_depth(node.left)`, `right = max_depth(node.right)` are correct.
3. Combine: this node adds one level: `1 + max(left, right)`.

```python
def max_depth(node):
    if node is None:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))
```

Time O(n): every node is visited once. Space O(h) for the recursion stack, where h is the height: O(log n) for a
balanced tree, O(n) for a tree shaped like a linked list.

## Worked approach: Invert Binary Tree

Swap the children at every node, and let recursion handle the subtrees.

```python
def invert_tree(node):
    if node is None:
        return None
    node.left, node.right = invert_tree(node.right), invert_tree(node.left)
    return node
```

Python evaluates the whole right-hand side before assigning, so the tuple swap is safe.

## Worked approach: Diameter (return one thing, track another)

The **diameter** is the number of edges on the longest path between any two nodes. The path does not have to pass
through the root. At each node, the longest path that **bends** here is `height(left) + height(right)`. So:

- **return up** the height (what the parent needs);
- **update on the side** the best diameter seen (what the problem asks).

```python
def diameter_of_binary_tree(root):
    best = 0

    def height(node):               # height in nodes; empty tree = 0
        nonlocal best
        if node is None:
            return 0
        left = height(node.left)
        right = height(node.right)
        best = max(best, left + right)   # edges on the path bending at this node
        return 1 + max(left, right)

    height(root)
    return best
```

For the example tree the answer is 4 (path 4 → 2 → 1 → 3 → 6). This "return one value, track another" trick
reappears in Balanced Binary Tree and Binary Tree Maximum Path Sum.

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Binary Tree Inorder Traversal (LC 94)](https://leetcode.com/problems/binary-tree-inorder-traversal/) | Lab | Recursive first, then the stack version |
| [Binary Tree Preorder Traversal (LC 144)](https://leetcode.com/problems/binary-tree-preorder-traversal/) | Lab | Node first |
| [Binary Tree Postorder Traversal (LC 145)](https://leetcode.com/problems/binary-tree-postorder-traversal/) | Lab | Node last |
| [Maximum Depth of Binary Tree (LC 104)](https://leetcode.com/problems/maximum-depth-of-binary-tree/) | Lab | `1 + max(left, right)` |
| [Same Tree (LC 100)](https://leetcode.com/problems/same-tree/) | Warm-up | Recurse on two trees at once |
| [Invert Binary Tree (LC 226)](https://leetcode.com/problems/invert-binary-tree/) | Lab | Swap children at every node |
| [Symmetric Tree (LC 101)](https://leetcode.com/problems/symmetric-tree/) | Twist | Same Tree on a mirrored pair: compare `a.left` with `b.right` |
| [Path Sum (LC 112)](https://leetcode.com/problems/path-sum/) | Twist | Pass the remaining sum **down** |
| [Binary Tree Level Order Traversal (LC 102)](https://leetcode.com/problems/binary-tree-level-order-traversal/) | Lab | Queue; fix the level size first |
| [Binary Tree Right Side View (LC 199)](https://leetcode.com/problems/binary-tree-right-side-view/) | Twist | Last node of each level |
| [Diameter of Binary Tree (LC 543)](https://leetcode.com/problems/diameter-of-binary-tree/) | Lab | Return height, track the best on the side |
| [Balanced Binary Tree (LC 110)](https://leetcode.com/problems/balanced-binary-tree/) | Combine | Same height trick; return -1 for "unbalanced" |
| [Binary Tree Maximum Path Sum (LC 124)](https://leetcode.com/problems/binary-tree-maximum-path-sum/) | Stretch | Diameter + drop negative branches (Kadane, Week 4) |

## Practice beyond class

Work through Week 13 of the **Pattern Path** sheet in DSA Practice. For each problem, write the base case, the trust
step and the combine step as comments **before** the code. If you are stuck on a tree problem, draw the tree with three
to five nodes and compute the answer for each leaf, then for their parents.
