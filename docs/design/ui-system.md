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
