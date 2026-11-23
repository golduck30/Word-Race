#!/usr/bin/env python3
"""Produce deployable Word-Race from authoritative todayword source + independent add-ons.
Fails closed if expected anchors are missing; never silently ships incomplete original logic.
"""
from pathlib import Path
import re, shutil, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'_todayword_source'
DIST=ROOT/'dist'
if not (SOURCE/'game.js').is_file():
    sys.exit('Original game files not imported. Run the one-time GitHub Action "Import original todayword ONCE" first.')
if DIST.exists():shutil.rmtree(DIST)
shutil.copytree(SOURCE,DIST,ignore=shutil.ignore_patterns('.git','.github','__pycache__'))
for rel in ['assets/nonemo','addons']:
    # Fantasy transformations are retired; do not publish legacy fantasy assets.
    ignore = shutil.ignore_patterns('fantasy','fantasy_parts') if rel=='assets/nonemo' else None
    shutil.copytree(ROOT/rel,DIST/rel,dirs_exist_ok=True,ignore=ignore)
for file in ['solo.html','solo.js','firebase-config.js']:
    shutil.copy2(ROOT/file,DIST/file)
source=(DIST/'game.js').read_text(encoding='utf-8')
anchors=['function calcRoundScores(data)', 'function nextRound()', 'function startRound(data, nextMasterUid, commitScores, extra)', 'function updateScoreboard(data)', 'function avatarHtml(av, size, bounce)', 'function openShop()', 'function awardCoinsOnce(key, amount)']
for a in anchors:
    if source.count(a)!=1:sys.exit(f'Original todayword anchor changed: {a!r}')
# Build pet catalog from the original todayword constants; preserve original IDs/prices.
# The source still owns AVATAR_BASES and EXTRA_SHOP_ITEMS, so there is no duplicated catalog.
source += '''\nwindow.WR_PET_CATALOG = {
  bases: AVATAR_BASES.map(x=>({id:x.id,name:x.n,price:Number(x.p)||0})),
  wings: EXTRA_SHOP_ITEMS.wing.map(x=>({id:x.id,name:x.n,price:Number(x.p)||0}))
};\n'''
# Match source Firebase initialization and replace hardcoded connection with new standalone Firebase config.
source,count=re.subn(r'const firebaseConfig\s*=\s*\{.*?\};', 'const firebaseConfig = window.WORD_RACE_FIREBASE_CONFIG;',source,count=1,flags=re.S)
if count!=1:sys.exit('Firebase config anchor changed')
# 8-jamo rounds permit 3 hints; all other lengths stay at the original limit of 2.
# Update every original reference, including UI messages and vote transaction guards.
HINT_DECL = 'const MAX_HINTS_PER_ROUND = 2;'
if source.count(HINT_DECL) != 1:
    sys.exit('Original hint limit anchor changed; inspect the upstream game before publishing.')
source = source.replace(HINT_DECL,
    'function maxHintsForRound() { return Number(wordLength) === 8 ? 3 : 2; }')
source = source.replace('MAX_HINTS_PER_ROUND', 'maxHintsForRound()')
if source.count('maxHintsForRound()') < 4:
    sys.exit('Not all original hint limit references found; check the original game.js.')
source=source.replace('wordle_', 'wordrace_')
# The original game used a locally random player ID. Replace it with Firebase Auth UID,
# otherwise bets, wardrobe, spectators and game players refer to different IDs.
source,nuid=re.subn(r"let myUid = null;\s*try \{ myUid = localStorage\.getItem\('wordrace_uid'\); \} catch \(e\) \{\}\s*if \(!myUid\) \{.*?\n\s*\}", "const myUid = firebase.auth().currentUser.uid;",source,count=1,flags=re.S)
if nuid!=1:sys.exit('UID initialization anchor changed')
source=source.replace('firebase.initializeApp(firebaseConfig);',"if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);")
# All in-game points and rules stay untouched; only prohibit the legacy untrusted coin balance.
source=source.replace('function fetchRemoteProfile(n) {', 'function fetchRemoteProfile(n) { return Promise.resolve(null); // Separate project: no legacy nickname wallet')
source=source.replace('function pushProfileRemote() {', 'function pushProfileRemote() { return; // All new currency is stored in server wallet')
source=source.replace('function awardCoinsOnce(key, amount) {','function awardCoinsOnce(key, amount) { return false; // Server wallet awards once per finished round')
# Server settlement before original next-round score commit. Fail closed if settlement is not available.
source=source.replace('function nextRound() {', 'async function nextRound() {\n            if (typeof window.WR_BEFORE_NEXT_ROUND === "function") {\n                const ok = await window.WR_BEFORE_NEXT_ROUND();\n                if (!ok) return;\n            }')
# Original todayword scoring remains untouched. It grants variable points by attempt,
# answer order, remaining time, hint penalties and maker bonus.
# Do not rewrite calcRoundScores (it is authoritative in _todayword_source/game.js).
# Original score update, hints, host and master rotation all continue executing unchanged.
source=source.replace('function updateScoreboard(data) {','function updateScoreboard(data) {\n            if (window.WordRaceUI) window.WordRaceUI.renderRace(data);')
# Redirect shop to the new nonemo dressing room. Old item code remains source-preserved but is not exposed.
source=source.replace('function openShop() {','function openShop() { if(window.WordRaceUI){window.WordRaceUI.openCloset();return;}')
# Set UI avatar to actual modular artwork instead of legacy emoji through the existing source function.
source=source.replace('function renderProfileBtn() {', 'function renderProfileBtn() { if(window.WordRaceUI){window.WordRaceUI.renderProfileBadge();return;}')
source=source.replace('function avatarHtml(av, size, bounce) {', """function wrPlayerAvatarHtml(playerUid, size, bounce) {
            const p = lastRoomData && lastRoomData.players && lastRoomData.players[playerUid];
            if (window.WordRaceUI) return window.WordRaceUI.avatar(
              (p && p.wrLook) || (playerUid === myUid ? window.WordRaceUI.currentLook() : {}), size || 40, bounce);
            return avatarHtml(sanitizeAv(p && p.avatar), size || 40, bounce);
        }
        function avatarHtml(av, size, bounce) {
            if(window.WordRaceUI) return window.WordRaceUI.avatar(av && av.wrLook || (av && av.frontHair ? av : {}), size || 40, bounce);""")
