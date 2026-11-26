---
type: quiz
title: "W14 · Weekly Test: Express, REST, Databases and Authentication"
slug: w14-weekly-test
topic: Week 14 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on Express middleware, REST design and status codes, validation, PostgreSQL from Node, authentication and binary search trees. 15 questions, 25 minutes.
---
Q: In an Express app, `req.body` is undefined inside `app.post('/api/notes', ...)`. The JSON middleware is registered with `app.use(express.json())` at the bottom of the file, after all routes. What is the fix?
A) Use req.params instead of req.body
*B) Register express.json() before the routes, because middleware runs in registration order
C) Send the body as a query string
D) Restart the server with node --watch
Explanation: Express runs middleware and routes in the order they are registered, so the body parser must come first.

Q: A custom middleware logs each request but never calls `next()` or sends a response. What does the client experience?
A) A 404 response
B) A 500 response
*C) The request hangs until it times out
D) Express calls the next handler automatically
Explanation: The request pipeline stops at that middleware, and no response is ever sent.

Q: Which design follows REST conventions for deleting note 7?
A) `POST /api/v1/deleteNote?id=7`
B) `GET /api/v1/notes/7/delete`
*C) `DELETE /api/v1/notes/7`
D) `DELETE /api/v1/note` with body `{ "id": 7 }`
Explanation: The URL names the resource and the HTTP method names the action.

Q: A logged-in student sends a valid request to edit another student's note. Which status code should the API return?
A) 400
B) 401
*C) 403
D) 404
Explanation: The user is authenticated but not authorised for this resource. 401 is for missing or invalid credentials.

Q: Which HTTP methods are idempotent by definition? (Select all that apply.)
*A) GET
B) POST
*C) PUT
*D) DELETE
Explanation: Repeating GET, PUT or DELETE leaves the server in the same state as doing it once. Repeating POST usually creates duplicates.

Q: What is the correct status code for a successful POST that creates a resource?
A) 200 OK
*B) 201 Created
C) 204 No Content
D) 202 Accepted
Explanation: 201 signals that a new resource was created; the response normally contains it.

Q: How does Express recognise a function as an error-handling middleware?
A) Its name ends in "Error"
B) It is registered with app.error()
*C) It takes exactly four parameters: (err, req, res, next)
D) It is the first middleware registered
Explanation: Express checks the function's arity. Error handlers are registered last with app.use.

Q: In Express 4, an `async` route handler awaits a database call that rejects, and there is no try/catch or wrapper. What happens?
A) Express 4 sends a 500 response automatically
*B) The rejection is not passed to the error handler, so the request can hang (and Node reports an unhandled rejection)
C) The route is retried once
D) The server always crashes immediately
Explanation: Express 5 forwards rejected promises to next(err); Express 4 does not, which is why an asyncHandler wrapper is used.

Q: Which query is safe from SQL injection?
A) `pool.query("SELECT * FROM users WHERE email = '" + email + "'")`
B) `pool.query('SELECT * FROM users WHERE email = ' + JSON.stringify(email))`
*C) `pool.query('SELECT * FROM users WHERE email = $1', [email])`
D) `pool.query(['SELECT * FROM users WHERE email =', email].join(' '))`
Explanation: Parameterised queries send the value separately, so the database never treats it as SQL.

Q: Inserting a user whose email already exists violates a UNIQUE constraint (PostgreSQL error code 23505). Which response is most appropriate?
A) 500 Internal Server Error
B) 404 Not Found
*C) 409 Conflict with a message such as "Email already registered"
D) 200 OK with the existing user
Explanation: The request conflicts with existing data; 409 tells the client exactly that without leaking internals.

Q: Why is bcrypt preferred over a single SHA-256 hash for storing passwords?
A) bcrypt hashes are shorter
B) bcrypt can be decrypted if a user forgets their password
*C) bcrypt is deliberately slow and salted, so leaked hashes are far harder to crack by guessing
D) SHA-256 is not a real hash function
Explanation: Fast hashes let attackers test billions of guesses per second; bcrypt's cost factor and per-user salt slow that down.

Q: Which statements about JWTs are true? (Select all that apply.)
*A) Anyone holding the token can decode and read its payload
*B) Changing the payload invalidates the signature unless the attacker knows the secret
C) The payload is encrypted, so it is a safe place for passwords
*D) A token stays valid until it expires unless the server keeps a revocation list
Explanation: JWTs are signed, not encrypted. Keep payloads non-sensitive and expiry short.

Q: Your API sets `cors({ origin: 'https://myapp.vercel.app' })`. Which statement is correct?
A) Nobody except myapp.vercel.app can call the API, including curl
*B) Browsers on other origins cannot read the API's responses, but tools like curl or Postman can still call it
C) CORS replaces the need for authentication on write routes
D) CORS encrypts the responses for that origin only
Explanation: CORS is a browser rule. Server-side authentication and authorisation still protect the data.

Q: A teammate pushed a real DATABASE_URL in .env to a public repository. What should be done FIRST?
A) Delete .env in a new commit
B) Make the repository private
*C) Rotate the database password so the leaked value stops working
D) Add .env to .gitignore
Explanation: The secret must be assumed stolen. Rotating it is the step that removes the risk; the other steps only help afterwards.

Q: For the BST with root 8, left child 3 (children 1 and 6) and right child 10 (right child 14), which traversal outputs the values in ascending order, and what is the lowest common ancestor of 1 and 6?
A) Preorder; 8
*B) Inorder; 3
C) Postorder; 3
D) Level order; 8
Explanation: Inorder of a BST is sorted. Both 1 and 6 lie under 3, where they split left and right.
