---
type: notes
title: "W8 · S1 · NoSQL, the CAP Theorem and MongoDB CRUD"
slug: w08-s1-nosql-cap-mongodb-crud
topic: NoSQL & MongoDB
subject: core-cs
minutes: 45
description: The four NoSQL families, SQL versus NoSQL trade-offs, an introduction to the CAP theorem, MongoDB documents, collections and BSON, setting up MongoDB with mongosh and Compass, and create, read, update and delete on a courses collection.
---
# NoSQL, the CAP theorem and MongoDB CRUD

Relational databases are the right default for most applications, and you will use PostgreSQL for the rest of the
programme. But interviewers expect you to know the alternatives and to **choose with reasons**. This session covers the
landscape and gets you productive in MongoDB, the most widely taught document database.

## The four NoSQL families

"NoSQL" ("not only SQL") covers databases that do not use the relational table model.

| Family | Data shape | Good at | Example systems |
|---|---|---|---|
| **Document** | JSON-like documents grouped in collections | Records with nested, varying structure; read a whole object at once | MongoDB, Couchbase |
| **Key–value** | A key maps to an opaque value | Very fast lookups by key: caches, sessions, counters | Redis, Amazon DynamoDB |
| **Wide-column** | Rows with flexible column families, partitioned across many servers | Huge write volumes, time series | Apache Cassandra, HBase |
| **Graph** | Nodes and relationships (edges) | Many-hop relationship queries: friends of friends, recommendations | Neo4j |

## SQL versus NoSQL: trade-offs

| Aspect | Relational (PostgreSQL) | Document (MongoDB) |
|---|---|---|
| Schema | Fixed, declared up front; changes need `ALTER TABLE` | Flexible: documents in one collection may differ (validation is optional) |
| Relationships | Joins across normalised tables | Embed related data, or reference it and use `$lookup` |
| Integrity | Foreign keys, `CHECK`, `UNIQUE`, transactions everywhere | Unique indexes and schema validation; multi-document transactions exist but are used sparingly |
| Query language | SQL, a standard | MongoDB Query API (JSON-style) |
| Scaling style | Traditionally scale up (bigger server); read replicas | Designed to scale out (sharding across servers) |
| Best fit | Money, marks, inventory, anything with strong rules between entities | Catalogues, content, event logs, profiles with varied fields |

A good interview answer is not "NoSQL is faster" or "SQL is old". It names the data's shape and rules:

> "Placement offers and payments have strict relationships and need transactions, so I would use PostgreSQL. A product
> catalogue where each category has different attributes fits a document model well."

## The CAP theorem (introduction)

In a **distributed** database (data copied across several servers), three properties are in tension:

- **Consistency (C):** every read sees the most recent write.
- **Availability (A):** every request to a working server gets a response.
- **Partition tolerance (P):** the system keeps working when the network between servers fails.

Network partitions do happen, so a distributed system must tolerate them. The real choice is what to do **during** a
partition: refuse some requests to stay consistent (**CP**), or answer every request even if some answers are stale
(**AP**). When there is no partition, a system can offer both C and A.

Note that "C" in CAP is not the same as "C" in ACID: CAP's consistency is about replicas agreeing; ACID's consistency
is about constraints holding.

## MongoDB basics

| Relational | MongoDB |
|---|---|
| Database | Database |
| Table | **Collection** |
| Row | **Document** |
| Column | Field |
| Primary key | `_id` (added automatically as an `ObjectId` if you do not provide one) |
| Join | Embedding, or `$lookup` in an aggregation |

A document:

```javascript
{
  _id: ObjectId("..."),
  code: "CS301",
  title: "Database Management Systems",
  credits: 4,
  dept: "CSE",
  tags: ["core", "placement"],
  instructor: { name: "Dr. K. Lakshmi", email: "lakshmi@example.com" }
}
```

Fields can hold arrays (`tags`) and embedded documents (`instructor`), which a relational row cannot.

**BSON** (Binary JSON) is how MongoDB stores documents. It adds types that JSON lacks, such as `ObjectId`, `Date`,
32- and 64-bit integers and `Decimal128` (exact decimals for money). A single document can be at most 16 MB.

