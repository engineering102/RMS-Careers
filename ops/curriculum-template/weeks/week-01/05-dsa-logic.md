---
type: notes
title: "W1 · DSA · Programming Logic: Algorithms, Pseudocode and Pattern Printing"
slug: w01-dsa-programming-logic
topic: Programming Logic
subject: dsa
minutes: 30
description: What an algorithm is, how to plan with flowcharts and pseudocode, nested loops for pattern printing, and this week's DSA problems with worked approaches.
---
# DSA stream · Week 1: programming logic

Before data structures, you need a habit: **plan the steps, then write the code**. This week is about that habit.

## What is an algorithm?

An **algorithm** is a finite, unambiguous sequence of steps that turns an input into the correct output. A good one is:

- **correct** for every valid input, including edge cases (0, negative numbers, one item);
- **clear** enough that someone else could follow it;
- **efficient**, which we will measure properly from Week 3 onward with Big-O.

## Planning tools

**Flowchart**: boxes and arrows. Ovals for start and end, rectangles for steps, diamonds for decisions. Useful for
seeing branches.

**Pseudocode**: plain-language steps that look like code but ignore syntax.

```text
READ a, b, c
largest ← a
IF b > largest THEN largest ← b
IF c > largest THEN largest ← c
PRINT largest
```

Write pseudocode first for every problem this week. It turns "I don't know where to start" into "I know step 1".

## The problem-solving routine

Use these five steps for every problem in the programme:

1. **Understand**: restate the problem in your own words. What is the input? What is the output?
2. **Examples**: work two or three small examples by hand, including an edge case.
3. **Plan**: pseudocode or a flowchart.
4. **Code**: translate the plan.
5. **Test**: run your examples, then try to break your own code.

## Pattern printing: thinking in rows and columns

Pattern problems train nested loops: **the outer loop picks the row, the inner loop prints that row's content**.

Right triangle, `n = 4`:

```text
*
* *
* * *
* * * *
```

Row `i` (from 1 to n) has `i` stars:

```python
n = 4
for i in range(1, n + 1):
    print("* " * i)
```

Centred pyramid, `n = 4`: row `i` has `n - i` spaces, then `2*i - 1` stars.

```text
   *
  ***
 *****
*******
```

```python
for i in range(1, n + 1):
    print(" " * (n - i) + "*" * (2 * i - 1))
```

The trick for every pattern: write a table of **row number → spaces → symbols**, find the formula, then code it.

| Row i | Spaces | Stars |
|---|---|---|
| 1 | 3 | 1 |
| 2 | 2 | 3 |
| 3 | 1 | 5 |
| 4 | 0 | 7 |

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| Star / number pyramids (5 variants) | nested loops | build the row → count table first |
| Largest of three numbers | conditionals | keep a running `largest` |
| Sum and reverse of digits | digit loop | `n % 10` takes the last digit, `n // 10` drops it |
| [Fizz Buzz (LeetCode 412)](https://leetcode.com/problems/fizz-buzz/) | conditionals in a loop | check divisible-by-15 **first** |

### Worked approach: sum and reverse of digits

```text
n = 1234
digit = n % 10  → 4      reverse = 0*10 + 4 = 4       sum = 4      n = 123
digit = 3                reverse = 4*10 + 3 = 43      sum = 7      n = 12
digit = 2                reverse = 432                sum = 9      n = 1
digit = 1                reverse = 4321               sum = 10     n = 0  → stop
```

```python
n = int(input())
total, rev = 0, 0
while n > 0:
    digit = n % 10
    total += digit
    rev = rev * 10 + digit
    n //= 10
print(total, rev)
```

Edge cases to test: `n = 0` (the loop never runs; is printing `0 0` correct?), a number ending in zero such as `120`
(the reverse is `21`).

### Worked approach: Fizz Buzz

The common bug is checking `% 3` before `% 15`, so 15 prints "Fizz". Order the checks from **most specific to least
specific**.

## Practice beyond class

Start the **Pattern Path** sheet in DSA Practice. Week 1 of the path matches this week's lab. Log each problem in your
DSA tracker with the date and the pattern, and mark anything you want to revisit.
