import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.BASE ?? "http://localhost:3100";

(async () => {
  const sb = createClient(URL_, KEY);
  const { data, error } = await sb.auth.signInWithPassword({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
  if (error) throw error;
  // Start from a clean slate: remove this test account's own rows (RLS limits this to its data).
  for (const t of ["customers", "availability_rules", "availability_exceptions", "booking_requests"]) {
    const { error: e } = await sb.from(t).delete().not("id", "is", null);
    if (e) throw e;
  }
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "sb-" + new URL(URL_).hostname.split(".")[0] + "-auth-token", value, url: BASE }]);
  const page = await ctx.newPage();
  // Click a submit button and wait until the server action has responded.
  const submit = async (locator) => {
    await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), locator.click()]);
    await page.waitForLoadState("networkidle");
    // Like a person, wait until the page has finished refreshing (no button still saying "처리 중...").
    await page.waitForFunction(() => !document.querySelector("main button[disabled]"));
  };
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  // anonymous redirected
  const anonCtx = await browser.newContext();
  const ap = await anonCtx.newPage();
  await ap.goto(BASE + "/customers");
  await ap.goto(BASE + "/");
  assert.match(ap.url(), /\/login/);
  console.log("ok anonymous redirected to /login");

  // settings
  await page.goto(BASE + "/settings");
  await page.fill('input[name="name"]', "김조율");
  await submit(page.locator('form:has(input[name="months"]) button'));
  for (let d = 0; d < 7; d++) {
    await page.selectOption('select[name="weekday"]', String(d));
    await page.fill('input[name="start"]', "09:00");
    await page.fill('input[name="end"]', "17:00");
    await submit(page.locator('form:has(select[name="weekday"]) button'));
  }
  await page.goto(BASE + "/settings");
  const bookingUrl = (await page.locator("p.break-all").innerText()).trim();
  assert.match(bookingUrl, /\/book\/[0-9a-f]{32}$/);
  console.log("ok settings + availability, link:", bookingUrl.replace(/[0-9a-f]{32}/, "<slug>"));

  // customers: add 30
  for (let i = 1; i <= 30; i++) {
    await page.goto(BASE + "/");
    await page.fill('input[name="name"]', `테스트고객${String(i).padStart(2, "0")}`);
    await page.fill('input[name="phone"]', `010-0000-${String(1000 + i)}`);
    if (i === 1) await page.check('input[name="contact_consent"]');
    await submit(page.locator('form:has(input[name="phone"]) button'));
  }
  await page.goto(BASE + "/");
  assert.equal(await page.locator("ul.divide-y li").count(), 30);
  console.log("ok 30 customers entered and listed");

  // instrument + service (no next date => auto)
  await page.click("text=테스트고객01");
  await page.selectOption('select[name="subtype"]', "grand");
  await page.fill('input[name="make_model"]', "야마하 C3");
  await submit(page.locator('form:has(select[name="subtype"]) button'));
  await page.fill('input[name="visit_date"]', "2025-10-01");
  await page.fill('input[name="price"]', "80000");
  await page.fill('input[name="work_done"]', "조율");
  await submit(page.locator('form:has(input[name="visit_date"]) button'));
  await page.reload();
  const body = await page.locator("main").innerText();
  assert.match(body, /2025-10-01/);
  assert.match(body, /다음 2026-10-01/);
  console.log("ok service recorded with auto next date 2026-10-01");

  // reminders inbox
  await page.goto(BASE + "/reminders");
  const draft = await page.locator("pre").innerText();
  assert.match(draft, /김조율/);
  assert.match(draft, /테스트고객01/);
  assert.ok(draft.includes(bookingUrl));
  console.log("ok reminder draft with booking link");
  await submit(page.locator('button:has-text("보냈어요")'));
  assert.equal(await page.locator("pre").count(), 0);
  console.log("ok reminder disappears after marking sent");

  // customer books via public link (anonymous)
  await ap.goto(bookingUrl);
  const slotLabels = ap.locator('label:has(input[name="slot"])');
  assert.ok((await slotLabels.count()) >= 10);
  await slotLabels.first().click();
  await ap.fill('input[name="name"]', "예약손님");
  await ap.fill('input[name="phone"]', "010-5555-6666");
  await ap.fill('input[name="address"]', "서울 강남구 테헤란로 1");
  await ap.click("text=예약 요청");
  await ap.waitForURL(/done/);
  console.log("ok anonymous booking submitted");

  // tuner accepts
  await page.goto(BASE + "/bookings");
  assert.match(await page.locator("main").innerText(), /예약손님/);
  await submit(page.locator('button:has-text("수락")'));
  await page.goto(BASE + "/today");
  const today = await page.locator("main").innerText();
  assert.match(today, /예약손님/);
  console.log("ok accepted booking appears in schedule");

  // map link check on a same-day booking is covered by unit data; verify link helper via page if today
  await browser.close();
  console.log("E2E PASSED");
})().catch((e) => { console.error("E2E FAILED", e); process.exit(1); });
