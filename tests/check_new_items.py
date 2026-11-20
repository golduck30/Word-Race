from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
cat=json.loads((root/'assets/nonemo/catalog.json').read_text(encoding='utf-8'))['categories']
assert len(cat['eyes'])==75
assert len([i for i in cat['eyes'] if i['id'].startswith('custom_')])==60
assert all((root/i['file']).is_file() for i in cat['eyes'] if i['id'].startswith('custom_'))
s=(root/'tools/build.py').read_text(encoding='utf-8')
assert 'Number(wordLength) === 8 ? 3 : 2' in s
print('PASS: 60 new face choices, 8-jamo 3 hints, others 2')
