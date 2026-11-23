"""Regression: todayword neck/side are SHOP_ITEMS, while wings are EXTRA_SHOP_ITEMS."""
import re, subprocess
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tools/restore_postbuild.py'
s=p.read_text(encoding='utf8')
m=re.search(r"s\+='''(.*?)'''", s, re.S)
assert m, 'generated game catalog not found'
js=m.group(1).replace(r"\n", "\n")
fixture="""
const SHOP_ITEMS={neck:[{id:'🧣',n:'목도리',p:180},{id:'🔔',n:'방울',p:200}],side:[{id:'🎈',n:'풍선',p:100},{id:'🎮',n:'게임기',p:250}]};
const EXTRA_SHOP_ITEMS={wing:[{id:'wing:angel',n:'천사',p:550}]};
window.WR_PET_CATALOG={bases:[],wings:[]};
"""
checks="""
if(window.WR_PET_CATALOG.necks.length!==3)throw Error('Missing neck catalog');
if(window.WR_PET_CATALOG.hands.length!==3)throw Error('Missing side catalog');
if(window.WR_PET_CATALOG.necks[1].id!=='🧣'||window.WR_PET_CATALOG.necks[1].price!==180)throw Error('Incorrect neck IDs or prices');
if(window.WR_PET_CATALOG.hands[2].emoji!=='🎮')throw Error('Missing item imagery');
if(window.WR_PET_CATALOG.necks[0].id!=='neck:none')throw Error('Missing unequip option');
console.log('PASS: neck/side catalog, correct source and emoji assets');
"""
code="globalThis.window={};\n"+fixture+js+checks
result=subprocess.run(['node','-e',code],capture_output=True,text=True)
assert result.returncode==0,result.stderr
print(result.stdout.strip())
