# BAZAR.UA — Phase B2.5 design comparison

Primary: `design-reference/storefront/Cart Page Desktop v1.1 (FINAL).PNG` (reference-map **10**). Supporting originals reviewed: Cards (**09**), Buttons (**08**), Inputs (**20**), Empty States (**14**), Responsive Rules (**27**), BAZAR UI Kit v1.0 (**07**), Shopify Components (**29**). All 33 originals are preserved byte-for-byte, including names/case. The cart FINAL screenshot is the page composition source; supporting boards do not override conflicts automatically.

## Coverage and differences

| Reference element | Implementation / verified evidence | Remaining difference |
|---|---|---|
| Breadcrumb, “Кошик”, item count | Real home/cart breadcrumb and `cart.item_count`; actual Liquid fixture rendering tested. | Count uses neutral “од.”, counting Shopify quantities rather than screenshot's fixed three products. |
| Horizontal bordered item cards, image left | Actual cart images/links, 8px border radius, title/options, quantity and price/remove controls. Local desktop/mobile screenshots captured and inspected. | Reference product images/text are illustrative, never imported as products. Actual content changes wrapping/height. |
| Unit/current/old price and discounts | Genuine `final_price`, `original_price` only when reduced, line allocation titles/amounts and `final_line_price`, with store currency. | No invented percentage/saving badges; final line totals and explicit unit prices replace screenshot assumptions about quantity=1. |
| Quantity minus/input/plus | Native Horizon cart selector, real rules and confirmed responses; visible focus and 44px button targets. | Extra accessible labels/fieldset and explicit errors/pending state are necessary behaviors absent from the static FINAL image. |
| Availability / delivery line | Actual selected variant availability, with unavailable quantity group disabled. | “Доступний до замовлення” means variant purchasability, not an invented stock count. No China shipping lead time or carrier tariff claim. |
| Selection checkboxes / clear cart | Actual all-line Shopify cart and individual confirmed removal. | Partial-checkout selection and bulk clear deferred; no misleading inactive checkboxes or unsafe multi-request clearing. |
| Right-hand order summary | Bordered summary, genuine items subtotal, cart-level allocations, final cart price and full-width CTA. Local source/DOM contracts tested. | “Разом у кошику” and checkout-dependent shipping/tax notice avoid claiming final payable amount. No synthetic delivery line or unverified security panel. |
| Promo input | Honest checkout-entry notice and actual checkout transition. Existing Horizon drawer discount flow unchanged. | No inline promo field on this page; merchant discount acceptance and checkout field remain remotely untested. |
| CTA | Required **«Оформити замовлення»**, actual native Shopify cart checkout POST. | Screenshot says “Сплатити”; explicit user wording and actual platform boundary take precedence. No wallet buttons/payment form. |
| Recommendations and policy panels | Old section data retained disabled; no fictional content. | Screenshot carousel, reviews, shipping/return/security benefits omitted pending actual content/integration. |
| Empty state | Real empty-cart conditional, heading/explanation and return-to-shopping link following Empty States anatomy. Locally rendered/tested, including axe. | Exact empty-bag illustration export unavailable; text-only rather than a new illustration. Primary FINAL shows populated cart, not a final empty-page layout. |
| Shared header/footer/cart drawer | Existing implementation/source retained; drawer uses same canonical controller and standard hydration/events. | No claim that the already-pending shell or drawer visual discrepancies are resolved. Local fixture uses a hidden minimal drawer hydration target, not a real Shopify drawer preview. |

## Responsive interpretation

Responsive Rules defines 320–767 mobile, 768–1023 tablet, 1024–1439 laptop, 1440+ desktop. New CSS uses these breakpoints: desktop item/summary columns, compact laptop item grid, tablet summary below items and mobile reflow. No content is intentionally hidden to fit; quantity/removal/checkout remain available. Chromium overflow checks pass at **320, 390, 767, 768, 1023, 1024, 1439 and 1440px**. This is a conservative interpretation of the supporting rules, not a separately approved mobile cart mockup.

Pending conflicts remain **C2 palette**, **C3 typography**, **C4 container/responsive geometry**, **C7 illustration assets** and **C9 mobile shell/details**. C1 homepage order remains untouched. B2.1 tokens/configuration are inherited: no hardcoded new blue/orange preset or global font/container change. The screenshot's vivid blue CTA and exact typography are therefore **not claimed matched** under the inherited default palette/font settings. Cart border/radius/spacing anatomy is implemented; exact pixel parity is unverified.

[Local desktop](analysis/shopify-cart-b2-5/previews/local-desktop.png) and [mobile](analysis/shopify-cart-b2-5/previews/local-mobile.png) screenshots prominently disclose synthetic fixtures. They show the cart content after quantity/removal tests, not BAZAR merchandise or the full header/footer. These are local rendering evidence; no pixel-diff/merchant-font/CDN/real-data visual acceptance was performed. Real asset exports, conflict decisions and separately authorized development-theme preview are required before claiming visual acceptance.
