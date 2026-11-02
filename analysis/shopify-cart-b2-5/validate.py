#!/usr/bin/env python3
"""Read-only B2.5 source checks; not Shopify server/editor acceptance."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];BASE='949923d93171b1a59c18fd4882ae9e76e2f44c2d'
sys.path.insert(0,str(ROOT/'analysis/shopify-catalog-b2-2'))
from check_section_tags import violations

def git(*a):return subprocess.check_output(['git','-C',str(ROOT),*a])
def jsonc(s):return json.loads(re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*',lambda m:m[0] if m[0].startswith('"') else ' ',s))
passed=[]
def ok(s):passed.append(s);print('PASS',s)
assert git('branch','--show-current').decode().strip()=='codex/shopify-cart-restoration-b2-5'
assert git('merge-base',BASE,'HEAD').decode().strip()==BASE
assert jsonc((ROOT/'config/settings_schema.json').read_text())[0]['theme_version']=='4.1.1'
allowed={'snippets/cart-products.liquid','assets/component-cart-items.js','snippets/quantity-selector.liquid','templates/cart.json','assets/bazar-cart.css','sections/bazar-main-cart.liquid'}
for p in git('diff',BASE,'--name-only').decode().splitlines():assert p in allowed or p.startswith(('analysis/shopify-cart-b2-5/','PHASE_B2_5_')),p
ok('Pinned stacked ancestry, Horizon 4.1.1 and bounded theme/analysis/documentation scope')
for p in ['assets/product-form.js','assets/bazar-pdp.js','assets/bazar-catalog.js','assets/bazar-global.css','templates/product.json','templates/collection.json','templates/search.json','templates/index.json','sections/header.liquid','sections/footer-group.json','snippets/product-card.liquid','snippets/cart-drawer.liquid','snippets/cart-summary.liquid']:
 assert (ROOT/p).read_bytes()==git('show',BASE+':'+p),p
old=jsonc(git('show',BASE+':templates/cart.json').decode());new=jsonc((ROOT/'templates/cart.json').read_text())
for key,value in old['sections'].items():
 expected=dict(value,disabled=True);assert new['sections'][key]==expected,key
assert new['order'][1:]==old['order']
assert (ROOT/'snippets/cart-products.liquid').read_text().replace('                data-confirmed-quantity="{{ item.quantity }}"\n','')==git('show',BASE+':snippets/cart-products.liquid').decode()
ok('Previous PDP/catalog/header/footer/home/search/drawer files intact; old cart section configuration retained disabled')
n=0;schemas=0
for folder in ['sections','blocks','snippets','layout']:
 for p in (ROOT/folder).rglob('*.liquid'):
  s=p.read_text();n+=1;assert not violations(s),p
  for match in re.finditer(r'{% schema %}([\s\S]*?){% endschema %}',s):
   spec=json.loads(match[1]);schemas+=1
   for group in [spec,*spec.get('blocks',[])]:
    ids=[v['id'] for v in group.get('settings',[]) if 'id' in v];assert len(ids)==len(set(ids)),p
assert violations(git('show','7df5cf9:sections/main-collection.liquid').decode())
ok(f'{n} Liquid top-level tag checks and {schemas} section/block schema payloads; historical upload failure still detected')
count=0
for folder in ['templates','sections','locales','config']:
 for p in (ROOT/folder).rglob('*.json'):
  data=jsonc(p.read_text());count+=1
  if not isinstance(data,dict) or 'sections' not in data:continue
  for value in data['sections'].values():assert (ROOT/'sections'/(value['type']+'.liquid')).exists(),p
  assert all(k in data['sections'] for k in data.get('order',[])),p
ok(f'{count} JSON/JSONC files, existing/new section references and template orders resolve')
s=(ROOT/'sections/bazar-main-cart.liquid').read_text()
for name in re.findall(r"render\s+'([^']+)'",s):assert (ROOT/'snippets'/(name+'.liquid')).exists(),name
for name in re.findall(r"'([^'\n]+)'\s*\|\s*(?:asset_url|inline_asset_content)",s):assert (ROOT/'assets'/name).exists(),name
assert 'cart.total_price | money_with_currency' in s and 'item.final_line_price | money_with_currency' in s
assert 'name="checkout" form="bazar-cart-form"' in s
assert 'localStorage' not in s and 'sessionStorage' not in s
ok('Cart snippet/asset dependencies resolve; money/checkout remain Shopify-owned, no browser-owned cart data')
hashes={}
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 rel=p.relative_to(ROOT).as_posix();data=p.read_bytes();assert data==git('show',BASE+':'+rel);assert data==git('show','026c01b:'+rel)
 hashes[rel]=hashlib.sha256(data).hexdigest()
assert len(hashes)==33
ok('33 original PNGs byte-identical to B2.4 and approved reference commit 026c01b')
for p in [ROOT/'assets/component-cart-items.js',*Path(__file__).parent.glob('*.mjs')]:subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
ok('Changed/new JavaScript parses and working diff whitespace passes')
print(json.dumps({'groups':len(passed),'png_count':len(hashes)},ensure_ascii=False))
if '--evidence' in sys.argv:
 (Path(__file__).parent/'source-evidence.json').write_text(json.dumps({'base':BASE,'scope':'Local source validation only','passed':passed,'png_sha256':hashes},indent=2,ensure_ascii=False)+'\n')
