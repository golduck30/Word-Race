# Word-Race — 독립 배포 구조 (GitHub Pages + Firebase Spark 무료)

## 핵심

`Word-Race`가 더 이상 **매 배포마다** `todayword`를 다운로드하지 않습니다.
다만 현재 전달하는 ZIP에 기존 todayword 원본 파일 자체는 들어 있지 않습니다. 최초 설치 때 GitHub Actions의 **Import original todayword ONCE**를 한 번만 실행해서 원본 `game.js`, `index.html`, `dictionary.js`, `dict/` 등의 파일을 Word-Race 저장소의 `_todayword_source/`에 영구 복사합니다.

**이 최초 1회 가져오기가 성공하고, `_todayword_source` 파일이 Word-Race 저장소에 실제로 커밋된 것을 확인한 다음에만** 기존 todayword를 삭제할 수 있습니다. 이후 배포 시 `todayword` 저장소에 접속하지 않습니다. 최초 가져오기 전에 기존 저장소를 삭제하면 실패합니다.

## 순서

1. 기존 todayword를 **삭제하지 않은 상태**에서 새 공개 GitHub 저장소 `Word-Race`를 준비합니다.
2. 이 ZIP을 풀어 **모든 파일(숨김 `.github` 폴더 포함)**을 Word-Race 루트에 업로드합니다. ZIP 내부의 `Word-Race_Independent` 폴더 자체를 한 단계 더 올리지는 마세요.
3. Word-Race 저장소의 **Actions → Import original todayword ONCE → Run workflow**를 1회 실행합니다. 처음에는 Actions 실행 권한/설정 활성화가 필요할 수 있습니다.
4. 실행 결과가 초록색 성공인지 확인한 후 **Code → `_todayword_source` → `game.js`, `dictionary.js`, `dict/5.js`~`dict/8.js`** 파일이 실제로 있는지 확인합니다. `ORIGINAL_COMMIT.txt`에는 복사한 원본 커밋 ID가 기록됩니다.
5. GitHub Settings → Pages → Source → **GitHub Actions**로 설정합니다. 원본 복사 후 자동으로 실행되는 `Deploy independent Word-Race`가 성공하는지 확인합니다. 필요하면 Actions에서 Deploy workflow를 수동 실행하세요.
6. Firebase 새 프로젝트 **Spark 무료**에서 Authentication → Anonymous, Realtime Database를 활성화하고 `firebase-config.js`를 채웁니다. `firebase deploy --only database`로 DB 규칙을 배포합니다. Cloud Functions는 필요하지 않습니다.
7. 최종 게임 사이트 `https://golduck30.github.io/Word-Race/`가 열리는지 확인합니다. 5~8자모 사전, 대결, 1인 모드, 친구들 동시 접속을 직접 검증하세요.
8. **6~7을 확인한 후** 기존 todayword를 삭제해도 새 Word-Race 배포는 원본 저장소에 접근하지 않습니다.

## 독립성 확인 방법

Word-Race `.github/workflows/deploy.yml`에 `git clone`이 없어야 합니다. 배포 시 `python tools/build.py`는 오직 **Word-Race 내부 `_todayword_source`**만 참조합니다. `tools/build.py`는 수정된 Word-Race 화면·캐릭터·게임 기능을 `dist/`에 조립합니다.

원본 todayword를 변경하더라도 Word-Race는 자동 변경되지 않습니다. Word-Race에 저장된 원본을 사용하므로 코드 안정성은 좋아지지만 새 규칙/사전을 반영하려면 의도적으로 업데이트해야 합니다.

## 배포 검사 및 한계

- `node tests/spark-economy.test.js`와 `python tests/check_release.py`로 기존 무료 코인·에셋 검사 가능.
- 원본 파일을 가져오기 전에는 전체 `index.html`과 사전이 완성되지 않습니다. 초기 ZIP만으로 즉시 게임이 실행된다고 주장할 수 없습니다.
- 실제 Firebase 다중 사용자 대결은 아직 검증되지 않았고, Spark 무료 구조의 코인/베팅은 조작 방지 서버가 없는 **지인 전용 신뢰 기반 포인트**입니다. 현금·상품 교환 용도로 사용하면 안 됩니다.
- 기존 todayword 게임 규칙을 유지하려는 빌드이지만, 새 상점으로 교체하면서 원본 구형 상점 관련 기능까지 전부 호환되는 것은 아닙니다.

기존 설치에 대한 기능 및 라이선스 안내는 `README_ORIGINAL_SPARK.md`와 `ASSETS_AND_LICENSE.md`도 참조하세요.
