import { revalidatePath } from "next/cache";
import { requireTuner } from "@/lib/tuner";
import { formatSlot } from "@/lib/format";

export default async function BookingsPage() {
  const { supabase } = await requireTuner();
  const { data: requests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("status", "requested")
    .gt("requested_at", new Date().toISOString())
    .order("requested_at");

  async function setStatus(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const status = String(formData.get("status"));
    if (!["accepted", "declined"].includes(status)) return;
    await supabase.from("booking_requests").update({ status }).eq("id", String(formData.get("id")));
    revalidatePath("/bookings");
    revalidatePath("/today");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">예약 요청</h1>
      {!requests?.length && <p className="text-gray-500">새 요청이 없어요.</p>}
      {requests?.map((r) => (
        <section key={r.id} className="mb-3 rounded border p-3">
          <div className="font-semibold">{formatSlot(r.requested_at)}</div>
          <div>{r.name} · <a href={`tel:${r.phone}`} className="underline">{r.phone}</a></div>
          {r.address && <div className="text-sm text-gray-600">{r.address}</div>}
          <div className="mt-2 flex gap-2">
            <form action={setStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="accepted" />
              <button className="rounded bg-black px-3 py-1 text-sm text-white">수락</button>
            </form>
            <form action={setStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="declined" />
              <button className="rounded border px-3 py-1 text-sm">거절</button>
            </form>
          </div>
        </section>
      ))}
      <p className="mt-4 text-sm text-gray-500">다른 시간을 제안하려면 거절한 뒤 전화/문자로 조율해 주세요.</p>
    </main>
  );
}
