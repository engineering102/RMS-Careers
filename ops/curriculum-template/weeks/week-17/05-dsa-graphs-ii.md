---
type: notes
title: "W17 · DSA · Graphs II: Topological Sort, Shortest Paths and Union–Find"
slug: w17-dsa-topological-sort-dijkstra-union-find
topic: Graphs
subject: dsa
minutes: 40
description: Three graph tools beyond plain traversal: topological sort with in-degrees, Dijkstra's shortest paths with a heap, and union–find for merging groups, with worked solutions and this week's problem ladder.
---
# DSA stream · Week 17: graphs II, topological sort, shortest paths and union–find

Last week's BFS and DFS answer "what can I reach?". This week adds three questions: **in what order** can tasks be
done, what is the **cheapest route**, and **which items belong to the same group**?

## Pattern card

- **Signal:** "prerequisites", "order", "schedule", "cheapest/fastest route", "redundant edge", "groups", "connected
  components".
- **Core move:** in-degrees for ordering; Dijkstra = BFS with a min-heap; union–find to merge groups.
- **Builds on:** Week 16 BFS/DFS; Week 15 heaps.
- **Trap:** using Dijkstra when edge weights can be negative. It gives wrong answers.

## 1. Topological sort

A **directed acyclic graph (DAG)** has directed edges and no cycles. A **topological order** lists its vertices so
that every edge `u → v` has `u` before `v`: take courses only after their prerequisites, build modules after their
dependencies. A graph with a cycle has **no** topological order.

**Kahn's algorithm** (BFS on in-degrees):

1. Count the **in-degree** (number of incoming edges) of every vertex.
2. Put every vertex with in-degree 0 in a queue: nothing has to come before them.
3. Pop a vertex, append it to the order, and decrease the in-degree of its neighbours; any that reach 0 join the queue.
4. If the order contains every vertex, it is valid. If not, the remaining vertices are in a cycle.

### Worked approach: Course Schedule (LC 207)

`prerequisites[i] = [a, b]` means you must take `b` before `a`, so the edge is `b → a`.

```python
from collections import deque

def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    indegree = [0] * num_courses
    for course, pre in prerequisites:
        graph[pre].append(course)
        indegree[course] += 1

    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    taken = 0
    while queue:
        c = queue.popleft()
        taken += 1
        for nxt in graph[c]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return taken == num_courses        # False means a cycle blocked some courses
```

Course Schedule II (LC 210) is the same code returning the order list instead of a count. Time O(V + E).

## 2. Shortest paths with Dijkstra

BFS finds the fewest **edges**. When edges have **non-negative weights** (minutes, kilometres, rupees), use
**Dijkstra**: always expand the unfinished vertex with the smallest known distance, which a **min-heap** gives you in
O(log n).

```python
import heapq

def dijkstra(graph, source):
    """graph[u] = list of (v, weight). Returns shortest distance to every reachable vertex."""
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            continue                        # stale entry: u was already reached more cheaply
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
```

Time O((V + E) log V). The "stale entry" check replaces a decrease-key operation, which `heapq` does not have.

### Worked approach: Network Delay Time (LC 743)

A signal starts at node `k`; `times[i] = [u, v, w]` is a directed edge taking `w` time. How long until every node has
the signal? That is the **largest** shortest distance, or -1 if some node is unreachable.

```python
from collections import defaultdict

def network_delay_time(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    dist = dijkstra(graph, k)
    return max(dist.values()) if len(dist) == n else -1
```

**Why negative weights break it:** Dijkstra treats a vertex as final once it is popped with the smallest distance.
A negative edge found later could make that distance smaller, but the vertex is never revisited. (The Bellman–Ford
algorithm handles negative weights; you will not need it this week.)

## 3. Union–find (disjoint set union)

Union–find keeps items in groups and supports two operations, both nearly O(1) with two small optimisations:

- `find(x)`: which group (representative) is `x` in?
- `union(a, b)`: merge the groups of `a` and `b`.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.groups = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path compression (halving)
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                                    # already in the same group
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                                # attach smaller tree under larger
        self.size[ra] += self.size[rb]
        self.groups -= 1
        return True
```

### Worked approach: Redundant Connection (LC 684)

A tree with `n` nodes (labelled 1 to n) had one extra edge added. Return the edge that can be removed; if several
qualify, the one that appears last in the input.

**Idea:** add edges one by one. The first edge whose two ends are **already connected** closes a cycle, so it is
redundant. Because a tree plus one edge has exactly one cycle, the first such edge we meet is also the last edge of
that cycle in input order.

```python
def find_redundant_connection(edges):
    uf = UnionFind(len(edges) + 1)       # nodes are 1..n, and n == len(edges)
    for a, b in edges:
        if not uf.union(a, b):
            return [a, b]
```

Number of Provinces (LC 547) uses 0-based cities: build `UnionFind(n)`, union every pair `i, j` with
`isConnected[i][j] == 1`, and the answer is `uf.groups`. Solve it with DFS first, then with union–find, and compare.

## Which tool?

| Problem says | Tool |
|---|---|
| order tasks with dependencies; detect a cycle in a directed graph | topological sort (Kahn) |
| fewest steps, every edge costs the same | BFS (Week 16) |
| cheapest/fastest route, non-negative weights | Dijkstra |
| keep merging groups; "are a and b connected?" asked many times | union–find |
| connect all points at minimum total cost | minimum spanning tree (Kruskal = sort edges + union–find) |

## This week's problems

| Problem | Role | Hint |
|---|---|---|
| [Number of Provinces (LC 547)](https://leetcode.com/problems/number-of-provinces/) | Lab | DFS count, then union–find |
| [Redundant Connection (LC 684)](https://leetcode.com/problems/redundant-connection/) | Lab | first union that returns False |
| [Course Schedule (LC 207)](https://leetcode.com/problems/course-schedule/) | Lab | Kahn's algorithm; count what you can take |
| [Course Schedule II (LC 210)](https://leetcode.com/problems/course-schedule-ii/) | Twist | return the order, or `[]` on a cycle |
| [Network Delay Time (LC 743)](https://leetcode.com/problems/network-delay-time/) | Lab | Dijkstra; answer is the largest distance |
| [Pacific Atlantic Water Flow (LC 417)](https://leetcode.com/problems/pacific-atlantic-water-flow/) | Lab | DFS uphill from each ocean's border; intersect the two sets |
| [Min Cost to Connect All Points (LC 1584)](https://leetcode.com/problems/min-cost-to-connect-all-points/) | Combine | minimum spanning tree with union–find or a heap |
| [Evaluate Division (LC 399)](https://leetcode.com/problems/evaluate-division/) | Combine | weighted graph; multiply along a DFS path |
| [Cheapest Flights Within K Stops (LC 787)](https://leetcode.com/problems/cheapest-flights-within-k-stops/) | Stretch | BFS levels limit the stops |
| [Word Ladder (LC 127)](https://leetcode.com/problems/word-ladder/) | Stretch | BFS where neighbours differ by one letter |

## Practice beyond class

These match Week 17 of the **Pattern Path** sheet. For revision, tick off the graph problems on the **Blind 75**
sheet. Log each problem with the tool you chose and why.
