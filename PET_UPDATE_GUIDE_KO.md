# Word-Race 펫 시스템 업데이트 (2026-11-20)

## 무엇이 바뀌나?
- 기존 todayword의 `AVATAR_BASES` 동물 캐릭터와 `EXTRA_SHOP_ITEMS.wing` 날개 목록을 Word-Race **펫 전용**으로 재사용합니다.
- 기존 `assets/wings/*.svg` 7종은 이미 한 번 가져온 todayword 원본의 에셋을 그대로 이용합니다.
- nonemo 사람형 아바타는 그대로, 펫은 공용 트랙에서 사람 캐릭터 뒤를 따라다닙니다.
- 상단 **🐾 펫 꾸미기**에서 동물, 날개를 개별 구매·장착할 수 있습니다.
- 펫 코디는 기존 Spark DB 경로 `wrEconomy/state/users/<uid>`의 `petOwned`, `petLook`, `petMigrated`에 저장됩니다.
- todayword 코인, 타일, 모자 등 다른 코디 데이터는 이전하지 않습니다.

## GitHub Desktop으로 적용 (Word-Race)
1. 이 ZIP을 압축 해제합니다.
2. 압축을 푼 **내부의 `addons/`, `tools/`, `tests/` 폴더와 파일**을 GitHub Desktop의 Word-Race 로컬 폴더에 복사합니다. 기존 같은 이름의 파일은 덮어씁니다. **기존 `_todayword_source` 폴더는 그대로 두세요.**
3. GitHub Desktop → Summary `Add todayword emoji pet wardrobe` → Commit to main → Push origin.
4. GitHub Actions `Deploy independent Word-Race` 성공을 확인하고 `/Word-Race/`에서 새로고침합니다.
5. Firebase 규칙을 새로 붙여넣을 필요는 없습니다. 현재 `wrEconomy/state` 트랜잭션을 사용합니다.

## 기존 todayword 아이템 이전
1. 예전에 **todayword를 사용했던 같은 브라우저/같은 브라우저 프로필**로 `https://golduck30.github.io/Word-Race/`에 접속합니다.
2. Firebase에 연결한 후 `🐾 펫 꾸미기` → `🔗 todayword 아이템 가져오기`를 클릭합니다.
3. todayword에서 사용했던 닉네임을 입력합니다. 이 브라우저에 저장된 `wordle_profile::<nickname>` 기록이 있어야 합니다.
4. 이전할 동물·날개를 확인 후 확정합니다. 처음 한 번만 가져오며 보유 코인은 옮기지 않습니다.
5. 옮긴 동물·날개는 이제 Word-Race 펫 코디에 저장되어 같은 Firebase 익명 UID 계정에서 이용 가능합니다.

## 정말 중요한 제약
- todayword는 닉네임을 계정 비밀번호처럼 인증하지 않았습니다. 동일 닉네임만으로 다른 기기 소유권을 증명할 수 없으므로 **이번 버전은 브라우저의 기존 로컬 보유 기록이 있는 경우로만 이전을 제한**했습니다. 그러나 로컬 저장소는 이용자가 변경할 수 있어 부정 획득 방지 기능으로는 완벽하지 않습니다.
- Firebase 익명 인증은 **브라우저/기기 변경이나 사이트 데이터 삭제 시 UID가 바뀔 수 있습니다.** UID가 바뀌면 이전한 펫도 자동으로 연결되지 않습니다. 장기적인 계정 승계를 원한다면 구글 로그인처럼 영구 계정 연결을 도입해야 합니다.
- 기존 todayword를 사용한 **다른 기기**에서만 보유 기록이 있는 경우, 해당 기기/브라우저로 Word-Race에 접속하여 이전해야 합니다.
- todayword와 Word-Race는 같은 `golduck30.github.io` 출처(origin)를 공유하므로 로컬 저장소에 접근할 수 있습니다. 도메인을 나중에 다르게 변경하면 이 자동 이전 방식은 작동하지 않습니다.
- 이미 Word-Race에 등록된 다른 계정이 같은 todayword 닉네임을 사용했다고 하더라도 자동 지급하지 않습니다.
- Spark 무료 버전은 클라이언트가 DB 상태를 수정할 수 있는 구조이므로, **의도적으로 조작하는 사용자에 대한 강한 보안 보장은 없습니다.** 지인용 무료 게임에 적합한 범위입니다.
- ZIP은 Word-Race 기존 저장소에 덮어쓰는 소스 업데이트입니다. 기존 가져오기 작업을 완료한 `_todayword_source` 파일은 ZIP에 다시 포함하지 않았습니다. 빌드는 현재 GitHub Actions에서 원본 게임 엔진/단어 사전을 다시 합칩니다.

## 테스트
- `node tests/pet-upgrade.test.js`
- `node tests/spark-economy.test.js`
- `python tests/check_release.py`

로컬 테스트는 통과했으나 실제 GitHub Actions/Firebase 동시 접속 통합 테스트는 아직 완료되지 않았습니다.
