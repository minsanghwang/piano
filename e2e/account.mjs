// Browser E2E for password change, reset request and account deletion.
// Needs two password accounts: E2E_KEEPER (kept) and E2E_DELETEE (deleted by this script), both with E2E_PASSWORD,
// and the app on localhost:3100. The reset request uses an address that has no account, so no email is sent.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = "http://localhost:3100";
const { E2E_KEEPER, E2E_DELETEE, E2E_PASSWORD } = process.env;
const NEW_PASSWORD = "Changed-pass-9-xyz";

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const text = () => page.locator("main").innerText();
const path = () => new URL(page.url()).pathname;
const submit = async (locator) => {
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), locator.click()]);
  await page.waitForLoadState("networkidle");
};
const login = async (email, password) => {
  await page.goto(BASE + "/login");
  await page.fill('form:has(input[name="password"]) input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await submit(page.locator('form:has(input[name="password"]) button'));
};
const logout = () => submit(page.locator('nav button:has-text("로그아웃")'));

try {
  // --- change password (signed in) ---
  await login(E2E_KEEPER, E2E_PASSWORD);
  assert.equal(path(), "/");
  await page.goto(BASE + "/settings");
  await Promise.all([page.waitForURL(/reset-password/), page.click("text=비밀번호 변경")]);
  await page.fill('input[name="password"]', NEW_PASSWORD);
  await page.fill('input[name="password2"]', "Another-pass-1-abc");
  await submit(page.locator("main form button"));
  assert.match(await text(), /비밀번호 확인이 일치하지 않아요/);
  console.log("ok password change: mismatch is rejected");

  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.fill('input[name="password2"]', E2E_PASSWORD);
  await submit(page.locator("main form button"));
  assert.match(await text(), /기존 비밀번호와 다른 비밀번호/);
  console.log("ok password change: same password is rejected");

  await page.fill('input[name="password"]', NEW_PASSWORD);
  await page.fill('input[name="password2"]', NEW_PASSWORD);
  await submit(page.locator("main form button"));
  assert.equal(path(), "/settings");
  assert.match(await text(), /비밀번호를 바꿨어요/);
  console.log("ok password changed");

  await logout();
  await login(E2E_KEEPER, E2E_PASSWORD);
  assert.match(await text(), /이메일 또는 비밀번호가 맞지 않아요/);
  await login(E2E_KEEPER, NEW_PASSWORD);
  assert.equal(path(), "/");
  console.log("ok old password stops working, new password works");
  await logout();

  // --- reset request (neutral answer, no email: the address has no account) ---
  await page.goto(BASE + "/login");
  await Promise.all([page.waitForURL(/forgot-password/), page.click("text=비밀번호를 잊으셨나요?")]);
  await page.fill('input[name="email"]', "nobody-has-this-address@example.com");
  await submit(page.locator("main form button"));
  assert.match(await text(), /가입한 계정이 있다면 재설정 링크를 보냈어요/);
  console.log("ok reset request gives the same neutral answer for an unknown address");

  // /reset-password needs a session
  await page.goto(BASE + "/reset-password");
  assert.equal(path(), "/login");
  console.log("ok /reset-password requires a session");

  // --- delete account ---
  await login(E2E_DELETEE, E2E_PASSWORD);
  await page.goto(BASE + "/settings");
  await page.fill('input[name="confirm"]', "취소");
  await submit(page.locator('section:has-text("계정 삭제") button'));
  assert.match(await text(), /확인 문구로 "삭제"를 입력해 주세요/);
  console.log("ok deletion needs the confirmation word");

  await page.fill('input[name="confirm"]', "삭제");
  await submit(page.locator('section:has-text("계정 삭제") button'));
  assert.equal(path(), "/login");
  assert.match(await text(), /계정과 모든 데이터를 삭제했어요/);
  await page.goto(BASE + "/");
  assert.equal(path(), "/login");
  await login(E2E_DELETEE, E2E_PASSWORD);
  assert.match(await text(), /이메일 또는 비밀번호가 맞지 않아요/);
  console.log("ok account deleted, signed out, cannot log in again");

  console.log("ACCOUNT E2E PASSED");
} catch (e) {
  console.error("ACCOUNT E2E FAILED", e.message);
  console.error((await text().catch(() => "")).slice(0, 500));
  process.exitCode = 1;
} finally {
  await browser.close();
}
