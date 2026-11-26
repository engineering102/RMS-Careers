---
type: quiz
title: "W9 · Weekly Test: HTTP, HTML5, CSS Layout and Binary Search"
slug: w09-weekly-test
topic: Week 9 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on how the web works, semantic HTML, CSS (cascade, box model, Flexbox, Grid, media queries) and binary search. 15 questions, 25 minutes.
---
Q: What is the job of DNS when you open https://www.example.com?
A) It encrypts the connection between the browser and the server
*B) It translates the domain name into the server's IP address
C) It renders the HTML into pixels
D) It stores the website's files
Explanation: DNS resolves names to IP addresses. TLS handles encryption; the browser renders.

Q: A logged-in student requests an admin-only page and is refused. Which status code fits best?
A) 401 Unauthorized
*B) 403 Forbidden
C) 404 Not Found
D) 500 Internal Server Error
Explanation: 401 means not authenticated. The student is authenticated but not allowed, which is 403.

Q: Which statements about HTTP are true? (Select all that apply.)
*A) A GET request should not change data on the server
*B) Status codes starting with 5 mean the server failed
C) HTTPS normally uses port 80
*D) HTTP is stateless, so each request carries what the server needs, such as a cookie
Explanation: HTTPS uses port 443 by default; plain HTTP uses 80.

Q: Which markup correctly connects a label to its input?
A) `<label name="email">Email</label><input id="email">`
*B) `<label for="email">Email</label><input id="email" name="email">`
C) `<label id="email">Email</label><input for="email">`
D) `<label>Email</label><input label="email">`
Explanation: The label's for attribute must match the input's id.

Q: Which practices improve accessibility? (Select all that apply.)
*A) Giving a decorative image alt=""
*B) Using a button element for actions instead of a clickable div
C) Using h4 instead of h2 because it looks smaller
*D) Writing link text such as "View the project on GitHub" instead of "click here"
Explanation: Heading levels describe structure, not size; change the size with CSS.

Q: Both rules apply to the same paragraph: `#intro p { color: navy; }` and, later in the file, `.lead { color: teal; }`. The paragraph has class="lead" and is inside #intro. What colour is it?
*A) Navy
B) Teal
C) Black, because the rules cancel out
D) Whichever rule the browser loads first
Explanation: #intro p has specificity (1,0,1), higher than .lead (0,1,0), so source order does not matter.

Q: A box has width: 200px; padding: 10px; border: 2px solid; and the default box-sizing (content-box). How wide does it render?
A) 200px
B) 220px
*C) 224px
D) 212px
Explanation: 200 + 10 + 10 + 2 + 2 = 224px. With box-sizing: border-box it would be exactly 200px.

Q: The root font size is 16px. What is 1.5rem?
A) 15px
*B) 24px
C) 1.5% of the screen width
D) It depends on the parent element's font size
Explanation: rem is relative to the root (html) font size: 1.5 × 16 = 24px. em depends on the element's own font size.

Q: A flex container has flex-direction: column. Which property centres the items horizontally?
A) justify-content: center
*B) align-items: center
C) text-align: center
D) vertical-align: middle
Explanation: In a column, the main axis is vertical, so the cross axis (align-items) is horizontal.

Q: What does `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))` do?
A) Always creates 220 columns
B) Creates exactly one column that is 220px wide
*C) Fits as many columns of at least 220px as the width allows, sharing extra space equally
D) Creates columns only after a media query matches
Explanation: auto-fill adds columns while each can be at least 220px; 1fr lets them stretch to fill the row.

Q: In a mobile-first stylesheet, which media query adds a three-column layout for laptops?
*A) @media (min-width: 1024px) { ... }
B) @media (max-width: 1024px) { ... }
C) @media (max-width: 360px) { ... }
D) @media screen and (orientation: portrait) { ... }
Explanation: Mobile first writes phone styles as the base and enhances upwards with min-width queries.

Q: Your portfolio works locally but the stylesheet does not load on GitHub Pages. Which are likely causes? (Select all that apply.)
*A) The file is styles.css but the HTML links Styles.css
*B) The HTML links /styles.css, which points to the domain root instead of the repository folder
C) The page has more than one section element
D) The CSS uses CSS variables
Explanation: GitHub Pages is case-sensitive, and a leading slash breaks paths for a site served at `https://<you>.github.io/<repo>/`.

Q: Binary search on a sorted array of 1,000,000 elements needs at most about how many comparisons?
A) 1,000
B) 500,000
*C) 20
D) 1,000,000
Explanation: Each step halves the range, and 2 to the power 20 is just over a million, so about 20 steps.

Q: Using `lo, hi = 0, len(nums)` and `while lo < hi: mid = (lo + hi) // 2; if nums[mid] >= target: hi = mid; else: lo = mid + 1`, what is returned (lo) for nums = [1, 3, 5, 6] and target = 2?
A) 0
*B) 1
C) 2
D) -1
Explanation: The first index with nums[i] >= 2 is 1 (value 3), which is also where 2 would be inserted.

Q: In Koko Eating Bananas (piles = [3, 6, 7, 11], h = 8), why can we binary search the speed k?
A) Because the piles array is sorted
*B) Because if a speed k finishes in time, every faster speed also finishes, so the yes/no answers are ordered
C) Because the answer is always the middle pile
D) Because h is even
Explanation: Feasibility is monotonic over k, so we search [1, max(piles)] for the first speed that works (here 4).
