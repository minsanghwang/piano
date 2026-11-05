// Browser E2E: a failed save must show an error banner, and a later success must clear it.
// Uses real database rules to cause failures: an availability window that ends before it starts,
// and the same rest day added twice. Needs E2E_EMAIL / E2E_PASSWORD and the app on localhost:3100.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const { createClient } = req("@supabase/supabase-js");

const BASE = process.env.BASE ?? "http://localhost:3100";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sb = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await sb.auth.signInWithPassword({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
if (error) throw error;
for (const t of ["availability_rules", "availability_exceptions"]) await sb.from(t).delete().not("id", "is", null);

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([{
  name: "sb-" + new URL(URL_).hostname.split(".")[0] + "-auth-token",
  value: "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url"),
  url: BASE,
}]);
const page = await ctx.newPage();
const text = () => page.locator("main").innerText();
const alert = () => page.locator('main [role="alert"]'); // not Next's own route announcer
const submit = async (locator) => {
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), locator.click()]);
  await page.waitForLoadState("networkidle");
};
const ruleForm = 'form:has(select[name="weekday"]) button';
const dayForm = 'form:has(input[name="day"]) button';

try {
  await page.goto(BASE + "/settings");
  assert.equal(await alert().count(), 0);

  // failure 1: window ends before it starts
  await page.fill('input[name="start"]', "15:00");
  await page.fill('input[name="end"]', "09:00");
  await submit(page.locator(ruleForm));
  await page.waitForURL(/error=badinput/);
  assert.match(await alert().innerText(), /입력한 값을 확인해 주세요/);
  assert.equal((await sb.from("availability_rules").select("id")).data.length, 0);
  console.log("ok invalid availability window shows an error and saves nothing");

  // success clears the banner
  await page.fill('input[name="start"]', "09:00");
  await page.fill('input[name="end"]', "12:00");
  await submit(page.locator(ruleForm));
  await page.locator('li:has-text("09:00–12:00")').waitFor(); // the new row is shown, so the action finished
  assert.equal(await alert().count(), 0);
  assert.ok(!page.url().includes("error"));
  console.log("ok a later success clears the error banner");

  // failure 2: duplicate rest day
  await page.fill('input[name="day"]', "2030-01-15");
  await submit(page.locator(dayForm));
  await page.locator('li:has-text("2030-01-15")').waitFor();
  await page.fill('input[name="day"]', "2030-01-15");
  await submit(page.locator(dayForm));
  await page.waitForURL(/error=duplicate/);
  assert.match(await alert().innerText(), /이미 등록된 항목/);
  console.log("ok duplicate rest day shows an error");

  console.log("ERRORS E2E PASSED");
} catch (e) {
  console.error("ERRORS E2E FAILED", e.message);
  console.error(page.url(), (await text().catch(() => "")).slice(0, 300));
  process.exitCode = 1;
} finally {
  await browser.close();
}
