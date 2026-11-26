---
type: notes
title: "W7 · S4 · Transactions, ACID and Safe Database Access from Python"
slug: w07-s4-transactions-acid-python
topic: Transactions & psycopg
subject: core-cs
minutes: 50
description: Transactions and ACID with a bank-transfer demo, isolation levels and their anomalies, locks and deadlocks, an introduction to functions and triggers, and connecting from Python with psycopg using parameterised queries to prevent SQL injection.
---
# Transactions, ACID and safe database access from Python

## Why transactions exist

Transferring ₹500 from account 1 to account 2 is two updates. If the server crashes between them, ₹500 disappears. A
**transaction** groups statements so that they succeed or fail **as one unit**.

```sql
CREATE TABLE accounts (
    account_id  INT PRIMARY KEY,
    holder      VARCHAR(100) NOT NULL,
    balance     NUMERIC(12,2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES (1, 'Asha', 1000.00), (2, 'Rahul', 200.00);

BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 500 WHERE account_id = 2;
COMMIT;
```

Until `COMMIT`, other sessions do not see the changes. `ROLLBACK` throws them away. Now try a transfer that breaks a
rule:

```sql
BEGIN;
UPDATE accounts SET balance = balance + 900 WHERE account_id = 2;
UPDATE accounts SET balance = balance - 900 WHERE account_id = 1;   -- fails: balance would be -400 (CHECK)
COMMIT;                                                             -- PostgreSQL answers ROLLBACK
SELECT * FROM accounts;                                             -- 500.00 and 700.00: nothing changed
```

After an error, PostgreSQL marks the transaction as failed and ignores every statement until it ends, so the first
update (+900) is undone too. Without the transaction, Rahul would have received money that never left Asha's account.

Outside `BEGIN ... COMMIT`, PostgreSQL runs each statement in its own transaction (**autocommit**).

## ACID

| Property | Promise | In the transfer |
|---|---|---|
| **Atomicity** | All of the transaction happens, or none of it | Both updates, or neither |
| **Consistency** | A transaction moves the database from one valid state to another; constraints always hold | The `CHECK (balance >= 0)` is never violated |
| **Isolation** | Concurrent transactions do not see each other's half-finished work | Another session never sees ₹500 "in flight" |
| **Durability** | Once committed, data survives a crash | After `COMMIT` returns, a power cut does not lose the transfer |

Durability is implemented with a **write-ahead log (WAL)**: changes are written to a log on disk before `COMMIT`
returns, and the log is replayed after a crash.

## Isolation levels and anomalies

Full isolation is expensive, so SQL defines levels that allow some anomalies in exchange for concurrency.

| Anomaly | What happens |
|---|---|
| **Dirty read** | You read another transaction's **uncommitted** change, which may be rolled back |
| **Non-repeatable read** | You read a row twice and get different values because another transaction committed an update in between |
| **Phantom read** | You run the same `WHERE` query twice and get **new rows** because another transaction inserted matching rows |
| **Lost update** | Two transactions read a value, both write a new value based on it, and one write overwrites the other |

The SQL standard's levels:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| Read Committed | prevented | possible | possible |
| Repeatable Read | prevented | prevented | possible |
| Serializable | prevented | prevented | prevented |

