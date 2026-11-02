#!/usr/bin/env python3
"""Read-only validation for B2.1: theme structure, recovery boundaries, references and original images."""
import collections,hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE='026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc'
def git(*args,raw=False):
 out=subprocess.check_output(['git','-C',str(ROOT),*args]);return out if raw else out.decode().strip()
def parse(text):return json.loads(re.sub(r'^\s*/\*.*?\*/\s*','',text,flags=re.S))
def read(p):return (ROOT/p).read_text()
def schema(text):return json.loads(re.search(r'{% schema %}(.*?){% endschema %}',text,re.S).group(1))
results=[]
def ok(label):results.append(label);print('PASS:',label)
spec=parse(read('config/settings_schema.json'));assert spec[0]['theme_name']=='Horizon' and spec[0]['theme_version']=='4.1.1'
old=parse(git('show',BASE+':config/settings_schema.json'));assert spec[:len(old)]==old
for group in spec:
 ids=[x['id'] for x in group.get('settings',[]) if 'id' in x];assert len(ids)==len(set(ids))
ok('Horizon 4.1.1 retained; existing global settings preserved and BAZAR IDs unique')
for path in (ROOT/'sections').glob('*.liquid'):
 text=path.read_text()
 if '{% schema %}' not in text:continue
 sc=schema(text)
 for group in [sc,*sc.get('blocks',[])]:
  ids=[x['id'] for x in group.get('settings',[]) if 'id' in x];assert len(ids)==len(set(ids)),path
ok('All section schemas parse; section/block setting IDs unique')
json_count=0
for parent in ['templates','sections']:
 for path in (ROOT/parent).rglob('*.json'):
  data=parse(path.read_text());json_count+=1
  if not isinstance(data,dict):continue
  for ident in data.get('order',[]):assert ident in data['sections'],path
  for sec in data.get('sections',{}).values():assert (ROOT/'sections'/f"{sec['type']}.liquid").is_file(),(path,sec['type'])
ok(f'{json_count} JSON templates/groups parse; section types and order IDs resolve')
newfiles=[*ROOT.glob('snippets/bazar-*.liquid'),*ROOT.glob('sections/bazar-*.liquid')]
for path in newfiles:
 text=path.read_text();code=re.sub(r'{%[-\s]*(doc|comment)\b.*?{%[-\s]*end\1\s*[-]?%}','',text,flags=re.S)
 for name in re.findall(r"{%[-\s]*render\s+'([^']+)'",code):assert (ROOT/'snippets'/f'{name}.liquid').exists(),(path,name)
 for name in re.findall(r"'([^']+)'\s*\|\s*(?:asset_url|inline_asset_content)",code):assert (ROOT/'assets'/name).is_file(),(path,name)
 assert not re.search(r'BazarSmsAuth|localStorage|sessionStorage|uiOnly|/profile|bazar-auth',code),path
ok('BAZAR snippet/asset references resolve; no imported demo-auth/storage/profile routing')
for parent in ['assets','snippets','sections']:
 for p in ROOT.glob(parent+'/bazar-*'):
  if p.suffix=='.svg':continue
  assert 'youtube' not in p.read_text().lower() and 'tiktok' not in p.read_text().lower(),p
ok('Active BAZAR slice contains no YouTube/TikTok, payment-icon row or fake auth')
for p in ['templates/index.json','sections/footer-group.json']:
 current=parse(read(p));old=parse(git('show',BASE+':'+p))
 for key,sec in old['sections'].items():
  restored=current['sections'][key].copy();assert restored.pop('disabled') is True;assert restored==sec,(p,key)
ok('Original homepage/footer sections retained byte-equivalent as data except disabled flag')
assert not git('diff',BASE,'--','apps','infra','.github','locales','AGENTS.md','blocks','config/settings_data.json')
ok('Independent applications, infrastructure, workflows, locales, blocks and store settings_data untouched')
images=[]
for p in sorted((ROOT/'design-reference/storefront').glob('*.PNG')):
 data=p.read_bytes();assert data==git('show',BASE+':'+str(p.relative_to(ROOT)),raw=True)
 images.append({'file':p.name,'sha256':hashlib.sha256(data).hexdigest()})
assert len(images)==33;ok('All 33 original PNGs match base bytes and SHA-256 inventory')
assert git('branch','--show-current')=='codex/shopify-theme-restoration-b2-1';assert git('merge-base',BASE,'HEAD')==BASE
ok('Correct task branch and direct required-base ancestry; no audit/feature merge')
subprocess.run(['node','--check',str(ROOT/'assets/bazar-header.js')],check=True)
ok('New storefront JavaScript syntax validates')
subprocess.run(['git','-C',str(ROOT),'diff','--check',BASE],check=True)
ok('git diff --check')
print(json.dumps({'checks_passed':len(results),'images':images},ensure_ascii=False))
