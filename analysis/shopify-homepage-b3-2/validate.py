#!/usr/bin/env python3
"""Read-only homepage source, stack, commerce preservation and original-reference checks."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];BASE='a7233d990e93c1936a1af9f687eef527f82540ae'
sys.path.insert(0,str(ROOT/'analysis/shopify-catalog-b2-2'))
from check_section_tags import violations

def git(*a):return subprocess.check_output(['git','-C',str(ROOT),*a])
def jsonc(s):return json.loads(re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*',lambda m:m[0] if m[0].startswith('"') else ' ',s))
passed=[]
def ok(x):passed.append(x);print('PASS',x)
assert git('branch','--show-current').decode().strip()=='codex/shopify-homepage-restoration-b3-2'
assert git('merge-base',BASE,'HEAD').decode().strip()==BASE
allowed={'templates/index.json','assets/bazar-home.css','assets/bazar-home.js','snippets/bazar-home-slide.liquid','sections/bazar-home-hero.liquid','sections/bazar-category-blocks.liquid','sections/bazar-home-benefits.liquid','sections/bazar-home-promotions.liquid','sections/bazar-home-products.liquid','sections/bazar-home-brands.liquid','sections/bazar-home-newsletter.liquid'}
for p in git('diff',BASE,'--name-only').decode().splitlines():assert p in allowed or p.startswith(('analysis/shopify-homepage-b3-2/','PHASE_B3_2_')),p
assert jsonc((ROOT/'config/settings_schema.json').read_text())[0]['theme_version']=='4.1.1'
ok('Stacked a7233d9 ancestry, Horizon 4.1.1, homepage-only runtime scope')
# All prior theme files other than explicit homepage composition/style are immutable.
for name in git('ls-tree','-r','--name-only',BASE).decode().splitlines():
 if name.split('/')[0]in ['assets','sections','snippets','templates','blocks','layout','config','locales'] and name not in allowed:
  assert (ROOT/name).read_bytes()==git('show',BASE+':'+name),name
ok('All previous shell/tokens/fonts/catalog/PDP/cart/commerce JS/native settings remain byte-identical')
old=jsonc(git('show',BASE+':templates/index.json').decode());new=jsonc((ROOT/'templates/index.json').read_text())
for k,v in old['sections'].items():assert new['sections'][k]==v,k
expected=['bazar_hero','bazar_benefits','bazar_categories','bazar_promotions','bazar_products','bazar_brands','bazar_newsletter']
assert new['order'][:7]==expected;assert new['order'][7:]==old['order'][2:]
ok('Approved rendered composition order; original section instances, disabled native data and order preserved')
n=0;schemas=0
for folder in ['sections','blocks','snippets','layout']:
 for p in (ROOT/folder).rglob('*.liquid'):
  s=p.read_text();n+=1;assert not violations(s),p
  for m in re.finditer(r'{% schema %}([\s\S]*?){% endschema %}',s):
   d=json.loads(m[1]);schemas+=1
   for group in [d,*d.get('blocks',[])]:
    ids=[x['id']for x in group.get('settings',[])if 'id'in x];assert len(ids)==len(set(ids)),p
assert violations(git('show','7df5cf9:sections/main-collection.liquid').decode())
count=0
for folder in ['sections','templates','locales','config']:
 for p in (ROOT/folder).rglob('*.json'):
  d=jsonc(p.read_text());count+=1
  if isinstance(d,dict)and'sections'in d:
   assert all((ROOT/'sections'/(v['type']+'.liquid')).exists()for v in d['sections'].values()),p
   assert all(k in d['sections']for k in d.get('order',[])),p
ok(f'{n} Liquid top-level guards, {schemas} schemas, {count} JSON/JSONC resources; upload regression still detected')
for rel in allowed:
 p=ROOT/rel
 if p.suffix!='.liquid':continue
 s=p.read_text()
 for name in re.findall(r"render\s+'([^']+)'",s):assert (ROOT/'snippets'/(name+'.liquid')).exists(),(rel,name)
 for name in re.findall(r"'([^'\n]+)'\s*\|\s*(?:asset_url|inline_asset_content)",s):assert (ROOT/'assets'/name).exists(),(rel,name)
products=(ROOT/'sections/bazar-home-products.liquid').read_text();assert "type: '_product-card'" in products and 'limit: section.settings.max_products' in products
newsletter=(ROOT/'sections/bazar-home-newsletter.liquid').read_text();assert "form 'customer'" in newsletter and 'form.posted_successfully?' in newsletter
assert 'section.settings.enabled and section.settings.consent_text != blank' in newsletter
for field in ['show','enabled']:
 schema=json.loads(re.search(r'{% schema %}([\s\S]*?){% endschema %}',newsletter)[1]);assert next(x for x in schema['settings']if x.get('id')==field)['default']is False
ok('Literal assets/snippets resolve; bounded canonical cards and native, consent-gated newsletter contract')
images={}
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 rel=p.relative_to(ROOT).as_posix();b=p.read_bytes();assert b==git('show',BASE+':'+rel);assert b==git('show','026c01b:'+rel);images[rel]=hashlib.sha256(b).hexdigest()
assert len(images)==33
ok('33 original design PNG files byte-identical to B3.1 and original approved commit')
for p in [ROOT/'assets/bazar-home.js',*Path(__file__).parent.glob('*.mjs')]:subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
ok('Homepage/analysis JavaScript syntax and diff whitespace')
if '--evidence'in sys.argv:(Path(__file__).parent/'source-evidence.json').write_text(json.dumps({'base':BASE,'scope':'Local source verification, no Shopify merchant request','passed':passed,'original_png_sha256':images},ensure_ascii=False,indent=2)+'\n')
