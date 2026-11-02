#!/usr/bin/env python3
"""Catch Shopify's section-level tag nesting restriction, which local fixtures strip."""
import re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TOKEN=re.compile(r'{%[-]?\s*(\w+)[\s\S]*?[-]?%}')
OPEN={'if','unless','case','for','tablerow','capture','paginate','form'}
OPAQUE={'doc','comment','raw','javascript','stylesheet','schema','style'}
TOP_LEVEL={'javascript','stylesheet','schema'}
def violations(text):
 stack=[];opaque=None;errors=[]
 for token in TOKEN.finditer(text):
  tag=token[1]
  if opaque:
   if tag=='end'+opaque:opaque=None
   continue
  if tag in TOP_LEVEL and stack:
   errors.append({'tag':tag,'line':text.count('\n',0,token.start())+1,'inside':stack.copy()})
  if tag in OPAQUE:opaque=tag
  elif tag in OPEN:stack.append(tag)
  elif tag.startswith('end') and tag[3:] in OPEN:
   if stack and stack[-1]==tag[3:]:stack.pop()
 return errors
if __name__=='__main__':
 paths=[Path(x) for x in sys.argv[1:]] if len(sys.argv)>1 else [p for folder in ['sections','blocks','snippets','layout'] for p in sorted((ROOT/folder).rglob('*.liquid'))]
 failures=[{'path':str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p),'violations':errors} for p in paths if (errors:=violations(p.read_text()))]
 if failures:
  import json
  print(json.dumps(failures,indent=2));raise SystemExit(1)
 print(f'PASS Shopify top-level javascript/stylesheet/schema tag nesting: {len(paths)} Liquid files')
