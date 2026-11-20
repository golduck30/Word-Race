# Word-Race 화면 수정 3종 + 정답 이펙트 기획 준비

## 수정된 파일 (모두 기존 Word-Race에 덮어쓰기)
- `addons/pet-upgrade.js`: 펫 날개 이미지를 좌·우 쌍으로 렌더링
- `addons/word-race.css`: 날개 좌우 미러 및 배치 스타일
- `addons/word-race.js`: 오늘의 단어 원본 헤더를 최상단에 유지하고 Word-Race 레이스를 그 아래에 배치
- `solo.html`, `solo.js`: 대결 모드와 유사한 한글 온스크린 키보드, 입력 중인 자모 표시, 키 색깔 판정

## 적용
1. GitHub Desktop의 Word-Race 저장소에서 `Fetch origin` / 필요시 `Pull origin`을 먼저 실행
2. 압축 해제한 내부 파일/폴더를 Word-Race 폴더에 덮어쓰기 (상위 `addons` 폴더 유지)
3. `Commit to main` → `Push origin`
4. GitHub Actions의 Deploy 작업이 초록 체크면 사이트 강력 새로고침 (Ctrl+F5)

## 유지되는 파일
- `_todayword_source` (원본 게임 엔진/단어 사전)
- `firebase-config.js`, `database.rules.json` (Firebase 설정)
- `assets/nonemo`, `assets/wings`
- 모든 아이템 및 코인 데이터

## 이번에 변경하지 않은 부분
- 정답 이펙트는 시안 선택 후 개선할 수 있도록 그대로 유지

## 확인 사항
- 실제 Github Actions+Firebase 환경에서는 아직 브라우저 통합 테스트 전
- `assets/wings`의 원본 SVG가 단일 날개 모양이라고 가정한 미러 배치. 좌우 모양을 실제 사이트에서 확인
