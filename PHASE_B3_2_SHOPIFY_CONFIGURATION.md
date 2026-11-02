# B3.2 — Shopify Theme Editor configuration guide

**Instructions for a later, separately authorized development-theme session. No steps were performed remotely in B3.2.** This code must first become available in the intended unpublished development copy through a separately approved upload workflow. Do not edit/publish the live Horizon theme or assume an older uploaded theme contains these sections.

Owner-supplied context: store `vbgvzy-ay.myshopify.com`; unpublished BAZAR DEV B2.2 `192306544952`; published Horizon `192303661368`. Verify store/theme/revision before future work. B3.2 neither queried nor changed these identities/settings.

## 1. Open the correct homepage

After separate approval, open the correct unpublished theme's **Customize → Home page**. Confirm active order:

1. **BAZAR — головний банер** (`bazar_hero`).
2. **BAZAR — переваги** (`bazar_benefits`).
3. **BAZAR — категорії** (`bazar_categories`).
4. **BAZAR — промобанери** (`bazar_promotions`).
5. **BAZAR — товари** (`bazar_products`).
6. **BAZAR — бренди** (`bazar_brands`).
7. **BAZAR — розсилка** (`bazar_newsletter`).

Old native hero/product-list remain disabled; do not enable them as substitutes. Empty modules deliberately hide customer content and explain setup only in editor. No product, collection, brand asset or campaign must be created just to imitate screenshot merchandise.

## 2. Hero and category navigation

In **BAZAR — головний банер**, select the existing merchant-approved **Меню категорій поруч із банером**. Align its real destinations with the header's existing catalog menu. The header catalog remains mobile navigation; the hero sidebar is hidden on mobile.

Add up to5 **Слайд** blocks. For each select:

- **Погоджений банер**: genuine standalone image, not the complete approved design board. Approximately4:1 desktop artwork best matches the composition; actual image aspect is retained.
- **Мобільне зображення**: optional genuine mobile master/crop. If absent, the actual desktop image remains the fallback without invented mobile artwork.
- Meaningful **Опис зображення**; genuine optional **Посилання**.
- Optional heading/subtitle/link text only when not already baked into the actual banner. Do not copy screenshot delivery/policy/price claims without merchant verification.

Valid slide blocks take priority. Existing single-image fields remain a compatibility fallback when no slide has an image. Blank-image blocks are skipped, not shown as placeholders. No autoplay setting; manual controls are intentional.

## 3. Benefits

In **BAZAR — переваги**, add up to5 **Підтверджена перевага** blocks. Enter the merchant-approved heading/text and select its approved original icon in a Shopify-supported image format (displayed32px). Do not improvise icons or delivery/return/support/warranty assertions.

If the hero uses a desktop category sidebar, enable **На широких екранах вирівняти під банером праворуч від меню**. This aligns benefits with the media column at≥1024. Leave it off for a full-width hero. Below1024 the strip uses full width and reflows automatically.

## 4. Category collections

In **BAZAR — категорії**, choose up to8 **Погоджені колекції** in the required real order. Check each existing collection's title, featured image and URL. This section uses genuine collection imagery; do not overwrite collection data or select arbitrary placeholder art in this phase. Missing editorial images require approved asset/content work. Set the actual heading if needed.

## 5. Promotions

In **BAZAR — промобанери**, add up to3 **Промобанер** blocks. Select real approved standalone artwork, meaningful alt, and the existing actual campaign destination. Optional heading/link text should be left blank if the artwork already contains it. No running countdown is implemented: do not upload a fabricated timer or claim an unverified offer. Remove/replace expired campaigns in a separately authorized content workflow.

## 6. Product collection / featured products

In **BAZAR — товари**:

- Set the genuine heading.
- Choose an existing **Колекція товарів**. Its actual products populate the rail and its actual URL supplies “Переглянути всі”.
- Alternatively choose **Або вибрані товари** (up to12). A nonempty featured list takes priority over the collection. Leave it empty to use collection products. If a collection is also set, its view-all link still points to that real collection; ensure this is intended.
- Set **Максимум товарів**2–12 (default10). Keep **Спільні картки BAZAR** enabled.
- Verify actual currency, product images, prices/compare-at, availability and variant requirements. Single eligible variants use the existing cart flow; multi-variant/complex items lead to product selection. No rating/favorites integration is implied.

The existing static product-card configuration is reused. No separate featured-product card renderer or unlimited browser catalog. Do not add an extra homepage rail solely because an annotation mentions new products; separate composition changes require approval.

## 7. Brands

In **BAZAR — бренди**, add actual **Бренд** blocks (up to12): approved original logo, actual accessible brand name and real existing destination. All three are required for customer output. Use actual collection/page/vendor destination approved by the merchant; no generated handle, external generic homepage or invented brand. Display is a responsive grid.

## 8. Newsletter — deliberately gated

Default: **Показувати блок=false**, **Механізм і згода перевірені=false**. No customer newsletter is displayed or submitted.

Before activation the merchant/legal owner must verify:

- Native Shopify customer/newsletter capture and its actual marketing-consent behavior.
- Actual double-opt-in/confirmation, sender/email-marketing operation and applicable privacy/consent requirements. Theme code does not configure an email campaign service or guarantee delivery.
- Legally approved description/consent copy and relevant actual policy context. Required browser consent is an interface safeguard, not independent proof of server-side compliance.

Then, in a separately authorized configuration session, set heading/approved description, fill **Юридично погоджений текст згоди**, enable **Показувати блок** and only then **Механізм і згода перевірені: увімкнути форму**. Without the readiness checkbox **or** consent text, shown controls remain disabled and there is no subscription form.

The active form is Shopify `customer`, with email/newsletter tags and affirmative required marketing checkbox. Success copy is server-driven and only confirms a submitted request; the user may still need email confirmation. Do not perform real subscription tests as part of this implementation PR. Native Shopify CAPTCHA, consent, localization and actual response behavior need a separately approved test session; never bypass them.

## 9. Preview acceptance before any release

Using real existing content, check1440/1024/768/390/320, images and alt text, carousel/dots/keyboard, benefit alignment, collection routes, finite product rail, exact variant add/error states and native cart/drawer count synchronization. Verify footer and Inter/blue tokens remain correct. Capture the actual unpublished theme ID/revision and consent states. Stop before checkout/order/payment operations.

Missing original hero/mobile/promo/brand/icon assets, real selections/policies or verified newsletter process are blockers: retain truthful hidden/inactive states. Saving editor settings, uploading files/themes and publishing remain outside B3.2 authorization.
