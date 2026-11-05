import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime, kstDate } from "@/lib/format";

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_open_slots", { p_slug: slug });
  const slots = ((data ?? []) as { slot: string }[]).map((r) => r.slot);

  async function book(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_booking_request", {
      p_slug: slug,
      p_name: String(formData.get("name") ?? "").trim(),
      p_phone: String(formData.get("phone") ?? "").trim(),
      p_address: String(formData.get("address") ?? "").trim(),
      p_at: String(formData.get("slot") ?? ""),
    });
    redirect(error ? `/book/${slug}?error=1` : `/book/${slug}/done`);
  }

  const byDay = new Map<string, string[]>();
  for (const s of slots) byDay.set(kstDate(s), [...(byDay.get(kstDate(s)) ?? []), s]);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-xl font-bold">피아노 조율 예약</h1>
      <p className="mb-4 text-sm text-gray-500">원하는 시간을 고르면 조율사가 확인 후 연락드려요. 입력하신 정보는 예약 확인 연락에만 사용됩니다.</p>
      {error && <p className="mb-3 text-red-700">예약에 실패했어요. 이미 마감된 시간일 수 있으니 다시 골라 주세요.</p>}
      {!slots.length ? (
        <p className="text-gray-500">지금 예약 가능한 시간이 없어요. 조율사에게 직접 연락해 주세요.</p>
      ) : (
        <form action={book} className="flex flex-col gap-4">
          {[...byDay.entries()].map(([day, list]) => (
            <fieldset key={day}>
              <legend className="mb-1 font-semibold">{formatDay(list[0])}</legend>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <label key={s} className="cursor-pointer rounded border px-3 py-2 has-[:checked]:bg-black has-[:checked]:text-white">
                    <input type="radio" name="slot" value={s} required className="sr-only" />
                    {formatTime(s)}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <input name="name" required maxLength={100} placeholder="이름" className="rounded border p-2" />
          <input name="phone" type="tel" required minLength={5} maxLength={30} placeholder="연락처" className="rounded border p-2" />
          <input name="address" maxLength={300} placeholder="방문 주소" className="rounded border p-2" />
          <button className="rounded bg-black p-3 text-white">예약 요청</button>
        </form>
      )}
    </main>
  );
}
