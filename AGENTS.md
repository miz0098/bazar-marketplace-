# BAZAR Dev Agent

## Mission
Migrate the existing Shopify Horizon storefront to a standalone Next.js/TypeScript frontend while preserving approved BAZAR UI and UX.

## Rules
- Work only on `vps-migration` or task branches based on it; never write directly to `main`.
- Audit the repository before changing implementation and document the migration plan.
- Preserve Shopify source until the replacement is verified. Prefer a separate `apps/storefront` during migration.
- Preserve Ukrainian UI, existing catalog, product cards, header, profile, orders, wishlist, authentication modal, messages, and responsive behavior.
- Use typed services and isolated mock data for the first frontend phase. Do not pretend mock behavior is live.
- Run available lint, type checks, tests and build; report actual results.
- Do not deploy, modify DNS, delete working code, commit secrets, or merge into `main` without explicit approval.
- Make small reviewable commits and PRs.

## First task
Audit the current repository. Create `MIGRATION_PLAN.md` and `ARCHITECTURE.md` describing the actual Shopify dependencies, component migration order, local development and verification steps. Do not perform a bulk rewrite before review.
