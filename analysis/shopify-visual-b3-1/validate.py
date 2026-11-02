#!/usr/bin/env python3
"""B3.1 scoped visual edits and unchanged commerce/image contracts; no merchant requests."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];BASE='bc33fb543fb817e64d8fdb0a78efa87b02859e63'
sys.path.insert(0,str(ROOT/'analysis/shopify-catalog-b2-2'))
from check_section_tags import violations

def git(*a):return subprocess.check_output(['git','-C',str(ROOT),*a])
def jsonc(s):return json.loads(re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*',lambda m:m[0] if m[0].startswith('"') else ' ',s))
passed=[]
def ok(x):passed.append(x);print('PASS',x)
assert git('branch','--show-current').decode().strip()=='codex/shopify-visual-restoration-b3-1'
assert git('merge-base',BASE,'HEAD').decode().strip()==BASE
allowed={'assets/bazar-global.css','assets/bazar-header.css','assets/bazar-footer.css','assets/bazar-cart.css','assets/bazar-catalog.css','assets/bazar-pdp.css','assets/bazar-inter-variable.woff2','assets/bazar-inter-license.txt','config/settings_schema.json','snippets/bazar-foundation.liquid','snippets/bazar-header-actions.liquid','snippets/bazar-header-desktop.liquid','snippets/bazar-destination.liquid'}
for p in git('diff',BASE,'--name-only').decode().splitlines():assert p in allowed or p.startswith(('analysis/shopify-visual-b3-1/','PHASE_B3_1_')),p
assert jsonc((ROOT/'config/settings_schema.json').read_text())[0]['theme_version']=='4.1.1'
ok('Pinned B3 stack, visual-only scope and Horizon 4.1.1')
# Verify every pre-existing commerce JS/template/component untouched, not only selected examples.
for folder in ['templates','sections','blocks','layout']:
 for p in (ROOT/folder).rglob('*'):
  if p.is_file():assert p.read_bytes()==git('show',BASE+':'+p.relative_to(ROOT).as_posix()),p
for p in (ROOT/'assets').glob('*.js'):assert p.read_bytes()==git('show',BASE+':'+p.relative_to(ROOT).as_posix()),p
for p in ['snippets/cart-products.liquid','snippets/cart-summary.liquid','snippets/cart-drawer.liquid','snippets/quantity-selector.liquid','snippets/product-card.liquid']:
 assert (ROOT/p).read_bytes()==git('show',BASE+':'+p),p
assert (ROOT/'snippets/bazar-header-desktop.liquid').read_text().replace('Inter, синя палітра та геометрія зафіксовані погодженою основою B3.1.','Палітра й контейнер — у налаштуваннях основи дизайну.')==git('show',BASE+':snippets/bazar-header-desktop.liquid').decode()
ok('Every existing section/block/template/layout/JS file byte-identical; native cart/variant/search contracts preserved')
old=jsonc(git('show',BASE+':config/settings_schema.json').decode());new=jsonc((ROOT/'config/settings_schema.json').read_text())
assert old[:-1]==new[:-1];assert old[-1]['name']==new[-1]['name'];assert len(new[-1]['settings'])==1
ok('Only provisional BAZAR settings group retired; all native Horizon settings preserved; no settings_data created')
n=0;schemas=0
for folder in ['sections','blocks','snippets','layout']:
 for p in (ROOT/folder).rglob('*.liquid'):
  s=p.read_text();n+=1;assert not violations(s),p
  for m in re.finditer(r'{% schema %}([\s\S]*?){% endschema %}',s):json.loads(m[1]);schemas+=1
assert violations(git('show','7df5cf9:sections/main-collection.liquid').decode())
count=0
for folder in ['templates','sections','locales','config']:
 for p in (ROOT/folder).rglob('*.json'):
  d=jsonc(p.read_text());count+=1
  if isinstance(d,dict) and 'sections' in d:
   for v in d['sections'].values():assert (ROOT/'sections'/(v['type']+'.liquid')).exists(),p
ok(f'{n} Liquid files / {schemas} schema payloads / {count} JSONC files; historical nested-tag error still rejected')
font=(ROOT/'assets/bazar-inter-variable.woff2').read_bytes();assert font[:4]==b'wOF2';assert 'SIL OPEN FONT LICENSE' in (ROOT/'assets/bazar-inter-license.txt').read_text()
css=(ROOT/'assets/bazar-global.css').read_text();tokens=dict(re.findall(r'(--bazar-[\w-]+):\s*([^;\n]+);',css[:css.index('@media')]))
assert tokens['--bazar-color-blue']=='#003eff';assert tokens['--bazar-container-width']=='1380px';assert "bazar-inter-variable.woff2" in css
for filename in ['bazar-global.css','bazar-header.css','bazar-footer.css','bazar-cart.css','bazar-catalog.css','bazar-pdp.css']:
 s=(ROOT/'assets'/filename).read_text();assert s.count('{')==s.count('}'),filename
ok('Approved token layer and bundled WOFF2/OFL assets resolve; scoped styles structurally balanced')
images={}
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 rel=p.relative_to(ROOT).as_posix();b=p.read_bytes();assert b==git('show',BASE+':'+rel);assert b==git('show','026c01b:'+rel);images[rel]=hashlib.sha256(b).hexdigest()
assert len(images)==33
ok('33 original PNG files byte-identical to B3 base and approved 026c01b')
for p in Path(__file__).parent.glob('*.mjs'):subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
ok('Analysis JavaScript parses; diff whitespace passes')
if '--evidence' in sys.argv:
 (Path(__file__).parent/'source-evidence.json').write_text(json.dumps({'base':BASE,'scope':'Local source validation only','passed':passed,'tokens':tokens,'font_sha256':hashlib.sha256(font).hexdigest(),'font_source':'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2','license_source':'https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt','png_sha256':images},indent=2,ensure_ascii=False)+'\n')
