---
type: notes
title: "W7 · S1 · From Requirements to an ER Model and Tables"
slug: w07-s1-er-modelling-to-tables
topic: ER Modelling
subject: core-cs
minutes: 45
description: Turn written requirements into entities, attributes and relationships with cardinality, handle weak entities and many-to-many links, and map the ER diagram to tables using a library system.
---
# From requirements to an ER model and tables

Until now you were given schemas. This week you design them. Bad designs cause most long-term database pain:
duplicated data, impossible queries and rules that cannot be enforced. The **Entity–Relationship (ER) model** is the
standard way to think through a design before writing any SQL.

## Step 1: read the requirements and underline nouns and verbs

Requirements for a college library:

> The library has many **books**. Each book has an ISBN, a title, a publisher and a publication year, and may have
> several **authors**; an author may write several books. The library holds one or more physical **copies** of each
> book, numbered 1, 2, 3 within that book, and records each copy's shelf location. **Members** (students and staff)
> have a member id, a name, a phone number and one or more email addresses. A member **borrows** a copy on a date and
> must return it by a due date; the actual return date is recorded. A member can have several loans at once, but a copy
> can be on only one open loan at a time.

- **Nouns** that have their own identity and several facts → candidate **entities**: Book, Author, Copy, Member.
- **Nouns** that describe something → **attributes**: ISBN, title, shelf location, phone.
- **Verbs** connecting entities → **relationships**: Author *writes* Book, Book *has* Copy, Member *borrows* Copy.

## Step 2: ER vocabulary

| Concept | Meaning | Library example |
|---|---|---|
| Entity | A thing with its own identity | Book, Member |
| Attribute | A property of an entity | `title`, `phone` |
| Key attribute | Identifies an entity | `isbn`, `member_id` |
| Composite attribute | Made of parts | `name` → first, last |
| Multivalued attribute | Several values per entity | a member's email addresses |
| Derived attribute | Computable from others | `days_overdue` from due and return dates |
| Relationship | An association between entities | Member *borrows* Copy |
| Relationship attribute | A fact about the association, not either entity | `borrowed_on`, `due_on` |
| Weak entity | Cannot be identified without its owner | Copy (copy 2 of *which* book?) |

### Cardinality

Cardinality says how many of one entity can relate to the other.

| Cardinality | Read as | Example |
|---|---|---|
| 1 : 1 | one to one | Department – Head of department |
| 1 : N | one to many | Book – Copy (a book has many copies; a copy belongs to one book) |
| M : N | many to many | Author – Book |

**Participation** adds whether the link is mandatory: every copy *must* belong to a book (total participation), but a
member need not have any loans (partial participation).

In crow's-foot notation (used by draw.io and dbdiagram.io), a single bar means "one", a crow's foot means "many" and a
circle means "zero is allowed".

## Step 3: draw the diagram

```text
 +---------+        writes         +---------+
 | AUTHOR  |>o-------------------o<|  BOOK   |
 +---------+       (M : N)         +---------+
                                       |1
                                       | has (1 : N, identifying)
                                       |
                                      /|\ N
                                  +=========+         borrows (LOAN)          +---------+
                                  ‖  COPY   ‖>o-----------------------------o<| MEMBER  |
                                  +=========+   borrowed_on, due_on,         +---------+
                                   (weak)       returned_on
```

Double borders mark the weak entity. Draw yours with **draw.io** (diagrams.net) or **dbdiagram.io**; the second one
generates the diagram from a short text description and can export SQL, which is a good cross-check of your own DDL.

## Step 4: map ER to tables

| ER element | Becomes |
|---|---|
| Strong entity | A table; its key attribute becomes the primary key |
| Composite attribute | Separate columns (`first_name`, `last_name`) |
| Multivalued attribute | Its own table: `(owner_id, value)` with a composite primary key |
| Derived attribute | Usually **not stored**; compute it in queries or a view |
| 1 : N relationship | A foreign key on the **N** side |
| 1 : 1 relationship | A foreign key with a `UNIQUE` constraint on one side |
| M : N relationship | A **junction table** holding both foreign keys, plus any relationship attributes |
| Weak entity | A table whose primary key includes the owner's key, with `ON DELETE CASCADE` |

Applying the rules:

