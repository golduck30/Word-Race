# Word-Race 통합 업데이트 (펫 + 닉네임 + 기존 게임)

이 ZIP에는 기존에 만든 **닉네임 유지 기능과 펫 기능을 모두 합친 단일 버전**이 들어 있습니다. 이 ZIP만 사용하고, 이전 펫/닉네임 패치 ZIP은 다시 적용하지 마세요.

## 적용 방법 (기존 Word-Race 저장소)
1. GitHub Desktop에서 **Fetch origin / Pull origin**으로 먼저 최신 GitHub 변경 사항을 받아 둡니다.
2. 이 ZIP을 압축 해제하고 **안쪽의 파일과 폴더를 전부** 현재 Word-Race 저장소 폴더로 복사합니다. 같은 파일이 있으면 덮어씁니다.
3. **`_todayword_source/`는 삭제하거나 수정하지 마세요.** 최초 가져오기를 성공한 저장소의 원본 파일은 그대로 유지합니다.
4. **`firebase-config.js`는 이 ZIP에 아예 넣지 않았습니다.** 기존에 입력한 Firebase 설정은 그대로 유지됩니다.
5. GitHub Desktop → 변경 사항 확인 → `Commit to main` → `Push origin`.
6. GitHub Actions → `Deploy independent Word-Race`의 최신 실행이 초록색 체크인지 확인합니다.
7. https://golduck30.github.io/Word-Race/ 로 접속해 `🐾 펫 꾸미기` 버튼을 확인하고, `Ctrl+F5`로 새로고침합니다.

## 펫 표시 / 이관
- 원본 todayword 동물 이모지와 SVG 날개만 펫으로 사용합니다.
- `🐾 펫 꾸미기`에서 동물과 날개를 별도로 구매·장착할 수 있습니다.
- `🔗 todayword 아이템 가져오기`는 **이전에 todayword를 하던 동일 브라우저**의 로컬 보유 기록이 있을 때 1회 사용할 수 있습니다.
- 이후 Word-Race에서 산 코인·펫은 **동일 닉네임 기준** Firebase 공유 보관함으로 동기화합니다.
- 펫 이관 때 과거 todayword 코인은 옮기지 않습니다.

## 한계 / 데이터 보호
- 이 ZIP은 GitHub에 이미 복사된 `_todayword_source` 파일을 전제로 하므로, **빈 저장소에 그대로 업로드하면 배포가 실패**합니다.
- Firebase 익명 인증과 무료 Realtime Database를 사용하며, 별도 Cloud Functions가 없습니다. 닉네임만 같으면 같은 보관함을 쓰므로 신뢰하는 지인용입니다.
- **현재 사용자 Firebase 프로젝트 실시간 대결까지 자동 검증한 결과는 아닙니다.** GitHub Actions의 빌드 검사, 브라우저 테스트가 따로 필요합니다.
- 기존 Firebase `database.rules.json`은 함께 들어 있습니다. Firebase 콘솔 규칙을 이미 변경했다면 재게시할 필요가 없습니다.
