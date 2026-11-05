# HANDOFF — piano-tuner field-service tool ("조율 노트")

Written 2026-11-05 for the next Claude session. English on purpose; **reply to the user in Korean** (they write Korean; keep identifiers/technical terms in English where natural).
Read this whole file first. It is self-contained. For the full decision/issue history read `docs/changelog.md`; for the course-submission texts read `docs/plan.md` and `docs/checkpoint1.md`.

## 0. TL;DR

- A working, deployed web app for on-site piano tuners in Korea (customers/instruments/visit history, re-tune reminders, public booking page, today's schedule). Personal portfolio project, **not** a business; it is also being submitted to a course ("Workbench": goal form → plan.md upload → "중간 점검 1차" submission).
- Production: https://piano-sang-e.vercel.app · Source: https://github.com/minsanghwang/piano (`main` auto-deploys to Vercel).
- All planned stages 1–4 are built, plus accounts, edit/delete, error banners, phone layout. Tests: 24 DB tests + 6 browser E2E scripts, all passing at last run.
- **Things that need attention first** (details in §6): (a) a throwaway test account may still exist in the live DB, (b) the production deploy of the last commit was not smoke-tested, (c) real email flows (signup confirm, password reset, magic link) were never verified by anyone, (d) an unexplained intermittent UI stall (I13).

## 1. The user and how to work with them

- App developer, no factory/procurement background, building this for a portfolio. Making money is explicitly NOT a goal. Language: Korean.
- Their standing working guidelines (follow them):
  1. **Think before coding** — state assumptions, ask when uncertain, present alternatives instead of silently choosing, push back if something simpler exists.
  2. **Simplicity first** — minimum code that solves the problem; no speculative features/abstractions/config.
  3. **Surgical changes** — touch only what the request needs; match existing style; mention (don't delete) unrelated dead code.
  4. **Goal-driven execution** — verifiable goals, tests first where sensible, short plan with a verify step for multi-step work.
- They want **decisions, changes and issues recorded** in `docs/changelog.md` (append a row for every notable change; keep the Decisions/Open issues tables current).
- They said "decide on your own and proceed until it is finished" (broad autonomy), but they still approve destructive/outward-facing actions when a tool asks. They interrupt when something takes too long — keep the user informed with short status lines and don't chain long sleeps.
- They do **not** want an interview step in plans (they informally ask their mother, who runs a piano academy, instead). **Her feedback has never been reported** (issue I5) — ask once, record it, don't nag.
- Be honest about what was and wasn't verified. Several earlier hypotheses of mine were wrong and were corrected by tests; keep that standard.

## 2. Product

- For: solo on-site piano tuners (Korea). Customers have **no accounts**; they act through links only.
- Core hypothesis (UNVERIFIED with real tuners): income comes from the same customers calling back every year, so rebooking/retention is the focus.
- Instruments: piano only (`instruments.type` is constrained to `'piano'`, kept as a field so others can be added). Visit `work_type`: tuning/regulation/voicing/repair.
- Notifications: reminders are **drafts** the tuner copies/shares (KakaoTalk/SMS by hand). No automatic sending (Kakao 알림톡 reportedly needs a business channel + approved templates — unverified).
- Out of scope: route optimization, payments, invoices, brokerage/reviews, multi-tuner teams, automatic SMS/Kakao sending.

### Features (all implemented)
| Area | What it does |
|---|---|
| Accounts | Email+password signup/login/logout, password reset (`/forgot-password` → emailed link → `/reset-password`), password change (Settings), account deletion (Settings, type "삭제"; removes everything incl. customers' names/phones in bookings). Email magic-link login kept as a secondary option. |
| Customers | List (`/`), add, detail page `/customers/[id]` with edit (name/phone/address/notes/contact consent), delete (behind a fold-out warning). |
| Instruments / visits | Add/edit/delete instrument; add/edit/delete visit records. Next due date auto = visit date + tuner's default interval (default 12 months) when left empty. |
| Reminders | `/reminders`: instruments due within 28 days or overdue, with a message draft incl. the booking link, copy/share button, "보냈어요" logs it (`reminder_logs`). Warns if no contact consent recorded. |
| Availability + booking | Settings: weekly windows + rest days; the tuner's public link `/book/<slug>` (32-hex slug). Customers pick a 2-hour slot (next 14 days, ≥12 h ahead), enter name/phone/address. Days are collapsed `<details>` (first day open). |
| Bookings | `/bookings`: accept/decline requests. `/today`: accepted visits for today in time order, Kakao/Naver map search links, "방문 완료"; upcoming accepted visits below. |
| PWA | `manifest.webmanifest` + icon (public, not behind login). |

## 3. Architecture

**Stack**: Next.js 15.5.29 (App Router, server components + inline server actions), React 19.1.10, Tailwind 4, TypeScript, Supabase (Auth + Postgres + RLS) via `@supabase/ssr`, Vercel hosting (function region `icn1`/Seoul, same as the DB). Vitest + PGlite for DB tests; Playwright (preinstalled in the sandbox) for browser E2E.

**Supabase project**: `piano-tuner`, id `adhqxliwvrgwdjpnjyzs`, region ap-northeast-2, URL `https://adhqxliwvrgwdjpnjyzs.supabase.co`. Env vars (in Vercel and local `.env.local`, which is git-ignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key; get it from the dashboard or the Supabase MCP `get_publishable_keys`). **Never commit keys or any test password** (the repo is public).

**Vercel**: team `SangE` (`team_RnAHZus4nWazzW6P22esFwRs`), project `piano` (`prj_zRPm0YCwAJUqJwj1TNceQUo3hqKJ`), Git-linked, production branch `main`, deployment protection OFF (customers must open `/book/...` without a Vercel login), function region `icn1`. Project Node version is the default `26.x` (unusual; not investigated).

**Git**: `main` = production. `claude/stage1-crud` and `claude/i8-errors` are stale mirrors of `main` (both at the same commit) and can be deleted. Remote `main` was at `5c264a9` when this was written.

### Database (migrations in `supabase/migrations/`, mirrored to the live DB via the MCP `apply_migration`)
1. `0001_init` — `tuners`, `customers`, `instruments`, `services`. Every table carries `tuner_id`; instruments/services use **composite FKs `(id, tuner_id)`** so a row can never be attached to another tuner's parent. RLS policies: a row is visible/changeable only by its tuner (`tuner_id = (select auth.uid())`).
2. `0002_reminders` — `reminder_logs`.
3. `0003_booking` — `tuners.booking_slug`, `availability_rules`, `availability_exceptions`, `booking_requests` (partial unique index: one live request per slot). Anonymous visitors never touch tables; they only call two **SECURITY DEFINER** functions: `public_open_slots(slug)` and `create_booking_request(...)` (validates the slot, max 10 requests/hour/tuner). `booking_requests` has no INSERT policy for tuners on purpose.
4. `0004_tuner_on_signup` — trigger on `auth.users` creates the `tuners` row (replaces a per-request upsert).
5. `0005_delete_account` — `delete_my_account()` (SECURITY DEFINER, authenticated only); deletion cascades through every table.
Note: the live migration history also contains a meaningless `init` (`select 1`) entry from an early mistake; harmless.
Supabase's security advisor reports "SECURITY DEFINER executable by anon/authenticated" for these functions — **intentional** (documented in the changelog).

### Code map (`src/`)
- `middleware.ts` — refreshes the Supabase session cookie; redirects anonymous visitors to `/login` except `/login`, `/signup`, `/forgot-password`, `/auth/*`, `/book/*`, `manifest`/icon; redirects signed-in users away from `/login`, `/signup`.
- `lib/tuner.ts` — `getSessionUser()` / `requireTuner()` read the user id from the session cookie **without a network call** (the middleware already verified the user; RLS is the real gate). `lib/supabase/server.ts` — server client.
- `lib/actionResult.ts` — `failIf(error, path)` (redirect back with `?error=<code>&t=<ts>`) and `done(path)` (just `revalidatePath`, **no redirect/headers read**; see I13 notes). `lib/actionMessages.ts`, `lib/authMessages.ts` — Korean messages. `lib/reminders.ts` — date math/draft text (unit-tested). `lib/format.ts` (KST formatting, map links), `lib/origin.ts`.
- `components/`: `SubmitButton` (pending label "처리 중..." + a CSS-only "응답이 늦어지고 있어요" notice after 8 s), `ErrorBanner` (client; hides on next form submit), `Nav`/`NavLink` (prefetch off, "…" while navigating), `CopyButton`.
- `app/`: `page.tsx` (customers), `customers/[id]`, `reminders`, `bookings`, `today`, `settings`, `login` (+`actions.ts`: all auth server actions), `signup`, `forgot-password`, `reset-password`, `account/actions.ts` (password update, account deletion), `book/[slug]` (+`done`), `auth/callback/route.ts` (PKCE code exchange; sends sessions whose JWT `amr` contains `recovery` to `/reset-password`), `loading.tsx`, `manifest.ts`.

## 4. How to run and test

```bash
npm install            # react is pinned to 19.1.10; vitest must be v3 (v5 conflicts with @types/node 20)
npm run dev            # needs .env.local
npm test               # 24 DB tests (PGlite = real Postgres in WASM; no network)
npm run lint && npx tsc --noEmit && npm run build
```
- DB tests (`tests/`): `rls.test.ts` (isolation, cascade, signup trigger, account deletion), `booking.test.ts` (public functions, double booking, rate limit, exceptions), `reminders.test.ts`. They run **all** migrations in order on a stub of Supabase's `auth` schema, so any new migration is covered automatically.
- Browser E2E (`e2e/*.mjs`, Playwright, hit the real Supabase through the app; target via `BASE` env, default `http://localhost:3100`; see README). They need a **throwaway password account** passed as `E2E_EMAIL`/`E2E_PASSWORD` (`account.mjs` needs two: `E2E_KEEPER`, `E2E_DELETEE`):
  - `run.mjs` full flow (30 customers, auto next date, reminder draft, anonymous booking, accept, schedule) · `auth.mjs` login/logout/signup validation · `account.mjs` password change, reset request, account deletion · `errors.mjs` failed saves show a banner · `mobile-edit.mjs` iPhone-13-size layout checks (no sideways scroll, tap targets, screenshots via `SHOTS_DIR`) + edit/delete features.
  - They tolerate and count the I13 stall (refresh and continue).
- **How test accounts are made** (no signup email needed): with the Supabase MCP `execute_sql`, insert into `auth.users` (confirmed, `encrypted_password = extensions.crypt('<random password>', extensions.gen_salt('bf'))`, plus a matching `auth.identities` row). The `on_auth_user_created` trigger creates the `tuners` row. **Delete them afterwards** (`delete from auth.users where email like 'e2e-%@example.com'`; everything cascades). Use a random password, never one written into the repo.
- Sandbox quirks:
  - Node `fetch` does not use the proxy by default: run Node scripts and `next start` with `NODE_USE_ENV_PROXY=1` (curl works without it). The user has set the environment's network access to "full".
  - Calls from this sandbox to Supabase/Vercel are slow and proxied; local E2E runs take 2–4 minutes and show far more I13 stalls than the real deployment. Prefer testing against a Vercel preview (`git push origin <branch>` → preview URL; an identical commit SHA that already deployed will not create a new deployment).
  - Foreground `sleep` is blocked by the harness; `for i in $(seq ..); do sleep 10; done` inside one command works, as does polling with `curl`.

## 5. Gotchas learned the hard way (don't repeat)

- Server-action forms: `<button name="x" value="y">` values are **not** delivered to the action. Use separate forms with hidden inputs (this silently broke accept/decline once).
- Do **not** drive a form's pending state from a JS timer/`setState` inside the submit button (`useFormStatus`); it cleared the pending state when the timer fired. The slow-response notice is pure CSS for that reason.
- Don't `redirect()` after a successful save just to clear a banner: it makes the page blank for ~1 s. Success = `revalidatePath` only.
- Error-code namespaces must not collide: a settings error once showed the login message because both maps had an `invalid` key. (`badinput` now.)
- Next.js injects its own `role="alert"` route announcer; scope test selectors to `main [role="alert"]`. `loading.tsx` must not render a `<main>`.
- Link prefetch: every prefetched customer link was re-fetched after each save (N requests). Prefetch is off for lists/nav.
- Supabase email: built-in SMTP has tiny send limits (429 `over_email_send_rate_limit`); the app now guards double-submit and explains it. Mail links use PKCE → must be opened in the **same browser** that requested them.
- The Supabase MCP `execute_sql` asks the user to confirm destructive statements; **if unanswered it times out after ~230 s and tells you not to call it again in that turn.** Tell the user, wait, and retry next turn. (This happened twice while deleting the test account.)
- Vercel MCP: the first `create_git_project` deploy call was denied by the auto-mode classifier; the user then explicitly approved ("배포시작") and the same call worked. Don't work around a denial; ask.

## 6. Open items — in priority order

1. **Possible leftover test account in the live DB.** `e2e-tester@example.com` (random-looking test data, 30 customers, availability, a booking) was created for the last E2E run and the delete query **timed out waiting for the user's confirmation**. Check with a read-only `select email from auth.users`; the only real account is `kbhj6789@gmail.com` (the user's — never delete it). If the test account exists, delete it (`delete from auth.users where email = 'e2e-tester@example.com'`) and make sure the user is ready to approve the prompt. Its password was a known throwaway value from an earlier session — treat it as compromised until deleted.
2. **Production smoke test of the last push was not run** (the command was interrupted). `main` = `5c264a9`. After Vercel finishes: `/login`, `/signup`, `/forgot-password`, `/manifest.webmanifest`, `/book/0000` should return 200 (the last shows "지금 예약 가능한 시간이 없어요"), and `/today` must redirect (307) to `/login` when signed out. Check the deployment state via the Vercel MCP `list_deployments` (target production).
3. **Real email flows never verified** (I9/I12). The user was asked to try signup-confirm, password-reset link, and magic link with their own mailbox; no answer recorded. Prereqs: Supabase dashboard → Authentication → URL Configuration: Site URL `https://piano-sang-e.vercel.app`, Redirect URL `https://piano-sang-e.vercel.app/auth/callback` (only the user can set this; unknown whether done). "Confirm email" is currently ON (`mailer_autoconfirm:false`); turning it off makes signup instant (the app handles both). If the reset link lands on `/` instead of `/reset-password`, the `amr: recovery` detection in `auth/callback/route.ts` needs a fix (fallback: Settings → "비밀번호 변경").
4. **I13 — intermittent UI stall (unresolved, cause unknown).** After a save the DB row exists and the server response completes, but the page keeps "처리 중..." and doesn't show the result; refresh fixes it. Reproduced on the pre-error-banner production build (so not caused by recent changes), on a local `next start` (so not Vercel), at human pace (1 in ~24), roughly 1 in 10–40 actions on the real deployment from the sandbox and much more often locally. Ruled out (each tested): link-prefetch overlap, clicking right after load, `headers()` in the action, React 19.1.0→19.1.10, server errors (Vercel runtime errors: none), browser console errors (none). Remaining suspects: Next.js 15.5.29 client server-action handling, or the sandbox browser/proxy. **Unknown whether real users on real browsers hit it.** Mitigation in place: 8 s notice with a refresh link. Ideas not yet tried: reproduce in a minimal Next 15.5 app without Supabase; try Next 16.x (newer majors exist: 16.4.x); try WebKit/Firefox; ask the user how often they see it. Don't sink time here unless the user reports it.
5. **I5 — the user's mother's feedback** on how tuners are found/contacted, who remembers re-tune timing, what annoys her about tuners: never reported. The 2-hour slot, 14-day window, 28-day reminder lead and 12-month default are **my arbitrary defaults** awaiting that input.
6. **Course submission** (the user does the typing in the course site "Workbench"): (a) goal form, (b) `docs/plan.md` upload (now v2), (c) 중간 점검 1차 — drafts in `docs/checkpoint1.md`. The field "AI에게 맡긴 일과 내가 판단한 일" must be written by the user; the draft only lists facts. Submission URLs: result `https://piano-sang-e.vercel.app`, source `https://github.com/minsanghwang/piano`. Also keep `docs/plan.md` "알려진 위험" honest (it already lists I13 and the gaps below).
7. **Known functional gaps** (none requested yet): accepting a booking does not create/link a customer record; no customer search or pagination; reminders logic is per-instrument only; no CSV export; account data export absent; no rate limit on login beyond Supabase defaults; custom SMTP needed before real users (I10); stale branches/preview deployments could be cleaned up.
8. Nice-to-have from the original spec not done: automatic SMS/Kakao sending (stage 5, optional), Kakao 알림톡 requirements check (I4).

## 7. Verification status at hand-off

- `npm test`: 24 passed. `tsc`, `eslint`, `next build`: clean at `5c264a9` (checked before the final docs-only commits).
- Browser E2E last results: `errors`, `auth`: pass; `run` (full flow): pass (many I13 refreshes locally); `mobile-edit`: pass (layout clean, all edit/delete checks); `account`: pass earlier (before the edit/mobile work).
- Not verified: production behavior of the final two commits, real emails, real phones (only an emulated iPhone 13), Safari/Firefox, anything with real tuners.

## 8. Suggested first actions for the next session

1. Greet briefly in Korean; say you have the context.
2. Do item 1 and 2 of §6 (read-only checks first), then report.
3. Ask the user: did they try signup / reset / magic-link with their own email, did anything fail, and have they asked their mother (I5)? Record answers in `docs/changelog.md`.
4. Ask what they want next from §6.6–6.8 before building anything (they value minimal scope; don't add features unasked — record any scope change in the changelog).
