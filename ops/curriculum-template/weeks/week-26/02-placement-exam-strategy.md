---
type: notes
title: "W26 · S2 · Final Placement Readiness Exam: Online Assessment Strategy and Revision"
slug: w26-s2-placement-exam-strategy
topic: Online Assessment Strategy
subject: aptitude
minutes: 35
description: How campus online assessments are structured, time management, the aptitude formulas and reasoning methods worth revising, a technical MCQ checklist, and a plan for the coding section.
---
# Final Placement Readiness Exam: online assessment strategy and revision

The Final Placement Readiness Exam simulates a campus **online assessment (OA)**: quantitative aptitude, logical
reasoning, verbal ability, technical MCQs and coding, under time pressure. The scorecard targets are **70% or more in
aptitude** and **60% or more in the technical MCQ section**. This note is your revision guide and exam-day plan.

## How online assessments are usually structured

| Section | Typical content |
|---|---|
| Quantitative aptitude | percentages, profit and loss, ratios, averages, time and work, time-speed-distance, interest, probability, permutations and combinations, data interpretation |
| Logical reasoning | series, coding–decoding, blood relations, directions, seating arrangement, syllogisms, puzzles, data sufficiency |
| Verbal ability | grammar and sentence correction, vocabulary, fill in the blanks, para-jumbles, reading comprehension |
| Technical MCQs | programming output, OOP, DBMS and SQL, operating systems, networks, DSA complexity |
| Coding | one or more problems with hidden test cases |

Sections are often **separately timed**, and some tests do not let you go back to a previous section. Some apply
negative marking and some do not. **Read the instructions screen every time**; it changes from company to company.

## Time management

- **Two-pass method.** On the first pass, answer every question you can solve in under a minute; mark the rest. On the
  second pass, return to the marked ones.
- **Do not get stuck.** A 4-minute question is worth the same as a 40-second one.
- **Guessing rule.** With no negative marking, never leave a question blank. With negative marking, a safe rule of
  thumb is to guess only when you can eliminate at least two options; check how large the penalty is first.
- **Watch the clock at the half-way point** of each section and adjust.

## Quantitative aptitude: formulas worth knowing cold

| Topic | Key idea | Quick example |
|---|---|---|
| Successive percentages | multiply the factors | +20% then −20%: 1.2 × 0.8 = 0.96, a **4% loss** |
| Profit and loss | profit % = profit ÷ cost price × 100 | CP 500, SP 600 → 100/500 = **20%** |
| Percentage change to keep spending same | price up by r% → cut consumption by r/(100+r) × 100% | price +25% → cut 25/125 = **20%** |
| Time and work | add daily rates | A in 10 days, B in 15: 1/10 + 1/15 = 1/6 → **6 days** together |
| Speed conversion | km/h × 5/18 = m/s | 72 km/h = **20 m/s** |
| Average speed, equal distances | 2xy / (x + y) | 40 and 60 km/h → 4800/100 = **48 km/h** (not 50) |
| Simple interest | SI = P × R × T / 100 | 5,000 at 8% for 3 years → **₹1,200** |
| Compound interest | A = P(1 + R/100)ⁿ | 10,000 at 10% for 2 years → A = 12,100, CI **₹2,100** |
| Combinations | nCr = n! / (r!(n − r)!) | choose 2 from 5 → **10** |
| Probability | favourable ÷ total | two coins, at least one head → 1 − 1/4 = **3/4** |

**Shortcut habits:** convert percentages to fractions (25% = 1/4, 12.5% = 1/8, 33⅓% = 1/3); check options before
calculating, since answer choices often reveal the size of the result; estimate first, then compute exactly.

## Logical reasoning: methods, not memory

| Type | Method |
|---|---|
| Number series | write the **differences** (and differences of differences); also try ×, squares, cubes, primes |
| Letter series and coding | convert letters to positions (A = 1 … Z = 26) and look for the shift |
| Blood relations | draw a family tree: generations as rows, + for male, − for female |
| Directions | draw it; north is up; track every turn ("right" from facing north is east) |
| Seating arrangement | place the **fixed** facts first (ends, middle), then the relative ones |
| Syllogisms | draw Venn diagrams; a conclusion follows only if it is true in **every** possible diagram |
| Data sufficiency | test statement 1 alone, then 2 alone, then both together; do not actually solve fully |

