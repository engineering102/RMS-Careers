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

---

## 5. Shared UI Primitives (student + admin)

Identical copies live in `apps/student/components/ui/` and `apps/admin/components/ui/` (same file, same API). Change both together.

| Primitive | Use instead of | Notes |
|---|---|---|
| `Label`, `Input`, `Textarea` | raw `<label>`/`<input>`/`<textarea>` with ad-hoc classes | Pair `Label htmlFor` with the control `id`; `aria-invalid="true"` turns the border destructive. Admin already had `Input` |
| `Alert` (+ `AlertTitle`, `AlertDescription`) | inline red/green `<p>` feedback | Variants `default/info/success/warning/destructive`. Role is automatic: `alert` for destructive/warning, `status` otherwise; pass `role` to override |
| `ConfirmDialog` | hand-rolled `fixed inset-0` modals, `window.confirm()`, per-page confirm state | `role="alertdialog"`, focus trap, Escape/Cancel return. Destructive variant focuses Cancel first. Cannot be dismissed while pending. Never closes itself: call `onOpenChange(false)` after the action succeeds |
| `PageHeader` | per-page title/description/action blocks | `title`, `description`, `eyebrow`, `actions`, `leading` (breadcrumb/back link), `level` |
| `StatCard` | bespoke metric tiles | `label` must say exactly what is counted; `tone` colours only the icon |
| `Skeleton` | custom pulse divs | Decorative (`aria-hidden`); mark the loading region with `aria-busy` |
| `EmptyState` | bespoke empty panels | Student: `components/ui/empty-state.tsx`; admin: `components/admin/empty-state.tsx` (same API) |

Adopting these in existing screens is done per screen in Phases 3–5, keeping every server action call and its arguments unchanged.

---

## 6. Student palette → token map (Phase 1.3 migration)

The student portal is migrated folder by folder from hardcoded Tailwind palette classes to tokens. Use this table so every slice maps the same way. Prefixes (`hover:`, `focus:`, `sm:`…) and opacity suffixes (`/60`) are kept.

| Old (dark UI) | Token | Note |
|---|---|---|
| `bg-slate-950` | `bg-background` | |
| `bg-slate-900` | `bg-card` | Slightly darker surface than slate-900 (web's dark card) |
| `bg-slate-800` | `bg-secondary` | |
| `bg-slate-700`, `hover:bg-slate-700` | `bg-accent` | `--accent` is slate-700 in dark |
| `border-slate-800` | `border-border` | Exact match |
| `border-slate-700`, `border-slate-600` | `border-input` | `--input` is slate-600 in dark |
| `text-slate-100/200`, `text-white` (on neutral) | `text-foreground` | |
| `text-slate-300` | `text-foreground/80` | |
| `text-slate-400/500/600`, `placeholder-slate-500` | `text-muted-foreground` | slate-500/600 were below AA as text; this raises them |
| `bg-blue-500/600` + `text-white` | `bg-primary text-primary-foreground` | Dark text on blue (AA); hover becomes `hover:bg-primary/90` |
| `text-blue-300/400`, `border-blue-500`, `ring-blue-*` | `text-primary`, `border-primary`, `ring-ring` | |
| emerald / amber / sky | `success` / `warning` / `info` | `-400` shades map to the token; `-950` tints map to `/10` |
| red / rose | `destructive` | Dark `--destructive` is red-500 with dark foreground text |
| tinted-panel body text (`text-*-100/200`) | `text-foreground` | The tint and border carry the meaning |

Left as-is on purpose: decorative gradients (avatar, progress bars: `from-blue-500 to-indigo-*`), categorical colours that distinguish kinds rather than status (purple/sky/cyan/orange notification icons, activity-type and content-type badges), and black modal overlays (`bg-black/70`).

Additional rules:
- Deep tints (`-900/-950`, e.g. `bg-blue-950/60`, `via-emerald-950/20`) become light token tints: `/10`, or `/5` when the original opacity was 30% or less.
- Deep borders (`-700` to `-900`) become `border-<token>/40` (`/50` for destructive, `/30` when the original opacity was 40% or less).
- Filled status buttons use the token's foreground: `bg-success text-success-foreground hover:bg-success/90`, likewise for primary and destructive.
- Sequential scales (the activity heatmap) use one token with stepped opacity so the ramp stays readable: `bg-success/15` → `/35` → `/60` → `bg-success`. The legend uses the same steps.
