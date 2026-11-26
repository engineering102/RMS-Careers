---
type: quiz
title: "W5 · Weekly Test: Keys, Constraints and SQL Queries"
slug: w05-weekly-test
topic: Week 5 Assessment
subject: core-cs
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on keys and constraints, SELECT queries, NULL handling, aggregation and this week's string problems. 15 questions, 25 minutes.
---
Q: A students table has the columns student_id, roll_no, email and full_name. student_id, roll_no and email are each unique for every student. Which of these are candidate keys? (Select all that apply.)
*A) {student_id}
*B) {email}
C) {student_id, email}
D) {full_name}
Explanation: A candidate key is a minimal unique set. {student_id, email} is unique but not minimal, so it is only a super key. Names can repeat.

Q: The enrolments table has PRIMARY KEY (student_id, course_id). What does this guarantee?
A) A student can enrol in only one course
B) A course can have only one student
*C) The same student cannot be enrolled in the same course twice
D) student_id and course_id are each unique on their own
Explanation: A composite key makes the pair unique. Each column on its own can repeat.

Q: departments contains dept_id 1 to 4. What happens when you run INSERT INTO students (roll_no, full_name, email, dept_id, semester) VALUES ('22CS9', 'Ravi', 'ravi@example.com', 7, 5); where students.dept_id REFERENCES departments (dept_id)?
A) The row is inserted with dept_id set to NULL
B) The row is inserted and department 7 is created automatically
*C) The insert fails with a foreign key violation
D) The row is inserted, but a warning is shown
Explanation: A foreign key value must exist in the referenced table, so the database rejects the row.

Q: A column is defined as cgpa NUMERIC(4,2) CHECK (cgpa BETWEEN 0 AND 10) with no NOT NULL. Which insert succeeds?
A) cgpa = 10.5
B) cgpa = -1
*C) cgpa = NULL
D) None of them
Explanation: A CHECK constraint only rejects rows where the condition is false. With NULL the condition is unknown, so the row is accepted.

Q: Which statement removes a table's rows AND its structure, so the table no longer exists?
A) DELETE FROM enrolments;
B) TRUNCATE enrolments;
*C) DROP TABLE enrolments;
D) ALTER TABLE enrolments DROP COLUMN marks;
Explanation: DELETE and TRUNCATE empty the table but keep it. DROP TABLE removes the table itself.

Q: Which of these are DDL statements? (Select all that apply.)
*A) CREATE TABLE
*B) ALTER TABLE
C) INSERT INTO
*D) DROP TABLE
Explanation: DDL defines structure. INSERT changes data, so it is DML.

Q: The students table has 10 rows, and 2 of them have cgpa = NULL. What does SELECT COUNT(*), COUNT(cgpa) FROM students; return?
A) 10, 10
*B) 10, 8
C) 8, 8
D) 8, 10
Explanation: COUNT(*) counts rows. COUNT(column) counts only non-NULL values.

Q: One student has cgpa = NULL. How many rows does SELECT * FROM students WHERE cgpa = NULL; return?
A) 1
*B) 0
C) Every row
D) It raises a syntax error
Explanation: Comparing with NULL using = gives unknown, never true, so no rows match. Use IS NULL.

Q: The cgpa values are 8, 6 and NULL. What does SELECT AVG(cgpa) FROM students; return?
A) 4.67
*B) 7
C) NULL
D) An error, because one value is NULL
Explanation: AVG skips NULLs, so it averages 8 and 6. It does not treat NULL as zero.

Q: You need "departments whose average CGPA is above 7.5". Where does the condition AVG(cgpa) > 7.5 belong?
A) In the WHERE clause
*B) In the HAVING clause
C) In the ORDER BY clause
D) In the SELECT list
Explanation: WHERE filters rows before grouping and cannot use aggregates. HAVING filters the groups.

Q: Why does PostgreSQL reject SELECT dept_id, full_name, COUNT(*) FROM students GROUP BY dept_id;?
A) COUNT(*) cannot be used with GROUP BY
*B) full_name is neither grouped nor aggregated, so one value per department cannot be chosen
C) dept_id must appear inside an aggregate
D) GROUP BY must come before FROM
Explanation: Every selected column must be in GROUP BY or inside an aggregate function.

Q: Which names match the pattern LIKE '_a%'? (Select all that apply.)
*A) Ravi
*B) Kavya
C) Asha
D) Sneha
Explanation: _ matches exactly one character, so the second letter must be a lower-case a. Asha starts with A, and Sneha's second letter is n.

Q: The query SELECT full_name, cgpa * 9.5 AS pct FROM students WHERE pct > 75; fails. Why?
A) Aliases must be written in double quotes
B) Arithmetic is not allowed in SELECT
*C) WHERE is evaluated before SELECT, so the alias pct does not exist yet
D) The alias must be declared in a GROUP BY clause
Explanation: Logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. Repeat the expression in WHERE, or use the alias only in ORDER BY.

Q: The two-index palindrome check compares s[left] and s[right] and moves both inwards. What is its extra space use for a string of length n?
*A) O(1)
B) O(log n)
C) O(n)
D) O(n squared)
Explanation: It only stores two integer indexes. Building a cleaned, reversed copy would use O(n) instead.

Q: In LeetCode 443 (String Compression), what is the compressed content for the characters a, a, a, b, c, c?
A) a3b1c2
*B) a3bc2
C) 3a1b2c
D) abc
Explanation: Groups of length 1 are written without a count, so b stays as just b. The function returns length 5.
