---
type: resource
title: "W8 · Cheat Sheet: MongoDB, Aggregation, Sorting and MP2"
slug: w08-cheat-sheet
topic: Week 8 Reference
subject: core-cs
minutes: 10
description: One-page reference for Week 8 — NoSQL families and CAP, mongosh CRUD and operators, aggregation stages, embed versus reference, sorting complexities, prefix sums, and this week's Mini Project 2 and Phase 2 test.
---
# Week 8 cheat sheet

## NoSQL at a glance

| Family | Example | Use for |
|---|---|---|
| Document | MongoDB | Nested, varying records |
| Key–value | Redis | Caches, sessions |
| Wide-column | Cassandra | Massive writes, time series |
| Graph | Neo4j | Relationship-heavy queries |

**CAP:** during a network partition, a distributed database chooses consistency (refuse some requests) or availability
(answer, maybe stale). CAP's C is replica agreement, not ACID's C.

## mongosh CRUD

```javascript
use college
db.courses.insertOne({ code: "CS301", credits: 4, tags: ["core"] })
db.courses.insertMany([ {...}, {...} ])
db.courses.find({ credits: { $gte: 3 } }, { code: 1, _id: 0 }).sort({ code: 1 }).limit(5)
db.courses.updateOne({ code: "CS301" }, { $set: { credits: 3 } })
db.courses.updateMany({}, { $inc: { credits: 1 } })
db.courses.deleteOne({ code: "CS301" })
db.courses.countDocuments({ dept: "CSE" })
```

Operators: `$eq $ne $gt $gte $lt $lte $in $nin $and $or $exists $regex $elemMatch $size`.
Updates: `$set $unset $inc $push $addToSet`; `{ upsert: true }` inserts when nothing matches.

## Aggregation pipeline

```javascript
db.orders.aggregate([
  { $match: { orderDate: { $gte: ISODate("2026-01-01") } } },     // filter early
  { $unwind: "$items" },                                           // one doc per array element
  { $lookup: { from: "products", localField: "items.productId",
               foreignField: "_id", as: "product" } },             // left join → array
  { $unwind: "$product" },
  { $group: { _id: "$product.category",
              revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
  { $sort: { revenue: -1 } }
])
```

| Stage | SQL |
|---|---|
| `$match` | `WHERE` / `HAVING` |
| `$group` | `GROUP BY` |
| `$project` | `SELECT` list |
| `$sort`, `$limit` | `ORDER BY`, `LIMIT` |
| `$lookup` | `LEFT JOIN` |

Indexes: `db.c.createIndex({ field: 1 })`; check with `.explain("executionStats")` (`COLLSCAN` vs `IXSCAN`).

**Embed** when the child is read with the parent and bounded in size. **Reference** when it is shared, queried on its
own, or unbounded.

## Sorting

| Algorithm | Average | Worst | Space | Stable |
|---|---|---|---|---|
| Bubble / Insertion | O(n²) | O(n²) | O(1) | Yes |
| Selection | O(n²) | O(n²) | O(1) | No |
| Merge | O(n log n) | O(n log n) | O(n) | Yes |
| Quick | O(n log n) | O(n²) | O(log n) | No |

Python's `sorted()` is O(n log n) and stable. Intervals: sort by start, then merge in one pass.

## Prefix sums

```python
prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)
range_sum = prefix[r + 1] - prefix[l]      # sum of nums[l..r]
```

## This week

| Item | Details |
|---|---|
| **Deliverable** | Mini Project 2 repository: ER diagram, `schema.sql`, `seed.py`, `queries.sql`, indexes with EXPLAIN evidence, `report.py`, `mongo/` pipelines and README |
| **Practice quiz** | NoSQL with MongoDB & Phase 2 Mini Project (untimed, retakes allowed) |
| **Phase 2 test** | Replaces this week's weekly test: 30 questions on SQL, normalisation, ACID, indexing, MongoDB and the Weeks 5–8 DSA patterns, 45 minutes |
| **DSA** | Sorting and prefix sums: five sorting algorithms, Merge Sorted Array, Sort Colors, Merge Intervals, Product of Array Except Self |
| **Career task** | Write STAR project descriptions for Mini Projects 1 and 2 and keep them for your resume |
