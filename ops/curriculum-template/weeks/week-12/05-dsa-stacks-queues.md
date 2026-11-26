---
type: notes
title: "W12 · DSA · Stacks and Queues: Matching, Evaluating and the Monotonic Stack"
slug: w12-dsa-stacks-queues
topic: Stacks & Queues
subject: dsa
minutes: 35
description: Stacks (last in, first out) and queues (first in, first out) in Python, how to recognise stack problems, and worked solutions for bracket matching, Min Stack, a queue from two stacks, Reverse Polish Notation and Daily Temperatures.
---
# DSA stream · Week 12: stacks and queues

## Two simple structures

| | Stack | Queue |
|---|---|---|
| Order | **LIFO**: last in, first out | **FIFO**: first in, first out |
| Picture | a pile of plates | a ticket counter line |
| Add | `push` to the top | `enqueue` at the back |
| Remove | `pop` from the top | `dequeue` from the front |
| Python | `list`: `append`, `pop()`, `stack[-1]` | `collections.deque`: `append`, `popleft()` |
| Everyday example | browser Back button, undo, function calls | print jobs, breadth-first search (Week 16) |

```python
from collections import deque

stack = []
stack.append(1); stack.append(2); stack.append(3)
print(stack.pop(), stack[-1])     # 3 2   (pop removes, [-1] peeks)

queue = deque()
queue.append("a"); queue.append("b"); queue.append("c")
print(queue.popleft(), queue[0])  # a b
```

Do not use `list.pop(0)` as a queue: it shifts every remaining element, so it is O(n). `deque.popleft()` is O(1).

## How to recognise a stack problem

- **Matching pairs**: brackets, tags, "every open must be closed in order".
- **Most recent first**: undo, backspace, going back in a path.
- **Evaluate**: expressions where operands wait for an operator.
- **Next greater / next smaller element**: "how many days until a warmer day?" (the monotonic stack).

The core move: **push what you might still need; pop when it is resolved.** And always check the stack is not empty
before popping.

## Valid Parentheses (LC 20)

Every closing bracket must match the **most recent** unmatched opening bracket, which is exactly the top of a stack.

```python
def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in pairs:                              # a closing bracket
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
        else:                                        # an opening bracket
            stack.append(ch)
    return not stack                                 # anything left open is invalid

print(is_valid("({[]})"), is_valid("(]"), is_valid("(("))   # True False False
```

Three ways to fail: a closer with an empty stack, a closer that does not match the top, and openers left at the end.
This is the same rule you used to **generate** parentheses in Week 10, now used to **check** them.

## Min Stack (LC 155)

Design a stack that also returns its minimum in O(1). The trick: store, with each item, **the minimum at the time it
was pushed**. Popping the item then automatically restores the previous minimum.

```python
class MinStack:
    def __init__(self) -> None:
        self.items: list[tuple[int, int]] = []       # (value, minimum so far)

    def push(self, val: int) -> None:
        current_min = min(val, self.items[-1][1]) if self.items else val
        self.items.append((val, current_min))

    def pop(self) -> None:
        self.items.pop()

    def top(self) -> int:
        return self.items[-1][0]

    def getMin(self) -> int:
        return self.items[-1][1]

s = MinStack()
for v in (5, 3, 7, 2):
    s.push(v)
print(s.getMin())   # 2
s.pop()
print(s.getMin())   # 3
```

(`getMin` keeps LeetCode's method name.)

## Implement Queue using Stacks (LC 232)

Use two stacks: `inbox` receives pushes; `outbox` serves pops. When `outbox` is empty, pour everything from `inbox`
into it, which reverses the order so the oldest item is on top.

```python
class MyQueue:
    def __init__(self) -> None:
        self.inbox: list[int] = []
        self.outbox: list[int] = []

    def push(self, x: int) -> None:
        self.inbox.append(x)

    def _move(self) -> None:
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self) -> int:
        self._move()
        return self.outbox.pop()

    def peek(self) -> int:
        self._move()
        return self.outbox[-1]

    def empty(self) -> bool:
        return not self.inbox and not self.outbox
```

Each element is moved from `inbox` to `outbox` at most once, so a sequence of n operations costs O(n) in total:
**amortised O(1)** per operation, even though a single `pop` can occasionally take longer.

## Evaluate Reverse Polish Notation (LC 150)

In Reverse Polish Notation the operator comes **after** its operands: `["2", "1", "+", "3", "*"]` means
`(2 + 1) * 3 = 9`. Numbers wait on the stack until an operator arrives; the operator takes the top two.

```python
def eval_rpn(tokens: list[str]) -> int:
    stack: list[int] = []
    for t in tokens:
        if t in {"+", "-", "*", "/"}:
            b = stack.pop()            # the right operand is on top
            a = stack.pop()
            if t == "+":
                stack.append(a + b)
            elif t == "-":
                stack.append(a - b)
            elif t == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))   # LC 150 truncates towards zero
        else:
            stack.append(int(t))
    return stack[0]

print(eval_rpn(["2", "1", "+", "3", "*"]))                  # 9
print(eval_rpn(["4", "13", "5", "/", "+"]))                 # 6
```

Two traps: the **order** of `a` and `b` matters for `-` and `/`; and Python's `//` rounds **down** (`-7 // 2 == -4`),
while the problem wants truncation towards zero (`-3`), hence `int(a / b)`.

## Daily Temperatures (LC 739): the monotonic stack

For each day, how many days until a warmer temperature? Checking every later day is O(n²). Instead, keep a stack of
**indices of days still waiting for a warmer day**. Their temperatures are decreasing from bottom to top (a
**monotonic** stack). When a warmer day arrives, it resolves every waiting day on top that is colder:

```python
def daily_temperatures(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    waiting: list[int] = []                    # indices, temperatures decreasing
    for i, t in enumerate(temps):
        while waiting and temps[waiting[-1]] < t:
            j = waiting.pop()
            answer[j] = i - j                  # day j waited i - j days
        waiting.append(i)
    return answer

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
# [1, 1, 4, 2, 1, 1, 0, 0]
```

Each index is pushed once and popped at most once, so the whole thing is O(n). Days left on the stack at the end never
see a warmer day and keep their 0.

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| [Valid Parentheses (LeetCode 20)](https://leetcode.com/problems/valid-parentheses/) | matching | map each closer to its opener |
| [Backspace String Compare (LeetCode 844)](https://leetcode.com/problems/backspace-string-compare/) | most recent first | warm-up: `#` pops the stack |
| [Implement Queue using Stacks (LeetCode 232)](https://leetcode.com/problems/implement-queue-using-stacks/) | two stacks | pour only when `outbox` is empty |
| [Min Stack (LeetCode 155)](https://leetcode.com/problems/min-stack/) | extra info per item | store `(value, min so far)` |
| [Evaluate Reverse Polish Notation (LeetCode 150)](https://leetcode.com/problems/evaluate-reverse-polish-notation/) | evaluate | pop `b` first, then `a` |
| [Daily Temperatures (LeetCode 739)](https://leetcode.com/problems/daily-temperatures/) | monotonic stack | store indices, not temperatures |

## Practice beyond class

Week 12 of the **Pattern Path** sheet adds Simplify Path and Car Fleet, with Sliding Window Maximum and Largest
Rectangle in Histogram as stretch problems.
