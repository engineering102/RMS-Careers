---
type: quiz
title: "Phase 2 Test: Databases & SQL"
slug: phase-2-test
topic: Phase 2 Assessment
subject: core-cs
quizType: formal
timeLimit: 45
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt Phase 2 test covering Weeks 5–8 — relational model and SQL, joins, CTEs and window functions, normalisation, indexing, transactions, MongoDB, and the strings, hashing, two pointer and sorting patterns. 30 questions, 45 minutes.
---
Q: Which statement about a primary key is true?
A) A table can have several primary keys
B) A primary key column may contain one NULL
*C) It uniquely identifies each row and can never be NULL
D) It must be a single column
Explanation: A table has one primary key, which may be composite. Its values are unique and never NULL.

Q: A table has the constraint CHECK (marks BETWEEN 0 AND 100) and no NOT NULL. Which inserted value is rejected?
A) marks = 0
B) marks = 100
C) marks = NULL
*D) marks = 101
Explanation: CHECK rejects only rows where the condition is false. NULL makes it unknown, which is accepted.

Q: enrolments.student_id REFERENCES students (student_id) ON DELETE CASCADE. What happens when a student is deleted?
A) The delete fails while enrolments exist
*B) The student's enrolments are deleted as well
C) The enrolments keep the old student_id
D) The enrolments' student_id becomes NULL
Explanation: CASCADE propagates the delete to the child rows. SET NULL would set them to NULL instead.

Q: What does SELECT COUNT(*), COUNT(city), COUNT(DISTINCT city) return for the cities Pune, Pune, NULL, Chennai?
A) 4, 4, 3
*B) 4, 3, 2
C) 3, 3, 2
D) 4, 3, 3
Explanation: COUNT(*) counts rows, COUNT(city) skips the NULL, and COUNT(DISTINCT city) counts Pune and Chennai.

Q: Which query lists departments that have more than 20 students?
A) SELECT dept_id FROM students WHERE COUNT(*) > 20 GROUP BY dept_id;
*B) SELECT dept_id FROM students GROUP BY dept_id HAVING COUNT(*) > 20;
C) SELECT dept_id FROM students GROUP BY dept_id WHERE COUNT(*) > 20;
D) SELECT dept_id, COUNT(*) > 20 FROM students;
Explanation: Conditions on aggregates go in HAVING, after GROUP BY. WHERE cannot use aggregates.

Q: Which conditions correctly find students whose city is not recorded? (Select all that apply.)
*A) WHERE city IS NULL
B) WHERE city = NULL
*C) WHERE NOT (city IS NOT NULL)
D) WHERE city = ''
Explanation: = NULL is never true. C is a roundabout way of writing IS NULL. D matches empty strings, which are not NULL.

Q: Table a has ids 1, 2, 3. Table b has a_id values 2, 2, 5. How many rows does a LEFT JOIN b ON b.a_id = a.id return?
A) 3
*B) 4
C) 5
D) 6
Explanation: id 2 matches twice (2 rows); ids 1 and 3 have no match and are kept with NULLs (2 rows). The b row with 5 is dropped.

Q: Which query correctly returns customers who never placed an order, even if orders.customer_id could contain NULL values?
A) SELECT * FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders);
*B) SELECT * FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
C) SELECT * FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;
D) SELECT * FROM customers WHERE customer_id <> ALL (SELECT order_id FROM orders);
Explanation: NOT IN returns no rows if the list contains NULL. An inner join never leaves order_id NULL. D compares with the wrong column.

Q: Salaries are 90, 80, 80, 70. Which values does DENSE_RANK() OVER (ORDER BY salary DESC) assign, in order?
A) 1, 2, 3, 4
B) 1, 2, 2, 4
*C) 1, 2, 2, 3
D) 1, 1, 2, 3
Explanation: DENSE_RANK gives ties the same rank and leaves no gap. RANK would give 1, 2, 2, 4.

Q: You need the top 3 products by revenue in each category. Which approach is correct?
A) GROUP BY category with LIMIT 3
B) WHERE ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) <= 3
*C) Compute ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) in a CTE, then filter rn <= 3 in the outer query
D) ORDER BY revenue DESC LIMIT 3
Explanation: Window functions cannot appear in WHERE. LIMIT applies to the whole result, not to each group.

Q: Monthly revenue is Jan 200, Feb 250, Mar 300. What does SUM(revenue) OVER (ORDER BY month) return for March?
A) 300
B) 550
*C) 750
D) 250
Explanation: A running total adds every row from the first up to the current one: 200 + 250 + 300.

Q: Which statements about CTEs are true? (Select all that apply.)
*A) WITH t AS (...) names a subquery that the following statement can use like a table
*B) A recursive CTE has an anchor query and a recursive query joined by UNION ALL
C) A CTE is stored permanently like a view
*D) A CTE can be referenced more than once in the same statement
Explanation: A CTE lives only for one statement. A view is the saved, reusable object.

Q: Query 1 returns 1, 2, 3. Query 2 returns 2, 3, 4. What does Query 1 EXCEPT Query 2 return?
*A) 1
B) 4
C) 2, 3
D) 1, 4
Explanation: EXCEPT keeps rows of the first result that are not in the second.

Q: In orders(order_id, customer_id, customer_name, order_date), the key is order_id and customer_id determines customer_name. Which normal form is violated?
A) 1NF
B) 2NF
*C) 3NF
D) None
Explanation: customer_name depends on the key through customer_id, a non-key column. That is a transitive dependency.

Q: Which design is in 1NF?
A) students(roll_no, name, phones) with phones = '98480 11111, 90000 22222'
B) students(roll_no, name, phone1, phone2, phone3)
*C) students(roll_no, name) and student_phones(roll_no, phone)
D) students(roll_no, name, phones) with phones stored as a comma-separated list sorted alphabetically
Explanation: A list in one cell breaks atomicity, and numbered columns are a repeating group. A separate table stores one phone per row.

