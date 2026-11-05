import { describe, expect, it } from "vitest";
import { digits, matchesCustomer, samePhone, smsHref } from "@/lib/phone";

describe("phone helpers", () => {
  it("compares numbers ignoring formatting and +82", () => {
    expect(samePhone("010-1234-5678", "01012345678")).toBe(true);
    expect(samePhone("+82 10 1234 5678", "010-1234-5678")).toBe(true);
    expect(samePhone("010-1234-5678", "010-1234-5679")).toBe(false);
    expect(samePhone("", "")).toBe(false);
    expect(samePhone(null, "010-1234-5678")).toBe(false);
  });
  it("builds an sms link with an encoded body", () => {
    expect(smsHref("010-1234-5678", "안녕 & 반가워")).toBe(`sms:01012345678?&body=${encodeURIComponent("안녕 & 반가워")}`);
    expect(digits("abc")).toBe("");
  });
  it("searches by name or phone digits", () => {
    const c = { name: "김피아노", phone: "010-1234-5678" };
    expect(matchesCustomer(c, "")).toBe(true);
    expect(matchesCustomer(c, "피아")).toBe(true);
    expect(matchesCustomer(c, "1234")).toBe(true);
    expect(matchesCustomer(c, "010 1234")).toBe(true);
    expect(matchesCustomer(c, "박")).toBe(false);
    expect(matchesCustomer({ name: "이", phone: null }, "1234")).toBe(false);
  });
});
