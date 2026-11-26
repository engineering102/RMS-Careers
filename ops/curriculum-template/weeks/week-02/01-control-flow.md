---
type: notes
title: "W2 · S1 · Control Flow: Conditions and Loops"
slug: w02-s1-control-flow
topic: Control Flow
subject: programming-fundamentals
minutes: 35
description: if/elif/else and nested conditions, for and while loops, range(), break and continue, and the loop–else clause, with output-prediction drills and menu-driven programs.
---
# Control flow: conditions and loops

Last week every program ran top to bottom, once. Real programs make **decisions** (conditions) and **repeat work**
(loops). Together these are called control flow, and they are the raw material of every DSA solution you will write.

## Conditions: if, elif, else

```python
marks = int(input("Marks: "))

if marks >= 90:
    grade = "A"
elif marks >= 75:
    grade = "B"
elif marks >= 60:
    grade = "C"
else:
    grade = "F"

print("Grade:", grade)
```

Rules to remember:

- Python checks the conditions **from top to bottom** and runs **only the first block whose condition is true**.
  The rest are skipped, even if they are also true.
- The body of each branch is **indented** (four spaces is the convention). Indentation is syntax in Python, not style.
- `elif` and `else` are optional. A plain `if` with no `else` simply does nothing when the condition is false.

Because the first true branch wins, **order matters**. If you wrote `marks >= 60` first, a student with 95 would get a C.
Put the most specific (or strictest) condition first.

### Nested conditions and combined conditions

You can put an `if` inside another `if`, but deep nesting is hard to read. Often `and` / `or` does the same job:

```python
age = 20
has_id = True

# nested
if age >= 18:
    if has_id:
        print("Allowed")

# combined: same behaviour, easier to read
if age >= 18 and has_id:
    print("Allowed")
```

Python also allows **chained comparisons**: `0 <= marks <= 100` means `0 <= marks and marks <= 100`.

### Truthy and falsy values

Any value can be used as a condition. These count as **false**: `False`, `None`, `0`, `0.0`, `""` (empty string),
`[]`, `()`, `{}`. Almost everything else counts as true.

```python
name = input("Name: ")
if not name:
    print("You did not type a name")
```

## for loops and range()

A `for` loop runs its body **once for each item** in a sequence.

```python
for ch in "abc":
    print(ch)          # a, b, c on separate lines
```

`range()` produces a sequence of integers. It is the usual way to repeat something a fixed number of times.

| Call | Values produced | Notes |
|---|---|---|
| `range(5)` | 0, 1, 2, 3, 4 | stop is **excluded** |
| `range(2, 6)` | 2, 3, 4, 5 | start included, stop excluded |
| `range(1, 10, 3)` | 1, 4, 7 | third argument is the step |
| `range(5, 0, -1)` | 5, 4, 3, 2, 1 | counting down; stop still excluded |
| `range(3, 3)` | nothing | empty: the loop body never runs |

```python
total = 0
for i in range(1, 11):
    total += i
print(total)           # 55
```

## while loops

A `while` loop repeats **as long as its condition is true**. Use it when you do not know in advance how many times
to repeat: reading input until it is valid, processing digits until the number becomes 0, and so on.

```python
n = 1234
count = 0
while n > 0:
    n //= 10
    count += 1
print(count)           # 4 digits
```

Every `while` loop needs something inside it that eventually makes the condition false. If nothing changes, you get
an **infinite loop**. Press **Ctrl+C** in the terminal to stop one.

## break, continue and loop–else

- `break` leaves the loop immediately.
- `continue` skips the rest of the current iteration and moves on to the next one.
- A loop can have an `else` block. It runs **only if the loop finished without hitting `break`**.

```python
for i in range(1, 8):
    if i % 2 == 0:
        continue           # skip even numbers
    if i == 7:
        break              # stop completely at 7
    print(i, end=" ")      # prints: 1 3 5
```

Loop–else is perfect for "search, and report if not found":

```python
n = 29
for d in range(2, n):
    if n % d == 0:
        print(n, "is not prime; divisible by", d)
        break
else:
    print(n, "is prime")
```

If a divisor is found, `break` runs and the `else` is skipped. If the loop checks every `d` without breaking, the
`else` runs. (This version is slow for large `n`; the DSA note this week shows a faster check.)

## Output prediction: how to trace

Tutors will ask you to **predict output before running code**. Do it with a trace table: one column per variable,
one row per iteration.

```python
x = 0
for i in range(1, 5):
    if i == 3:
        continue
    x += i
print(x)
```

| i | skipped? | x after |
|---|---|---|
| 1 | no | 1 |
| 2 | no | 3 |
| 3 | yes | 3 |
| 4 | no | 7 |

Output: `7`. Hand-tracing like this is slow at first, but it is the habit that makes debugging and DSA easier later.

## Menu-driven programs

A menu program shows options, reads a choice, acts on it, and repeats until the user chooses to exit. The pattern is
a `while True` loop with a `break`:

```python
balance = 0

while True:
    print("\n1. Deposit  2. Withdraw  3. Show balance  4. Exit")
    choice = input("Choose: ").strip()

    if choice == "1":
        amount = int(input("Amount: "))
        balance += amount
    elif choice == "2":
        amount = int(input("Amount: "))
        if amount > balance:
            print("Insufficient balance")
        else:
            balance -= amount
    elif choice == "3":
        print("Balance:", balance)
    elif choice == "4":
        print("Goodbye")
        break
    else:
        print("Invalid choice, try again")
```

Notice that the menu compares strings (`"1"`), so a user typing `abc` does not crash the program; it falls through to
the final `else`. Typing `abc` at the *Amount* prompt still crashes it, because `int("abc")` raises `ValueError`. You
will learn to handle that properly with `try`/`except` in Week 3.

## Lab: output prediction and menus

1. **Prediction drills.** For each snippet your tutor gives, write the output on paper first, then run it. Record
   how many you predicted correctly.
2. **Menu-driven program.** Build a menu with at least four options: check even/odd, print a multiplication table,
   find the largest of three numbers, exit. The program must loop until the user exits and reject invalid choices.
3. **Loop–else.** Write a program that asks for a number and a digit, and reports whether the digit appears in the
   number, using a `while` loop with `break` and an `else`.

Commit each program to `rms-weekly-labs/week-02/` with a clear message.

## Check yourself

1. What does `for i in range(10, 0, -3): print(i, end=" ")` print?
2. In an `if/elif/else` chain, two conditions are true. Which branches run?
3. When does the `else` block of a `for` loop run?
