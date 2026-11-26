---
type: notes
title: "W9 · S4 · Build and Deploy Your Portfolio with GitHub Pages and Lighthouse"
slug: w09-s4-portfolio-deploy
topic: Portfolio & GitHub Pages
subject: web-development
minutes: 35
description: Plan and build a responsive personal portfolio in HTML and CSS, deploy it free on GitHub Pages, and run a Lighthouse audit to find and fix accessibility problems.
---
# Build and deploy your portfolio

Today everything from S1–S3 comes together in something real: a personal portfolio that recruiters can open from
your résumé. It is Weekly Build WB-09, and you will upgrade it in later weeks, so build it cleanly.

## Plan before you code

Spend 15 minutes on paper first.

**Content** (what a recruiter wants in under a minute):

| Section | What goes in it |
|---|---|
| Header / hero | your name (the page's only `h1`), target role, one line about what you build |
| About | 3–5 sentences: branch, year, interests, what you are learning |
| Skills | grouped lists: Languages, Web, Databases, Tools. Only skills you can answer questions on |
| Projects | a card per project: title, one-line description, tech stack, GitHub link (MP1, MP2 so far) |
| Contact | email link, LinkedIn, GitHub, and a labelled contact form (it does not need to send yet) |
| Footer | name, year |

**Wireframe** the phone layout and the laptop layout as two quick boxes-and-labels sketches. Decide which parts
change: usually the navbar (stacked → row) and the projects grid (1 → 2 → 3 columns).

## Project structure

```text
portfolio/
├── index.html
├── styles.css
├── images/
│   └── profile.jpg      (optional; compress it to under ~200 KB)
├── lighthouse.png       (added after the audit)
└── README.md
```

Keep it to one HTML file and one CSS file this week. No frameworks: the point is to prove you can do it with HTML
and CSS.

## The skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Asha Rao, B.Tech CSE student building Python, SQL and web projects.">
  <title>Asha Rao · Portfolio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <a class="logo" href="#top">Asha Rao</a>
    <nav aria-label="Main">
      <ul class="nav-links">
        <li><a href="#about">About</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main id="top">
    <section class="hero">
      <h1>Asha Rao</h1>
      <p>Aspiring full stack developer · Python, SQL, JavaScript</p>
    </section>

    <section id="about">
      <h2>About</h2>
      <p>...</p>
    </section>

    <section id="projects">
      <h2>Projects</h2>
      <div class="project-grid">
        <article class="project-card">
          <h3>Library Manager CLI</h3>
          <p>Object-oriented Python command-line app with JSON storage and tests.</p>
          <p class="stack">Python · OOP · pytest</p>
          <a href="https://github.com/<you>/library-manager">View code on GitHub</a>
        </article>
        <!-- more cards -->
      </div>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <form>
        <label for="c-name">Name</label>
        <input id="c-name" name="name" required>
        <label for="c-msg">Message</label>
        <textarea id="c-msg" name="message" rows="4" required></textarea>
        <button type="submit">Send</button>
      </form>
    </section>
  </main>

  <footer>
    <p>© 2026 Asha Rao</p>
  </footer>
</body>
</html>
```

Notice: link text says where it goes, the `nav` has an accessible name, and each section has an `h2`.

## The CSS plan

1. `box-sizing: border-box` reset and a `:root` block of variables (colours, spacing, radius).
2. Body typography and a `.container` width with `min()`.
3. Mobile base styles: everything stacked.
4. `@media (min-width: 640px)` and `(min-width: 1024px)` for the navbar row and the projects grid.
5. Hover and `:focus-visible` states for links and buttons.

Smooth scrolling for the in-page links is one line, wrapped so people who turn off animations are respected:

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

## Deploying with GitHub Pages

GitHub Pages serves static files (HTML, CSS, JS, images) straight from a repository, free.

```bash
cd portfolio
git init
git add .
git commit -m "Add portfolio v1"
git branch -M main
git remote add origin https://github.com/<you>/portfolio.git
git push -u origin main
```

Then on GitHub:

1. Open the repository → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then **Save**.
4. After a minute or two the page shows your URL: `https://<you>.github.io/portfolio/`.

Notes:

- The entry file must be called `index.html` and sit in the folder you selected.
- If you name the repository exactly `<you>.github.io`, the site is served at `https://<you>.github.io/` with no
  repository name in the path. Many students use this for their main portfolio.
- Every push to `main` redeploys automatically. Check the **Actions** tab if a change does not appear.
- **File names are case-sensitive** on GitHub Pages. `Images/Profile.JPG` and `images/profile.jpg` are different
  files; a mismatch works on Windows and breaks online.
- Use **relative paths** (`styles.css`, `images/profile.jpg`). A path starting with `/` points to the domain root,
  which is wrong for `https://<you>.github.io/portfolio/`.

## Lighthouse audit

1. Open your **live** site in Chrome, open DevTools → **Lighthouse**.
2. Choose **Mobile**, tick at least **Accessibility** (and Performance, Best practices, SEO if you like), then
   **Analyze page load**. Run it in an incognito window so extensions do not affect the result.
3. Read each failed audit; each links to an explanation.

Common accessibility failures and fixes:

| Lighthouse says | Fix |
|---|---|
| Image elements do not have `[alt]` attributes | add meaningful `alt`, or `alt=""` if decorative |
| Form elements do not have associated labels | add `label for` matching the input's `id` |
| Background and foreground colours do not have a sufficient contrast ratio | darken the text or lighten the background |
| Heading elements are not in a sequentially-descending order | do not jump from `h1` to `h4` |
| Links do not have a discernible name | an icon-only link needs text, e.g. an `aria-label` |
| `[lang]` attribute missing on `html` | `<html lang="en">` |

Fix, push, wait for the redeploy, and run it again. The WB-09 target is an **Accessibility score of 90 or more**;
commit a screenshot of the report as `lighthouse.png`.

A good score does not prove a page is accessible. Also test by hand: unplug the mouse and use **Tab**, **Shift+Tab**
and **Enter** to reach every link and form field. You should always see where the focus is.

## Lab: ship it

- [ ] Wireframes (phone and laptop) photographed or drawn and committed as `docs/wireframe.png` (optional but
      recommended).
- [ ] Semantic page with About, Skills, Projects (MP1 and MP2 cards) and Contact.
- [ ] Mobile-first CSS with variables; no horizontal scroll at 360px.
- [ ] Deployed on GitHub Pages; the live URL added to the repository's About box on GitHub.
- [ ] Lighthouse Accessibility ≥ 90; `lighthouse.png` committed.
- [ ] README with a one-line description, the live link and a screenshot.

## Check yourself

1. Your CSS loads locally but not on GitHub Pages. Name two likely causes.
2. Why should the hero name be the only `h1` on the page?
3. Lighthouse gives 100 for accessibility. What else should you still test by hand, and how?
