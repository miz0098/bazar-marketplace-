#!/usr/bin/env python3
"""Read-only B2.4 contracts/preservation/schema/source checks, not merchant rendering."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
BASE='f747000b18ddf00ca1844851145db9cef46edfed'
sys.path.insert(0,str(ROOT/'analysis/shopify-catalog-b2-2'))
from check_section_tags import violations

def git(*args,raw=False):
 out=subprocess.check_output(['git','-C',str(ROOT),*args]);return out if raw else out.decode().strip()
def read(p):return (ROOT/p).read_text()
def jsonc(s):
 return json.loads(re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*',lambda m:m[0] if m[0].startswith('"') else ' ',s))
passed=[]
def ok(s):passed.append(s);print('PASS',s)
assert git('branch','--show-current')=='codex/shopify-product-page-restoration-b2-4'
assert git('merge-base',BASE,'HEAD')==BASE
changed=git('diff',BASE,'--name-only').splitlines()
allowed={'templates/product.json','assets/product-form.js','assets/bazar-pdp.css','assets/bazar-pdp.js','sections/bazar-main-product.liquid','sections/bazar-pdp-recommendations.liquid'}
for p in changed:assert p in allowed or p.startswith(('snippets/bazar-pdp-','analysis/shopify-product-b2-4/','PHASE_B2_4_')),p
assert jsonc(read('config/settings_schema.json'))[0]['theme_version']=='4.1.1'
ok('Stacked f747000 ancestry, bounded source scope and Horizon 4.1.1')
# The only shared native edit catches rejected variant promises. Cart/quantity logic is unchanged.
old=git('show',BASE+':assets/product-form.js')+'\n'
new=read('assets/product-form.js')
addition="""    } catch (error) {
      // Rapid option changes intentionally abort the previous section request.
      // Do not turn its rejected event promise into an unhandled async listener error.
      if (error?.name !== 'AbortError') console.warn('[product-form] Variant update failed:', error);
"""
assert new.replace(addition,'')==old
ok('Native product-form edit limited to variant-event rejection handling; other native commerce logic intact')
old=jsonc(git('show',BASE+':templates/product.json'));new=jsonc(read('templates/product.json'))
for key,value in old['sections'].items():
 preserved=dict(new['sections'][key]);preserved.pop('disabled',None);assert preserved==value,key
 assert new['sections'][key]['disabled'] is True
assert new['order'][2:]==old['order']
for p in ['sections/header.liquid','sections/header-group.json','sections/footer-group.json','templates/index.json','templates/collection.json','templates/list-collections.json','templates/search.json','assets/bazar-header.js','assets/bazar-catalog.js','assets/bazar-global.css','snippets/product-card.liquid']:
 assert (ROOT/p).read_bytes()==git('show',BASE+':'+p,raw=True),p
ok('Original PDP/rec section data retained disabled; header/footer/home/catalog/search/cards remain byte-identical')
liquid=0;schemas=0
for folder in ['sections','blocks','snippets','layout']:
 for p in (ROOT/folder).rglob('*.liquid'):
  text=p.read_text();liquid+=1;assert not violations(text),p
  match=re.search(r'{% schema %}([\s\S]*?){% endschema %}',text)
  if not match:continue
  spec=json.loads(match[1]);schemas+=1
  for group in [spec,*spec.get('blocks',[])]:
   ids=[s['id'] for s in group.get('settings',[]) if 'id' in s];assert len(ids)==len(set(ids)),p
assert violations(git('show','7df5cf9:sections/main-collection.liquid'))
ok(f'{liquid} Liquid files pass top-level javascript/stylesheet/schema guard; {schemas} schema payloads and setting IDs valid')
count=0
for folder in ['templates','sections','locales','config']:
 for p in (ROOT/folder).rglob('*.json'):
  data=jsonc(p.read_text());count+=1
  if not isinstance(data,dict) or 'sections' not in data:continue
  for section in data['sections'].values():assert (ROOT/'sections'/(section['type']+'.liquid')).exists(),p
  assert all(x in data['sections'] for x in data.get('order',[])),p
ok(f'{count} JSON/JSONC resources parsed; active/disabled section types and order references resolve')
for p in [*ROOT.glob('snippets/bazar-pdp-*.liquid'),*ROOT.glob('sections/bazar-*product*.liquid'),ROOT/'sections/bazar-pdp-recommendations.liquid']:
 text=re.sub(r'{%[-\s]*(doc|comment)\b[\s\S]*?{%[-\s]*end\1\s*[-]?%}','',p.read_text())
 for name in re.findall(r"render\s+'([^']+)'",text):assert (ROOT/'snippets'/(name+'.liquid')).exists(),(p,name)
 for name in re.findall(r"'([^'\n]+)'\s*\|\s*(?:asset_url|inline_asset_content)",text):assert (ROOT/'assets'/name).exists(),(p,name)
 assert not re.search(r'bazar-auth|localStorage|sessionStorage|360|model_viewer_tag|placeholder_svg_tag',text),p
assert "render 'video'" in read('snippets/bazar-pdp-gallery.liquid')
assert 'selected_or_first_available_variant' in read('snippets/bazar-pdp-state.liquid')
assert 'recommendations.performed and recommendations.products_count > 0' in read('sections/bazar-pdp-recommendations.liquid')
assert 'collections.all' not in read('sections/bazar-pdp-recommendations.liquid')
assert "render 'variant" not in read('sections/bazar-main-product.liquid') # OS2 native static variant block, not duplicate option engine
ok('PDP literal dependencies resolve; genuine objects/media/recommendations only; no demo auth/360/placeholder fallback')
script=read('assets/bazar-pdp.js');assert "'@theme/product-form'" in script and "'@theme/variant-picker'" in script
assert 'fetch(' not in script and 'product.variants' not in script
assert 'on:click="/handleClick"' not in read('snippets/bazar-pdp-purchase.liquid')
assert 'on:submit=' not in read('snippets/bazar-pdp-purchase.liquid')
assert "this.productForm.handleSubmit(event)" in script
ok('Native option-value/product-form/quantity mechanisms reused; submit guard precedes delegation; no duplicate Ajax or optimistic click animation')
images=[]
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 rel=p.relative_to(ROOT).as_posix();raw=p.read_bytes();assert raw==git('show',BASE+':'+rel,raw=True);assert raw==git('show','026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc:'+rel,raw=True);images.append({'path':rel,'sha256':hashlib.sha256(raw).hexdigest()})
assert len(images)==33
ok('33 original PNGs byte-identical to f747000 and approved reference commit')
for p in ['assets/bazar-pdp.js','assets/product-form.js','analysis/shopify-product-b2-4/preview.mjs','analysis/shopify-product-b2-4/browser-check.mjs']:
 subprocess.run(['node','--check',str(ROOT/p)],check=True)
subprocess.run(['git','-C',str(ROOT),'diff','--check'],check=True);subprocess.run(['git','-C',str(ROOT),'diff','--cached','--check'],check=True)
ok('New/shared JS syntax and working/staged whitespace valid')
print(json.dumps({'base':BASE,'groups_passed':len(passed),'checks':passed,'original_pngs':images},ensure_ascii=False))
