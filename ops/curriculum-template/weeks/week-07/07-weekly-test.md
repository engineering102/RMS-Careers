---
type: quiz
title: "W7 · Weekly Test: Database Design, Indexing and Transactions"
slug: w07-weekly-test
topic: Week 7 Assessment
subject: core-cs
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on ER mapping, normal forms, indexes and EXPLAIN, ACID and isolation, SQL injection, and two pointers and sliding window problems. 15 questions, 25 minutes.
---
Q: Students can join many clubs and each club has many students. How should this relationship be stored?
A) A club_id column in students
B) A student_ids column in clubs holding a comma-separated list
*C) A junction table club_members(student_id, club_id) with a composite primary key
D) A single table holding all student and club columns
Explanation: A many-to-many relationship needs its own table with a foreign key to each side.

Q: A hospital stores prescriptions numbered 1, 2, 3 within each appointment. A prescription cannot be identified without its appointment. What is the prescription in ER terms, and what is its primary key?
A) A strong entity with key prescription_no
*B) A weak entity with key (appointment_id, prescription_no)
C) A multivalued attribute of the doctor
D) A derived attribute
Explanation: A weak entity's key combines the owner's key with its own partial key.

Q: Table results(roll_no, course_code, student_name, marks) has key (roll_no, course_code) and roll_no determines student_name. Which normal form does it violate?
A) 1NF
*B) 2NF
C) Only BCNF
D) None, it is fully normalised
Explanation: student_name depends on part of the composite key, which is a partial dependency.

Q: Table students(roll_no, name, dept, hod) has key roll_no, and dept determines hod. What is the problem and the fix?
A) A partial dependency; split on roll_no
*B) A transitive dependency; move (dept, hod) into a departments table
C) A multivalued attribute; split hod into rows
D) No problem; every column depends on roll_no
Explanation: hod depends on the key only through dept. That violates 3NF and causes update anomalies when a HOD changes.

Q: When the HOD of CSE changes, a clerk must edit 400 rows, and one missed row leaves the data contradicting itself. What is this called?
A) Insertion anomaly
*B) Update anomaly
C) Deletion anomaly
D) Phantom read
Explanation: The same fact stored in many rows must be updated everywhere at once.

Q: Which statements about indexes in PostgreSQL are true? (Select all that apply.)
*A) A PRIMARY KEY automatically creates a unique index
B) A FOREIGN KEY automatically creates an index on the referencing column
*C) Every extra index makes INSERT and UPDATE slower
*D) An index on (company, applied_on) can serve WHERE company = 'X' efficiently
Explanation: PostgreSQL does not index foreign key columns automatically. The composite index can be used for its leftmost column.

Q: There is an index on students(email). Which condition is least likely to use it?
A) WHERE email = 'asha@example.com'
B) WHERE email IN ('a@example.com', 'b@example.com')
*C) WHERE LOWER(email) = 'asha@example.com'
D) WHERE email = 'asha@example.com' AND city = 'Pune'
Explanation: The index stores email, not LOWER(email). An expression index on LOWER(email) would be needed.

Q: How does EXPLAIN ANALYZE differ from EXPLAIN?
A) It only shows the estimated cost
*B) It actually runs the query and reports real times and row counts
C) It creates the indexes the query needs
D) It works only on UPDATE statements
Explanation: Because it runs the query, wrap EXPLAIN ANALYZE of a data-changing statement in a transaction you roll back.

Q: A plan shows: Seq Scan on applications, Rows Removed by Filter: 99995, for WHERE student_id = 4242. What is the most reasonable next step?
A) Add more RAM to the server
*B) Create an index on student_id and compare EXPLAIN ANALYZE before and after
C) Rewrite the query with SELECT DISTINCT
D) Drop the primary key
Explanation: Reading 100,000 rows to return 5 is the classic sign that a selective column needs an index.

Q: A transfer runs BEGIN; UPDATE (debit account 1); UPDATE (credit account 2); and the server crashes before COMMIT. After restart, neither account has changed. Which ACID property guaranteed this?
*A) Atomicity
B) Consistency
C) Isolation
D) Durability
Explanation: Atomicity means all or nothing; an uncommitted transaction is undone.

Q: Transaction T1 reads a row, T2 updates that row and commits, and T1 reads it again and sees a different value. What is this anomaly, and the lowest standard level that prevents it?
A) Dirty read; Read Committed
*B) Non-repeatable read; Repeatable Read
C) Phantom read; Serializable
D) Lost update; Read Uncommitted
Explanation: Re-reading the same row and getting a different committed value is a non-repeatable read.

Q: A script runs cur.execute("SELECT * FROM users WHERE name = '" + name + "'"). Which input makes it return every row?
A) Asha
*B) ' OR '1'='1
C) %
D) NULL
Explanation: The input closes the string and adds a condition that is always true. A parameterised query with %s prevents this.

Q: Which practices protect a Python program against SQL injection? (Select all that apply.)
*A) cur.execute("SELECT * FROM students WHERE roll_no = %s", (roll,))
B) cur.execute(f"SELECT * FROM students WHERE roll_no = '{roll}'")
*C) Choosing a sort column from a fixed list in code, because placeholders cannot be used for column names
D) Replacing every quote in the input by hand before concatenating
Explanation: Values go through placeholders, identifiers come from a whitelist. f-strings and hand escaping are not safe.

Q: In Container With Most Water, why is it safe to move the pointer at the SHORTER line inwards?
A) Shorter lines are always at the ends
*B) The area is capped by the shorter line, so keeping it while the width shrinks can never give a larger area
C) Moving the taller line would skip the answer only when the array is sorted
D) It is not safe; both pointers must be tried
Explanation: Every container that keeps the shorter line and moves the other is narrower and no taller, so all of them can be discarded.

Q: In Longest Substring Without Repeating Characters, what does the code return for "pwwkew" if the shrink step uses if instead of while?
A) 3
B) 2
*C) 4
D) 6
Explanation: At the second w, if removes only p, leaving w inside; then the window "wwke" is wrongly counted as length 4. while keeps removing until the repeated character is gone.
