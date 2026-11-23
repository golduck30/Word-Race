# Word-Race — Firebase Spark(무료) 배포 패키지

**새 사이트:** `https://golduck30.github.io/Word-Race/` (배포 전에는 비활성)

**유료 결제 계정 / Cloud Functions / Cloud Scheduler / 서버 API가 필요하지 않습니다.** GitHub Pages와 Firebase 무료 Spark의 익명 Authentication, Realtime Database만 사용합니다. Firebase의 무료 제공량 및 계정/지역별 조건은 공식 가격표에서 확인하세요.

## 이 파일이 제공하는 것

- todayword 원본 게임 엔진과 5~8자모 사전을 **GitHub Actions 빌드 시 가져옵니다**. 이 ZIP만 로컬에서 열어서는 완성된 대결 게임이 나오지 않습니다.
- 원본 `game.js`의 게임 보드, 초록/노랑/회색 판정, 5회 도전, 출제자 순환, 힌트 투표, 타임어택/무제한, 방장, 강퇴, 활동 상태, 채팅, 기존 점수 계산 로직을 그대로 이용합니다.
- 별도 `solo.html`: 원본 단어 사전 사용, 힌트 없음, **코인 지급 없음**.
- nonemo CC0 모듈식 에셋 적용. 피부·눈·헤어·옷·하의·안경·수염의 개별 슬롯. 펫과 날개는 보류.
- 1줄 실시간 레이스: 상대 점수 격차로 거리 표시. 점수 숫자/눈금 없음. 캐릭터 중첩 허용.
- 1라운드당 관전자 1회, 시작 후 60초 내에 참가자 1명을 20코인으로 예측. 맞힌 관전자끼리 참여금을 균등 분배(정수 나머지 소멸). 공동 1등 허용. 정답자가 전원 0점이면 환급. 적중자 0명인데 실제 우승자가 있으면 참여금 소멸.
- 기본 지급 코인 200개, 캐릭터 상점 구매 및 장착. 기존 todayword의 코인/구매내역은 이전하지 않음.
- 익명 Firebase UID를 game.js 내 player UID와 일치시킵니다.

## 매우 중요한 보안 특성

**이 무료 버전의 코인과 예측은 친한 친구끼리 하는 '신뢰 기반 게임용 포인트'입니다.**

서버의 비밀 키 또는 Cloud Functions가 없으므로, 게임 클라이언트를 수정할 줄 아는 사람은 Firebase DB에 임의 점수, 코인, 예측, 보상 기록을 기록할 수 있습니다. DB 트랜잭션은 동시에 클릭했을 때의 충돌과 *정상적인 클라이언트에서의* 중복 정산을 방지할 뿐, 조작 자체를 막지는 못합니다. 현재 규칙은 인증된 사람이 `wrEconomy/state` 전체를 읽고 쓸 수 있으므로 **서로의 베팅 선택과 지갑도 열람할 수 있습니다**. 포인트를 현금·상품·현물 경품으로 교환하거나, 불특정 다수에게 공개된 경쟁 게임에 이용하지 마세요.

순수 Spark + GitHub Pages 조합에서 **비공개 베팅, 부정행위 방지, 자동 서버 정산**까지 안전하게 완성할 수 있다고 주장하지 않습니다. 호스트/출제자가 라운드 종료 시 접속 중이어야 자동 정산을 시도하며, 정산 실패 시 다음 라운드 진행 전에 다시 시도해야 합니다. Google 로그인 등을 설정하지 않는 한 익명 로그인 데이터는 브라우저 인증 기록이 사라지면 복구가 어려울 수 있습니다.

## 설치 단계

