---
type: notes
title: "W9 · S2 · CSS Fundamentals: Cascade, Box Model, Units and Variables"
slug: w09-s2-css-fundamentals
topic: CSS Fundamentals
subject: web-development
minutes: 35
description: How CSS picks a winning rule (selectors, specificity, cascade), the box model, units such as px, rem, % and vh, colour and typography, and CSS custom properties for a consistent theme.
---
# CSS fundamentals

CSS decides how HTML looks. Most "CSS is random" frustration comes from not knowing two rules: **which rule wins**
when several apply, and **how big a box really is**. Learn those and CSS becomes predictable.

## Linking a stylesheet

```html
<link rel="stylesheet" href="styles.css">
```

A rule is a **selector** plus **declarations**:

```css
.card {
  padding: 1rem;
  border-radius: 8px;
}
```

Avoid inline `style="..."` attributes: they are hard to override and impossible to reuse.

## Selectors

| Selector | Matches | Example |
|---|---|---|
| element | every element of that type | `p` |
| class | elements with `class="card"` | `.card` |
| id | the one element with `id="hero"` | `#hero` |
| descendant | `a` anywhere inside `nav` | `nav a` |
| child | `li` directly inside `ul` | `ul > li` |
| group | either selector | `h1, h2` |
| attribute | inputs of type email | `input[type="email"]` |
| pseudo-class | a state | `a:hover`, `input:focus`, `li:nth-child(odd)` |
| pseudo-element | part of an element | `p::first-line`, `.req::after` |

Style mostly with **classes**. They are reusable and keep specificity low.

## The cascade: which rule wins?

When two rules set the same property on the same element, the browser decides in this order:

1. **Importance**: a declaration marked `!important` beats normal ones. Avoid it; it starts an arms race.
2. **Specificity**: the more specific selector wins.
3. **Source order**: if specificity is equal, the rule that comes **later** wins.

### Specificity

Count three numbers `(ids, classes, elements)` and compare left to right:

| Selector | (id, class, element) |
|---|---|
| `p` | (0, 0, 1) |
| `.card` | (0, 1, 0) |
| `.card p` | (0, 1, 1) |
| `nav .link:hover` | (0, 2, 1) |
| `#hero` | (1, 0, 0) |
| `#hero .title` | (1, 1, 0) |

Classes, attribute selectors and pseudo-classes count in the middle column; elements and pseudo-elements in the
last. One id beats any number of classes. Inline styles beat all of these.

```css
#intro p { color: navy; }   /* (1,0,1) */
.lead    { color: teal; }   /* (0,1,0) */
```

A `<p class="lead">` inside `#intro` is **navy**: the id wins even though `.lead` comes later.

### Inheritance

Some properties (mostly text ones: `color`, `font-family`, `font-size`, `line-height`) are **inherited** by child
elements. Box properties (`margin`, `padding`, `border`, `width`) are not. That is why you set the font once on
`body`.

## The box model

Every element is a box with four layers, from inside out:

```text
+----------------- margin -----------------+
|  +-------------- border --------------+  |
|  |  +----------- padding ----------+  |  |
|  |  |          content             |  |  |
|  |  +------------------------------+  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

By default, `width` sets only the **content** width, so padding and border are added on top:

```css
.box { width: 300px; padding: 20px; border: 2px solid; }
/* default (content-box): rendered width = 300 + 20*2 + 2*2 = 344px */
```

Almost every project switches to `border-box`, where `width` includes padding and border:

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

Now the same `.box` is exactly 300px wide.

Two more facts:

- **Block** elements (`div`, `p`, `section`, `h1`) start on a new line and fill the available width. **Inline**
  elements (`span`, `a`, `strong`) flow inside text and ignore `width` and `height`. `inline-block` flows like text
  but accepts a width and height.
- **Vertical margins collapse**: two stacked paragraphs with `margin: 20px` are 20px apart, not 40px.

## Units

| Unit | Relative to | Good for |
|---|---|---|
| `px` | nothing (a fixed CSS pixel) | borders, small fixed details |
| `rem` | the root (`html`) font size, usually 16px | font sizes, spacing |
| `em` | the current element's font size | padding that scales with a button's text |
| `%` | the parent's size | widths inside a container |
| `vh` / `vw` | 1% of viewport height / width | full-screen sections |
| `ch` | width of the "0" character | limiting line length |

Prefer `rem` for text: if a user increases their browser's default font size, your whole layout scales with it.
`max-width: 65ch` on paragraphs keeps lines comfortable to read.

## Colour and typography

```css
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1f2937;
  background: #ffffff;
}

h1 { font-size: 2.25rem; line-height: 1.2; font-weight: 700; }
```

- Colours can be written as names (`teal`), hex (`#0f766e`), `rgb(15 118 110)` or `hsl(175 77% 26%)`. HSL is the
  easiest to adjust by hand: change lightness to get a darker or lighter shade.
- Keep enough **contrast** between text and background. Lighthouse flags low contrast as an accessibility problem;
  light grey text on white is the most common failure.
- Use a font stack ending in a generic family (`sans-serif`) so text still renders if a font is missing.

## CSS variables (custom properties)

Define values once and reuse them everywhere:

```css
:root {
  --color-primary: #0f766e;
  --color-text: #1f2937;
  --color-surface: #f8fafc;
  --radius: 8px;
  --space-2: 0.5rem;
  --space-4: 1rem;
}

.button {
  background: var(--color-primary);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius);
}
```

Variables are inherited and can be changed at runtime, which makes themes simple:

```css
[data-theme="dark"] {
  --color-text: #e5e7eb;
  --color-surface: #111827;
}
```

Switching `data-theme` on `<html>` (with one line of JavaScript in Week 10) recolours the whole site.

## Styling forms well

```css
label { display: block; font-weight: 600; margin-top: var(--space-4); }

input, select, textarea {
  width: 100%;
  font: inherit;
  padding: var(--space-2);
  border: 1px solid #cbd5e1;
  border-radius: var(--radius);
}

input:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

input:user-invalid { border-color: #b91c1c; }
```

- `font: inherit` stops form controls from using the browser's small default font.
- **Never remove the focus outline** without replacing it. Keyboard users need to see where they are.
- `:user-invalid` matches a field that fails validation only after the user has interacted with it, so the form
  does not start covered in red. It is supported in current major browsers; `:invalid` is the older, stricter version.

## Lab: style the form and reproduce a card

1. Link a `styles.css` to your S1 registration form. Add the `border-box` reset, a `:root` block of variables, body
   typography, and form styles with a visible focus state.
2. Reproduce this card design with HTML and CSS only:

```text
+------------------------------------+
|  [ CSE ]                  4th year |   small pill badge, muted text
|  Asha Rao                          |   name: 1.25rem, bold
|  Builds Python CLIs and SQL        |   body text, muted colour
|  dashboards.                       |
|  ------------------------------    |   1px divider
|  [ View GitHub ]   [ Message ]     |   primary + outline buttons
+------------------------------------+
   padding 1.5rem, radius 12px, subtle shadow, max-width 360px
```

- [ ] All colours, radius and spacing come from CSS variables.
- [ ] The buttons have hover and `:focus-visible` styles.
- [ ] In DevTools → Elements → Computed, confirm the card's width includes its padding.

## Check yourself

1. `.nav a` and `#menu a` both set `color` on the same link. Which wins, and why?
2. A box has `width: 200px; padding: 10px; border: 1px solid` and the default `box-sizing`. How wide does it render?
3. Why use `rem` instead of `px` for font sizes?
