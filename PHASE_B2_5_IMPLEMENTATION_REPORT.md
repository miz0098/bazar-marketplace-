# BAZAR.UA — Phase B2.5 cart implementation

Date: 2026-11-02. Base: `codex/shopify-product-page-restoration-b2-4` at `949923d93171b1a59c18fd4882ae9e76e2f44c2d`. Task: `codex/shopify-cart-restoration-b2-5`; stacked PR targets that B2.4 branch. Eventual integration target remains `design-reference-storefront`. No existing PR was merged.

Reviewed root `AGENTS.md` (no nested AGENTS), Phase A audit/reference map at `2e901f8`, B1 recovery/implementation plan at `5a01190`, B2.1/B2.2/B2.4 implementation, design and validation findings and the B2.2 nested-JavaScript correction. The explicit user Shopify task supersedes the older VPS migration mission/branch instruction. Horizon **4.1.1** remains the foundation.

## Implemented behavior

A new OS2 cart section provides the approved breadcrumb/title/count, bordered horizontal item cards and right-hand summary composition. Genuine Shopify cart objects provide images, titles, selected options, visible merchant properties, selling plans, bundle components, final unit/line prices, actual line discounts and variant availability. Absent images remain absent; no invented merchandise or inventory count. Quantity rule minimum/maximum/increment semantics remain native Horizon; unavailable/missing variants and instruction-restricted quantities disable their whole quantity group. Native removal instructions are respected.

There is **one cart controller**, Horizon's `component-cart-items.js`. Existing native quantity components, declarative removal actions, Ajax `cart/change.js`, bundled section rendering, standard cart events, drawer hydration and cart-icon subscriptions are reused. Mutations address the actual line **key**, preserving properties/plans and distinguishing multiple lines of the same variant. No separate BAZAR Ajax cart, local cart persistence or client price calculator is introduced.

Quantity and removal await Shopify response HTML. Optimistic removal/empty-state replacement is removed from the shared controller, including the drawer. Page/drawer quantity mutations serialize; other cart surfaces are inert while the initiating request settles. The cart page disables checkout and keyboard/pointer interaction with items during updates. Confirmed success morphs the server section and announces success. Known inventory rejection restores the server-rendered quantity, displays Shopify's escaped/text-only message and allows correction. Network/HTTP/incomplete-section outcomes remain uncertain: no automatic POST retry, success animation or assumed removal; mutations remain locked with an explicit reload-cart action. A reload is required to reconcile an uncertain outcome. Concurrent independent app mutations, multiple browser tabs and third-party cart apps still require merchant acceptance.

Cart summary uses `items_subtotal_price`, actual cart-level discount applications and `total_price`, formatted with Shopify's `money_with_currency`. Line-level discount detail is attached to its actual item; it is not subtracted twice from the summary. “Разом у кошику” is explicitly distinguished from final checkout amount; tax inclusion follows `cart.taxes_included`, while delivery/final amount are deferred to checkout. No shipping price or payment promise is fabricated.

The **«Оформити замовлення»** button submits the genuine cart form (`routes.cart_url`, POST, `name="checkout"`). Shopify handles the actual checkout transition. No secure form replacement, accelerated-wallet imitation or checkout setting change. Without JavaScript, the standard cart update POST and genuine per-line `url_to_remove` links remain available.

**Promo handling:** Horizon already has a native discount component in its drawer/old summary. It is preserved unchanged. For this new cart page, code entry/validation is explicitly deferred to actual Shopify Checkout, with Ukrainian explanatory text. No unsupported validation or fabricated discount success. Merchant checkout discount eligibility/exposure remains an acceptance item.

Empty cart uses Ukrainian explanation and a genuine `all_products_collection_url` shopping action. No missing illustration is recreated. Existing header/footer/home/catalog/search/PDP source remains intact.

## File provenance and dependencies

All native sources below are from base `949923d`. The 71-file selective recovery matrix confirms the old BAZAR branch is not a complete cart implementation; no wholesale recovery/merge or demonstration auth/wishlist code is used.

| Theme file | Provenance and modification | Dependencies |
|---|---|---|
| `sections/bazar-main-cart.liquid` — new | Primary FINAL cart PNG anatomy plus native `main-cart`, `cart-products`, `cart-summary` contracts; new scoped OS2 composition using real cart objects. Ukrainian labels, live feedback, conditional empty state and actual checkout form. | Existing `cart-items-component`, native quantity helper/controller, money filters, delete SVG, B2.1 foundation. |
| `assets/bazar-cart.css` — new | Reference-based item/summary layout, existing shared tokens; all selectors scoped under `.bazar-cart`. No global palette/font/container override. | B2.1 tokens, native quantity styles; breakpoints 768/1024/1440. |
| `assets/component-cart-items.js` | Existing canonical native controller: remove optimistic deletion, serialize quantity mutations, submit exact line key, validate HTTP/cart/section response, await section morph, pending/uncertain guards and Ukrainian page announcements. Consume the emitted notification promise's already-handled rejection when no external listener exists. | Existing fetch/event/morph/performance utilities and Shopify section API. No global rejection handler or warning suppression. |
| `snippets/cart-products.liquid` | **One attribute only:** server-confirmed quantity on the native row, so shared error recovery works for drawer lines as well as BAZAR page lines. | Existing native row/error/quantity refs; all native rendering otherwise unchanged. |
| `snippets/quantity-selector.liquid` | Optional `bazar` parameter supplies three Ukrainian accessible labels only. All default consumer labels/behavior remain native. | Existing quantity component and variant rules. |
| `templates/cart.json` | Activate new section; preserve original native section/block/settings and old product-list data disabled, plus their original order. Retain generated-file notice. | Existing sections remain recoverable/editable; new section has valid OS2 schema. |

**Six theme files**, plus the three reports and isolated `analysis/shopify-cart-b2-5/` evidence/tools. No package/lockfile dependency, independent application, authentication, checkout, payment, delivery or production configuration modification. All 33 PNGs remain byte-identical.

## Deliberate boundaries

- No partial-item selection/partial checkout; native cart checkout includes its actual cart lines. Screenshot checkboxes are not rendered as nonfunctional controls.
- No bulk-clear: existing controller's tested mutation contract is per-line change. Native per-line removal is implemented; adding a dedicated bulk-clear confirmation/reconciliation contract is deferred.
- No screenshot delivery-from-China estimate, return policy, security/payment claims or fictional recommendation/review carousel. Old native product-list settings are retained disabled; no random merchandising fallback.
- No visual drawer redesign, discount-engine replacement or new cart ownership. Drawer confirmation timing changes through its existing controller, and its server-quantity attribute is the only markup change.
- Real Shopify compiler, editor, inventory/discount/Markets/bundle behavior, cart drawer focus and checkout navigation remain **unverified remotely**. Source/local tests are evidence of contracts, not production readiness.

See [design comparison](PHASE_B2_5_DESIGN_COMPARISON.md) and [validation](PHASE_B2_5_VALIDATION.md). Store/theme IDs are owner-provided context only; no Shopify store request, login, upload, overwrite, delete, publish or setting change occurred. Stop after the stacked PR.