## Setting up

Choose one:

1. **Local:** install MongoDB Community Server and the shell **mongosh** from the official MongoDB website, then run
   `mongosh` (it connects to `mongodb://localhost:27017` by default).
2. **Atlas free tier:** create a free cluster on MongoDB Atlas, add a database user, allow your IP address, and copy the
   connection string into `mongosh "<connection string>"`. Keep the password out of Git.

Install **MongoDB Compass** as well: a graphical tool for browsing collections, running queries and building
aggregation pipelines stage by stage.

Useful shell commands:

```javascript
show dbs                  // list databases
use college               // switch (created on first insert)
show collections
db.courses.countDocuments()
```

## CRUD in mongosh

### Create

```javascript
db.courses.insertOne({
  code: "CS301", title: "Database Management Systems", credits: 4, dept: "CSE",
  tags: ["core", "placement"]
})

db.courses.insertMany([
  { code: "CS302", title: "Operating Systems", credits: 4, dept: "CSE", tags: ["core"] },
  { code: "CS201", title: "Data Structures", credits: 4, dept: "CSE", tags: ["core", "placement"] },
  { code: "EC301", title: "Digital Signal Processing", credits: 3, dept: "ECE", tags: ["core"] },
  { code: "ME301", title: "Thermodynamics", credits: 3, dept: "MECH" },
  { code: "HS101", title: "Professional Communication", credits: 2, dept: "CIVIL", tags: ["soft-skills"] }
])
```

Notice that `ME301` has no `tags` field. MongoDB accepts it; your code must cope with missing fields.

### Read

```javascript
db.courses.find()                                         // all documents
db.courses.find({ dept: "CSE" })                          // equality filter
db.courses.findOne({ code: "CS301" })                     // first match or null
db.courses.find({ credits: { $gte: 4 } })                 // comparison operator
db.courses.find({ tags: "placement" })                    // matches if the array CONTAINS "placement"
db.courses.find({ dept: "CSE" }, { title: 1, credits: 1, _id: 0 })   // projection: chosen fields only
```

The second argument to `find` is a **projection**: `1` includes a field, `0` excludes it. You cannot mix inclusion and
exclusion in one projection, except for `_id`, which is included unless you exclude it.

### Update

```javascript
db.courses.updateOne({ code: "CS302" }, { $set: { credits: 3 } })
db.courses.updateMany({ dept: "CSE" }, { $inc: { credits: 1 } })        // add 1 to every CSE course
db.courses.updateOne({ code: "ME301" }, { $push: { tags: "core" } })    // creates the array if missing
db.courses.updateOne({ code: "CS201" }, { $unset: { tags: "" } })       // remove a field
db.courses.updateOne(
  { code: "AI401" },
  { $set: { title: "Applied AI", credits: 3, dept: "CSE" } },
  { upsert: true }                                                    // insert if no match
)
```

Always use an update operator such as `$set`. `replaceOne` replaces the **whole** document, which silently deletes
every field you did not include.

### Delete

```javascript
db.courses.deleteOne({ code: "AI401" })
db.courses.deleteMany({ credits: { $lt: 3 } })
```

`deleteMany({})` with an empty filter deletes every document. As in SQL, run the filter with `find` first.

## Lab: CRUD on a courses collection

1. Start mongosh (local or Atlas) and run `use college`.
2. Insert the six courses above, then add two of your own with an embedded `instructor` document.
3. Write queries for: all ECE courses; courses with 3 or more credits, showing only `code` and `title`; courses tagged
   `placement`; courses with no `tags` field (`{ tags: { $exists: false } }`).
4. Update: change one title; give every CSE course an extra tag `"cse"`; upsert a new course.
5. Delete the course you upserted, after checking it with `find`.
6. Open Compass, find the `courses` collection and repeat one query there. Save your mongosh commands as
   `mongo/courses-crud.js` in your lab repository.

## Check yourself

1. Give one kind of data that suits a document database and one that suits a relational database, with a reason each.
2. During a network partition, what must a distributed database choose between, according to CAP?
3. What is the difference between `updateOne(filter, { $set: {...} })` and `replaceOne(filter, {...})`?
