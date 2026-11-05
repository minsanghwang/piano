import { SubmitButton } from "@/components/SubmitButton";
import { done as finish, failIf } from "@/lib/actionResult";
import { ErrorBanner } from "@/components/ErrorBanner";
import { requireTuner } from "@/lib/tuner";
import { formatDay, formatTime, kstDate, mapLinks } from "@/lib/format";
import { todayKST } from "@/lib/reminders";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ error?: string; t?: string }> }) {
  const { error: errorCode, t: stamp } = await searchParams;
  const { supabase } = await requireTuner();
  const { data } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("status", "accepted")
    .gte("requested_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .order("requested_at");
  const today = todayKST();
  const todays = (data ?? []).filter((r) => kstDate(r.requested_at) === today);
  const upcoming = (data ?? []).filter((r) => kstDate(r.requested_at) > today);

  async function done(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("booking_requests").update({ status: "done" }).eq("id", String(formData.get("id")));
    failIf(error, "/today");
    finish("/today");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">오늘 일정</h1>
      <ErrorBanner code={errorCode} stamp={stamp} />
      {!todays.length && <p className="mb-6 text-gray-500">오늘 방문 일정이 없어요.</p>}
      {todays.map((r, n) => {
        const maps = r.address ? mapLinks(r.address) : null;
        return (
          <section key={r.id} className="mb-3 rounded border p-3">
            <div className="font-semibold">{n + 1}. {formatTime(r.requested_at)} · {r.name}</div>
            <a href={`tel:${r.phone}`} className="underline">{r.phone}</a>
            {r.address && <div className="text-sm text-gray-600">{r.address}</div>}
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {maps && <a href={maps.kakao} target="_blank" rel="noreferrer" className="rounded border px-3 py-1">카카오맵</a>}
              {maps && <a href={maps.naver} target="_blank" rel="noreferrer" className="rounded border px-3 py-1">네이버지도</a>}
              <form action={done}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton className="rounded bg-black px-3 py-1 text-white">방문 완료</SubmitButton>
              </form>
            </div>
          </section>
        );
      })}
      {!!upcoming.length && <h2 className="mb-2 font-semibold">다가오는 일정</h2>}
      {upcoming.map((r) => (
        <div key={r.id} className="border-b py-2 text-sm">{formatDay(r.requested_at)} {formatTime(r.requested_at)} · {r.name} · {r.phone}</div>
      ))}
    </main>
  );
}
