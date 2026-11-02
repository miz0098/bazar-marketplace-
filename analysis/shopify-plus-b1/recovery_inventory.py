#!/usr/bin/env python3
"""Read Git objects and print recovery evidence JSON or Markdown; no writes/network."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[2]
BASE='026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc'
SOURCE='105d10fb6b8e65c5f163016aa8c69072e85faa0e'
AUDIT='2e901f8aaeb1166ff0827eb63a6363ed18c9c437'
DIRS=['assets','blocks','config','layout','locales','sections','snippets','templates']
def git(*args,raw=False):
 out=subprocess.check_output(['git','-C',str(ROOT),*args])
 return out if raw else out.decode().strip()

def classify(path):
 name=Path(path).name
 if 'auth' in name or name in ['bazar-phone-input.liquid','bazar-sms-code-input.liquid'] or path.startswith('templates/customers/'):
  refs='01, 15, 20, 22 (mislabeled), 23'
  risk='Critical' if name=='bazar-auth.js' else 'High'
  if path.startswith('templates/customers/') or any(k in name for k in ['activate-account','reset-password']):
   action='Hold legacy account route/template; do not recover as current accounts or add password/activation/reset UX.'
   reuse='Do not wire by default'
  elif name=='bazar-auth.js':
   action='Replace UI-only OTP acceptance, browser auth flags and optional BazarSmsAuth fallbacks; use approved hosted OIDC transaction/session boundary.'
   reuse='Presentation behavior only; auth authority rejected'
  else:
   action='Compare phone/OTP/error/focus styles with approved module; adapt to approved IdP-hosted flow, remove unsupported legacy route assumptions.'
   reuse='Markup/style candidate; not an authentication service'
 elif 'account' in name or name=='page.profile.json':
  refs='25, 33, 13, 16'
  risk='Critical' if name=='bazar-account.js' else 'High'
  reuse='Presentation candidate; account data/routing needs redesign of technical integration'
  action='Replace local/session storage authority and /profile History-route assumptions; current accounts use supported extensions/routes and owner-authorized APIs.'
  if name=='bazar-account-provider-data.liquid': action='Replace bounded 20-order/20-address bootstrap and empty feature arrays with chosen account API/extension contract; never equate SMS browser flag to Liquid customer.'
  if name=='page.profile.json': action='Hold until route choice; a page template does not register /profile nested paths. Prove direct-load/auth behavior.'
 elif any(k in name for k in ['favorites','wishlist']):
  refs='13, 15, 33, 09'
  risk='High';reuse='UI/guest-state candidate only'
  action='Implement owner-scoped persistent wishlist via API/app; reconcile guest data only by approved policy, remove hardcoded /profile assumptions and validate canonical variants.'
 elif any(k in name for k in ['header','logo','catalog-menu']):
  refs='06, 23, 29, 30; C1/C4/C9'
  risk='High' if name in ['header.liquid','header-group.json','bazar-header-actions.liquid'] else 'Medium'
  reuse='Selective shell recovery'
  action='Resolve final desktop/mobile menu and colors; retain Horizon editor behavior, keyboard/drawer focus and cart/search integrations; replace auth links, prove no duplicate shell.'
 elif 'footer' in name:
  refs='06, 10, 15, 19, 29; C9'
  risk='Medium';reuse='Selective footer recovery'
  action='Confirm actual legal/contact/social/app links and locale/currency placement; preserve group/editor settings, remove placeholder links and unsupported profile paths.'
 elif any(k in name for k in ['product','recently']):
  refs='09, 11, 26, 06'
  risk='High' if name in ['bazar-product.js','bazar-main-product.liquid','product.json'] else 'Medium'
  reuse='Selective catalog/product presentation'
  action='Verify canonical variants/availability/price, metafield/review ownership and gallery/a11y; preserve Shopify cart and no duplicate checkout authority.'
  if 'recently' in name: action='Validate consent/retention and canonical IDs/media; guest recent-view storage is not server/customer authority; compare missing/empty states.'
  if name=='bazar-product-card.liquid': action='Resolve blue/orange CTA and badge/rating/price/variant rules; use actual Shopify data, not sample discounts or backend competing totals.'
  if name=='product.json': action='Recover section composition only after required sections/metafields exist; preserve merchant product-template assignments and settings.'
 elif any(k in name for k in ['collection','catalog','pagination']):
  refs='11, 28, 23, 09'
  risk='High' if name in ['bazar-catalog-data.liquid','bazar-collection-url.liquid'] else 'Medium'
  reuse='Selective catalog/filter/navigation recovery'
  action='Map real Shopify collections/facets/routes; validate filters/sort/page/deep links and mobile drawer; preserve native pagination consumers.'
  if name=='bazar-catalog-data.liquid': action='Replace hardcoded category taxonomy with approved merchant menus/collections and tested stable handles; preserve Ukrainian labels.'
  if name=='bazar-collection-url.liquid': action='Resolve real collection URLs/handles; no inferred/placeholder route may become a broken link.'
 elif any(k in name for k in ['home','category-blocks','promo','index.json']):
  refs='06, 30, 32; C1/C2'
  risk='Medium';reuse='Selective homepage recovery'
  action='Confirm v1.0/v1.2/wireframe section order, approved assets and blue/purple tokens; use real links/catalog and editable merchant settings.'
  if name=='index.json': action='Recover reviewed composition after dependencies; replace shopify:// image/collection handles with verified development-store resources; do not overwrite live settings.'
 elif 'toast' in name:
  refs='07, 15, 24'
  risk='Medium';reuse='Feedback UI candidate'
  action='Use live operation states only; escaping, aria-live, focus/reduced motion and auto-dismiss must match approved feedback rules.'
 else:
  refs='02–09, 15, 20–24, 27, 29'
  risk='High' if name in ['scripts.liquid','stylesheets.liquid'] else 'Medium'
  reuse='Recover minimal hunks only'
  action='Reconcile global tokens/cascade and BAZAR loaders with Horizon; keep module dependency order and editor lifecycle; avoid global regressions and duplicated assets.'
 if path.endswith('.css'): action+=' Scope selectors; verify unresolved palette/grid/type tokens and all responsive breakpoints.'
 if path.endswith('.svg'): action+=' Compare exact artwork and retain vector provenance; no claim this is the original PNG export.'
 return refs,reuse,action,risk

rows=[]
for line in git('diff','--name-status',BASE,SOURCE,'--',*DIRS).splitlines():
 status,path=line.split('\t');body=git('show',SOURCE+':'+path)
 code=re.sub(r'{%[-\s]*(doc|comment)\s*[-]?%}.*?{%[-\s]*end\1\s*[-]?%}','',body,flags=re.S)
 deps=sorted({a or b for a,b in re.findall(r"(?:render|section)\s+['\"]([^'\"]+)|['\"]([^'\"]+)['\"]\s*\|\s*asset_url",code)})
 if path.endswith('.json'):
  parsed=json.loads(re.sub(r'^\s*/\*.*?\*/\s*','',body,flags=re.S))
  deps+=['section:'+x['type'] for x in parsed.get('sections',{}).values()]
 refs,reuse,action,risk=classify(path)
 rows.append(dict(status=status,path=path,blob=git('rev-parse',SOURCE+':'+path),reference_ids=refs,reusability=reuse,dependencies=sorted(set(deps)),corrections=action,risk=risk))
images=[]
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 data=p.read_bytes();assert data==git('show',BASE+':'+str(p.relative_to(ROOT)),raw=True)
 images.append(dict(file=p.name,sha256=hashlib.sha256(data).hexdigest()))
result=dict(base=BASE,source_branch='bazar-latest-shopify',source=SOURCE,phase_a=AUDIT,files=rows,images=images)
if '--matrix' not in sys.argv:
 print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit()
print('''# BAZAR.UA — Selective Shopify theme recovery matrix (B1)

Date: 2026-11-02. Analysis only: **no theme file has been recovered or changed**. Base `design-reference-storefront@026c01b`; source `bazar-latest-shopify@105d10f`. [Pinned machine inventory](analysis/shopify-plus-b1/recovery-inventory.json) records full SHAs, source blobs, direct dependencies and all 33 unchanged-image hashes. Reproduce with `python analysis/shopify-plus-b1/recovery_inventory.py --matrix`. Dependencies list literal render/asset and JSON section references; dynamic/JS runtime dependencies still require development-store validation.

## Recovery rules

Preserve Horizon 4.1.1 at root. Review isolated file/hunk recovery in future authorized PRs; never wholesale merge the source branch or import store settings. Treat source as a UI candidate against approved references, not as proof of finished features. Unsafe demonstration auth and deprecated legacy-account routes are excluded from direct functional recovery. Checkout remains Shopify-owned. Customer account visual code may inform extension design, but cannot be copied into the native account shell.

Reference IDs below are the 01–33 original-image rows in the [Phase A design map](https://github.com/miz0098/bazar-marketplace-/blob/2e901f8aaeb1166ff0827eb63a6363ed18c9c437/DESIGN_REFERENCE_MAP.md); C1–C10 remain unresolved except requirements already fixed by the user. No original PNG is modified. All source links below point to the exact source commit, not the current B1 filesystem.

## File-by-file recovery (all 71 changed theme paths)

| Existing component / source path on bazar-latest-shopify | Source delta | Approved design IDs | Reusability | Dependencies | Required corrections | Risk |
|---|---|---|---|---|---|---|''')
for r in rows:
 url='https://github.com/miz0098/bazar-marketplace-/blob/'+SOURCE+'/'+quote(r['path'],safe='/')
 deps=', '.join('`'+d+'`' for d in r['dependencies']) or 'Owning template/section, shared BAZAR tokens and runtime contract; see corrections'
 print(f"| [{r['path']}]({url}) | {r['status']} | {r['reference_ids']} | {r['reusability']} | {deps} | {r['corrections']} | {r['risk']} |")
print('''
## Unchanged foundation and missing surfaces

The source delta contains 55 BAZAR assets/sections/snippets, six added templates and ten modified native wiring/template files (61 additions, ten modifications). It is the full theme-path delta, not a statement that every existing native file is production-ready. Native `blocks/`, `layout/`, `config/`, `locales/` and unaffected native cart/search/template files remain the foundation. Current native cart, search, legal/help and checkout do not acquire approved BAZAR appearance just by recovering the 71 rows. Dedicated carrier/checkout/current-account extensions and verified server connectors are absent. No `uk.json` was found in this pinned theme inventory; Ukrainian native strings need explicit localization work later.

No live settings/theme export was obtained. Do not replace `config/settings_data.json`, market settings, product-template assignments, merchant menus or image resources without comparing the authorized store snapshot. Root release must stage only Shopify theme directories; `.shopifyignore` alone is not a proven allowlist excluding apps, analysis and original references.

## Order and acceptance

1. Decide C1/C2/C3/C4/C9 and identity/checkout route architecture; obtain original assets and verified merchant snapshot.
2. Recover tokens/logo, header/footer and feedback with minimal native loader hunks. Prove Horizon editor section lifecycle, no duplicate header/assets and keyboard/mobile behavior.
3. Recover cards/home/catalog/PDP one surface at a time; verify actual collection/image references, variant money/availability and native cart behavior.
4. Adapt customer/favorites/phone UI only after supported OIDC/account route proofs. Never recover old browser authentication flags as authority or expose password/reset/activation routes.
5. Build missing approved cart/search/information/help and account-service surfaces in a separately approved implementation phase. Use development-store screenshots/Theme Check and meaningful functional tests for each PR.

Every recovered file requires source provenance, design-region comparison, dependency review, tests appropriate to its surface and an explicit decision for any platform deviation. B1 contains no theme implementation, merge, upload or publication.
'''.rstrip())
