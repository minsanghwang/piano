import { describe, expect, it } from "vitest";
import { addMonths, daysBetween, draftMessage, isReminderDue, todayKST } from "@/lib/reminders";

describe("reminders", () => {
  it("adds months, clamping to month end", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-05", 12)).toBe("2027-11-05");
    expect(addMonths("2026-11-05", 3)).toBe("2027-02-05");
  });
  it("counts days", () => {
    expect(daysBetween("2026-11-05", "2026-12-05")).toBe(30);
    expect(daysBetween("2026-11-05", "2026-11-01")).toBe(-4);
  });
  it("is due 28 days ahead and when overdue", () => {
    expect(isReminderDue("2026-12-03", "2026-11-05")).toBe(true);
    expect(isReminderDue("2026-12-04", "2026-11-05")).toBe(false);
    expect(isReminderDue("2026-01-01", "2026-11-05")).toBe(true);
  });
  it("uses Korea date", () => {
    expect(todayKST(new Date("2026-11-05T16:00:00Z"))).toBe("2026-11-06");
  });
  it("drafts a message with and without a booking link", () => {
    const base = { tuner: "김조율", customer: "이피아", instrument: "업라이트", lastVisit: "2025-11-01" };
    expect(draftMessage(base)).toContain("알려 주시면");
    expect(draftMessage({ ...base, bookingUrl: "https://x/book/abc" })).toContain("https://x/book/abc");
  });
});
