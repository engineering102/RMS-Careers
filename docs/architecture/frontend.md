# Frontend Architecture & Conventions

This document outlines the frontend engineering patterns across all web applications in the RMS Careers monorepo.

---

## 1. Component Organization & Server/Client Boundaries

RMS Careers uses **Next.js 15 App Router** with **React 19**:

- **Server Components by Default**: All layout and page components (`layout.tsx`, `page.tsx`) are Server Components unless client-side state, event handlers, or browser APIs are required.
- **Client Component Leaf Pattern**: Client components are pushed to the leaves of the render tree (e.g. interactive filters, dialog modals, forms, and theme toggles).
- **Client Component Directives**: Every client file begins with `'use client';` as the very first line.

```text
apps/web/
├── app/                  # File-system routing, Server Component pages, layouts, metadata
└── components/
    ├── header.tsx        # Responsive client navbar with theme toggle and portal dropdown
    ├── footer.tsx        # Multi-column semantic footer
    └── homepage/         # Data-driven homepage sections (Hero, Pillars, Journey, etc.)
```

---

## 2. Layout & Presentation vs Data Separation

To allow rapid product iteration without triggering breaking layout shifts:
- Marketing copy, headlines, features, roadmaps, and FAQ items are strictly defined in structured data files:
  - `apps/web/lib/data/homepage-content.ts`
  - `apps/web/lib/data/dsa-sheets.ts`
- Components import these data definitions instead of embedding static marketing copy directly into JSX.

---

## 3. Styling & Visual System

- **Tailwind CSS + CSS Variables**: Themes are powered by CSS custom properties in `globals.css` (`--background`, `--foreground`, `--primary`, `--border`, `--card`, etc.).
- **Dark/Light Mode**:
  - Initialized inline in `layout.tsx` via an early `<head>` script to eliminate flash-of-unstyled-content (FOUC).
  - Toggled dynamically by updating the `dark` class on `document.documentElement` and persisted to `localStorage('rms-theme')`.
- **Aesthetic Principles**: Deep navy / charcoal technical surfaces, restrained cyan/blue accents, subtle grid backgrounds (`bg-grid-pattern`), code snippet motifs, and asymmetric cards with glowing hover states (`glow-card`).

---

## 4. State Management & Data Fetching

- **Server-Side Data Fetching**: Async React Server Components fetch data directly from `@rms/db` using typed query functions in `lib/db/queries/*.ts`.
- **Local Browser State (Guest Practice)**: Guest DSA sheet progress is managed through `apps/web/lib/client/anonymous-progress.ts`. All state updates occur in `window.localStorage` under the key `rms_dsa_progress_v1`.
- **Form State**: Interactive forms (e.g. `partnership-section.tsx`, `enrollments-filter.tsx`) manage local state using standard React `useState` hooks with clean validation before submission.
- **Server Actions**: Administrative mutations in `apps/admin` (e.g. enrollment status changes, CSV imports) use Next.js Server Actions (`'use server'`).