```sql
CREATE TABLE books (
    isbn       CHAR(13)     PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    publisher  VARCHAR(100),
    pub_year   SMALLINT     CHECK (pub_year BETWEEN 1450 AND 2100)
);

CREATE TABLE authors (
    author_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL
);

-- M:N  Author writes Book  →  junction table
CREATE TABLE book_authors (
    isbn       CHAR(13) REFERENCES books (isbn) ON DELETE CASCADE,
    author_id  INT      REFERENCES authors (author_id),
    PRIMARY KEY (isbn, author_id)
);

-- Weak entity: a copy is identified by (book, copy number)
CREATE TABLE copies (
    isbn       CHAR(13) REFERENCES books (isbn) ON DELETE CASCADE,
    copy_no    SMALLINT CHECK (copy_no > 0),
    shelf      VARCHAR(20) NOT NULL,
    PRIMARY KEY (isbn, copy_no)
);

CREATE TABLE members (
    member_id   VARCHAR(12) PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL,
    last_name   VARCHAR(50),
    member_type VARCHAR(10) NOT NULL CHECK (member_type IN ('student', 'staff')),
    phone       VARCHAR(15)
);

-- Multivalued attribute: a member's email addresses
CREATE TABLE member_emails (
    member_id  VARCHAR(12) REFERENCES members (member_id) ON DELETE CASCADE,
    email      VARCHAR(255),
    PRIMARY KEY (member_id, email)
);

-- Relationship with attributes: Member borrows Copy
CREATE TABLE loans (
    loan_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id    VARCHAR(12) NOT NULL REFERENCES members (member_id),
    isbn         CHAR(13)    NOT NULL,
    copy_no      SMALLINT    NOT NULL,
    borrowed_on  DATE        NOT NULL DEFAULT CURRENT_DATE,
    due_on       DATE        NOT NULL,
    returned_on  DATE,
    FOREIGN KEY (isbn, copy_no) REFERENCES copies (isbn, copy_no),
    CHECK (due_on > borrowed_on),
    CHECK (returned_on IS NULL OR returned_on >= borrowed_on)
);

-- "A copy can be on only one open loan at a time"
CREATE UNIQUE INDEX one_open_loan_per_copy ON loans (isbn, copy_no) WHERE returned_on IS NULL;
```

Points worth noticing:

- `loans` gets its own surrogate key `loan_id`, because the same member can borrow the same copy again next month, so
  `(member_id, isbn, copy_no)` is not unique over time.
- The foreign key to `copies` is **composite** because the copy's key is composite.
- The last rule in the requirements is enforced by a **partial unique index** (a PostgreSQL feature): uniqueness only
  among rows where `returned_on IS NULL`. Rules in the requirements should become constraints wherever possible.
- `days_overdue` is derived, so it is not a column. Compute it:
  `GREATEST(COALESCE(returned_on, CURRENT_DATE) - due_on, 0)`.

## Common modelling mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| A list in one column (`authors = 'A, B'`) | Cannot search or join on one author | Junction table |
| M:N stored as a foreign key on one side | Each book can have only one author | Junction table |
| Relationship facts on an entity (`due_on` in `copies`) | History is lost on the next loan | Put them on the relationship table |
| Storing derived values | Values drift out of date | Compute them, or use a view |
| No natural uniqueness enforced | Duplicate ISBNs with different ids | `UNIQUE` on the natural key |

## Lab: model a hospital or library system

Pick **one** domain and work in pairs for the first 20 minutes, then individually:

1. Write 8–10 one-line requirements (who, what, how many, which rules).
2. List entities, attributes (mark keys, multivalued and derived ones) and relationships with cardinality.
3. Draw the ER diagram in draw.io or dbdiagram.io and export it as PNG.
4. Map it to `CREATE TABLE` statements using the mapping table above. Every requirement that is a rule should become a
   constraint; list any you could not enforce.
5. Insert three rows per table and write two queries that prove the design answers real questions (for a hospital:
   "today's appointments for Dr. X", "patients seen by more than one doctor").

For a hospital: patients, doctors, departments, appointments (relationship with date, time and status), prescriptions
(weak entity of an appointment), and a doctor's multiple specialisations (multivalued).

## Check yourself

1. How is a many-to-many relationship represented in tables? What is the primary key of that table?
2. Why is `copies` a weak entity, and what does its primary key look like?
3. Where do the attributes `borrowed_on` and `due_on` belong, and why not in `copies` or `members`?