Worked series: `3, 5, 9, 15, 23, ?` → differences 2, 4, 6, 8 → next difference 10 → **33**.

## Verbal ability

- **Subject–verb agreement**: "Each of the students **has**…"; with "neither…nor" and "either…or", the verb agrees
  with the nearer subject ("Neither the manager nor the employees **were** present").
- **Prepositions of time**: "since 2022" (point in time) vs "for two years" (duration).
- **Reading comprehension**: read the questions first, then the passage; answer only from what the passage says, not
  from outside knowledge. Watch for extreme words such as "always" and "never" in wrong options.
- **Para-jumbles**: find the opening sentence (introduces the topic, no pronoun pointing back), then link pairs by
  pronouns, connectors ("however", "therefore") and time order.

## Technical MCQ checklist

Make sure you can answer each of these in one sentence:

- [ ] **OOP**: encapsulation, inheritance, polymorphism (overloading vs overriding), abstraction; abstract class vs
      interface
- [ ] **DBMS**: primary vs foreign key; 1NF, 2NF, 3NF; ACID; joins; `GROUP BY` with `HAVING`; `COUNT(*)` vs
      `COUNT(column)`; indexes
- [ ] **OS**: process vs thread; scheduling (FCFS, SJF, round robin); the four deadlock conditions; paging and virtual
      memory; semaphores and mutexes
- [ ] **Networks**: OSI and TCP/IP layers; TCP vs UDP; DNS; HTTP vs HTTPS; common status codes; IP addressing basics
- [ ] **Web**: REST methods, cookies vs tokens, CORS
- [ ] **DSA complexity**: the table below

| Operation | Time |
|---|---|
| Array access by index | O(1) |
| Binary search on a sorted array | O(log n) |
| Hash map lookup (average) | O(1) |
| Merge sort / heap sort | O(n log n) |
| Quick sort (average / worst) | O(n log n) / O(n²) |
| Heap push / pop | O(log n) |
| BFS / DFS on a graph | O(V + E) |
| Balanced BST search | O(log n) |

Output-prediction questions reward **slow, careful tracing**. Write variable values down, line by line, exactly as in
Week 1.

## The coding section

1. **Read the whole problem and the constraints.** n ≤ 10⁵ means you need about O(n log n) or better; n ≤ 20 allows
   exponential approaches.
2. **Check the input format** carefully: one test case or many? Space- or line-separated?
3. **Start with a correct brute force** if the optimal idea is not immediate. Many platforms award marks per test case
   passed.
4. **Name the pattern** (the Pattern Path cards), then optimise.
5. **Test edge cases** before submitting: empty input, one element, duplicates, negatives, maximum size.
6. **Watch overflow and recursion depth.** Python integers do not overflow, but deep recursion can hit the recursion
   limit; convert to iteration when n is large.

Fast input in Python for large inputs:

```python
import sys

def main() -> None:
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(sum(nums))

main()
```

## The day before and the day of

- Sleep properly; a tired brain loses more marks than one more hour of revision gains.
- Check your laptop, charger, internet connection and any required browser or proctoring set-up in advance.
- Keep rough paper and a pen if they are permitted.
- Remember: assessments are **closed-AI**. No assistants or internet search unless the paper says otherwise.

## Lab: timed exam

Sit the Final Placement Readiness Exam under exam conditions. Afterwards, take the **Placement Readiness Mock Test**
(40 questions, 60 minutes) in this week's items, then sort every mistake into: concept gap, calculation slip, misread
question, or ran out of time. Fix the biggest category first.

## Check yourself

1. A car travels to a town at 30 km/h and returns at 60 km/h. What is its average speed for the round trip?
2. A test has negative marking and you can eliminate one of four options. Should you guess? What if you can eliminate
   two?
3. The constraints say n ≤ 2 × 10⁵. Is an O(n²) solution likely to pass? Why?
