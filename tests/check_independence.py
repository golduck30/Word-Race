from pathlib import Path
r=Path(__file__).resolve().parents[1]
deploy=(r/'.github/workflows/deploy.yml').read_text()
assert 'git clone' not in deploy, 'Deployment must not clone todayword'
assert '_todayword_source/game.js' in deploy
assert 'git clone --depth 1' in (r/'.github/workflows/import-original-once.yml').read_text()
assert (r/'tools/build.py').exists()
print('Independent build config: OK (one-time import still required before first deployment)')
