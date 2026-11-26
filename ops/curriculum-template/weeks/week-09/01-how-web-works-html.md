---
type: notes
title: "W9 · S1 · How the Web Works and Semantic HTML5"
slug: w09-s1-how-web-works-html
topic: HTTP & HTML5
subject: web-development
minutes: 35
description: What happens between typing a URL and seeing a page (DNS, HTTP/HTTPS, methods, status codes), using browser DevTools, and writing semantic, accessible HTML5 with forms and tables.
---
# How the web works and semantic HTML5

Phase 3 starts here. For the next seven weeks you will build for the browser, then for the server, and finish with a
deployed full stack app. Everything rests on two ideas from today: **how a request travels**, and **how a page is
structured**.

## From URL to page: the request–response cycle

Take the URL `https://www.example.com/products?page=2`.

| Part | Value | Meaning |
|---|---|---|
| Scheme | `https` | the protocol (HTTP over an encrypted TLS connection) |
| Host | `www.example.com` | the server's domain name |
| Path | `/products` | which resource on that server |
| Query string | `?page=2` | extra parameters, as `key=value` pairs |

When you press Enter:

1. **DNS lookup.** Computers connect using IP addresses, not names. The browser asks a DNS resolver "what is the IP of
   `www.example.com`?". The resolver checks its cache; if needed it asks the root servers, then the `.com` servers,
   then the domain's own (authoritative) name server. Answers are cached for a while, so repeat visits are faster.
2. **Connection.** The browser opens a TCP connection to that IP: port **443** for HTTPS (port 80 for plain HTTP). For
   HTTPS, a **TLS handshake** follows: the server proves its identity with a certificate and both sides agree on
   encryption keys.
3. **HTTP request.** The browser sends a request: a method, a path, headers and sometimes a body.
4. **HTTP response.** The server replies with a status code, headers and a body (HTML, JSON, an image…).
5. **Rendering.** The browser parses the HTML, sees links to CSS, JavaScript and images, and sends **more requests**
   for each one. A single page often needs dozens of requests.

A request and response look like this (simplified):

```http
GET /products?page=2 HTTP/1.1
Host: www.example.com
Accept: text/html

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!doctype html>...
```

HTTP is **stateless**: each request stands alone. Logins "stick" because the browser sends a cookie or token with
every request.

## HTTP methods

| Method | Typical use | Has a body? |
|---|---|---|
| `GET` | read a resource | no |
| `POST` | create a resource, submit a form | yes |
| `PUT` | replace a resource | yes |
| `PATCH` | change part of a resource | yes |
| `DELETE` | remove a resource | usually no |

`GET` requests should never change data: browsers, caches and crawlers repeat them freely.

## Status codes

The first digit tells you the family.

| Code | Meaning | When you see it |
|---|---|---|
| 200 OK | success | a normal page load |
| 201 Created | a new resource was created | after a successful `POST` |
| 204 No Content | success, empty body | after a `DELETE` |
| 301 / 302 | moved permanently / temporarily | `http://` redirecting to `https://` |
| 304 Not Modified | use your cached copy | repeat visits |
| 400 Bad Request | the request is malformed | invalid JSON or missing fields |
| 401 Unauthorized | not logged in | missing or expired token |
| 403 Forbidden | logged in, but not allowed | a student opening an admin page |
| 404 Not Found | no such resource | a typo in the URL |
| 500 Internal Server Error | the server crashed | a bug in server code |
| 503 Service Unavailable | server overloaded or down | maintenance |

Remember: **4xx = the client did something wrong, 5xx = the server failed.**

## Browser DevTools

Open with **F12** (or Ctrl+Shift+I; Cmd+Option+I on macOS). The panels you will use most:

- **Elements**: the live HTML and the CSS applied to each element. You can edit both to experiment.
- **Console**: JavaScript errors and `console.log` output.
- **Network**: every request the page makes, with method, status, size and time. Tick **Disable cache** while
  developing, and reload to fill the list.
- **Lighthouse**: audits performance, accessibility and best practices (used in S4).

