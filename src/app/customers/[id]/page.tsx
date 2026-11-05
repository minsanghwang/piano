import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTuner } from "@/lib/tuner";
import { addMonths } from "@/lib/reminders";

const WORK_TYPES = { tuning: "조율", regulation: "조정", voicing: "정음", repair: "수리" } as const;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireTuner();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();
  const { data: instruments } = await supabase
    .from("instruments")
    .select("*, services(id, visit_date, work_type, work_done, price, next_due_date)")
    .eq("customer_id", id)
    .order("created_at")
    .order("visit_date", { referencedTable: "services", ascending: false });

  async function addInstrument(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("instruments").insert({
      customer_id: id,
      subtype: String(formData.get("subtype") ?? "") || null,
      make_model: String(formData.get("make_model") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
    });
    revalidatePath(`/customers/${id}`);
  }

  async function addService(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const price = String(formData.get("price") ?? "");
    const visitDate = String(formData.get("visit_date"));
    let nextDue = String(formData.get("next_due_date") ?? "");
    if (!nextDue) {
      const { data: t } = await supabase.from("tuners").select("default_retune_months").single();
      nextDue = addMonths(visitDate, t?.default_retune_months ?? 12);
    }
    await supabase.from("services").insert({
      instrument_id: String(formData.get("instrument_id")),
      visit_date: visitDate,
      work_type: String(formData.get("work_type")),
      work_done: String(formData.get("work_done") ?? "").trim() || null,
      price: price ? Number(price) : null,
      next_due_date: nextDue,
    });
    revalidatePath(`/customers/${id}`);
  }

  async function deleteCustomer() {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("customers").delete().eq("id", id); // instruments and services cascade
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href="/" className="text-sm text-gray-500">← 고객 목록</Link>
      <h1 className="mt-2 text-xl font-bold">{customer.name}</h1>
      <p className="text-gray-600">{[customer.phone, customer.address].filter(Boolean).join(" · ")}</p>
      <p className="mb-6 text-sm text-gray-500">연락 동의: {customer.contact_consent ? "있음" : "없음"}</p>

      {instruments?.map((i) => (
        <section key={i.id} className="mb-6 rounded border p-3">
          <h2 className="font-semibold">
            {i.subtype === "grand" ? "그랜드" : i.subtype === "upright" ? "업라이트" : "피아노"} {i.make_model}
            {i.location && <span className="font-normal text-gray-500"> · {i.location}</span>}
          </h2>
          <ul className="my-2 text-sm">
            {i.services.map((s: { id: string; visit_date: string; work_type: keyof typeof WORK_TYPES; work_done: string | null; price: number | null; next_due_date: string | null }) => (
              <li key={s.id} className="border-b py-1">
                {s.visit_date} {WORK_TYPES[s.work_type]} {s.price != null && `· ${s.price.toLocaleString()}원`}
                {s.work_done && ` · ${s.work_done}`}
                {s.next_due_date && <span className="text-gray-500"> (다음 {s.next_due_date})</span>}
              </li>
            ))}
          </ul>
          <form action={addService} className="flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="instrument_id" value={i.id} />
            <input type="date" name="visit_date" required className="rounded border p-1" />
            <select name="work_type" className="rounded border p-1">
              {Object.entries(WORK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input name="price" type="number" min={0} placeholder="금액" className="w-24 rounded border p-1" />
            <input name="work_done" maxLength={2000} placeholder="작업 내용" className="flex-1 rounded border p-1" />
            <label>다음 권장일 (비우면 자동) <input type="date" name="next_due_date" className="rounded border p-1" /></label>
            <SubmitButton className="rounded bg-black px-3 text-white">기록 추가</SubmitButton>
          </form>
        </section>
      ))}

      <form action={addInstrument} className="mb-8 flex flex-wrap gap-2 text-sm">
        <select name="subtype" className="rounded border p-1">
          <option value="upright">업라이트</option>
          <option value="grand">그랜드</option>
        </select>
        <input name="make_model" maxLength={100} placeholder="제조사/모델" className="rounded border p-1" />
        <input name="location" maxLength={200} placeholder="설치 장소" className="rounded border p-1" />
        <SubmitButton className="rounded bg-black px-3 text-white">악기 추가</SubmitButton>
      </form>

      <form action={deleteCustomer}>
        <SubmitButton className="text-sm text-red-700 underline">고객과 모든 기록 삭제</SubmitButton>
      </form>
    </main>
  );
}
