---
type: notes
title: "W16 · DSA · Graphs I: Representation, BFS and DFS"
slug: w16-dsa-graphs-bfs-dfs
topic: Graphs
subject: dsa
minutes: 35
description: How to represent a graph, the visited-set rule, DFS and BFS templates for adjacency lists and grids, worked solutions to Number of Islands and Rotting Oranges, and this week's problem ladder.
---
# DSA stream · Week 16: graphs I, representation, BFS and DFS

Trees (Weeks 13–14) were graphs with no cycles and one root. A general **graph** can have cycles, several components
and no root at all, so we need one new tool: a **visited set**.

## Pattern card

- **Signal:** "connected", "islands", "grid", "neighbours", "spread", "minimum steps".
- **Core move:** build an adjacency list, keep a visited set, then DFS (recursion or a stack) or BFS (a queue).
- **Builds on:** Week 10 recursion; Week 13 level-order traversal; Week 3 sets.
- **Trap:** marking a node visited when it is **popped** instead of when it is **added**, so it is queued many times.

## Vocabulary

| Term | Meaning |
|---|---|
| Vertex (node) | an item: a person, a city, a grid cell |
| Edge | a connection between two vertices; **directed** (one way) or **undirected** |
| Weighted edge | an edge with a cost (distance, time); Week 17 |
| Component | a group of vertices all reachable from one another |
| Degree | number of edges touching a vertex (in-degree / out-degree when directed) |

## Representing a graph

LeetCode usually gives `n` and an **edge list** such as `[[0, 1], [1, 2]]`. Convert it to an **adjacency list**: for
each vertex, the list of its neighbours.

```python
from collections import defaultdict

def build_graph(n, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)      # omit this line for a directed graph
    return graph
```

| Representation | Space | "Is u connected to v?" | Use when |
|---|---|---|---|
| Adjacency list | O(V + E) | O(degree of u) | almost always |
| Adjacency matrix | O(V²) | O(1) | small, dense graphs |
| Grid | the grid itself | check the 4 neighbours | islands, mazes, flood fill |

A **grid is a graph** without building anything: cell `(r, c)` has neighbours `(r±1, c)` and `(r, c±1)` that are
inside the bounds.

## DFS: go deep first

DFS follows one path as far as it can, then backtracks. Recursion makes it short:

```python
def dfs(node, graph, visited):
    visited.add(node)
    for nxt in graph[node]:
        if nxt not in visited:
            dfs(nxt, graph, visited)
```

Python's default recursion limit is about 1,000 frames, so a long path (a 300 × 300 grid of land) can raise
`RecursionError`. The iterative version uses an explicit stack and has no limit:

```python
def dfs_iterative(start, graph):
    visited = {start}
    stack = [start]
    while stack:
        node = stack.pop()
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                stack.append(nxt)
    return visited
```

## BFS: go level by level

BFS uses a **queue** and visits all vertices at distance 1, then distance 2, and so on. In an unweighted graph, the
first time BFS reaches a vertex is by a **shortest path**. DFS gives no such guarantee.

```python
from collections import deque

def bfs_distance(start, graph):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt not in dist:            # dist doubles as the visited set
                dist[nxt] = dist[node] + 1
                queue.append(nxt)
    return dist
```

Use `deque.popleft()`, which is O(1). `list.pop(0)` is O(n).

Both traversals visit each vertex and edge once: **O(V + E) time, O(V) space**. On an `m × n` grid that is O(m·n).

## Worked approach: Number of Islands (LC 200)

`'1'` is land, `'0'` is water. Count the islands.

**Idea:** scan every cell. When you find land that no earlier DFS has reached, that is a new island: count it, then
DFS to "sink" the whole island so it is not counted again.

```python
def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    seen = set()

    def sink(r, c):
        stack = [(r, c)]
        seen.add((r, c))
        while stack:
            cr, cc = stack.pop()
            for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    stack.append((nr, nc))

    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                islands += 1
                sink(r, c)
    return islands
```

The same skeleton solves Flood Fill (start one DFS and recolour) and Max Area of Island (count cells in each DFS).

## Worked approach: Rotting Oranges (LC 994)

Every minute, each rotten orange (2) rots its fresh neighbours (1). Return the minutes until no fresh orange is left,
or -1 if some can never rot.

**Idea:** multi-source BFS. Put **all** rotten oranges in the queue at the start; each BFS level is one minute.

```python
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1

    minutes = 0
    while queue and fresh > 0:
        for _ in range(len(queue)):            # process exactly one level
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2           # mark when ADDED, not when popped
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1
```

The `for _ in range(len(queue))` loop is the level-order trick from Week 13 trees.

## DFS or BFS?

| Question asks for | Use |
|---|---|
| Is there a path? How many components? Visit everything | either; DFS is often shorter |
| Fewest steps or minutes in an unweighted graph | **BFS** |
| Something spreading from several starting points at once | multi-source **BFS** |
| Explore all paths or build a result on the way back | DFS (recursion) |

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Find if Path Exists in Graph (LC 1971)](https://leetcode.com/problems/find-if-path-exists-in-graph/) | Lab | build the adjacency list; DFS from `source`, check `destination` |
| [Flood Fill (LC 733)](https://leetcode.com/problems/flood-fill/) | Lab | DFS on a grid; return early if the new colour equals the old one |
| [Number of Islands (LC 200)](https://leetcode.com/problems/number-of-islands/) | Lab | count how many DFS calls start |
| [Max Area of Island (LC 695)](https://leetcode.com/problems/max-area-of-island/) | Twist | the DFS returns the island's size |
| [Rotting Oranges (LC 994)](https://leetcode.com/problems/rotting-oranges/) | Lab | multi-source BFS, one level per minute |
| [Shortest Path in Binary Matrix (LC 1091)](https://leetcode.com/problems/shortest-path-in-binary-matrix/) | Twist | BFS with 8 directions |
| [Clone Graph (LC 133)](https://leetcode.com/problems/clone-graph/) | Lab | DFS plus a dict from old node to its copy |
| [Surrounded Regions (LC 130)](https://leetcode.com/problems/surrounded-regions/) | Combine | DFS from the border first; keep what it reaches |
| [Snakes and Ladders (LC 909)](https://leetcode.com/problems/snakes-and-ladders/) | Stretch | BFS after mapping square number to cell |

## Practice beyond class

These match Week 16 of the **Pattern Path** sheet in DSA Practice. This week also adds the **Blind 75** sheet as an
optional revision list: tick off its graph problems alongside the path. Log each problem in your tracker with the
pattern and whether you needed a hint.
