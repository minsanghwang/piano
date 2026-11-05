# piano

출장 피아노 조율사를 위한 고객/악기 이력 및 재방문 관리 도구 (개인 포트폴리오 프로젝트).

- 스펙: [docs/spec.md](docs/spec.md) · 결정/이슈/변경 로그: [docs/changelog.md](docs/changelog.md)
- 스택: Next.js (App Router) + Supabase (Auth, Postgres, RLS)

## 실행
1. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql`을 SQL Editor에서 실행
2. Auth 설정에서 Site URL을 `http://localhost:3000`, Redirect URL에 `http://localhost:3000/auth/callback` 추가
3. `.env.example`을 `.env.local`로 복사해 값 입력
4. `npm install && npm run dev`

## 테스트
`npm test`: 로컬 인메모리 Postgres(PGlite)에서 마이그레이션을 실행하고, 조율사 간 데이터 격리를 검증합니다.
