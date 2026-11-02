#!/usr/bin/env python3
"""Validate B1 documentation and read-only evidence, without merchant/network access."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parents[2]
DOCS={'SHOPIFY_PLUS_FEASIBILITY.md','AUTHENTICATION_ARCHITECTURE.md','CHECKOUT_FEASIBILITY_MATRIX.md','PAYMENT_DELIVERY_COMPATIBILITY.md','SHOPIFY_THEME_RECOVERY_MATRIX.md','PHASE_B2_IMPLEMENTATION_PLAN.md'}
SUPPORT={f'analysis/shopify-plus-b1/{name}' for name in ['README.md','oidc-contract.mjs','oidc-contract.test.mjs','recovery_inventory.py','recovery-inventory.json','meest-spec-evidence.json','validate.py']}
BASE='026c01b1cac15436f16c3f68d1ad1f85e2ea6ccc'
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
def run_inventory(*args): return subprocess.check_output([sys.executable,str(ROOT/'analysis/shopify-plus-b1/recovery_inventory.py'),*args],text=True)
for name in DOCS|{'analysis/shopify-plus-b1/README.md'}:
 p=ROOT/name;assert p.is_file() and p.stat().st_size>100,name
 for link in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if link.startswith(('https://','http://','#')):continue
  target=(p.parent/unquote(link.split('#')[0])).resolve()
  assert target.is_file(),(name,link)
print('PASS: six required deliverables and local Markdown links')
evidence=json.loads((ROOT/'analysis/shopify-plus-b1/recovery-inventory.json').read_text())
assert json.loads(run_inventory())==evidence
assert run_inventory('--matrix')==(ROOT/'SHOPIFY_THEME_RECOVERY_MATRIX.md').read_text()
assert len(evidence['files'])==71 and len({x['path'] for x in evidence['files']})==71
for row in evidence['files']:
 assert git('rev-parse',evidence['source']+':'+row['path'])==row['blob']
 assert row['corrections'] and row['reusability'] and row['reference_ids'] and row['risk']
print('PASS: 71 source blobs, complete matrix rows and exact reproducible JSON/Markdown')
assert len(evidence['images'])==33
for im in evidence['images']:
 p=ROOT/'design-reference/storefront'/im['file'];data=p.read_bytes()
 assert hashlib.sha256(data).hexdigest()==im['sha256']
 assert data==subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':'+str(p.relative_to(ROOT))])
print('PASS: 33 image SHA-256 hashes and exact original base bytes')
assert git('merge-base',BASE,'HEAD')==BASE
assert git('branch','--show-current')=='codex/shopify-plus-feasibility-b1'
changed=set(git('diff','--name-only',BASE).splitlines())|set(git('ls-files','--others','--exclude-standard').splitlines())
assert changed==DOCS|SUPPORT,changed^(DOCS|SUPPORT)
assert all(line.startswith('A\t') for line in git('diff','--name-status',BASE).splitlines())
assert not git('diff',BASE,'--','design-reference','apps','assets','blocks','config','layout','locales','sections','snippets','templates','.github','infra','AGENTS.md')
print('PASS: correct task branch/base ancestry, exactly 13 additive documentation/proof files, protected paths unchanged')
meest=json.loads((ROOT/'analysis/shopify-plus-b1/meest-spec-evidence.json').read_text())
assert meest['carrier_operations_called'] is False and meest['http_status']==200
assert set(['/citySearch','/branchSearch','/branchTypes','/calculate','/parcel','/tracking/{trackNumber}'])<=set(meest['paths'])
print('PASS: read-only Meest public-contract evidence is clearly separated from operations')
subprocess.run(['git','-C',str(ROOT),'diff','--check',BASE],check=True)
print('PASS: git diff --check')
