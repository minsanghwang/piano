// Browser E2E for login / logout / signup screens. Needs a password account (E2E_EMAIL / E2E_PASSWORD)
// and the app running on localhost:3100. It never submits a signup for a new address (that would send mail).
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = "http://localhost:3100";
const { E2E_EMAIL, E2E_PASSWORD } = process.env;

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const text = () => page.locator("main").innerText();
const submit = async (locator) => {
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), locator.click()]);
  await page.waitForLoadState("networkidle");
};

try {
  // login screen, wrong password
  await page.goto(BASE + "/login");
  await page.fill('form:has(input[name="password"]) input[name="email"]', E2E_EMAIL);
  await page.fill('input[name="password"]', "wrong-password-123");
  await submit(page.locator('form:has(input[name="password"]) button'));
  assert.match(await text(), /이메일 또는 비밀번호가 맞지 않아요/);
  console.log("ok wrong password shows an error");

  // correct login
  await page.fill('form:has(input[name="password"]) input[name="email"]', E2E_EMAIL);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await submit(page.locator('form:has(input[name="password"]) button'));
  assert.equal(new URL(page.url()).pathname, "/");
  const nav = await page.locator("nav").innerText();
  assert.ok(nav.includes(E2E_EMAIL) && nav.includes("로그아웃"));
  console.log("ok login works; nav shows email and logout");

  // logged-in user is bounced away from /login and /signup
  for (const p of ["/login", "/signup"]) {
    await page.goto(BASE + p);
    assert.equal(new URL(page.url()).pathname, "/");
  }
  console.log("ok logged-in visitors skip /login and /signup");

  // logout
  await submit(page.locator('nav button:has-text("로그아웃")'));
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.match(await text(), /로그아웃했어요/);
  await page.goto(BASE + "/");
  assert.equal(new URL(page.url()).pathname, "/login");
  await page.goto(BASE + "/settings");
  assert.equal(new URL(page.url()).pathname, "/login");
  console.log("ok logout ends the session; protected pages redirect to /login");

  // signup validation
  await page.goto(BASE + "/signup");
  const pw = page.locator('input[name="password"]');
  await page.fill('input[name="email"]', "new-person@example.com");
  await pw.fill("short");
  assert.equal(await pw.evaluate((e) => e.validity.tooShort), true);
  console.log("ok short password blocked by the form");
  await pw.fill("long-enough-1");
  await page.fill('input[name="password2"]', "different-pass-2");
  await submit(page.locator("form button"));
  assert.match(await text(), /비밀번호 확인이 일치하지 않아요/);
  console.log("ok mismatched confirmation shows an error");

  // existing email
  await page.fill('input[name="email"]', E2E_EMAIL);
  await page.fill('input[name="password"]', "long-enough-1");
  await page.fill('input[name="password2"]', "long-enough-1");
  await submit(page.locator("form button"));
  assert.match(await text(), /이미 가입된 이메일/);
  console.log("ok existing email is reported");

  console.log("AUTH E2E PASSED");
} catch (e) {
  console.error("AUTH E2E FAILED", e.message);
  console.error((await text().catch(() => "")).slice(0, 400));
  process.exitCode = 1;
} finally {
  await browser.close();
}
