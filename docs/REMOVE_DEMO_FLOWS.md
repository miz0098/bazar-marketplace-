# F24 storefront: removal of client-only demonstration flows

Base: `origin/vps-migration` at `30b7d01c1f65388710e2f7507bbf50d24c63971a`. The merged F24 simulation implementation, including commit `074577e`, was present and retained. No F25/F26 restoration, database migration, production deployment or security bypass is included.

## Removed and replaced

- Removed the client-only checkout stop screen, account overview/orders/detail/lifecycle previews, account preview provider, communication preview provider/query hook, and copy-mode helper (`lib/simulation.ts`).
- Replaced account data, addresses, payment methods, reviews, messages and support wrappers with the F24 server-backed screens. Profile routes no longer accept fabricated preview scenarios; catalog errors and empty results reflect actual API responses.
- Removed fake guest cart mutations, mock authentication fallback, OTP-inbox UI, pretend attachment uploads, disabled payment-method placeholder, fake social links, session-mode banners and their unused styles. Authentication is required before customer mutations.
- Moved legacy mock services into `apps/storefront/tests/fixtures/mock`; existing unit fixture tests remain. Production providers have no mock fallback. Home-page products and categories come from the PostgreSQL catalog; static merchandising copy is independent of mock services.
- Retained actual empty/error/loading states, Retry actions and successful-operation screens. Order confirmation, including «Дякуємо за замовлення!» and its order number, requires server-confirmed successful payment. Unknown payment outcomes remain uncertain and cannot silently become a successful submission.

## Server state and authentication

Phone-only registration/login verifies `123456` on the server, creates a Secure/HttpOnly/SameSite session, redirects to the account, survives reload and terminates the session on logout. Fixed OTP configuration requires the explicit full-simulation/browser integration flags and test environment; production rejects it. Rate limits, failed-attempt limits, expiry, CSRF/Origin checks and session validation remain enforced. Legacy security harnesses retain their random OTP behavior.

F24 PostgreSQL repositories remain responsible for cart, wishlist, customer profile, addresses, payment-method references, orders, reviews, returns, support conversations and notifications. Order items/prices/contact/shipping snapshots, unique identifiers, cart clearing, authorization, idempotency, signing and transactional writes remain server-side. No real SMS, banking operation, shipment or card credential collection is introduced.

## Launcher and Codespaces

`npm run simulation:start` starts PostgreSQL, the isolated API, Next.js and the gateway together. It installs missing application dependencies and requires Node 24 and Docker. Local access uses HTTPS port 3000. Codespaces uses its exact HTTPS forwarded origin and an HTTP bridge on port 3000; the devcontainer includes Docker-in-Docker and the port configuration. No second manually started Next.js process is needed.

The bridge validates forwarded hosts and never rewrites the request Origin. Private HTTPS uses a generated trusted certificate, including the exact Codespaces host. Server catalog reads use a bounded, read-only transport limited to known catalog routes; cookies and client credentials are not forwarded. Canonical local redirects are shared between both storefront entries; external redirects are rejected.

## Verification and test scope

The official browser entry now runs the complete server-backed stack. Earlier first-phase client-only UI specifications remain in `tests/e2e/tests` with a historical-contract README; they are not counted as executed tests. The separate 44-case legacy isolated security suite and 44-case F24 storefront regression suite remain active. New coverage exercises fixed/wrong OTP, server session persistence/logout, CSRF/Origin denial, checkout confirmation, declined/unknown payments, accessible controls and the Codespaces forwarding contract.

The Codespaces smoke runs the real launcher through a locally emulated forwarding edge, requiring actual catalog cards, canonical redirects and authenticated API state. It does not provision or claim validation inside a remote Codespace.

## Remaining boundaries

- Adapters deliberately use synthetic delivery/payment/support outcomes and collect no real card credentials.
- The launcher retains F24's disposable database lifecycle: records survive refresh/logout/login during a run; stopping the isolated stack removes its test database.
- File uploads, phone replacement, automatic privacy erasure and unsupported partial-unit financial operations remain guarded where F24 lacks a safe implementation. These are capability/security boundaries, not demonstration stop screens.
- Approved legal policy texts and real branded social destinations were not supplied; no legal promises or social identities were invented.
- Nothing is automatically merged into `vps-migration` or deployed.

## Executed checks (2026-11-01)

| Check | Result |
| --- | --- |
| API lint, typecheck, build | Passed |
| API unit / isolated entry policy | 62 passed |
| Compiled API startup smoke | 3 passed |
| PostgreSQL integration | 150 passed |
| Storefront lint, typecheck (ordinary, browser and storefront entries), build | Passed |
| Storefront unit | 99 passed |
| F24 storefront browser regressions (desktop/mobile) | 44 passed |
| Retained legacy checkout/security browser coverage | 36 checkout cases passed across regression runs |
| Retained notification browser coverage | 8 passed in the final targeted run after updating obsolete copy selectors |
| Complete marketplace journey/security (desktop/mobile) | 10 passed |
| Declined / unknown payment outcomes | 2 + 2 passed |
| Codespaces port3000 / real catalog / OTP / session / CSRF / logout smoke | Passed |
| Governance tests / task ledger / whitespace | 5 passed / valid / passed |

Earlier regressions exposed a missing catalog-path allowlist entry, duplicate authentication bootstrap in the legacy harness and obsolete notification-copy selectors. These were corrected and affected checks rerun; no security assertion or test file was deleted. Local results above are distinct from GitHub Actions status, which is shown on the PR.