# Render each player with that player's Word-Race outfit. Keep legacy emoji fallback.
PLAYER_AVATAR_PATCHES = [
    ('const avOf = p => avatarHtml(sanitizeAv(p.avatar), 32);',
     'const avOf = p => window.WordRaceUI ? window.WordRaceUI.avatar(p.wrLook || {}, 32) : avatarHtml(sanitizeAv(p.avatar), 32);'),
    ('uid, nickname: p.nickname, avatar: p.avatar, solved,',
     'uid, nickname: p.nickname, avatar: p.avatar, wrLook: p.wrLook, solved,'),
    ('avatarHtml(sanitizeAv(w0.avatar), 72, true)', 'wrPlayerAvatarHtml(w0.uid, 72, true)'),
    ('avatarHtml(sanitizeAv(p.avatar), 32)}${nameHtml(p.uid, p.nickname)',
     'wrPlayerAvatarHtml(p.uid, 32)}${nameHtml(p.uid, p.nickname)'),
    ('avatarHtml(sanitizeAv(mp && mp.avatar), 32)}${nameHtml(data.masterUid',
     'wrPlayerAvatarHtml(data.masterUid, 32)}${nameHtml(data.masterUid'),
    ('avatarHtml(sanitizeAv(x.avatar), 30)}${nameHtml(x.uid, x.nickname)',
     'wrPlayerAvatarHtml(x.uid, 30)}${nameHtml(x.uid, x.nickname)'),
    ('avatarHtml(sanitizeAv(x.avatar), isLead ? 46 : 34, isLead)',
     'wrPlayerAvatarHtml(x.uid, isLead ? 46 : 34, isLead)'),
    ('avatarHtml(sanitizeAv(msg.av), 40)',
     'wrPlayerAvatarHtml(msg.uid, 40)'),
    ('👀 ${crown(uid)}${escapeHtml(p.nickname)}${me}',
     '${window.WordRaceUI ? window.WordRaceUI.avatar(p.wrLook || {}, 24) : "👀"} ${crown(uid)}${escapeHtml(p.nickname)}${me}'),
]
for before, after in PLAYER_AVATAR_PATCHES:
    n=source.count(before)
    if n!=1:sys.exit(f'Player-specific avatar anchor not found uniquely: {before[:85]} ({n})')
    source=source.replace(before,after)
(DIST/'game.js').write_text(source,encoding='utf-8')
html=(DIST/'index.html').read_text(encoding='utf-8')
if '<script src="game.js?v=4"></script>' not in html:sys.exit('HTML main script anchor changed')
html=html.replace('<title>오늘의 단어 - 대결 모드</title>','<title>Word-Race | 오늘의 단어</title>')
html=html.replace('<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>', '''<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
''')
html=html.replace('</head>','<link rel="stylesheet" href="addons/word-race.css?v=20261123gapcasino">\n</head>',1)
html=html.replace('<script src="game.js?v=4"></script>', '''<script src="firebase-config.js"></script>
    <script src="addons/spark-economy.js?v=20261120c"></script>
    <script src="addons/pet-upgrade.js?v=20261120c"></script>
    <script src="addons/word-race.js?v=20261120c"></script>
    <script src="addons/bootstrap.js"></script>''')
(DIST/'index.html').write_text(html,encoding='utf-8')
assert (DIST/'dict/8.js').is_file(), '8 jamo dictionary missing'
assert (DIST/'addons/pet-upgrade.js').is_file(), 'pet-upgrade.js not included'
assert 'addons/pet-upgrade.js' in html, 'pet-upgrade.js not loaded by index'
assert 'window.WR_PET_CATALOG' in source, 'pet catalog not built'
assert 'WordRacePets' in (DIST/'addons/word-race.js').read_text(encoding='utf-8'), 'pet race integration missing'
print('Word-Race dist ready. Original variable scoring restored; player wardrobes attached to result/rank/chat/spectator UI.')
