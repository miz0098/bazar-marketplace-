# BAZAR.UA — Shopify restoration audit (Phase A only)

Date: 2026-11-02. Repository: `miz0098/bazar-marketplace-`. Base: `design-reference-storefront` at `026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc`. Task branch: `codex/shopify-restoration-audit`.

## Scope and evidence standard

This is a source and visual audit, not implementation or production certification. Read `AGENTS.md` and `design-reference/storefront/README.md` before edits; no nested AGENTS files were found. The older AGENTS mission and branch restriction describe the opposite migration. The user's explicit restoration architecture and task/base branches supersede those instructions for this task. No application code, images, workflow, environment, DNS, store setting or theme was changed. Existing historical audit documents are leads, not proof of current behavior.

**Verified** means observed in the pinned repository files, executed local check, decoded PNG or linked official documentation below. **Proposed** means a future implementation recommendation. **Unknown** means evidence/access was unavailable. A branch name, passing mock test, app listing or screenshot never establishes a working production integration.

Reproducible inventory: [collector](docs/shopify-restoration/collect_evidence.py), [pinned refs, theme counts, literal-reference checks, PNG dimensions/hashes and manifest discrepancies](docs/shopify-restoration/evidence.json). It reads Git objects and PNG headers using Python's standard library. Its static checks do not execute Liquid, fully validate schema, resolve dynamic render/asset references or prove runtime completeness. All PNGs were also decoded and visually inspected, with temporary contact sheets outside Git.

## Audit summary

1. The root theme is Shopify **Horizon 4.1.1**, confirmed by `config/settings_schema.json`, layout, sections, blocks and templates. The base and `vps-migration` preserve the same 452 theme files as `main`, but contain **no `bazar-*` theme customization files**. The richer BAZAR implementation exists on a divergent branch, `bazar-latest-shopify`, with 513 theme files including 55 BAZAR assets/sections/snippets. Restoring only the base root would restore generic Horizon, not the approved storefront.
2. `bazar-latest-shopify` has useful Liquid/CSS/JS for home/header/footer/catalog/product/account/auth/favorites, but is incomplete. Its SMS fallback accepts any six-digit input and stores a browser authentication flag. It does not establish a Shopify customer session. Do not promote that code as production authentication.
3. The Next.js/API migration contains tested domain contracts and isolated test flows; production entry wiring is much narrower. Payment/shipping interfaces are explicitly isolated-test, and SMS construction rejects non-test adapters. These are design and contract assets, not ready Shopify connectors.
4. All 33 PNG files exist and were visually reviewed. There are 32 unique images; `Modals.PNG` duplicates `Icons.PNG`. The set covers principal desktop pages, but has palette/grid/header/version conflicts and incomplete mobile/account/error artwork. See [complete map](DESIGN_REFERENCE_MAP.md).
5. High-fidelity OS2/Liquid storefront restoration is feasible after reconciliation. Checkout and current customer-account screens are platform-managed surfaces: Liquid cannot freely replace them. Phone-only/no-required-email authentication is unresolved even with Plus, because Shopify's external-provider requirements include verified email.

## Current source architecture (not verified deployed architecture)

