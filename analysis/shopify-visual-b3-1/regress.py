"""Run prior browser suites, capture fresh results and restore historical artifacts."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parents[2];out=root/'analysis/shopify-visual-b3-1'
for suffix in ['theme-b2-1','catalog-b2-2','product-b2-4','cart-b2-5']:
 prefix=root/'analysis'/('shopify-'+suffix)
 paths=[prefix/'browser-results.json',prefix/'previews/local-desktop.png',prefix/'previews/local-mobile.png']
 backups={p:p.read_bytes() for p in paths}
 try:
  with open('/tmp/b31-'+suffix+'.log','w') as f:r=subprocess.run(['node',str(prefix/'browser-check.mjs')],cwd=root,stdout=f,stderr=subprocess.STDOUT)
  if r.returncode:raise RuntimeError(suffix+' failed; see log')
  (out/(suffix+'-regression-results.json')).write_bytes((prefix/'browser-results.json').read_bytes())
  print(suffix,'PASS',flush=True)
 finally:
  for p,b in backups.items():p.write_bytes(b)
