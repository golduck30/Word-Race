from pathlib import Path
s=(Path(__file__).resolve().parents[1]/'tools/build.py').read_text(encoding='utf-8')
assert 'total: 100, base: 100' not in s, 'Hard-coded score still present'
assert 'PLAYER_AVATAR_PATCHES' in s
assert 'wrPlayerAvatarHtml' in s
assert 'calcRoundScores (it is authoritative' in s
assert 'const avOf = p =>' in s
assert 'wrPlayerAvatarHtml(w0.uid' in s
print('Score restore/build avatar patches: PASS')