| Location | Verified role and boundary |
|---|---|
| `layout/`, `sections/`, `blocks/`, `snippets/`, `assets/`, `templates/`, `config/`, `locales/` | Horizon theme at repository root. `layout/theme.liquid` uses `content_for_header`, section groups, Shopify assets and content rendering. OS2 JSON index/collection/product/cart/search/page/blog/article templates exist. No custom checkout implementation or customer templates on base. |
| `apps/storefront/` | Next.js 16.4.2, React 19.3.1, TypeScript; routes include home/catalog/collections/products/search/cart/checkout/profile/help/info. See `app/`, `components/`, `domain/`, `services/`, `lib/`. Runtime behavior depends on real API availability; do not infer live success from rendered pages. |
| `apps/storefront/services/service-provider.server.ts`, `services/http/offers.server.ts` | Current catalog selects offer-service transport; content comes from `content-service.ts`. Old migration/mock statements in prior documents are not universal descriptions of this revision. |
| `apps/storefront/browser-integration/`, `storefront-integration/`; `apps/api/tests/browser/` | Separate isolated entry points, test gateways and simulation workers. `next.config.ts` rejects simulation/integration activation on ordinary production entry. |
| `apps/api/` | Independent Node/TypeScript HTTP API, `pg`, PostgreSQL migrations and domains for catalog/offers, cart, auth, promotions, checkout, commerce, shipping, payments, lifecycle, customers and communication. |
| `apps/api/src/main.ts` | Actual composition registers database readiness, legacy catalog, catalogV2 and offers. It does **not** wire auth/cart/checkout/payments/shipping/communications production providers; other source modules alone do not make those endpoints usable. `server.ts` guards unavailable dependencies. |
| `infra/postgres/` | Development and test Compose files; not evidence of deployed PostgreSQL, backups or disaster recovery. |
| `origin/codex/phase-f25-seller-dashboard:apps/seller-admin/` | Separate seller application on an unmerged task branch, absent from the design base. Source presence verified via Git tree only; operational readiness not audited. Preserve independently. |
| `origin/codex/phase-f26-staff-crm:apps/staff-crm/` | Separate CRM on another task branch, likewise not part of storefront restoration. Do not merge or move it into Shopify. |
| Flutter/mobile | User-specified independent client. No Flutter application was found in the audited base tree. |

No live DNS, Shopify Admin, installed-app configuration, published theme, VPS process, database or merchant account was inspected. Therefore `bazar.ua`'s actual currently deployed implementation is **unknown**. The requested hostname architecture is a target, not a claimed production observation.

## Relevant branches and lineage

All remote heads were fetched, not just the initially available `vps-migration` ref. The full head/SHA inventory is in evidence.json.

| Branch | Audited head | Relevance / verified comparison |
|---|---|---|
| `main` | `e05f33faeb3270a8d6546d8a5a1b81fe1d371ea5` | Commit message “Import Shopify Horizon theme”; root original Horizon source. Theme paths are identical to the design base. |
| `bazar-latest-shopify` | `105d10fb6b8e65c5f163016aa8c69072e85faa0e` | Principal customized Shopify recovery source; not incorporated into base. Symmetric history count base…branch = 56/80. Inspect/recover selected files later; no branch merge in Phase A. |
| `design-reference-storefront` | `026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc` | Required base; adds design directory/images to migration ancestry. Three commits ahead of fetched `vps-migration`, zero behind. |
| `vps-migration` | `141af11ccc8102ee892a5154c8cb0155eb8cf3e4` | Migration implementation and backend ancestry; root theme identical to design base and main. |
| `codex/audit-shopify-migration`, `codex/reaudit-latest-shopify`, `codex/approved-screens-audit` | See evidence | Historical architecture, source and screenshot inventories. Reuse findings only after verification; they do not settle new approved-reference conflicts. |
| `codex/phase1-storefront`, `phase-b-catalog-cart`, `phase-c-checkout`, `phase-d-phone-auth`, `phase-e1-profile`, `phase-e2-messages-support` (all `codex/`) | See evidence | Early Next.js parity/UI history, not alternative finished Shopify themes. |
| `codex/phase-f1-*` through `phase-f24-*`, `codex/phase-f22-1-financial-rounding`, `codex/contract-001-api-adrs` | See evidence for exact names | API/database/auth, catalog/cart, pricing, delivery/payment, lifecycle, customer communication and contract work. Topic names are not readiness evidence. |
| `codex/bazar-full-functional-simulation-f24`, `codex/bazar-remove-demo-flows`, `codex/autonomous-workflow` | See evidence | Test entry points, runtime boundary changes and orchestration. |
| `codex/phase-f25-seller-dashboard`, `codex/phase-f26-staff-crm` | `32d46f1`, `d3d76a8` | Independent portals on topic branches; outside implementation scope. |

## Shopify source inventory and completeness

