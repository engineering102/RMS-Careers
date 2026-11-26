---
type: notes
title: "W11 · S3 · Tooling: npm, Vite, ESLint, Prettier and a First Look at TypeScript"
slug: w11-s3-npm-vite-tooling
topic: npm, Vite & Linting
subject: dev-tools
minutes: 35
description: Manage packages with npm and package.json, set up a Vite project, catch bugs with ESLint, format code with Prettier, handle environment variables, and see what TypeScript types add.
---
# Tooling: npm, Vite, ESLint, Prettier and TypeScript

Real projects are not one HTML file and one script. They use packages written by others, a dev server that reloads
on save, a build step that makes files small for production, and tools that catch mistakes before you run the code.
This session sets up that toolchain. You will use the same tools in React (Week 12) and Node.js (Week 14).

## Node.js and npm

**Node.js** runs JavaScript outside the browser. It comes with **npm**, the package manager (like `pip` for Python).
Install the current **LTS** version from nodejs.org, then check:

```bash
node --version
npm --version
```

### package.json

Every JavaScript project has a `package.json` at its root, created with `npm init -y` or by a project generator:

```json
{
  "name": "api-explorer",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier . --write"
  }
}
```

When you run `npm install -D <package>`, npm adds a `devDependencies` block with the installed version of each
package; you do not type versions by hand.

| Field | Meaning |
|---|---|
| `scripts` | named commands: `npm run dev`, `npm run lint` |
| `dependencies` | packages your app needs when it runs |
| `devDependencies` | packages only needed while developing or building (Vite, ESLint, Prettier) |
| `"type": "module"` | `.js` files use ES module `import`/`export` syntax |

### Everyday npm commands

```bash
npm install                 # install everything listed in package.json
npm install date-fns        # add a runtime dependency
npm install -D eslint       # add a dev dependency (-D = --save-dev)
npm uninstall date-fns
npm run dev                 # run a script
npx prettier --version      # run a package's command without a global install
```

- Installed packages go in `node_modules/`. It can hold thousands of files: **never commit it**; put
  `node_modules` in `.gitignore`. Anyone can recreate it with `npm install`.
- `package-lock.json` records the **exact** version of every installed package. **Do commit it**, so your teammates
  and your deploy get the same versions.
- Version ranges: `^1.4.2` allows any `1.x.y` from 1.4.2 upwards (no breaking major update); `~1.4.2` allows only
  `1.4.x`.

## Vite

**Vite** is a build tool and dev server. In development it serves your files with instant reload on save; for
production, `vite build` bundles and minifies everything into a `dist/` folder of static files that any host can serve.

```bash
npm create vite@latest api-explorer -- --template vanilla
cd api-explorer
npm install
npm run dev
```

The dev server prints a local URL (by default `http://localhost:5173`). Open it, edit a file, and the page updates
immediately.

