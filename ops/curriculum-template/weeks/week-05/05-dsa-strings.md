---
type: notes
title: "W5 · DSA · Strings: Two Indexes, Read and Write Pointers"
slug: w05-dsa-strings-two-indexes
topic: Strings
subject: dsa
minutes: 35
description: How Python strings behave, the two-index pattern for reversing and palindromes, column-wise prefix comparison, read/write pointers for compression, and this week's problems with worked approaches.
---
# DSA stream · Week 5: strings

## Pattern card

- **Signal:** "palindrome", "reverse", "prefix", "words", "compress", "in place".
- **Core move:** two indexes moving towards each other, or one index reading while another writes.
- **Builds on:** Week 4 write index (Move Zeroes); Week 3 frequency counting.
- **Trap:** building a string with `+=` inside a loop. Python strings are immutable, so collect parts in a list and
  `"".join(parts)` once at the end.

## What you need to know about Python strings

| Fact | Consequence |
|---|---|
| Strings are **immutable** | `s[0] = "x"` raises `TypeError`; build a new string or work on a list |
| Indexing is O(1) | `s[i]` and `s[-1]` are cheap |
| Slicing copies | `s[::-1]` is O(n) time **and** O(n) extra space |
| `+=` in a loop can copy the whole string each time | Use a list and `"".join(...)` |
| `s.split()` with no argument splits on any run of whitespace | Leading, trailing and repeated spaces disappear |
| Character helpers | `ch.isalnum()`, `ch.isalpha()`, `ch.isdigit()`, `ch.lower()` |
| Character codes | `ord("a") == 97`, `chr(97) == "a"` |

Interviewers often accept `s[::-1]` as a first answer and then ask, "Now do it in place with O(1) extra space." That
follow-up is the two-index pattern.

## The two-index pattern

Put one index at each end. Do something with the pair, then move both towards the middle. Stop when they meet.

```text
s = ['h', 'e', 'l', 'l', 'o']
     L                   R      swap → o e l l h
          L         R           swap → o l l e h
               LR               stop (L >= R)
```

### Worked approach: Reverse String (LC 344)

The input is a list of characters, to be reversed in place.

```python
def reverse_string(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1

chars = list("hello")
reverse_string(chars)
print("".join(chars))   # olleh
```

Time O(n), extra space O(1). Each element is touched once.

### Worked approach: Valid Palindrome (LC 125)

Ignore everything that is not a letter or digit, and ignore case. `"A man, a plan, a canal: Panama"` is a palindrome.

The easy version builds a cleaned copy:

```python
def is_palindrome_copy(s: str) -> bool:
    cleaned = [ch.lower() for ch in s if ch.isalnum()]
    return cleaned == cleaned[::-1]
```

That is O(n) extra space. The two-index version skips junk characters as it goes:

```python
def is_palindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("race a car"))                      # False
print(is_palindrome(" "))                               # True (no letters left)
```

Note the `left < right` inside the inner loops. Without it, a string of only punctuation would run the index off the
end.

## Column-wise comparison: Longest Common Prefix (LC 14)

Compare the first character of every word, then the second, and so on. Stop at the first column where a word is too
short or a character differs.

```python
def longest_common_prefix(words: list[str]) -> str:
    if not words:
        return ""
    first = words[0]
    for i, ch in enumerate(first):
        for word in words[1:]:
            if i == len(word) or word[i] != ch:
                return first[:i]
    return first

print(longest_common_prefix(["flower", "flow", "flight"]))  # fl
print(longest_common_prefix(["dog", "racecar", "car"]))     # (empty string)
```

Time O(total characters). You will meet this problem again with tries in Week 21.

## Read and write pointers: String Compression (LC 443)

Compress `["a","a","b","b","c","c","c"]` **in place** to `["a","2","b","2","c","3"]` and return the new length (6).
A group of one character is written without a count.

This is Week 4's write index on characters: `read` scans groups, `write` marks where the next output goes. Because
the compressed form is never longer than the original, `write` never overtakes `read`.

```python
def compress(chars: list[str]) -> int:
    write = 0
    read = 0
    while read < len(chars):
        ch = chars[read]
        start = read
        while read < len(chars) and chars[read] == ch:
            read += 1
        count = read - start
        chars[write] = ch
        write += 1
        if count > 1:
            for digit in str(count):        # 12 is written as "1", "2"
                chars[write] = digit
                write += 1
    return write

data = list("aabbccc")
n = compress(data)
print(n, data[:n])          # 6 ['a', '2', 'b', '2', 'c', '3']
```

## Reverse Words in a String (LC 151)

`"  the sky   is blue "` becomes `"blue is sky the"`. In Python, `split()` already removes extra spaces:

```python
def reverse_words(s: str) -> str:
    return " ".join(reversed(s.split()))

print(reverse_words("  the sky   is blue "))   # blue is sky the
```

Be ready for the follow-up: "Do it without `split`." Walk from the right end, skip spaces, find the start of each word,
and append the word to a list. That is the same two-index idea, one word at a time.

## This week's problems

| Problem | Where | Pattern | Hint |
|---|---|---|---|
| [Length of Last Word (LC 58)](https://leetcode.com/problems/length-of-last-word/) | Pattern Path warm-up | scan from the end | skip trailing spaces first |
| [Reverse String (LC 344)](https://leetcode.com/problems/reverse-string/) | Lab | two indexes from both ends | swap and move inwards |
| [Valid Palindrome (LC 125)](https://leetcode.com/problems/valid-palindrome/) | Lab | two indexes, skipping | `isalnum()` and `lower()` |
| [Longest Common Prefix (LC 14)](https://leetcode.com/problems/longest-common-prefix/) | Lab | column-wise scan | stop at the first mismatch |
| [Is Subsequence (LC 392)](https://leetcode.com/problems/is-subsequence/) | Pattern Path twist | two indexes at different speeds | advance in `s` only on a match |
| [Reverse Words in a String (LC 151)](https://leetcode.com/problems/reverse-words-in-a-string/) | Lab | split and reverse | then try without `split` |
| [String Compression (LC 443)](https://leetcode.com/problems/string-compression/) | Lab | read and write indexes | counts above 9 use several characters |
| [Isomorphic Strings (LC 205)](https://leetcode.com/problems/isomorphic-strings/) | Pattern Path combine | character map | the mapping must work in both directions |
| [Best Time to Buy and Sell Stock II (LC 122)](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/) | Pattern Path revisit | Week 4 arrays | add every rising step |

## Testing string code

Always try these inputs before you submit:

- the empty string `""` and a single character `"a"`;
- only spaces or only punctuation (`"  "`, `",."`);
- mixed case (`"Aa"`);
- for compression, a group of ten or more (`"a" * 12` → `["a", "1", "2"]`).

## Practice beyond class

Solve the Week 5 group of the **Pattern Path** sheet in DSA Practice, in order. Log each problem in your DSA tracker
with the pattern name ("two indexes", "read/write") so you can search by pattern later.
