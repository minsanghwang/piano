# piano

출장 피아노 조율사를 위한 고객/악기 이력 및 재방문 관리 도구 (개인 포트폴리오 프로젝트).

- 스펙: [docs/spec.md](docs/spec.md) · 결정/이슈/변경 로그: [docs/changelog.md](docs/changelog.md)
- 스택: Next.js (App Router) + Supabase (Auth, Postgres, RLS)

## 실행
1. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql`을 SQL Editor에서 실행
2. Auth 설정에서 Site URL을 `http://localhost:3000`, Redirect URL에 `http://localhost:3000/auth/callback` 추가
3. `.env.example`을 `.env.local`로 복사해 값 입력
4. `npm install && npm run dev`

## 화면
- `/today` 오늘 일정 · `/bookings` 예약 요청 수락/거절 · `/reminders` 재방문 안내 · `/` 고객 · `/settings` 설정, 가능 시간, 예약 링크
- `/book/<slug>` 고객용 예약 페이지 (로그인 없음)

## 배포
운영 주소: https://piano-sang-e.vercel.app (`main`에 push하면 자동 배포)

Vercel에 저장소를 연결하고 환경변수 2개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)를 넣은 뒤, Supabase Auth의 Site URL과 Redirect URL(`https://<도메인>/auth/callback`)을 배포 주소로 바꿉니다.

## 계정
이메일+비밀번호로 가입/로그인하고(8자 이상), 비밀번호 없이 이메일 링크로도 로그인할 수 있습니다. 가입 시 이메일 확인은 Supabase 설정(Authentication → Sign In / Providers → Email → Confirm email)을 따릅니다.

비밀번호를 잊으면 `/forgot-password`에서 재설정 링크를 받고, 로그인 상태에서는 설정의 "비밀번호 변경"을 씁니다. 설정 화면 맨 아래의 "계정 삭제"는 계정과 모든 데이터를 영구 삭제합니다.

## 테스트
`npm test`: 로컬 인메모리 Postgres(PGlite)에서 마이그레이션을 실행하고, 조율사 간 데이터 격리를 검증합니다.

`e2e/errors.mjs`: 저장 실패 시 오류 안내 검증. `e2e/account.mjs`: 비밀번호 변경, 재설정 요청, 계정 삭제 검증(계정 2개 필요). `e2e/auth.mjs`: 로그인/로그아웃/가입 화면 검증(새 주소로 실제 가입 요청은 보내지 않음). `e2e/run.mjs`: 실제 Supabase와 브라우저(Playwright)로 전체 흐름을 검증하는 스크립트입니다(고객 30명 입력, 자동 권장일, 재방문 초안, 익명 예약, 수락, 일정). 로그인 가능한 테스트 계정이 필요하고(`E2E_EMAIL`, `E2E_PASSWORD`), `npm run build && npx next start -p 3100` 상태에서 `node e2e/run.mjs`로 실행합니다. 이 계정은 이메일 링크 로그인 없이 비밀번호로 만든 임시 계정이어야 하며, 끝나면 삭제하세요. 2026-11-05에 통과했습니다. 대상 주소는 `BASE` 환경변수(기본 `http://localhost:3100`)로 바꿀 수 있어 배포본에도 돌릴 수 있습니다. 화면이 멈추는 간헐 현상(변경 로그 I13)이 있어 멈추면 새로고침하고 계속하며 횟수를 보고합니다. 샌드박스처럼 프록시를 거치는 환경에서는 Node에 `NODE_USE_ENV_PROXY=1`을 붙여야 `fetch`가 동작합니다. 실행할 때마다 테스트 계정의 기존 데이터를 먼저 지웁니다.