| Theme directory | Base / main / VPS count | Customized Shopify count | Important contents |
|---|---:|---:|---|
| `assets` | 122 | 144 | Native modules/icons; customized branch adds BAZAR CSS/JS/logo/promo SVG. |
| `blocks` | 95 | 95 | Native Horizon product/cart/accelerated-checkout blocks. |
| `config` | 2 | 2 | Settings schema + store-specific settings data; settings data is not safe to overwrite blindly. |
| `layout` | 3 | 3 | Theme/password/gift-card layouts. |
| `locales` | 52 | 52 | Locale/schema resources. No `uk.json` found; BAZAR Ukrainian literals do not complete native Ukrainian translation. |
| `sections` | 43 | 58 | Custom home/category/product rails/promos/collection/product/footer/account/auth sections. |
| `snippets` | 121 | 139 | Custom desktop header/actions/menu/product-card/gallery/filter/auth/phone/OTP/account/wishlist components. |
| `templates` | 14 | 20 | 12 vs 18 JSON templates plus two Liquid templates. Custom branch adds customer auth/account JSON and `page.profile.json`. |

Important recovery candidates on **`origin/bazar-latest-shopify`**, not the current filesystem:

- Home: `sections/bazar-home-hero.liquid`, `bazar-category-blocks.liquid`, `bazar-product-rail.liquid`, `bazar-promo-banners.liquid`, `bazar-recently-viewed.liquid`, relevant `templates/index.json` and home CSS/JS.
- Shell: modified `sections/header.liquid`, `sections/header-group.json`, `sections/footer-group.json`; `sections/bazar-footer.liquid`; `snippets/bazar-header-desktop.liquid`, actions/catalog menu/logo; BAZAR header/footer/global assets; script/style loader modifications.
- Catalog/PDP: `sections/bazar-main-collection.liquid`, `bazar-main-product.liquid`, collections index/recommendations; `snippets/bazar-product-card.liquid`, gallery/catalog filters; product/catalog CSS/JS and template wiring.
- Identity/account: `assets/bazar-auth.*`, `bazar-account.*`, `snippets/bazar-auth-modal.liquid`, `bazar-phone-input.liquid`, `bazar-sms-code-input.liquid`, `bazar-account-provider-data.liquid`, `bazar-account-sidebar.liquid`, `sections/bazar-account-dashboard.liquid`, customer templates and `templates/page.profile.json`.
- Favorites/feedback: `assets/bazar-wishlist-store.js`, favorites modal and toast CSS/JS/snippets. Guest localStorage persistence is not cross-device account storage.

`docs/horizon-base.md` says no native Horizon source exists. That statement is stale: actual root files and theme metadata prove otherwise. No source pull/push is necessary for Phase A. Theme JSON templates parse and their declared sections resolve in both inventories. This does not validate all Liquid or Shopify editor schemas. After excluding `{% doc %}`/comments, the limited literal-reference scan reports no missing snippet/section targets in those four refs. This does not cover dynamic names or all multiline Liquid syntax. Shopify Theme Check remains unavailable locally and no store preview was performed; completeness/functionality remain unproven.

## Existing integrations and dependencies

