// Pure date helpers (ISO yyyy-mm-dd strings, no timezone surprises).

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function todayKST(now = new Date()): string {
  return now.toLocaleDateString("sv", { timeZone: "Asia/Seoul" });
}

/** A reminder is due from 28 days before the next due date (overdue included). */
export const REMINDER_LEAD_DAYS = 28;

export function isReminderDue(nextDue: string, today: string): boolean {
  return daysBetween(today, nextDue) <= REMINDER_LEAD_DAYS;
}

export function draftMessage(p: { tuner: string; customer: string; instrument: string; lastVisit: string; bookingUrl?: string }): string {
  const lines = [
    `안녕하세요, ${p.customer}님. ${p.tuner || "조율사"}입니다.`,
    `${p.instrument} 마지막 조율이 ${p.lastVisit}이었어요. 이제 다음 조율 시기가 다가왔습니다.`,
    p.bookingUrl ? `편하신 시간을 여기서 골라 주세요: ${p.bookingUrl}` : "편하신 시간을 알려 주시면 일정 맞춰 방문드릴게요.",
  ];
  return lines.join("\n");
}
