---
type: notes
title: "W21 · DSA · Tries and Bit Manipulation"
slug: w21-dsa-tries-bit-manipulation
topic: Tries & Bit Manipulation
subject: dsa
minutes: 40
description: The bitwise operators and the tricks built on them (XOR cancelling, removing the lowest set bit, counting bits with DP), then the trie as a tree of dictionaries for prefix and wildcard search, with this week's problems.
---
# DSA stream · Week 21: tries and bit manipulation

Two small patterns this week. **Bit manipulation** works on the binary form of integers. A **trie** is a tree built for
words and prefixes. Both turn problems that look like they need extra memory or repeated scanning into short, fast
code.

## Pattern card

- **Signal:** "appears once", "XOR", "number of 1 bits", "without using + or -", "power of two"; "prefix",
  "starts with", "autocomplete", "dictionary of words", wildcard `.` in a search.
- **Core move:** XOR cancels equal values (`x ^ x == 0`); `n & (n - 1)` removes the lowest set bit; a trie is a tree of
  dictionaries with one level per character.
- **Builds on:** Week 2 Power of Two and Plus One (carry); Week 6 hash maps; Week 13 trees; Week 19 DP; Week 10
  backtracking.
- **Trap:** Python integers have no fixed width, so negative numbers do not behave like 32-bit values. Mask with
  `0xFFFFFFFF` when a problem assumes 32 bits.

## Bitwise operators

| Operator | Name | Example (`a = 12` = `1100`, `b = 10` = `1010`) | Result |
|---|---|---|---|
| `&` | AND: 1 only if both bits are 1 | `a & b` | `8` (`1000`) |
| `\|` | OR: 1 if either bit is 1 | `a \| b` | `14` (`1110`) |
| `^` | XOR: 1 if the bits differ | `a ^ b` | `6` (`0110`) |
| `~` | NOT (in Python, `~x == -x - 1`) | `~a` | `-13` |
| `<<` | Shift left: multiply by 2 per place | `a << 1` | `24` |
| `>>` | Shift right: floor-divide by 2 per place | `a >> 2` | `3` |

```python
a, b = 12, 10
print(bin(a), bin(b))          # 0b1100 0b1010
print(a & b, a | b, a ^ b)     # 8 14 6
print(a << 1, a >> 2)          # 24 3
print((a >> 2) & 1)            # 1  -> bit 2 of a is set
```

### Tricks to know by heart

| Trick | Meaning |
|---|---|
| `x ^ x == 0`, `x ^ 0 == x` | XOR cancels pairs; order does not matter |
| `n & 1` | 1 if `n` is odd |
| `(n >> i) & 1` | value of bit `i` |
| `n & (n - 1)` | `n` with its lowest set bit removed |
| `n > 0 and n & (n - 1) == 0` | `n` is a power of two (exactly one bit set) |

## Worked approach 1: Single Number

Every element appears twice except one. Find it in `O(n)` time and `O(1)` extra space.

A hash set (Week 6) works but uses `O(n)` space. XOR everything instead: pairs cancel to 0, and what remains is the
single number.

```python
def single_number(nums: list[int]) -> int:
    result = 0
    for x in nums:
        result ^= x
    return result

print(single_number([4, 1, 2, 1, 2]))   # 4
```

## Worked approach 2: Number of 1 Bits and Counting Bits

**Number of 1 Bits**: each `n &= n - 1` removes one set bit, so the loop runs once per 1 bit, not once per bit
position.

```python
def hamming_weight(n: int) -> int:
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count

print(hamming_weight(11))   # 3   (11 = 1011)
```

**Counting Bits** asks for the count for every number from `0` to `n`. That is DP (Week 19): `i >> 1` is `i` with its
last bit dropped and is smaller than `i`, so its answer is already known.

```python
def count_bits(n: int) -> list[int]:
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits

print(count_bits(5))   # [0, 1, 1, 2, 1, 2]
```

## Tries

A **trie** (prefix tree) stores words character by character. Each node has a dictionary from a character to a child
node and a flag saying whether a word ends there.

```text
Words: "car", "cart", "cat", "dog"

(root)
 ├─ c ─ a ─ r*─ t*
 │       └─ t*
 └─ d ─ o ─ g*            * = end of a word
```

Words that share a prefix share the path, so checking "does any word start with `ca`?" is one walk of two steps,
however many words are stored. Insert and search both take `O(L)` time for a word of length `L`.

### Worked approach 3: Implement Trie (Prefix Tree)

```python
class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def _walk(self, text: str) -> TrieNode | None:
        node = self.root
        for ch in text:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_word

    def startsWith(self, prefix: str) -> bool:   # name required by LeetCode
        return self._walk(prefix) is not None


t = Trie()
for w in ["car", "cart", "cat"]:
    t.insert(w)
print(t.search("car"), t.search("ca"), t.startsWith("ca"))   # True False True
```

The difference between `search` and `startsWith` is only the final `is_word` check.

### Worked approach 4: wildcard search with DFS

**Design Add and Search Words Data Structure** adds one twist: `.` matches any letter. At a `.` you cannot follow one
child, so you try every child: backtracking (Week 10) on a tree.

```python
# Reuses the TrieNode class from the previous example.
class WordDictionary:
    def __init__(self) -> None:
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def search(self, word: str) -> bool:
        def dfs(node: TrieNode, i: int) -> bool:
            if i == len(word):
                return node.is_word
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            nxt = node.children.get(ch)
            return nxt is not None and dfs(nxt, i + 1)

        return dfs(self.root, 0)


d = WordDictionary()
for w in ["bad", "dad", "mad"]:
    d.addWord(w)
print(d.search("pad"), d.search(".ad"), d.search("b.."))   # False True True
```

## This week's problems

| # | Problem | Role | Hint |
|---|---|---|---|
| 1 | [Single Number (LeetCode 136)](https://leetcode.com/problems/single-number/) | Lab | XOR everything |
| 2 | [Number of 1 Bits (LeetCode 191)](https://leetcode.com/problems/number-of-1-bits/) | Lab | `n & (n - 1)` |
| 3 | [Counting Bits (LeetCode 338)](https://leetcode.com/problems/counting-bits/) | Lab | `bits[i >> 1] + (i & 1)` |
| 4 | [Reverse Bits (LeetCode 190)](https://leetcode.com/problems/reverse-bits/) | Twist | shift out of `n`, shift into the result, 32 times |
| 5 | [Add Binary (LeetCode 67)](https://leetcode.com/problems/add-binary/) | Warm-up | carry, as in Plus One, in base 2 |
| 6 | [Sum of Two Integers (LeetCode 371)](https://leetcode.com/problems/sum-of-two-integers/) | Combine | `^` adds without carry, `&` then `<< 1` is the carry; mask to 32 bits in Python |
| 7 | [Implement Trie (LeetCode 208)](https://leetcode.com/problems/implement-trie-prefix-tree/) | Lab | tree of dictionaries |
| 8 | [Design Add and Search Words Data Structure (LeetCode 211)](https://leetcode.com/problems/design-add-and-search-words-data-structure/) | Lab | DFS that branches on `.` |
| 9 | [Word Search II (LeetCode 212)](https://leetcode.com/problems/word-search-ii/) | Stretch | trie of words + grid backtracking |

The weekly test includes two questions from this week. Make sure you can predict the output of short bitwise
expressions by hand and write `insert` and `search` for a trie from memory.

## Practice beyond class

Continue the **Pattern Path** sheet (Week 21 group). For the bit problems, write the binary form of your test inputs in
a comment and trace the loop by hand once before running it.
