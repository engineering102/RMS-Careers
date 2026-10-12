# Design System & UI Specifications

This document defines the design tokens, visual hierarchy, typography, and component styling conventions for RMS Careers.

---

## 1. Visual Identity & Atmosphere

The RMS Careers design system evokes a **high-trust, technical, and engineering-first atmosphere** inspired by premier developer tools and technical academies (e.g. Next.js, Vercel, Supabase).

### Core Aesthetic Tokens
- **Backgrounds**: Deep navy and near-black dark mode (`#030712` / `hsl(222, 47%, 4%)`), crisp white / soft slate in light mode.
- **Accents**: Modern royal blue (`hsl(217, 91%, 60%)`), indigo, and subtle cyan highlights.
- **Surfaces**: Layered card containers with subtle borders (`border-border`), backdrop blur (`backdrop-blur-sm`), and radial ambient glows (`bg-primary/10`).
- **Textures**: Subtle code/grid background (`bg-grid-pattern`) and monospace code viewports with syntax highlighting.

---

## 2. Typography

- **Headings**: Inter / System sans-serif with tight letter-spacing (`tracking-tight`) and bold weights (`font-extrabold` / `font-bold`).
- **Body**: Clean readable body copy (`text-muted-foreground`, `leading-relaxed`).
- **Code & Metadata**: JetBrains Mono / System Monospace for tags, invariants, time complexity, and code blocks (`font-mono text-xs`).

---

## 3. UI Component Patterns

### Asymmetric Cards
Cards vary in column spans (e.g. 7-col + 5-col, or 4-col multi-tiers) to create visual rhythm rather than monotonous grids of identical boxes.

### Glow Cards (`.glow-card`)
Interactive cards feature subtle border and shadow shifts on hover:
```css
.glow-card {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.glow-card:hover {
  border-color: hsl(var(--primary) / 0.4);
  box-shadow: 0 10px 30px -10px hsl(var(--primary) / 0.15);
}
```

### Micro-Animations & Accessibility
- Hover transitions and dropdown fades use subtle, performant CSS transforms.
- All animations respect `prefers-reduced-motion: reduce`.
- Focus states are explicitly styled with visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).

---

## 4. Design Tokens (shared contract)

All three apps define the same CSS variables in `app/globals.css` and map them in `tailwind.config.ts`. Keep the values identical across `apps/web`, `apps/student` and `apps/admin`.

| Token | Use |
|---|---|
| `background` / `foreground` | Page canvas and body text |
| `card`, `popover` (+ `-foreground`) | Surfaces, menus, tooltips |
| `primary` (+ `-foreground`) | Brand blue: primary actions, links, active state |
| `secondary`, `muted`, `accent` (+ `-foreground`) | Neutral surfaces, secondary text, hover fills |
| `destructive` (+ `-foreground`) | Errors and destructive actions |
| `success`, `warning`, `info` (+ `-foreground`) | Status (badges, alerts, toasts). Light values meet AA as text |
| `border`, `input`, `ring` | Lines, field borders, focus rings |
| `radius` | `0.75rem` on web; `0.5rem` on student/admin until radius is unified with visual QA |

Themes:
- **Web**: light by default; `.dark` via the header toggle (`rms-theme` in localStorage).
- **Student**: dark-only (`class="dark"` on `<html>` in `apps/student/app/layout.tsx`).
- **Admin**: light-only.

Fonts: Inter (`font-sans`) and JetBrains Mono (`font-mono`) are loaded with `next/font/google` in each app's `app/fonts.ts`. They are self-hosted at build time, so CSP `font-src 'self'` is enough. Web unit tests that import `app/layout.tsx` use the stub in `apps/web/lib/__tests__/stubs/next-font-google.ts` (aliased in `vitest.config.ts`).

Prefer tokens (`bg-card`, `text-muted-foreground`, `text-success`) over raw palette classes (`bg-slate-900`, `text-emerald-400`) in new and touched code.