What you get: an `index.html` at the project root (Vite's entry point), a `main.js` entry module that it loads with
`<script type="module">`, a stylesheet, and a small demo you can delete. Where `main.js` sits (root or `src/`) depends
on the template version; check the `<script>` tag in `index.html`.

Things Vite gives you over plain files:

- **Imports from npm packages**: `import { format } from "date-fns";` just works.
- **CSS imports**: `import "./style.css";` inside JavaScript.
- **Environment variables** (below).
- A production build: `npm run build`, then `npm run preview` to test the built version locally.

### Converting the Week 10 app

1. Create a Vite vanilla project and delete the demo files.
2. Copy your HTML body into `index.html`, your CSS into the stylesheet, and your JavaScript into modules:
   `storage.js` (load/save), `render.js` (DOM building), `main.js` (state and event wiring).
3. Replace the old `<script defer>` tags with the single module entry.
4. `npm run dev` and test everything again, including localStorage.

### Environment variables

Vite reads `.env` files and exposes variables that start with `VITE_`:

```bash
# .env.local  (never committed)
VITE_WEATHER_API_KEY=your-key-here
```

```js
const key = import.meta.env.VITE_WEATHER_API_KEY;
```

- Commit a `.env.example` with the variable names and empty values, so teammates know what to set.
- Check that `.gitignore` covers `.env.local` (Vite's starter ignores `*.local` files).
- `VITE_` variables are **built into the JavaScript the browser downloads**. They are not secret. Never put a paid or
  private key in a front-end app; that needs a back end (Week 14).

### Deploying a Vite app

Deploy the **built** `dist/` folder, not the source.

- **Netlify or Vercel**: import the GitHub repository; build command `npm run build`, output directory `dist`.
  Every push to `main` redeploys.
- **GitHub Pages**: the site lives at `/<repo>/`, so set `base: "/<repo>/"` in `vite.config.js`, then deploy `dist`
  with a GitHub Actions workflow (Settings → Pages → Source: **GitHub Actions**). Vite's documentation has a
  "Deploying a Static Site" guide with a ready workflow.

```js
// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  base: "/api-explorer/",
});
```

## ESLint: find bugs before running

ESLint reads your code and reports likely mistakes: unused variables, undefined names, unreachable code, comparisons
that are always false.

```bash
npm install -D eslint @eslint/js globals
```

Current ESLint versions use a **flat config** file, `eslint.config.js`:

```js
// eslint.config.js
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.browser,     // document, window, fetch… are known globals
    },
    rules: {
      "no-unused-vars": "warn",
      eqeqeq: "error",              // force === and !==
    },
  },
];
```

```bash
npm run lint          # runs "eslint ." from the scripts
npx eslint . --fix    # fix what can be fixed automatically
```

Install the **ESLint** extension in VS Code to see problems underlined as you type. For WB-11, `npm run lint` must
finish with no errors.

## Prettier: stop arguing about formatting

Prettier rewrites your code in one consistent style (indentation, quotes, line length, semicolons), so a code
review never discusses spaces.

```bash
npm install -D --save-exact prettier
```

A `.prettierrc` file in the project root holds the options:

```json
{
  "semi": true,
  "singleQuote": false,
  "printWidth": 100
}
```

Add a `.prettierignore` containing `dist` and `package-lock.json`, then:

```bash
npm run format                 # "prettier . --write"
npx prettier . --check         # report unformatted files without changing them (useful in CI)
```

In VS Code, install the **Prettier** extension and enable **Format On Save**. ESLint's recommended rules look for
bugs, not formatting, so the two tools do not fight: ESLint for correctness, Prettier for layout.

For a team, agree on the config **before** the first feature branch. Otherwise every pull request contains hundreds of
lines of formatting changes and real changes are hard to review.

## A first look at TypeScript (optional extension)

TypeScript is JavaScript plus **type annotations**, checked before the code runs:

```ts
type User = {
  login: string;
  name: string | null;
  public_repos: number;
};

function summary(user: User): string {
  return `${user.name ?? user.login} has ${user.public_repos} public repos`;
}

summary({ login: "octocat", name: null, public_repos: 8 });  // OK
// summary({ login: "octocat" });  // error before running: name and public_repos are missing
```

The types disappear when compiled; the browser still runs plain JavaScript. Try it with
`npm create vite@latest ts-try -- --template vanilla-ts`. Many companies use TypeScript for front-end and Node.js
work, so it is worth exploring once JavaScript feels comfortable.

## Lab: the Week 10 app as a Vite project

- [ ] Convert your WB-10 app into a Vite project split into at least three ES modules.
- [ ] Add ESLint (flat config) and Prettier with `lint` and `format` scripts; `npm run lint` shows no errors.
- [ ] `.gitignore` covers `node_modules`, `dist` and `.env.local`; `package-lock.json` is committed.
- [ ] `npm run build` succeeds and `npm run preview` works.
- [ ] README: how to install and run (`npm install`, `npm run dev`).

## Check yourself

1. Why do you commit `package-lock.json` but not `node_modules`?
2. A teammate puts a paid API key in `VITE_API_KEY`. The `.env` file is not committed. Is the key safe? Why or why
   not?
3. What is the difference between what ESLint checks and what Prettier changes?