Q: Deleting the only student enrolled in a course also deletes the only record of that course's title and credits. What is this?
A) An update anomaly
*B) A deletion anomaly
C) A dirty read
D) A deadlock
Explanation: Facts about the course were stored only in enrolment rows, so removing the row removed them too.

Q: A table is in 3NF but not in BCNF. Which situation causes this?
A) A non-key column depends on part of a composite key
B) A cell contains a list of values
*C) A dependency X → Y exists where Y is a prime attribute and X is not a super key
D) The table has no primary key
Explanation: 3NF allows a non-super-key determinant when the dependent attribute is prime. BCNF does not allow it.

Q: Which actions are reasonable cases of deliberate denormalisation? (Select all that apply.)
*A) Storing unit_price on order_items to keep the price at the time of sale
*B) Storing a precomputed orders.total_amount for a read-heavy dashboard, updated in the same transaction as its items
C) Copying each customer's city into every order row so that joins are never needed anywhere
D) Storing a student's age instead of the date of birth
Explanation: A and B are justified with a reason and a plan to keep them correct. C duplicates a changing fact everywhere; age is a derived value that goes stale.

Q: There is an index on applications (company, applied_on). Which query can use it most efficiently?
A) WHERE applied_on = '2026-03-01'
*B) WHERE company = 'Infotech' AND applied_on >= '2026-03-01'
C) WHERE LOWER(company) = 'infotech'
D) WHERE company LIKE '%tech'
Explanation: It matches the leftmost column with equality and the second with a range. A skips the leftmost column, C wraps it in a function, and D has a leading wildcard.

Q: An EXPLAIN ANALYZE plan shows Seq Scan with Rows Removed by Filter: 499,990 for a query that returns 10 rows. What does this suggest?
A) The table needs a primary key
*B) The filtered column is selective and is a good candidate for an index
C) The query should use SELECT DISTINCT
D) The statistics are perfect and nothing can improve
Explanation: Reading half a million rows to return ten is the signal that an index on the filter column would help.

Q: A bank transfer debits one account and credits another inside BEGIN ... COMMIT. The credit fails a constraint. What is the final state?
A) The debit is kept and the credit is lost
*B) Neither change is applied
C) Both changes are applied with a warning
D) The database must be restored from a backup
Explanation: Atomicity: the failed transaction is rolled back as a whole.

Q: Which anomaly does the Read Committed isolation level prevent?
*A) Dirty reads
B) Non-repeatable reads
C) Phantom reads
D) All anomalies
Explanation: Read Committed never shows uncommitted data, but a repeated read can still see another transaction's committed changes.

Q: Why does cur.execute("SELECT * FROM students WHERE roll_no = %s", (roll,)) in psycopg prevent SQL injection?
A) psycopg removes all quotes from the input
*B) The SQL text and the value are sent separately, so the value is never interpreted as SQL
C) %s only accepts digits
D) It does not; it is the same as an f-string
Explanation: Parameterised queries keep data and code apart. f-strings and concatenation put user input into the SQL text.

Q: Which MongoDB query returns documents from courses with credits greater than or equal to 3, showing only the title?
A) db.courses.find({ credits: >= 3 }, { title: 1 })
*B) db.courses.find({ credits: { $gte: 3 } }, { title: 1, _id: 0 })
C) db.courses.select({ credits: { $gte: 3 } }, "title")
D) db.courses.find({ $gte: { credits: 3 } }).project("title")
Explanation: Operators go inside the field's condition object, and the second argument to find is the projection.

Q: In an aggregation pipeline, what does $lookup produce for each input document?
A) A single embedded document, or nothing when there is no match
*B) An array of the matching documents from the other collection, which is empty when there is no match
C) A new collection on disk
D) A count of the matches
Explanation: $lookup behaves like a left join that stores matches in an array; $unwind turns the array into separate documents.

Q: Which data is the best candidate for EMBEDDING in the parent document rather than referencing?
*A) The line items of an order, which are always read with the order
B) Products, which appear in thousands of orders
C) A user's activity log, which grows without limit
D) Departments shared by many students and courses
Explanation: Embed small, bounded children that are read with their parent. Shared or unbounded data should be referenced.

Q: In the two-index Valid Palindrome solution for "A man, a plan, a canal: Panama", what is done with the characters ',' and ':'?
A) They are compared like letters
*B) Each index skips them before comparing
C) The function returns False when it meets one
D) They are converted to spaces
Explanation: Only letters and digits are compared, case-insensitively. The indexes move past everything else.

Q: Why does the hash map solution to Two Sum run in O(n) time?
A) It sorts the array first
*B) Each element needs one O(1) average lookup for target - x among the values already seen
C) It compares every pair with two loops
D) It uses binary search on each element
Explanation: One pass, with constant-time average dictionary lookups, replaces the O(n squared) pair check.

Q: Which problems are normally solved with a sliding window or two pointers? (Select all that apply.)
*A) Longest substring without repeating characters
*B) Smallest subarray with sum at least k, when all numbers are positive
C) Count subarrays with sum exactly k when the array contains negative numbers
*D) Find a pair with a given sum in a sorted array
Explanation: With negative numbers a window cannot decide when to shrink, so prefix sums with a hash map are used instead.

Q: Which sorting algorithm has O(n log n) time in the worst case and is stable?
A) Quick sort
*B) Merge sort
C) Selection sort
D) Bubble sort
Explanation: Merge sort is always O(n log n) and keeps equal elements in order. Quick sort's worst case is O(n squared), and it is not stable.
