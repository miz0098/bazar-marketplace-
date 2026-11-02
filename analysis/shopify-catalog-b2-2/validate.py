#!/usr/bin/env python3
"""Read-only B2.2 structural/scope assertions. Not Shopify merchant tests."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE='75db8b898e2435ecc67cfdeb4ae4c0b7e01891b4'
def git(*args,raw=False):
 out=subprocess.check_output(['git','-C',str(ROOT),*args]);return out if raw else out.decode().strip()
def parse(s):return json.loads(re.sub(r'^\s*/\*.*?\*/\s*','',s,flags=re.S))
def read(p):return (ROOT/p).read_text()
def schema(s):return json.loads(re.search(r'{% schema %}(.*?){% endschema %}',s,re.S)[1])
passed=[]
def ok(name):passed.append(name);print('PASS',name)
assert git('branch','--show-current')=='codex/shopify-catalog-restoration-b2-2'
assert git('merge-base',BASE,'HEAD')==BASE
paths=git('diff',BASE,'--name-only').splitlines()
allowed={'blocks/_product-card.liquid','sections/main-collection.liquid','sections/main-collection-list.liquid','sections/search-results.liquid','snippets/product-card.liquid','snippets/bazar-header-desktop.liquid','templates/collection.json','templates/list-collections.json','templates/search.json'}
for p in paths:assert p in allowed or p.startswith(('analysis/shopify-catalog-b2-2/','PHASE_B2_2_','assets/bazar-catalog.','snippets/bazar-card-content.','snippets/bazar-category-tree.','snippets/bazar-collection','snippets/bazar-pagination.')),p
ok('Stack ancestry and bounded theme/docs-only scope; no independent apps/checkout/PDP/infrastructure changes')
evidence=json.loads(read('analysis/shopify-theme-b2-1/evidence.json'))
for f in evidence['theme_files']:
 old=git('show',BASE+':'+f['path'],raw=True);new=(ROOT/f['path']).read_bytes()
 if f['path']=='snippets/bazar-header-desktop.liquid':assert new==old.replace(b'<summary class="bazar-button">',b'<summary class="bazar-button" aria-label="\xd0\x9a\xd0\xb0\xd1\x82\xd0\xb0\xd0\xbb\xd0\xbe\xd0\xb3">')
 else:assert new==old,f['path']
assert parse(read('config/settings_schema.json'))[0]['theme_version']=='4.1.1'
ok('B2.1 foundation byte-preserved except explicit mobile catalog accessible-name correction; Horizon 4.1.1')
for p in (ROOT/'sections').glob('*.liquid'):
 if '{% schema %}' not in p.read_text():continue
 sc=schema(p.read_text())
 for group in [sc,*sc.get('blocks',[])]:
  ids=[i['id'] for i in group.get('settings',[]) if 'id' in i];assert len(ids)==len(set(ids)),p
for path in ['sections/main-collection.liquid','sections/main-collection-list.liquid','sections/search-results.liquid']:
 old=schema(git('show',BASE+':'+path));new=schema(read(path));assert all(x in new['settings'] for x in old['settings'])
ok('All section schemas/unique IDs valid and original native settings preserved')
count=0
for parent in ['templates','sections']:
 for p in (ROOT/parent).rglob('*.json'):
  d=parse(p.read_text());count+=1
  if not isinstance(d,dict) or 'sections' not in d:continue
  for sec in d['sections'].values():assert (ROOT/'sections'/(sec['type']+'.liquid')).exists()
  assert all(x in d['sections'] for x in d.get('order',[]))
for path in ['templates/collection.json','templates/search.json']:
 d=parse(read(path));assert d['sections']['main']['settings']['enable_infinite_scroll'] is False
 old=parse(git('show',BASE+':'+path));assert d['sections']['main']['blocks']==old['sections']['main']['blocks']
ok(f'{count} template/group JSON structures; native card block data retained; finite pagination selected')
for p in ['snippets/bazar-card-content.liquid','snippets/bazar-collection.liquid','snippets/bazar-collection-heading.liquid','snippets/bazar-category-tree.liquid','snippets/bazar-pagination.liquid']:
 s=read(p)
 for ref in re.findall(r"render\s+'([^']+)'",s):assert (ROOT/'snippets'/(ref+'.liquid')).exists(),ref
 for asset in re.findall(r"'([^']+)'\s*\|\s*asset_url",s):assert (ROOT/'assets'/asset).exists(),asset
 assert not re.search(r'localStorage|sessionStorage|bazar-auth|/profile|placeholder_svg|\b1999\b',s),p
assert not (ROOT/'snippets/bazar-product-card.liquid').exists()
assert "render 'bazar-card-content'" in read('snippets/product-card.liquid')
ok('Single canonical product-card mode, dependencies resolved, no source demo auth/storage/merchandising fallback imported')
assert "paginate collection.products by section.settings.products_per_page" in read('sections/main-collection.liquid')
assert 'paginate collections by 24' in read('sections/main-collection-list.liquid')
assert 'collection.filters' in read('snippets/bazar-collection.liquid') and 'collection.sort_options' in read('snippets/bazar-collection.liquid')
assert 'data.set(\'sections_url\'' in read('assets/bazar-catalog.js')
assert not re.search(r'\.bazar-catalog[\s:{.]',read('assets/bazar-catalog.css'))
ok('Server-side bounded collections/facets/sort contracts; bundled cart section request; no collision with header catalog class')
images=[]
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 raw=p.read_bytes();rel=p.relative_to(ROOT).as_posix();assert raw==git('show',BASE+':'+rel,raw=True);assert raw==git('show','026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc:'+rel,raw=True);images.append({'path':rel,'sha256':hashlib.sha256(raw).hexdigest()})
assert len(images)==33
ok('33 original PNGs byte-identical to B2.1')
for p in ['assets/bazar-catalog.js','analysis/shopify-catalog-b2-2/preview.mjs','analysis/shopify-catalog-b2-2/browser-check.mjs']:
 subprocess.run(['node','--check',str(ROOT/p)],check=True)
ok('All new storefront/test JavaScript syntax valid')
subprocess.run(['git','-C',str(ROOT),'diff','--check'],check=True);subprocess.run(['git','-C',str(ROOT),'diff','--cached','--check'],check=True)
ok('Working and staged whitespace checks')
print(json.dumps({'scope':'source-only structural checks','base':BASE,'groups_passed':len(passed),'passed':passed,'images':images},ensure_ascii=False))
