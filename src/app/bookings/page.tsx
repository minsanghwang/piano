import { SubmitButton } from "@/components/SubmitButton";
import { done, failIf } from "@/lib/actionResult";
import { ErrorBanner } from "@/components/ErrorBanner";
import { requireTuner } from "@/lib/tuner";
import { formatSlot } from "@/lib/format";
import { samePhone } from "@/lib/phone";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ error?: string; t?: string }> }) {
  const { error: errorCode, t: stamp } = await searchParams;
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
    const id = String(formData.get("id"));
    const { data: updated, error } = await supabase.from("booking_requests").update({ status }).eq("id", id).select("name, phone, address").single();
    failIf(error, "/bookings");
    if (status === "accepted" && updated) {
      // Accepting a request also makes sure the customer has a record (matched by phone number).
      const { data: existing, error: listError } = await supabase.from("customers").select("phone");
      failIf(listError, "/bookings");
      if (!existing?.some((c) => samePhone(c.phone, updated.phone))) {
        const { error: insertError } = await supabase.from("customers").insert({
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          contact_consent: false, // booking is not consent to reminder messages
        });
        failIf(insertError, "/bookings");
      }
    }
    done("/bookings", ["/today", "/"]);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">예약 요청</h1>
      <ErrorBanner code={errorCode} stamp={stamp} />
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
              <SubmitButton className="rounded bg-black px-3 py-1 text-sm text-white">수락</SubmitButton>
            </form>
            <form action={setStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="declined" />
              <SubmitButton className="rounded border px-3 py-1 text-sm">거절</SubmitButton>
            </form>
          </div>
        </section>
      ))}
      <p className="mt-4 text-sm text-gray-500">다른 시간을 제안하려면 거절한 뒤 전화/문자로 조율해 주세요.</p>
    </main>
  );
}
