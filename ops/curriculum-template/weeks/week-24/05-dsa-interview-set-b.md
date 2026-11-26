---
type: notes
title: "W24 · DSA · Interview Set B: Trees, Graphs and Heaps"
slug: w24-dsa-interview-set-b
topic: Interview Problem Sets
subject: dsa
minutes: 35
description: Recognise tree, graph and heap problems without labels, with worked solutions for zigzag level-order traversal, Minimum Genetic Mutation (BFS on strings) and tree serialisation, plus this week's company-style set B.
---
# DSA stream · Week 24: interview set B

Set B covers the non-linear structures: **trees, graphs and heaps**. In technical interviews these separate candidates
quickly, because the code is short but easy to get subtly wrong. The good news: almost every problem reduces to a
handful of templates you already know.

## Recognising the structure

| Signal | Template |
|---|---|
| "level by level", "nearest", "minimum number of steps/moves" | **BFS** with a queue |
| "path from root", "height", "subtree", "every node" | **DFS** recursion on a tree |
| "states that change one character / one cell at a time" | A hidden **graph**: states are nodes, moves are edges → BFS |
| "k largest / k most recent / merge k sorted" | **Heap** of size k |
| "minimise the maximum along a path", "cheapest path" with weights | **Dijkstra-style** heap search |
| "rebuild the tree from traversals / from a string" | Recursive construction with a shared index |

## Worked approach 1: Binary Tree Zigzag Level Order Traversal

Standard BFS processes one level at a time by reading `len(queue)` at the start of the level. Zigzag only changes how
each finished level is added: reversed on every other level.

```python
from collections import deque


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def zigzag_level_order(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    result, queue, left_to_right = [], deque([root]), True
    while queue:
        level = []
        for _ in range(len(queue)):          # exactly the nodes of this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level if left_to_right else level[::-1])
        left_to_right = not left_to_right
    return result


root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(zigzag_level_order(root))  # [[3], [20, 9], [15, 7]]
```

Time O(n), space O(w) where w is the widest level. A common mistake is changing the order in which children are
**added** to the queue; that scrambles the next level. Keep BFS standard and reverse only the output.

## Worked approach 2: Minimum Genetic Mutation (BFS on strings)

A gene is an 8-character string of `A`, `C`, `G`, `T`. One mutation changes one character, and every intermediate gene
must be in the bank. Find the minimum number of mutations.

The trigger is "minimum number of steps" with states that change one character at a time. Each gene is a **node**; two
genes are connected if they differ in one position. Shortest path in an unweighted graph means **BFS**.

```python
from collections import deque


def min_mutation(start: str, end: str, bank: list[str]) -> int:
    valid = set(bank)
    if end not in valid:
        return -1
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        gene, steps = queue.popleft()
        if gene == end:
            return steps
        for i in range(len(gene)):
            for ch in "ACGT":
                nxt = gene[:i] + ch + gene[i + 1:]
                if nxt in valid and nxt not in seen:
                    seen.add(nxt)
                    queue.append((nxt, steps + 1))
    return -1


print(min_mutation("AACCGGTT", "AACCGGTA", ["AACCGGTA"]))                          # 1
print(min_mutation("AACCGGTT", "AAACGGTA", ["AACCGGTA", "AACCGCTA", "AAACGGTA"]))  # 2
```

Mark genes as **seen when they are added** to the queue, not when they are removed; otherwise the same gene can be
queued many times. This is the same template as Word Ladder from Week 17.

## Worked approach 3: Serialize and Deserialize Binary Tree

Write the tree in **preorder** with a marker (`#`) for every missing child. The markers make the string unambiguous, so
one pass can rebuild the exact shape.

```python
def serialize(root: TreeNode | None) -> str:
    out = []

    def dfs(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return ",".join(out)


def deserialize(data: str) -> TreeNode | None:
    values = iter(data.split(","))

    def build():
        v = next(values)
        if v == "#":
            return None
        node = TreeNode(int(v))
        node.left = build()
        node.right = build()
        return node

    return build()


s = serialize(root)
print(s)                          # 3,9,#,#,20,15,#,#,7,#,#
print(serialize(deserialize(s)))  # same string: the round trip works
```

Both directions are O(n). The shared iterator plays the role of a global index, so each recursive call consumes exactly
the values that belong to its subtree. For very deep trees, Python's recursion limit can be hit; mention that an
iterative version with an explicit stack avoids it.

## Heaps in this set

- **Design Twitter**: store each user's tweets with a global timestamp; to build a feed, push the newest tweet of each
  followed user into a heap and pop the 10 most recent, pushing that user's next tweet each time (merge k sorted
  lists).
- **Swim in Rising Water**: you want the path whose **maximum** cell is smallest. Use a min-heap keyed by "highest
  elevation so far on this path", always expanding the cell with the smallest key, Dijkstra-style. The first time you
  pop the bottom-right cell, its key is the answer.

## This week's problems (company-style set B)

| # | Problem | Difficulty | Hint |
|---|---|---|---|
| 1 | [Binary Tree Zigzag Level Order Traversal (LC 103)](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/) | Medium | BFS by level; reverse every other level |
| 2 | [Flatten Binary Tree to Linked List (LC 114)](https://leetcode.com/problems/flatten-binary-tree-to-linked-list/) | Medium | relink in preorder; or process right, left, root and keep a "previous" pointer |
| 3 | [Construct Binary Tree from Inorder and Postorder Traversal (LC 106)](https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/) | Medium | last postorder value is the root; build the right subtree first |
| 4 | [Minimum Genetic Mutation (LC 433)](https://leetcode.com/problems/minimum-genetic-mutation/) | Medium | BFS over strings |
| 5 | [Design Twitter (LC 355)](https://leetcode.com/problems/design-twitter/) | Medium | hash maps + heap merge |
| 6 | [Serialize and Deserialize Binary Tree (LC 297)](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) | Hard | preorder with null markers |
| 7 | [Swim in Rising Water (LC 778)](https://leetcode.com/problems/swim-in-rising-water/) | Hard | min-heap on "max elevation so far" |

Weekly timed contest: 90 minutes, run by your tutor.

## Practice beyond class

Before Mock Interview #2, write BFS on a grid, DFS on a tree and a heap-based top-k from memory, timing yourself. Then
continue with the tree, graph and heap problems on the **LeetCode 150** sheet.
