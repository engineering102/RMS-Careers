---
type: notes
title: "W8 · S2 · MongoDB Queries, Aggregation Pipelines and Schema Design"
slug: w08-s2-mongodb-queries-aggregation
topic: MongoDB Aggregation
subject: core-cs
minutes: 50
description: Query operators, projection and sorting, the aggregation pipeline with $match, $group, $sort, $lookup and $unwind, indexes and explain, and the embed-versus-reference decision. Re-implements three Week 6 SQL reports as pipelines.
---
# MongoDB queries, aggregation pipelines and schema design

## Sample data: a small shop

Orders **embed** their line items, because items are always read with their order and never on their own. Customers
and products are separate collections that orders **reference** by id.

```javascript
use shop

db.customers.insertMany([
  { _id: 1, name: "Asha Rao",     city: "Hyderabad" },
  { _id: 2, name: "Rahul Verma",  city: "Pune" },
  { _id: 3, name: "Imran Khan",   city: "Bengaluru" },
  { _id: 4, name: "Karthik Iyer", city: "Chennai" }
])

db.products.insertMany([
  { _id: 1, name: "Wireless Mouse",    category: "Electronics", price: 799 },
  { _id: 2, name: "USB-C Charger",     category: "Electronics", price: 1299 },
  { _id: 3, name: "SQL Handbook",      category: "Books",       price: 549 },
  { _id: 4, name: "Cotton Kurta",      category: "Fashion",     price: 999 },
  { _id: 5, name: "Running Shoes",     category: "Fashion",     price: 2999 }
])

db.orders.insertMany([
  { _id: 1, customerId: 1, orderDate: ISODate("2026-01-05"),
    items: [ { productId: 1, quantity: 2, unitPrice: 799 }, { productId: 3, quantity: 1, unitPrice: 549 } ] },
  { _id: 2, customerId: 2, orderDate: ISODate("2026-01-12"),
    items: [ { productId: 2, quantity: 1, unitPrice: 1299 } ] },
  { _id: 3, customerId: 1, orderDate: ISODate("2026-02-20"),
    items: [ { productId: 4, quantity: 2, unitPrice: 999 } ] },
  { _id: 4, customerId: 3, orderDate: ISODate("2026-02-25"),
    items: [ { productId: 5, quantity: 1, unitPrice: 2999 }, { productId: 1, quantity: 1, unitPrice: 799 } ] },
  { _id: 5, customerId: 2, orderDate: ISODate("2026-03-02"),
    items: [ { productId: 3, quantity: 2, unitPrice: 549 } ] }
])
```

(Prices are whole rupees here to keep the examples short. For real money, store `Decimal128` values or integer paise.)

## Query operators

| Operator | Meaning | Example |
|---|---|---|
| `$eq`, `$ne` | Equal, not equal | `{ city: { $ne: "Pune" } }` |
| `$gt`, `$gte`, `$lt`, `$lte` | Comparisons | `{ price: { $gte: 500, $lte: 1500 } }` |
| `$in`, `$nin` | In / not in a list | `{ category: { $in: ["Books", "Fashion"] } }` |
| `$and`, `$or`, `$not` | Logic | `{ $or: [ { city: "Pune" }, { city: "Chennai" } ] }` |
| `$exists` | Field present or absent | `{ tags: { $exists: false } }` |
| `$regex` | Pattern match | `{ name: { $regex: "^A" } }` |
| `$elemMatch` | One array element meets several conditions | `{ items: { $elemMatch: { productId: 1, quantity: { $gte: 2 } } } }` |
| `$size` | Array length | `{ items: { $size: 1 } }` |

Several conditions in one filter object are combined with AND: `{ category: "Fashion", price: { $lt: 1000 } }`.

Dot notation reaches inside embedded documents and arrays of documents:

```javascript
db.orders.find({ "items.productId": 3 })                 // orders containing product 3
```

### Projection, sorting, limiting

```javascript
db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: -1 }).limit(3)
db.products.find().sort({ category: 1, price: -1 })      // 1 ascending, -1 descending
db.products.find().skip(2).limit(2)                       // paging
```

## The aggregation pipeline

An aggregation is a **pipeline**: an array of stages, each transforming the stream of documents and passing it on,
like a Unix pipe.

