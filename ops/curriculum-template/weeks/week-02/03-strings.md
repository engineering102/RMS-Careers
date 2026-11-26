---
type: notes
title: "W2 · S3 · Strings: Indexing, Slicing and Methods"
slug: w02-s3-strings
topic: Strings
subject: programming-fundamentals
minutes: 35
description: Indexing and slicing, common string methods, f-string formatting, immutability and iterating over characters, with three text utilities: vowel count, word frequency and a title-case converter.
---
# Strings: indexing, slicing and methods

Text is everywhere: names, emails, log lines, CSV rows, LeetCode inputs. In Python, text is a `str`, an **ordered,
immutable sequence of characters**.

## Indexing

Each character has a position (index). Indexes start at **0**. Negative indexes count from the end.

```text
 s =   P   y   t   h   o   n
       0   1   2   3   4   5
      -6  -5  -4  -3  -2  -1
```

```python
s = "Python"
print(s[0])      # P
print(s[5])      # n
print(s[-1])     # n  (last character)
print(len(s))    # 6
print(s[6])      # IndexError: string index out of range
```

The last valid index is always `len(s) - 1`.

## Slicing

`s[start:stop:step]` returns a **new string** from `start` up to but **not including** `stop`. Any part can be left out.

| Slice | Result | Meaning |
|---|---|---|
| `s[0:3]` | `"Pyt"` | indexes 0, 1, 2 |
| `s[2:]` | `"thon"` | from index 2 to the end |
| `s[:4]` | `"Pyth"` | from the start to index 3 |
| `s[-3:]` | `"hon"` | the last three characters |
| `s[::2]` | `"Pto"` | every second character |
| `s[::-1]` | `"nohtyP"` | the whole string reversed |
| `s[10:20]` | `""` | slices never raise IndexError; out-of-range gives empty |

`s[::-1]` is the quickest way to reverse a string, so a palindrome check can be one line:

```python
def is_palindrome(text):
    return text == text[::-1]

print(is_palindrome("level"))   # True
```

## Immutability

You cannot change a string in place.

```python
s = "cat"
s[0] = "b"        # TypeError: 'str' object does not support item assignment
s = "b" + s[1:]   # build a new string instead: "bat"
```

Every string method returns a **new** string; the original is unchanged.

```python
name = "asha"
name.upper()      # returns "ASHA" but the result is thrown away
print(name)       # asha
name = name.upper()
print(name)       # ASHA
```

## Common methods

| Method | Example | Result |
|---|---|---|
| `upper()`, `lower()` | `"Hi".lower()` | `"hi"` |
| `title()` | `"ram kumar".title()` | `"Ram Kumar"` |
| `strip()` | `"  hi  ".strip()` | `"hi"` (also `lstrip`, `rstrip`) |
| `split(sep)` | `"a,b,c".split(",")` | `["a", "b", "c"]` |
| `split()` | `"to  be or".split()` | `["to", "be", "or"]` (any whitespace) |
| `sep.join(items)` | `"-".join(["a", "b"])` | `"a-b"` |
| `replace(old, new)` | `"2024".replace("4", "5")` | `"2025"` |
| `find(sub)` | `"hello".find("l")` | `2` (returns `-1` if not found) |
| `count(sub)` | `"banana".count("a")` | `3` |
| `startswith`, `endswith` | `"main.py".endswith(".py")` | `True` |
| `isdigit()`, `isalpha()`, `isalnum()` | `"123".isdigit()` | `True` |
| `in` operator | `"ell" in "hello"` | `True` |

`split` and `join` are a pair: `split` turns a string into a list of words, `join` turns a list of strings back into
one string. `join` only accepts strings, so `", ".join([1, 2])` fails; convert first with `str()`.

## f-strings in more depth

```python
name, marks, rank = "Asha", 86.456, 3
print(f"{name} scored {marks:.2f}")        # Asha scored 86.46
print(f"Rank: {rank:03d}")                 # Rank: 003
print(f"|{name:<10}|{name:>10}|")          # left- and right-aligned in 10 characters
print(f"{1234567:,}")                      # 1,234,567
print(f"{2 + 3 = }")                       # 2 + 3 = 5   (handy for debugging)
```

Any expression can go inside the braces, including method calls: `f"{name.upper()}"`.

## Iterating over characters

```python
for ch in "data":
    print(ch)
```

When you need the index too, use `enumerate`:

```python
for i, ch in enumerate("data"):
    print(i, ch)       # 0 d, 1 a, 2 t, 3 a
```

Characters have numeric codes. `ord("a")` is `97` and `chr(97)` is `"a"`. This is useful for problems that shift
letters (such as a Caesar cipher).

### Building strings efficiently

Because strings are immutable, `result += ch` in a long loop creates a new string each time. For short inputs that
is fine. For large inputs, collect the pieces in a list and `join` once at the end:

```python
parts = []
for ch in "hello":
    parts.append(ch.upper())
result = "".join(parts)   # "HELLO"
```

## Lab: three text utilities

Write each as a function with a docstring and `assert` tests.

**1. Vowel count**

```python
def count_vowels(text):
    """Return how many vowels (a, e, i, o, u, either case) are in text."""
    count = 0
    for ch in text.lower():
        if ch in "aeiou":
            count += 1
    return count

assert count_vowels("Rising Mind") == 3
assert count_vowels("") == 0
```

**2. Word frequency** (a preview of dictionaries, which Week 3 covers fully)

```python
def word_frequency(sentence):
    """Return a dict mapping each lower-case word to how often it appears."""
    freq = {}
    for word in sentence.lower().split():
        freq[word] = freq.get(word, 0) + 1
    return freq

print(word_frequency("the cat and the hat"))
# {'the': 2, 'cat': 1, 'and': 1, 'hat': 1}
```

**3. Title-case converter.** `str.title()` capitalises after *every* non-letter, so `"it's"` becomes `"It'S"`.
Write your own version that capitalises only the first letter of each space-separated word:

```python
def to_title(text):
    """Capitalise the first letter of each word and lower-case the rest."""
    words = text.split()
    return " ".join(w[0].upper() + w[1:].lower() for w in words)

assert to_title("it's a GOOD day") == "It's A Good Day"
```

Stretch: extend the word-frequency function to ignore punctuation such as `,` `.` `!` (hint: `strip(".,!?")` on each
word).

## Check yourself

1. For `s = "placement"`, what are `s[2:5]` and `s[-4:]`?
2. Why does `s.upper()` on its own line not change `s`?
3. What does `"-".join("abc")` return?
