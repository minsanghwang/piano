const TZ = "Asia/Seoul";

export function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: TZ, month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit",
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: TZ, month: "long", day: "numeric", weekday: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function kstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv", { timeZone: TZ });
}

export function mapLinks(address: string) {
  const q = encodeURIComponent(address);
  return { kakao: `https://map.kakao.com/link/search/${q}`, naver: `https://map.naver.com/p/search/${q}` };
}