| Stage | SQL equivalent | Purpose |
|---|---|---|
| `$match` | `WHERE` (or `HAVING` when placed after `$group`) | Filter documents |
| `$project` / `$addFields` | `SELECT` list | Shape fields, compute new ones |
| `$unwind` | (no direct equivalent) | One output document per array element |
| `$group` | `GROUP BY` + aggregates | Group by `_id` and compute `$sum`, `$avg`, `$min`, `$max`, `$count` |
| `$sort`, `$limit`, `$skip` | `ORDER BY`, `LIMIT`, `OFFSET` | Order and page |
| `$lookup` | `LEFT JOIN` | Pull matching documents from another collection into an array |

In `$group`, the `_id` field is the grouping key and `"$field"` (with a dollar sign) means "the value of this field".

```javascript
// Number of products and average price per category
db.products.aggregate([
  { $group: { _id: "$category", products: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
  { $sort: { products: -1 } }
])
```

Put `$match` as **early** as possible: it shrinks the stream before the expensive stages and, at the start of a
pipeline, can use an index.

## Three Week 6 reports as pipelines

### 1. Revenue per category

SQL joined `order_items → products → categories`. Here: unwind the embedded items, look up each product, then group.

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
  { $unwind: "$product" },
  { $group: {
      _id: "$product.category",
      revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } }
  } },
  { $sort: { revenue: -1 } }
])
```

Expected: Fashion 4997, Electronics 3696, Books 1647.

`$lookup` always produces an **array** (`product`), even for one match, so `$unwind` turns it back into a single
embedded document.

### 2. Customers who never ordered

```javascript
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customerId", as: "orders" } },
  { $match: { orders: { $size: 0 } } },
  { $project: { _id: 0, name: 1, city: 1 } }
])
```

`$lookup` behaves like a `LEFT JOIN`: customers without orders get an empty array, which `$size: 0` finds. Result:
Karthik Iyer.

### 3. Monthly revenue

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$orderDate" } },
      revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
      orderIds: { $addToSet: "$_id" }
  } },
  { $project: { _id: 0, month: "$_id", revenue: 1, orders: { $size: "$orderIds" } } },
  { $sort: { month: 1 } }
])
```

Expected: 2026-01 revenue 3446 (2 orders), 2026-02 revenue 5796 (2 orders), 2026-03 revenue 1098 (1 order).
`$addToSet` collects distinct order ids so the count is per order, not per line item: the same trap as `COUNT(*)` versus
`COUNT(DISTINCT order_id)` in SQL.

## Indexes in MongoDB

MongoDB indexes are B-trees too, and the reasoning from Week 7 carries over.

```javascript
db.orders.createIndex({ customerId: 1 })
db.orders.createIndex({ orderDate: -1 })
db.products.createIndex({ name: 1 }, { unique: true })       // also rejects duplicate product names
db.orders.createIndex({ customerId: 1, orderDate: -1 })      // compound: leftmost prefix rule applies
db.orders.getIndexes()

db.orders.find({ customerId: 1 }).explain("executionStats")
```

In the `explain` output, `COLLSCAN` means every document was read (like `Seq Scan`); `IXSCAN` means an index was used.
Compare `totalDocsExamined` with `nReturned`.

## Schema design: embed or reference?

| Embed when… | Reference when… |
|---|---|
| The child is always read with the parent (order → items) | The child is shared by many parents (a product in many orders) |
| The child has no meaning on its own | The child is queried or updated on its own |
| The number of children is small and bounded | The number can grow without limit (a user's lifetime log entries) |
| You want one read and an atomic single-document update | You must avoid copying data that changes (product name, price list) |

Rules of thumb:

- Design for your **queries**: in MongoDB, you shape documents around how the application reads them.
- Unbounded arrays are a warning sign: documents have a 16 MB limit, and large arrays are slow to update.
- Copying a value is fine when it is a **snapshot** (`unitPrice` at the time of sale), just as in SQL.

## Lab: three Week 6 reports as pipelines

1. Load the sample data above into a `shop` database.
2. Run the three pipelines and check that your results match the expected values.
3. Write three more: top 2 products by quantity sold; average order value (total each order first, then `$avg` in a
   second `$group` with `_id: null`); each customer's total spend including customers with 0.
4. Create an index on `orders.customerId` and compare `explain("executionStats")` for `find({ customerId: 1 })` before
   and after.
5. Save the pipelines in `mongo/reports.js` with a comment above each giving the equivalent SQL question.

## Check yourself

1. Why does a pipeline usually need `$unwind` after `$lookup`?
2. Would you embed a student's semester marks inside the student document, or reference them? Give your reasoning.
3. Why should `$match` come as early as possible in a pipeline?
