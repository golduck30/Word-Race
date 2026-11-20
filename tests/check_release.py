from pathlib import Path
from subprocess import run
root=Path(__file__).resolve().parents[1]
for file in ['addons/word-race.js','addons/bootstrap.js','solo.js','addons/spark-economy.js']:
 p=root/file
 r=run(['node','--check',str(p)],capture_output=True,text=True)
 assert r.returncode==0, f'{file}: {r.stderr}'
 print('OK',file)
assets=root/'assets/nonemo'
import json
catalog=json.loads((assets/'catalog.json').read_text())
for cat,items in catalog['categories'].items():
 for it in items:
  if it.get('file'):
   assert (root/it['file']).is_file(),f'missing {it["file"]}'
print('OK all nonemo catalog paths')