| Area | Actual repository evidence | Reuse / missing work |
|---|---|---|
| Shopify theme commerce | Custom PDP uses `product.selected_or_first_available_variant`, variant prices/availability, `routes.cart_add_url` + `.js`, `/checkout`, reviews metafields. Native cart, predictive search and section-rendering assets exist. | Good Liquid/JS seams. Verify variants, currency, filters, recommendation data and all native cart behavior in a development store. No live catalog/export was obtained. |
| Account data | `bazar-account-provider-data.liquid` emits `customer`, paginated `customer.orders` (20), addresses (20); wishlist/messages/reviews/tickets/payment methods default empty. | Read-only bootstrap, not complete backend. More-than-20 pagination, tracking and mutations need work. BAZAR SMS browser flags are not Shopify `customer`. |
| Phone/SMS | Customized `assets/bazar-auth.js` has `window.BazarSmsAuth` TODO hooks and unsafe UI-only fallback; API `auth/sms.ts` defines adapter and `auth/service.ts` accepts only isolated-test construction. | Reuse markup/accessibility/OTP validation concepts, discard fake success/session authority. No live SMS transport, Shopify SSO or OIDC provider is demonstrated. |
| Profile routes | JS uses `/profile/...` and History routing; `page.profile.json` only supplies a page template. | Shopify pages normally route via `/pages/<handle>`. Liquid templates cannot register arbitrary Next.js-style nested paths. Direct load/refresh and protected access need explicit supported routing design. |
| Payment | `apps/api/src/payments/adapter.ts` scope is `isolated-test`; `lib/payment-capabilities.ts` expressly loads no merchant wallet SDK. | Good idempotency/outcome concepts; no selected live Shopify gateway or charge integration. Do not connect synthetic paid states to Shopify orders. |
| Delivery | `shipping/adapter.ts` scope is `isolated-test`; `meest-contract.ts` references published Meest request contracts, not a complete live transport. Existing types/tests also include Ukrposhta. | Reuse carrier IDs/validation, not fake quotes. Current task limits storefront to Nova Poshta + Meest; keep BAZAR pickup disabled and do not carry Ukrposhta into new UI without authorization. |
| Data/business | PostgreSQL migrations, `commerce/`, `lifecycle/`, customer/communication contracts; ADR0020–0023 and domain contracts describe seller components, rounding, events and request states. | Preserve independent API. Map Shopify IDs, money/tax/discount semantics and paid/fulfillment/refund ownership; old isolated order tables must not become a second production checkout authority. |
| Firebase | No Firebase implementation/dependency found in audited application source/package inventories. | Target is FCM push only. Never propose Firebase Auth, Firestore or Firebase hosting. FCM device tokens/consent/revocation and event worker still require a scoped implementation. |
| Shopify app/backend integration | No `shopify.app.toml`, extension manifests or production Shopify webhook/app-proxy implementation found in audited base; root package contains theme CLI commands without installed/pinned CLI dependency. | App installation, scopes, OAuth/session validation, protected customer data approval, API version, webhooks and sync are future work. Store-installed apps cannot be inferred from Git. |

## Shopify feasibility and limitations

### OS2 and visual fidelity

Liquid JSON templates, sections, blocks, CSS and JS can implement the approved shell, home, collection/catalog, PDP, cart, search and information pages with close visual fidelity. Use Shopify data primitives rather than browser-authored prices or availability. Product reviews/Q&A, wishlist, message/support/history and seller-specific data need app/API services; they are not native full features merely because there is a visual component. Search across brands/articles may need an explicit index. Final artwork and mobile behavior need the decisions in DESIGN_REFERENCE_MAP.

### Checkout: three intended stages, constrained rendering

The approved intent is (1) contact/delivery, (2) payment, (3) confirmation. Liquid theme templates do not own Shopify checkout. Standard plans offer branding/configuration and eligible app extensions; UI extensions on information/shipping/payment require **Plus**. Even Plus uses isolated extension targets and platform components, without checkout DOM or arbitrary CSS access. Checkout branding does not permit moving/rebuilding every native field or promising the full BAZAR header/footer and exact step composition. Shopify supports checkout layout choices, but neither its one-page nor its native multi-page mode should be described as the exact approved two-input-stage plus confirmation design without a proof.

Contact/delivery fields and branch selectors must map into valid checkout addresses/delivery data; supported extension targets may add provider selection but cannot replace the entire native contact form. Card input remains provider-hosted. Promo/totals remain Shopify-authoritative. Thank-you/order-status extensions are available on Basic or higher but still constrained. Confirmation must distinguish paid/pending/declined based on authoritative order/payment facts. Accelerated Apple/Google checkout can bypass intended screens, so stage-by-stage equivalence is not guaranteed. `checkout.liquid` is not a viable new restoration strategy. **Recommendation:** prove the closest supported flow on an unpublished development setup, document deviations, and obtain design approval before building the rest of checkout. Do not build a fake custom Liquid payment sequence.