Try it: open any site, open the Network panel, reload, and click the first request. Find its status code, the
`Content-Type` response header, and how long it took.

## HTML5: structure with meaning

HTML describes **what content is**, not how it looks. A minimal valid page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Asha Rao · Portfolio</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>Asha Rao</h1>
  </body>
</html>
```

- `lang="en"` tells screen readers which language to pronounce.
- The **viewport** meta tag makes phones render at device width; without it, responsive CSS will not work.

### Semantic elements

Use elements that say what a region is, instead of a `<div>` for everything:

| Element | Use for |
|---|---|
| `<header>` | intro content or site banner |
| `<nav>` | the main navigation links |
| `<main>` | the page's main content (one per page) |
| `<section>` | a themed group of content, usually with a heading |
| `<article>` | self-contained content (a blog post, a project card) |
| `<aside>` | related side content |
| `<footer>` | closing content: contact, copyright |

Semantic markup helps screen readers jump between regions, helps search engines, and makes your own CSS easier to
read.

### Headings

Use **one `<h1>`** per page, then `<h2>` for sections and `<h3>` inside them. Never skip levels to get a smaller font;
size is CSS's job.

## Forms

```html
<form action="/register" method="post">
  <label for="name">Full name</label>
  <input id="name" name="name" type="text" required autocomplete="name">

  <label for="email">College email</label>
  <input id="email" name="email" type="email" required>

  <label for="branch">Branch</label>
  <select id="branch" name="branch">
    <option value="cse">CSE</option>
    <option value="ece">ECE</option>
    <option value="mech">Mechanical</option>
  </select>

  <fieldset>
    <legend>Year</legend>
    <label><input type="radio" name="year" value="3"> 3rd year</label>
    <label><input type="radio" name="year" value="4"> 4th year</label>
  </fieldset>

  <button type="submit">Register</button>
</form>
```

- Every input needs a **label**. `for` on the label must match `id` on the input; clicking the label then focuses
  the input.
- The `name` attribute is the key the server receives.
- Input types such as `email`, `tel`, `number` and `date` give mobile keyboards and built-in validation for free.
- `required`, `minlength`, `maxlength`, `min`, `max` and `pattern` add browser-side validation. The server must still
  validate: browser checks are easy to bypass.
- Group radio buttons in a `<fieldset>` with a `<legend>`.

## Tables

Tables are for **tabular data**, never for page layout.

```html
<table>
  <caption>Semester results</caption>
  <thead>
    <tr><th scope="col">Subject</th><th scope="col">Marks</th></tr>
  </thead>
  <tbody>
    <tr><td>Data Structures</td><td>86</td></tr>
    <tr><td>DBMS</td><td>78</td></tr>
  </tbody>
</table>
```

## Accessibility basics

- **Alt text**: every `<img>` needs `alt`. Describe what matters (`alt="Screenshot of the to-do app"`). For purely
  decorative images use `alt=""` so screen readers skip them.
- **Labels** on every form control.
- **Heading order** that makes sense when read as an outline.
- **Links** that say where they go ("View the project on GitHub", not "click here").
- **Buttons for actions, links for navigation.** A `<div>` with a click handler cannot be reached with the keyboard.

## Lab: semantic registration form

Build `register.html` for a "Campus Coding Club" sign-up:

- [ ] Page uses `header`, `main` and `footer`, with one `h1`.
- [ ] Fields: full name, college email, phone (`type="tel"`), branch (`select`), year (radio group in a `fieldset`),
      interests (checkboxes), and a "Why do you want to join?" `textarea`.
- [ ] Every field has a visible, connected label; required fields use `required`.
- [ ] A small table below the form lists club meeting days and times, with a `caption` and `th` headers.
- [ ] Open DevTools → Elements and check that clicking each label focuses its field.

Keep the file: you will style it in S2.

## Check yourself

1. List the steps between typing `https://www.example.com` and seeing the page.
2. A logged-in student opens an admin-only page. Should the server return 401 or 403? Why?
3. Why is `<div onclick="...">Submit</div>` worse than `<button type="submit">Submit</button>`?
