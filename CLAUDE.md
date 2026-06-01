# Motocenter

Monorepo with two apps:

- `frontend/` — Nuxt 4 + Vue 3 + Nuxt UI + Tailwind CSS v4
- `backend/` — Express + Mongoose (TypeScript), tested with Vitest

## Frontend styling

- **Use Tailwind utility classes every time it's possible.** Prefer Tailwind for
  layout, spacing, sizing, colors, and responsiveness instead of scoped
  `<style>` CSS. Only fall back to scoped CSS (or `@media`) when a utility
  genuinely can't express it — e.g. `@keyframes` animations, complex
  pseudo-elements, or dynamic/computed values.
- Use the design tokens defined in `frontend/app/assets/css/main.css`
  (`--space-*`, `--radius-*`, `--border-*`, color variables) rather than
  hard-coded `px`/`rem`/hex values.
- Responsive convention: the mobile breakpoint is `lg` (1024px). Use the
  `max-lg:` / `lg:` (and intermediate `md:` / `sm:`) prefixes, with the `!`
  important modifier when a utility needs to override scoped CSS.
