---
type: quiz
title: "W6 · Weekly Test: Joins, Subqueries, CTEs and Window Functions"
slug: w06-weekly-test
topic: Week 6 Assessment
subject: core-cs
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on join results, subqueries, set operations, CTEs, window functions and hashing problems. 15 questions, 25 minutes.
---
Q: Table a has ids 1, 2, 3. Table b has a column a_id with the values 1, 1, 2, 4. How many rows does SELECT * FROM a INNER JOIN b ON b.a_id = a.id return?
A) 2
*B) 3
C) 4
D) 12
Explanation: id 1 matches two rows of b and id 2 matches one. id 3 and a_id 4 have no partner, so 3 rows.

Q: Same tables (a: 1, 2, 3; b.a_id: 1, 1, 2, 4). How many rows does a LEFT JOIN b ON b.a_id = a.id return?
A) 3
*B) 4
C) 5
D) 6
Explanation: The 3 matched rows plus id 3 with NULLs for b. The b row with a_id 4 is dropped because b is the right table.

Q: Same tables (a: 1, 2, 3; b.a_id: 1, 1, 2, 4). How many rows does a FULL OUTER JOIN b ON b.a_id = a.id return?
A) 3
B) 4
*C) 5
D) 7
Explanation: 3 matched rows, plus id 3 with no b partner, plus a_id 4 with no a partner.

Q: Which queries list customers who have never placed an order? (Select all that apply.)
*A) SELECT c.* FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;
*B) SELECT c.* FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
C) SELECT c.* FROM customers c INNER JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;
D) SELECT c.* FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NOT NULL;
Explanation: A and B are the two standard anti-joins. An inner join never produces NULL order ids, and D lists customers who did order.

Q: products.category_id contains the values 1, 2, 3 and NULL. Category 4 has no products. What does SELECT name FROM categories WHERE category_id NOT IN (SELECT category_id FROM products); return?
A) Category 4 only
*B) No rows
C) All four categories
D) An error
Explanation: x NOT IN (..., NULL) is never true because x <> NULL is unknown. Use NOT EXISTS or filter out the NULLs.

Q: What makes a subquery correlated?
A) It returns more than one column
B) It appears in the FROM clause
*C) It refers to a column of the outer query, so its result can change for each outer row
D) It uses EXISTS
Explanation: Correlation means the inner query depends on the current outer row, such as WHERE p2.category_id = p.category_id.

Q: Query 1 returns the cities Pune, Pune, Chennai. Query 2 returns Pune, Kochi. How many rows does Query 1 UNION ALL Query 2 return, and how many does Query 1 UNION Query 2 return?
A) 5 and 5
*B) 5 and 3
C) 3 and 3
D) 4 and 3
Explanation: UNION ALL keeps every row (5). UNION removes duplicates, leaving Pune, Chennai and Kochi (3).

Q: Salaries are 100, 90, 90, 80. Which values do RANK() and DENSE_RANK() (ORDER BY salary DESC) give the salary 80?
A) 3 and 3
*B) 4 and 3
C) 4 and 4
D) 3 and 4
Explanation: RANK skips after the tie (1, 2, 2, 4). DENSE_RANK does not (1, 2, 2, 3).

Q: Monthly revenue is Jan 100, Feb 150, Mar 120. What does LAG(revenue) OVER (ORDER BY month) return for March?
A) NULL
B) 100
*C) 150
D) 120
Explanation: LAG reads the previous row in the window order, which is February.

Q: Why does SELECT name, ROW_NUMBER() OVER (ORDER BY price DESC) AS rn FROM products WHERE rn <= 3; fail?
A) ROW_NUMBER needs a PARTITION BY clause
*B) Window functions are computed after WHERE, so rn does not exist when WHERE runs
C) Aliases cannot start with r
D) ORDER BY is not allowed inside OVER
Explanation: Compute the row number in a CTE or derived table, then filter it in the outer query.

Q: Which statements about CTEs are true? (Select all that apply.)
*A) A CTE can be referenced more than once in the statement that follows it
*B) A later CTE in the same WITH clause can refer to an earlier one
C) A CTE stays available for every later query in the session
*D) A recursive CTE needs an anchor part and a recursive part joined with UNION or UNION ALL
Explanation: A CTE exists only for the single statement that follows the WITH clause.

Q: You want the second highest distinct salary even when several employees share the top salary. Which approach is correct?
A) ROW_NUMBER() OVER (ORDER BY salary DESC) and keep row 2
*B) DENSE_RANK() OVER (ORDER BY salary DESC) and keep rank 2
C) SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;
D) SELECT MAX(salary) FROM employees;
Explanation: With ties at the top, row 2 (A) or the second row (C) can still be the top salary. DENSE_RANK gives each distinct salary its own rank.

Q: In SQL, what does CASE WHEN marks >= 75 THEN 'A' WHEN marks >= 60 THEN 'B' END return for marks = 50?
A) 'B'
B) An empty string
*C) NULL
D) An error
Explanation: No WHEN matched and there is no ELSE, so the result is NULL.

Q: In the hash map solution to Two Sum, why must you look up target - x BEFORE storing x?
A) Storing first makes the solution O(n squared)
*B) Otherwise an element can be paired with itself, e.g. nums = [3, 2, 4], target = 6 would return [0, 0]
C) Dictionaries cannot store negative numbers
D) The lookup fails if the key was just inserted
Explanation: The partner must be an earlier element. Looking up first guarantees the two indexes differ.

Q: In Subarray Sum Equals K, the count map starts as {0: 1}. For nums = [3] and k = 3, what is returned if you start with an empty map instead?
*A) 0, because the subarray starting at index 0 is missed
B) 1, the map's starting value does not matter
C) 2
D) It raises a KeyError
Explanation: The prefix sum is 3 and prefix - k = 0. The entry 0: 1 represents the empty prefix before index 0. Without it the answer is wrongly 0.
