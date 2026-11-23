# Word-Race 상점 가격 5배 업데이트

## 적용 범위
- nonemo 유료 꾸미기: 기존 가격 × 5
- 기존 todayword에서 목록을 읽는 펫 동물·날개: 유료 가격 × 5
- 가격 0인 기본 아이템: 무료 유지
- 기존에 구매한 아이템: 보유 기록을 그대로 사용하여 재구매 불필요
- 기존 보유 코인, todayword 이전 보상, 정답 점수, 관전자 참여금: 변경 없음

## 가격 예시
- 60 → 300코인
- 85 → 425코인
- 90 → 450코인
- 550 → 2,750코인 (기존 펫 날개 가격 예시)

## 적용 순서
1. GitHub Desktop에서 Fetch origin / 필요한 경우 Pull origin.
2. 이 ZIP의 **assets/nonemo/catalog.json**, **tools/build.py**만 Word-Race 폴더에 같은 경로로 덮어쓰기.
3. Commit to main → Push origin.
4. GitHub Actions의 최신 배포 성공 후 Ctrl+F5 또는 시크릿 창에서 가격 확인.

주의: addons/spark-economy.js, addons/pet-upgrade.js, firebase-config.js, _todayword_source는 덮어쓰지 마세요. 현재 보유 아이템을 재계산하거나 구매 코인을 소급해서 회수하지 않습니다.

펫 아이템 가격은 Word-Race 배포 시 원본 todayword의 펫 카탈로그를 읽으며 5배로 계산합니다. 원본 todayword 사이트 자체의 상점 가격은 변경하지 않습니다.