PostgreSQL details worth knowing: its default is **Read Committed**; it never allows dirty reads (asking for Read
Uncommitted gives Read Committed); and its Repeatable Read also prevents phantoms. MySQL InnoDB's default is Repeatable
Read.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... statements ...
COMMIT;
```

At Serializable, PostgreSQL may abort a transaction with a serialization error instead of letting an anomaly happen;
the application must then **retry** it.

## Locks and deadlocks

To keep isolation, the database **locks** rows that a transaction is changing. A second transaction that wants to
update the same row waits until the first commits or rolls back. Reading with plain `SELECT` does not block writers in
PostgreSQL (it reads a consistent snapshot instead).

`SELECT ... FOR UPDATE` locks the rows you read, so you can check a value and then change it without someone else
changing it in between. That prevents the lost update:

```sql
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1 FOR UPDATE;   -- others wait here
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;
```

A **deadlock** happens when two transactions each hold a lock the other needs:

```text
T1: locks account 1 ............ wants account 2  (waits for T2)
T2: locks account 2 ............ wants account 1  (waits for T1)
```

Neither can continue. PostgreSQL detects the cycle after a short timeout and aborts one transaction with a deadlock
error. Prevention: always lock rows in the **same order** (for example, lower `account_id` first), and keep
transactions short.

## Functions and triggers (introduction)

PostgreSQL can run code inside the database. A **function** written in PL/pgSQL, attached as a **trigger**, runs
automatically when rows change. A typical use is keeping an audit trail:

```sql
CREATE TABLE balance_audit (
    account_id  INT,
    old_balance NUMERIC(12,2),
    new_balance NUMERIC(12,2),
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_balance_change() RETURNS trigger AS $$
BEGIN
    INSERT INTO balance_audit (account_id, old_balance, new_balance)
    VALUES (OLD.account_id, OLD.balance, NEW.balance);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_balance_audit
AFTER UPDATE OF balance ON accounts
FOR EACH ROW EXECUTE FUNCTION log_balance_change();

UPDATE accounts SET balance = balance + 50 WHERE account_id = 2;
SELECT * FROM balance_audit;
```

`OLD` and `NEW` are the row before and after the change. Triggers are powerful but hidden: someone reading the
application code will not see them. Use them for rules that must hold no matter which program writes the data, and
document them.

## Python and PostgreSQL with psycopg

**psycopg** (version 3) is the standard PostgreSQL driver for Python. Install it in your virtual environment:

```bash
pip install "psycopg[binary]"
```

Never hard-code the password. Put the connection string in an environment variable (and `.env` in `.gitignore`):

```python
import os
import psycopg

conninfo = os.environ["DATABASE_URL"]    # e.g. postgresql://postgres:<password>@localhost:5432/college

with psycopg.connect(conninfo) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT full_name, cgpa FROM students WHERE dept_id = %s ORDER BY cgpa DESC", (1,))
        for full_name, cgpa in cur.fetchall():
            print(f"{full_name:<20} {cgpa}")
```

- `with psycopg.connect(...)` commits when the block ends normally, rolls back if an exception escapes, and closes the
  connection. Every statement inside one connection block is part of a transaction until then.
- `%s` is a **placeholder**. The values go in the second argument as a tuple, even for one value: `(1,)`.
- `fetchone()`, `fetchall()` and iterating over the cursor read results.

### SQL injection

Suppose a search script builds SQL by gluing strings together:

```python
name = input("Search name: ")
query = "SELECT roll_no, full_name FROM students WHERE full_name = '" + name + "'"   # NEVER do this
```

A user types `' OR '1'='1`. The query becomes:

```sql
SELECT roll_no, full_name FROM students WHERE full_name = '' OR '1'='1';
```

`'1'='1'` is always true, so every student is returned. Worse inputs can change or delete data. This is **SQL
injection**, one of the most common and serious web vulnerabilities.

The fix is **parameterised queries**: the SQL text and the values travel separately, and the database never interprets
a value as SQL.

```python
name = input("Search name: ")
with psycopg.connect(conninfo) as conn:
    rows = conn.execute(
        "SELECT roll_no, full_name FROM students WHERE full_name = %s",
        (name,),
    ).fetchall()
print(rows)          # the input ' OR '1'='1 now matches no one
```

Rules:

- Always pass values through placeholders. Never use f-strings, `+` or `%` formatting to put values into SQL.
- Placeholders are for **values** only, not table or column names. If those must vary, choose them from a fixed list
  in your code.
- Escaping quotes by hand is not a fix; use the driver.

### A transfer in Python

```python
def transfer(conninfo: str, from_id: int, to_id: int, amount: float) -> bool:
    try:
        with psycopg.connect(conninfo) as conn:          # one transaction
            conn.execute("UPDATE accounts SET balance = balance - %s WHERE account_id = %s", (amount, from_id))
            conn.execute("UPDATE accounts SET balance = balance + %s WHERE account_id = %s", (amount, to_id))
        return True                                       # committed
    except psycopg.Error as exc:
        print("Transfer failed and was rolled back:", exc)
        return False
```

If the `CHECK (balance >= 0)` fails, the exception leaves the `with` block, psycopg rolls back, and no money moves.

## Lab

1. Create `accounts`, run the successful and failing transfers in `psql`, and confirm the balances after each.
2. Open **two** `psql` windows. In the first, `BEGIN` and update account 1 without committing. In the second, try to
   update the same row and watch it wait. Commit the first and watch the second continue.
3. Recreate a deadlock with two windows (each updates a different account first, then the other), read the error, and
   write one sentence on how to prevent it.
4. Add the audit trigger and check that a transfer writes two audit rows.
5. Write `safe_query.py`: read a name from the user, search `students` with a parameterised query, and print the
   results in a table. In a comment, show the string-concatenated version and the input that breaks it. Run the
   attack only against your own local practice database.

## Check yourself

1. Which ACID property is violated if a crash after the first `UPDATE` of a transfer leaves only one account changed?
2. What is a non-repeatable read, and which is the lowest standard isolation level that prevents it?
3. Why does a parameterised query stop `' OR '1'='1` from returning every row?