1. GitHub에서 새 공개 Repository `Word-Race`를 생성합니다.
2. 이 ZIP을 압축 해제하고 **`.github/` 숨김 폴더 포함 전체**를 저장소의 최상위에 올립니다. `dist/` 폴더는 생성할 필요가 없습니다.
3. Firebase 콘솔에서 새 프로젝트를 **Spark (무료)** 로 만듭니다. 결제 계정을 연결하지 마세요.
4. Authentication → Sign-in method → **Anonymous(익명)** 활성화.
5. Realtime Database → 데이터베이스 생성(무료에서 제공하는 기본 DB 인스턴스 1개). 시작 모드는 **잠금 모드**를 추천합니다. `firebase.json`에 DB 규칙 파일을 지정해 놓았습니다.
6. Project settings → Web app 생성. `firebase-config.js`의 7개 필드에 해당 프로젝트 설정 값을 복사합니다. 이 값은 공개 클라이언트 설정이지 관리자 비밀 키가 아닙니다.
7. PC에서 Node.js + Firebase CLI를 설치합니다: `npm install -g firebase-tools` → `firebase login` → `firebase use --add` (새 Firebase 프로젝트 선택).
8. **DB 규칙만** 배포합니다: `firebase deploy --only database`. `functions`를 배포하지 않습니다.
9. GitHub Settings → Pages → Source에서 **GitHub Actions** 선택.
10. GitHub Actions가 기존 `https://github.com/golduck30/todayword` 원본을 복사하고 `tools/build.py`를 실행하여 Pages에 배포합니다.
11. 브라우저를 3개 이상 열어 대결 2명 + 관전자 1명으로 테스트합니다.

### 비용 범위

- GitHub Pages: 공개 Repository 무료 배포 조건에서 비용 없음.
- Firebase Spark: 한도 내 무료. Realtime Database 동시 연결 100개 제한이며 저장공간·다운로드에도 한도 적용.
- 사용량이 Spark 한도를 초과하면 기능 제한이 발생할 수 있습니다. 자동으로 유료 결제가 발생하는 방식은 아닙니다.

## 로컬 테스트

단위 테스트와 패키지 검사:

```bash
node tests/spark-economy.test.js
python tests/check_release.py
```

원본 사전+게임을 합쳐 로컬 웹서버에서 확인하려면 인터넷이 되는 컴퓨터에서:

```bash
git clone --depth 1 https://github.com/golduck30/todayword.git _todayword_source
python tools/build.py
python -m http.server --directory dist 8000
```

`http://localhost:8000/`을 엽니다. Firebase 설정이 없으면 대결방은 동작하지 않으며 `solo.html`만 사용 가능합니다.

## 통합 테스트 필수 항목

- 5/6/7/8자모 단어와 사전 로딩, 중복 자모 색상 판정, 5회 제한
- 방장·출제자 순환, 제한시간/무제한, 힌트 투표, 강퇴/관전/대기, 채팅
- 다중 접속 시 참가자 UID와 Firebase 로그인 UID 일치
- 한 라운드에 관전자 3명, 1명만 적중 → 참여금 60코인 지급
- 동일 관전자 재참여 거부, 동일 라운드 중복 정산 차단
- 적중자 전원 0명/전원 실패/동점 1등 사례
- 출제자·방장 중 한 명이 접속 종료됐을 때 정산 유예와 복구
- 아이템 구매/착용 후 다른 브라우저에서 코디 확인
- 1인 모드 정답/실패 때 온라인 코인 불변

## 한계와 원본 버전 의존성

1. `tools/build.py`는 원본 game.js의 특정 함수들을 확인해 패치합니다. 원본 저장소가 업데이트되면 빌드 실패 가능성이 있습니다. 이 경우 원본 커밋을 고정하거나 빌더를 업데이트해야 합니다.
2. 본 코드에서 실제 Firebase 다중기기 통합 테스트는 수행하지 않았습니다. 정식 공개 버전으로 간주하기 전에 반드시 실사용 검증이 필요합니다.
3. 전신 캐릭터는 nonemo의 정적 파츠를 부드럽게 흔드는 모션이며, 실제 달리기 프레임 스프라이트가 아닙니다.
4. old todayword의 옛 상점/미니 카지노 UI 일부는 원본 HTML에 남아 있을 수 있지만, Word-Race의 코인 지갑과 연동하지 않습니다. **모든 옛 상점 기능까지 완전 동일하게 복제한 프로젝트는 아닙니다.**

## 에셋

사용자가 업로드한 nonemo `Free Character Creation Asset Pack`의 CC0 이미지를 포함했습니다. `ASSETS_AND_LICENSE.md` 참조.
