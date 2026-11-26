---
type: notes
title: "W2 · DSA · Math and Loop Problems: Digits, GCD and Primes"
slug: w02-dsa-math-and-loops
topic: Math & Digits
subject: dsa
minutes: 35
description: The digit loop, Euclid's GCD and LCM, prime checking up to the square root, the Sieve of Eratosthenes, palindrome and Armstrong numbers and iterative Fibonacci, with this week's problems.
---
# DSA stream · Week 2: math and loop problems

This week's problems all use one or two loops and a little arithmetic. The point is not the maths; it is learning to
pick a **method** that does less work, and to test the awkward inputs: **0, 1 and negative numbers**.

## How to recognise the pattern

Look for words like *digits*, *divisible*, *prime*, *factor*, *without converting to a string*. These usually mean:

- a **digit loop** (`n % 10` takes the last digit, `n // 10` removes it), from Week 1; or
- a **divisor loop** that tries candidate divisors, ideally stopping early.

## GCD and LCM: Euclid's algorithm

The slow way to find the greatest common divisor tries every number from `min(a, b)` down to 1. Euclid's observation is
that `gcd(a, b) = gcd(b, a % b)`, and `gcd(a, 0) = a`.

```text
gcd(48, 18) → gcd(18, 48 % 18 = 12) → gcd(12, 6) → gcd(6, 0) → 6
```

```python
def gcd(a, b):
    a, b = abs(a), abs(b)
    while b != 0:
        a, b = b, a % b
    return a

def lcm(a, b):
    if a == 0 or b == 0:
        return 0
    return abs(a * b) // gcd(a, b)

assert gcd(48, 18) == 6
assert lcm(4, 6) == 12
```

Each step makes the numbers shrink quickly, so Euclid needs very few iterations even for large inputs. Python also
provides `math.gcd` (and `math.lcm` in Python 3.9+), but you must be able to write it yourself in an interview.

## Prime check: stop at the square root

If `n` has a divisor larger than `√n`, it must also have one smaller than `√n` (they come in pairs, `d × n/d`). So you
only need to test divisors up to `√n`.

```python
def is_prime(n):
    if n < 2:
        return False          # 0, 1 and negatives are not prime
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

assert [x for x in range(20) if is_prime(x)] == [2, 3, 5, 7, 11, 13, 17, 19]
```

Using `d * d <= n` avoids floating-point square roots. For `n` around one million, this tests about a thousand
divisors instead of a million.

## Count Primes: the Sieve of Eratosthenes

[Count Primes (LeetCode 204)](https://leetcode.com/problems/count-primes/) asks how many primes are **strictly less
than** `n`, with `n` up to 5 million. Calling `is_prime` on every number is too slow. The sieve crosses out multiples
instead:

1. Make a list `is_p` of `True` values for `0 … n-1`; mark 0 and 1 as `False`.
2. For each `p` from 2 while `p * p < n`: if `is_p[p]` is still `True`, mark `p*p, p*p + p, p*p + 2p, …` as `False`.
3. Count the `True` values.

```python
def count_primes(n):
    if n < 3:
        return 0
    is_p = [True] * n
    is_p[0] = is_p[1] = False
    p = 2
    while p * p < n:
        if is_p[p]:
            for multiple in range(p * p, n, p):
                is_p[multiple] = False
        p += 1
    return sum(is_p)

assert count_primes(10) == 4      # 2, 3, 5, 7
assert count_primes(0) == 0
```

Why start at `p * p`? Smaller multiples such as `2p` and `3p` were already crossed out by 2 and 3. The sieve runs in
about `O(n log log n)` time, which is close to linear. You will learn to read that notation in Week 3; for now, notice
that a smarter method beat a faster loop.

## Palindrome Number

[Palindrome Number (LeetCode 9)](https://leetcode.com/problems/palindrome-number/): is an integer the same forwards
and backwards? Use the reverse-digits loop from Week 1 and compare.

```python
def is_palindrome_number(x):
    if x < 0:
        return False          # "-121" reversed is "121-"
    original, rev = x, 0
    while x > 0:
        rev = rev * 10 + x % 10
        x //= 10
    return rev == original

assert is_palindrome_number(121)
assert not is_palindrome_number(-121)
assert not is_palindrome_number(10)
```

`str(x) == str(x)[::-1]` also works, but the problem's follow-up asks you to solve it without converting to a string.

## Armstrong numbers

An Armstrong number equals the sum of its digits, each raised to the power of the number of digits.
`153 = 1³ + 5³ + 3³`, `9474 = 9⁴ + 4⁴ + 7⁴ + 4⁴`. Count the digits first, then do a second digit loop.

```python
def is_armstrong(n):
    if n < 0:
        return False
    k = len(str(n))
    total, x = 0, n
    while x > 0:
        total += (x % 10) ** k
        x //= 10
    return total == n

assert [n for n in range(1000) if is_armstrong(n)][:12] == [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 153, 370]
```

## Fibonacci, iteratively

Each term is the sum of the previous two: `0, 1, 1, 2, 3, 5, 8, …`. Keep **two running values** and slide them
forward.

```python
def fib(n):
    """Return the n-th Fibonacci number, with fib(0) = 0 and fib(1) = 1."""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

assert [fib(i) for i in range(8)] == [0, 1, 1, 2, 3, 5, 8, 13]
```

The tuple assignment `a, b = b, a + b` computes the right side first, so you do not need a temporary variable. This
same "two running values" idea returns in Week 10 (recursion) and Week 19 (dynamic programming).

## This week's problems

| Problem | Pattern | Hint |
|---|---|---|
| GCD and LCM (Euclid) | remainder loop | `a, b = b, a % b` until `b` is 0; `lcm = a*b // gcd` |
| Prime check | divisor loop | stop when `d * d > n`; handle `n < 2` first |
| [Count Primes (LeetCode 204)](https://leetcode.com/problems/count-primes/) | sieve | "strictly less than n"; cross out from `p * p` |
| [Palindrome Number (LeetCode 9)](https://leetcode.com/problems/palindrome-number/) | digit loop | negatives are never palindromes |
| [Fibonacci Number (LeetCode 509)](https://leetcode.com/problems/fibonacci-number/) | two running values | `a, b = b, a + b` |
| Armstrong numbers | digit loop + powers | count digits first |

**Pattern Path extras** (optional, same pattern):
[Add Digits (LeetCode 258)](https://leetcode.com/problems/add-digits/),
[Power of Two (LeetCode 231)](https://leetcode.com/problems/power-of-two/),
[Plus One (LeetCode 66)](https://leetcode.com/problems/plus-one/).

## Edge-case checklist for number problems

- [ ] `n = 0` and `n = 1`
- [ ] negative input (is it allowed? what should happen?)
- [ ] a number ending in 0, such as `10` or `120`
- [ ] the largest input the problem allows (is your loop fast enough?)

## Practice beyond class

Create your **LeetCode** and **HackerRank** profiles this week if you have not already, and start your **DSA tracker**:
one row per problem with the date, the pattern, whether you needed a hint, and a "revisit" flag. Continue Week 2 of the
Pattern Path in DSA Practice.
