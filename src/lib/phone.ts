// Phone numbers are free text ("010-1234-5678", "01012345678", "+82 10 1234 5678"), so compare digits only.
export function digits(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 11) d = "0" + d.slice(2); // +82 10... -> 010...
  return d;
}

export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = digits(a);
  return x.length >= 5 && x === digits(b);
}

// Opens the phone's own messages app with the text filled in; the tuner still presses send.
// "?&body=" is understood by both Android and iOS.
export function smsHref(phone: string, body: string): string {
  return `sms:${digits(phone)}?&body=${encodeURIComponent(body)}`;
}

// Customer list search: name substring, or digits of a phone number.
export function matchesCustomer(c: { name: string; phone: string | null }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (c.name.toLowerCase().includes(q)) return true;
  const qd = digits(q);
  return qd.length >= 2 && digits(c.phone).includes(qd);
}