Sources reviewed: [checkout UI restrictions](https://shopify.dev/docs/api/checkout-ui-extensions/latest), [plan availability](https://help.shopify.com/en/manual/checkout-settings/checkout-customization), [customization technologies](https://shopify.dev/docs/apps/build/checkout/technologies), [one-page/three-page layout](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/one-page-checkout), [checkout.liquid deprecation](https://shopify.dev/docs/storefronts/themes/architecture/layouts/checkout-liquid). No plan or app entitlement is verified for BAZAR.

### Authentication and customer accounts

Default current customer accounts use email OTP, not generic merchant phone/SMS login. Plus can connect an OIDC provider and customize its sign-in experience, with an SMS provider added to that identity stack. **Shopify's current OIDC requirements also require unique, verified email and `email_verified=true`**, while approved registration makes email optional. Plus alone does not solve phone-only identity. No fictitious email addresses or false verified-email claims are acceptable. Decision required: approved verified-email provisioning flow, or separately authenticated BAZAR customer functions with explicitly separate Shopify account/checkout identity. The latter has significant UX/security constraints and does not satisfy native Shopify SSO by itself.

Required services include a non-Firebase OIDC identity provider (managed or independently operated), SMS transport for Ukrainian numbers, challenge expiry/retry/abuse limits, phone-change/recovery policies, durable Shopify-customer linkage, logout/session handling and mobile PKCE validation. Identity account linking must prevent cross-customer order access. No provider is selected here.

Current customer accounts are hosted separately from the theme. Account extensions can add blocks and full-page features, but cannot freely restyle the entire native shell to the approved Liquid sidebar layout. Native orders/profile/addresses/returns may cover part of the function; wishlist/reviews/messages/support and per-seller timelines need app/API pages and verified identity. Saved card methods depend on account/payment support and must never be stored in BAZAR. A bespoke account experience using Customer Account API may improve visual control but requires a separately reviewed supported route/auth/backend architecture; it is not an automatic Liquid-only solution. Legacy Liquid customer templates are now deprecated per current Shopify docs; do not choose them as the default restoration strategy or silently introduce passwords.

Sources: [sign-in options](https://help.shopify.com/en/manual/customers/customer-accounts/sign-in-options), [OIDC requirements](https://help.shopify.com/en/manual/customers/customer-accounts/sign-in-options/identity-provider/requirements), [account extensions](https://shopify.dev/docs/api/customer-account-ui-extensions/latest), [account comparison/deprecation](https://help.shopify.com/en/manual/customers/customer-accounts/upgrade/compare-features). These are platform findings, not proof of a configured BAZAR identity stack.

### Payments: Apple Pay, Google Pay, bank card; no COD

Ukraine is absent from the current Shopify Payments supported-country list. For a Ukrainian merchant entity, evaluate a supported **Shopify third-party payment provider**, not a direct arbitrary API gateway bolted onto Liquid. Actual merchant country/entity, UAH settlement, marketplace business model, fees, refund/partial capture rules and installed gateway are unknown. A local PSP advertising wallets does not prove its Shopify connector exposes those wallets. No specific provider is declared compatible or selected without merchant-admin/provider confirmation.

Apple Pay requires a compatible processor/network tokenization and eligible device/browser/card; Google Pay requires a supported Shopify Payments or third-party configuration and eligible wallet. Verify whether each wallet is native accelerated checkout or available only after a gateway redirect, since those differ visually and operationally. Require provider sandbox confirmation, 3DS, failed/unknown/retry outcomes, signed callbacks, deduplication and refunds. Do not collect PAN/CVV in theme/API or mark paid from a return URL. Disable COD/manual cash methods and any unapproved alternatives at configuration time. Multi-seller settlement and commissions remain independent backend/payment/legal decisions; Shopify orders do not imply automated seller payouts.

Sources: [supported countries](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries), [Apple Pay](https://help.shopify.com/en/manual/payments/accelerated-checkouts/apple-pay), [Google Pay](https://help.shopify.com/en/manual/payments/accelerated-checkouts/google-pay), [third-party providers](https://help.shopify.com/en/manual/payments/third-party-providers).

### Delivery: Nova Poshta and Meest; BAZAR pickup disabled

Evaluate maintained Shopify carrier apps against the actual plan and approved pre-payment branch/locker experience, or implement an app/service through api.bazar.ua. Nova Poshta Shopify app listings exist, but installation, plan support and functional compatibility are unverified. No vetted Meest Shopify connector was established by this audit. Direct Meest API contract knowledge is not a Shopify checkout integration.

Both integrations need merchant/carrier accounts, server-side credentials, valid cities/branches/lockers, stable IDs persisted to order metadata, directory caching/staleness checks, recipient validation, per-seller origin/package rules, waybill creation, tracking, cancellation and retry/deduplication. Branch selection in a cart page cannot be trusted without server validation and consideration of accelerated checkout bypass. Post-purchase-only selection would depart from the approved flow. Do not turn carrier branch pickup into BAZAR local pickup.

Dynamic shipping rates through CarrierService require shipping scope and eligible plan/feature (Advanced or higher, qualifying Shopify plan entitlement, or eligible development store). Check actual admin entitlement rather than infer from plan name. A rate callback supplies rates; it does not create a branch-selector UI. In API 2026-10, carrier-service creation no longer automatically attaches it to General shipping profile/zones. Determine who pays carrier costs and how “carrier tariff” copy maps to Shopify shipping/tax totals; never imply unknown shipping is free. BAZAR pickup remains disabled. Existing Ukrposhta implementation is preserved in code but excluded from this restoration target.

Sources: [CarrierService requirements](https://shopify.dev/docs/api/admin-graphql/latest/objects/DeliveryCarrierService), [2026-10 profile change](https://shopify.dev/changelog/posts/carrier-services-will-no-longer-be-automatically-added-to-the-default-shipping-profile), [Nova Poshta listing](https://apps.shopify.com/nova-poshta-service), [Meest contract referenced by repository](https://wiki.meest-group.com/api/files/openAPI_ua.json) (repository reference only; carrier contract not certified against a live account).

## Testing and deployment infrastructure

- `.github/workflows/ci.yml` has governance, Next.js lint/types/unit/build, browser/simulation, dependency checks, API checks, PostgreSQL integration and isolated browser-checkout jobs. Automatic push/PR triggers target **vps-migration only**. This PR targeting design-reference-storefront does not automatically receive that coverage. No theme-check job or Shopify visual regression suite exists there.
- `.github/workflows/autonomous-next-task.yml` is scheduled/manual, checks out vps-migration and opens implementation proposals using the ledger. Restoration is not authorization to run it. Governance direction remains migration-oriented and needs a future explicit reconciliation; no workflow changed in Phase A.
- Root package exposes `shopify theme dev/check/pull/push`, but CLI is not pinned/installed locally. `.theme-check.yml` and `.shopifyignore` exist. Current ignore patterns do not establish a clean theme-only release boundary for apps, infra, design PNGs or root audit docs. Future release must explicitly stage/allowlist only theme directories.
- Playwright has standard, browser, storefront and simulation configurations. `tests/e2e/package.json` currently delegates `npm test` to root simulation:test. Passing such tests would not establish live Shopify checkout/provider readiness.
- `.devcontainer` installs dependencies/browser tooling and Docker capability. `infra/postgres` is local/test infrastructure. No verified Shopify publish pipeline, VPS deployment pipeline, production monitoring, backups, DNS ownership or rollback artifacts were established.

## Actual checks performed

| Check | Result and limits |
|---|---|
| Git status before work; fetch all heads; branch/SHA/tree/diff inspection | Clean starting worktree. Task branch created directly from required base. No branch merged. Theme-path diff base vs main and base vs VPS empty; customized branch differs in 71 files (1283 insertions / 18271 deletions when viewed from custom branch toward base). |
| Instructions and package/workflow/entrypoint/source review | Completed as described above; independent portal branches inspected by tree, not executed. |
| All PNGs: header, full decode, dimensions, hashes, visual contact-sheet review | 33 files, 32 unique hashes, one portrait; duplicate Icons/Modals; six exact manifest-name mismatches. No original image changed. |
| `python docs/shopify-restoration/collect_evidence.py` | Completed; JSON templates parse and referenced section files exist across four source refs. Limited literal-reference scan is not Theme Check. |
| Storefront `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | All exited 0; **99 unit tests passed**. Existing installed dependencies used. Build also ran its TypeScript check. This is Next.js baseline evidence only. |
| API `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:production` | All exited 0; **62 tests + 3 production-boundary tests passed**. Installation warned that ESLint 9.39.5 is no longer supported. No dependency or lockfile changed. |
| `node --test scripts/autonomy/*.test.mjs`; `node scripts/autonomy/validate-ledger.mjs` | 5 tests passed; ledger valid. Does not approve future migration automation. |
| `npm run theme:check` | **Blocked:** exit 127, `shopify: not found`. No successful Shopify Theme Check is claimed. |
| Live Shopify preview/editor, phone/SMS, wallets, carriers, webhooks | **Not executed:** no verified store/admin/provider setup. |
| Browser E2E/PostgreSQL integration / dependency vulnerability audit | **Not executed in Phase A.** Existing CI definitions were inspected, not reported as passing. Required later for integration changes; no test containers or services started. |
| Final documentation scope, links, map count, base ancestry and image hashes; `git diff --check` | Validated before commit; see PR for final exact diff. |

## Decisions, missing information and blockers

| Priority / ID | Status | Decision/evidence needed | Owner |
|---|---|---|---|
| P0 A1 | Technical blocker | Shopify plan, store URL/theme IDs, installed apps and development access; Plus budget/entitlement for payment-step UI and external identity. | Merchant/platform owner |
| P0 A2 | Technical/product blocker | Phone/SMS with optional email conflicts with required verified-email OIDC provisioning; approve a supported identity/account flow before promises of parity. | Product + identity owner |
| P0 A3 | Technical/design blocker | Accept documented native checkout/account rendering deviations or approve a separately scoped account architecture; full three-stage pixel parity cannot be promised. | Product/design + platform owner |
| P0 A4 | Missing merchant evidence | Legal merchant country/entity, supported Shopify gateway, actual Apple/Google wallet exposure, UAH/capture/refund and marketplace settlement support. | Finance/payment owner |
| P0 A5 | Integration blocker | Authoritative catalog/availability/order/payment/fulfillment/refund responsibilities and seller-component mappings; avoid dual-order/dual-charge system. | Backend/commerce owner |
| P1 A6 | Design decisions | Resolve C1–C10 in reference map; supply original assets and missing account/mobile/error details. Task already settles no-password, three intended stages, no COD and disabled BAZAR pickup. | Design/product owner |
| P1 A7 | Integration blocker | Nova Poshta/Meest credentials/app choice, pre-payment branch UX, rate entitlement and shipping cost/tax treatment. | Delivery/platform owner |
| P1 A8 | Missing operational evidence | Published theme/catalog/customer exports, existing checkout/account settings, URLs/SEO inventory, provider contracts and live integration state. | Merchant/operations owner |
| P1 A9 | Validation blocker | Install/pin Shopify CLI and run Theme Check plus real development-store/editor/visual tests; CI/release allowlist needs future work. | Engineering |
| P1 A10 | Policy alignment | Current V1 commerce contracts vs Shopify discounts/taxes/binary availability/commission/returns: document explicit adapters and conflicts rather than rewriting old policy or code. | Backend/product/finance |

Assumptions for the proposed plan: Shopify is intended to own storefront checkout/payment/order facts; the API remains the independent domain/integration layer; one merchant store can represent the intended catalog. These are recommendations to confirm, not verified production architecture. Merchant settlement model, customer/email migration, data volume, taxes, multilingual markets and operational cutover window remain unknown. Do not estimate a completion percentage or declare the theme production-ready from this audit.

**Stop boundary:** Phase A ends with documentation and PR. No implementation, merges, deployments, theme publication, production configuration or DNS changes are authorized by this document.
