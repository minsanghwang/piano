// Phone-sized checks (no sideways scrolling, tap-target sizes, screenshots) plus the edit/delete features.
// Needs E2E_EMAIL / E2E_PASSWORD, the app at BASE, and SHOTS_DIR for screenshots.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const req = createRequire(import.meta.url);
const { chromium, devices } = req("playwright");
const { createClient } = req("@supabase/supabase-js");

const BASE = process.env.BASE ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR ?? ".";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(URL_, KEY);
const anon = createClient(URL_, KEY);
const { data: auth, error: authError } = await sb.auth.signInWithPassword({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
if (authError) throw authError;

// --- seed through the API as the tester (RLS applies) ---
for (const t of ["customers", "availability_rules", "booking_requests"]) await sb.from(t).delete().not("id", "is", null);
const { data: tuner } = await sb.from("tuners").select("booking_slug").single();
const { data: c } = await sb.from("customers").insert({ name: "김모바일", phone: "010-1234-5678", address: "서울 강남구 테헤란로 123", contact_consent: true }).select().single();
const { data: ins } = await sb.from("instruments").insert({ customer_id: c.id, subtype: "grand", make_model: "야마하 C3", location: "거실" }).select().single();
await sb.from("services").insert([
  { instrument_id: ins.id, visit_date: "2025-10-01", work_type: "tuning", price: 80000, work_done: "정기 조율", next_due_date: "2026-10-01" },
  { instrument_id: ins.id, visit_date: "2025-03-01", work_type: "voicing", price: 50000, work_done: "정음", next_due_date: "2025-09-01" },
]);
for (let d = 0; d < 7; d++) await sb.from("availability_rules").insert({ weekday: d, start_time: "09:00", end_time: "17:00" });
const { data: slots } = await anon.rpc("public_open_slots", { p_slug: tuner.booking_slug });
await anon.rpc("create_booking_request", { p_slug: tuner.booking_slug, p_name: "예약손님", p_phone: "010-5555-6666", p_address: "서울 서초구 반포대로 1", p_at: slots[0].slot });
const { data: br } = await sb.from("booking_requests").select("id").single();
await sb.from("booking_requests").update({ status: "accepted" }).eq("id", br.id);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addCookies([{
  name: "sb-" + new URL(URL_).hostname.split(".")[0] + "-auth-token",
  value: "base64-" + Buffer.from(JSON.stringify(auth.session)).toString("base64url"),
  url: BASE,
}]);
const page = await ctx.newPage();
const issues = [];
let stalls = 0;

async function inspect(name, p = page) {
  await p.waitForLoadState("networkidle");
  const r = await p.evaluate(() => {
    const vw = window.innerWidth;
    const small = [...document.querySelectorAll("a, button, input:not([type=hidden]), select, textarea, summary")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ e, r }) => r.height < 30 && !(e.tagName === "INPUT" && ["checkbox", "radio"].includes(e.type)) && !e.classList.contains("sr-only"))
      .map(({ e, r }) => `${e.tagName.toLowerCase()}"${(e.textContent || e.placeholder || e.name || "").trim().slice(0, 18)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    return { overflow: document.documentElement.scrollWidth - vw, small };
  });
  if (r.overflow > 1) issues.push(`${name}: sideways scroll, ${r.overflow}px too wide`);
  if (r.small.length) issues.push(`${name}: small tap targets: ${r.small.slice(0, 4).join("; ")}${r.small.length > 4 ? ` (+${r.small.length - 4})` : ""}`);
  await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}
const submit = async (locator) => {
  await Promise.all([page.waitForResponse((x) => x.request().method() === "POST"), locator.click()]);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.querySelector("main button[disabled]"), null, { timeout: 12000 }).catch(async () => {
    stalls++;
    await page.reload();
  });
};

try {
  // ---- phone layout of every screen ----
  for (const [name, path] of [["home", "/"], ["customer", `/customers/${c.id}`], ["reminders", "/reminders"], ["bookings", "/bookings"], ["today", "/today"], ["settings", "/settings"]]) {
    await page.goto(BASE + path);
    await inspect(name);
  }
  const pub = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  for (const [name, path] of [["book", `/book/${tuner.booking_slug}`], ["login", "/login"], ["signup", "/signup"]]) {
    await pub.goto(BASE + path);
    await inspect(name, pub);
  }
  console.log(issues.length ? "LAYOUT ISSUES:\n  - " + issues.join("\n  - ") : "ok phone layout: no sideways scroll, no small tap targets");

  // ---- edit / delete features ----
  await page.goto(BASE + `/customers/${c.id}`);
  const q = async (table, id) => (await sb.from(table).select("*").eq("id", id).single()).data;

  await page.locator('summary:has-text("고객 정보 수정")').click();
  await page.fill('form:has(textarea[name="notes"]) input[name="name"]', "김수정");
  await page.fill('form:has(textarea[name="notes"]) input[name="phone"]', "010-9999-0000");
  await submit(page.locator('details:has(summary:has-text("고객 정보 수정")) form button'));
  let row = await q("customers", c.id);
  assert.equal(row.name, "김수정");
  assert.equal(row.phone, "010-9999-0000");
  assert.match(await page.locator("h1").innerText(), /김수정/);
  console.log("ok customer edit saved and shown");

  await page.locator('summary:has-text("악기 수정/삭제")').click();
  await page.fill('form:has(input[name="instrument_id"]):has(input[name="make_model"]) input[name="make_model"]', "스타인웨이 B");
  await submit(page.locator('details:has(summary:has-text("악기 수정/삭제")) form').first().locator("button"));
  assert.equal((await q("instruments", ins.id)).make_model, "스타인웨이 B");
  console.log("ok instrument edit saved");

  const target = page.locator('li:has-text("정기 조율")');
  await target.locator("summary").click();
  await target.locator('input[name="price"]').fill("90000");
  await submit(target.locator("form").first().locator("button"));
  const svcs = (await sb.from("services").select("*").order("visit_date")).data;
  assert.equal(svcs.find((s) => s.work_done === "정기 조율").price, 90000);
  console.log("ok service edit saved");

  const old = page.locator('li:has-text("2025-03-01")');
  await old.locator("summary").click();
  await submit(old.locator('button:has-text("이 기록 삭제")'));
  assert.equal((await sb.from("services").select("id")).data.length, 1);
  console.log("ok service delete works");

  await page.locator('summary:has-text("악기 수정/삭제")').click();
  await submit(page.locator('button:has-text("악기 삭제")'));
  assert.equal((await sb.from("instruments").select("id")).data.length, 0);
  assert.equal((await sb.from("services").select("id")).data.length, 0);
  console.log("ok instrument delete also removes its records");

  await page.locator('summary:has-text("고객 삭제")').click();
  await Promise.all([page.waitForURL((u) => u.pathname === "/"), page.locator('button:has-text("고객과 모든 기록 삭제")').click()]);
  assert.equal((await sb.from("customers").select("id")).data.length, 0);
  console.log("ok customer delete asks first, then removes the customer");

  console.log("MOBILE+EDIT E2E PASSED", stalls ? `(page stalled and was refreshed ${stalls}x)` : "(no stalls)");
} catch (e) {
  console.error("MOBILE+EDIT E2E FAILED", e.message);
  if (issues.length) console.error("layout issues so far:\n  - " + issues.join("\n  - "));
  console.error(page.url());
  process.exitCode = 1;
} finally {
  await browser.close();
}
