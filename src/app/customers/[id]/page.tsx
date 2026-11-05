import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { done, failIf } from "@/lib/actionResult";
import { ErrorBanner } from "@/components/ErrorBanner";
import { requireTuner } from "@/lib/tuner";
import { addMonths } from "@/lib/reminders";

const WORK_TYPES = { tuning: "조율", regulation: "조정", voicing: "정음", repair: "수리" } as const;

type Supa = Awaited<ReturnType<typeof requireTuner>>["supabase"];

// The date typed by the tuner, or the tuner's default re-tune interval after the visit.
async function nextDueFor(supabase: Supa, visitDate: string, typed: string) {
  if (typed) return typed;
  const { data: t } = await supabase.from("tuners").select("default_retune_months").single();
  return addMonths(visitDate, t?.default_retune_months ?? 12);
}

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; t?: string }> }) {
  const { id } = await params;
  const { error: errorCode, t: stamp } = await searchParams;
  const { supabase } = await requireTuner();
  const [{ data: customer }, { data: instruments }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("instruments")
      .select("*, services(id, visit_date, work_type, work_done, price, next_due_date)")
      .eq("customer_id", id)
      .order("created_at")
      .order("visit_date", { referencedTable: "services", ascending: false }),
  ]);
  if (!customer) notFound();

  async function addInstrument(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("instruments").insert({
      customer_id: id,
      subtype: String(formData.get("subtype") ?? "") || null,
      make_model: String(formData.get("make_model") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
    });
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function addService(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const price = String(formData.get("price") ?? "");
    const visitDate = String(formData.get("visit_date"));
    const nextDue = await nextDueFor(supabase, visitDate, String(formData.get("next_due_date") ?? ""));
    const { error } = await supabase.from("services").insert({
      instrument_id: String(formData.get("instrument_id")),
      visit_date: visitDate,
      work_type: String(formData.get("work_type")),
      work_done: String(formData.get("work_done") ?? "").trim() || null,
      price: price ? Number(price) : null,
      next_due_date: nextDue,
    });
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function updateCustomer(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase
      .from("customers")
      .update({
        name: String(formData.get("name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
        contact_consent: formData.get("contact_consent") === "on",
      })
      .eq("id", id);
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function updateInstrument(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase
      .from("instruments")
      .update({
        subtype: String(formData.get("subtype") ?? "") || null,
        make_model: String(formData.get("make_model") ?? "").trim() || null,
        location: String(formData.get("location") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      })
      .eq("id", String(formData.get("instrument_id")));
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function deleteInstrument(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("instruments").delete().eq("id", String(formData.get("instrument_id"))); // its records cascade
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function updateService(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const price = String(formData.get("price") ?? "");
    const visitDate = String(formData.get("visit_date"));
    const nextDue = await nextDueFor(supabase, visitDate, String(formData.get("next_due_date") ?? ""));
    const { error } = await supabase
      .from("services")
      .update({
        visit_date: visitDate,
        work_type: String(formData.get("work_type")),
        work_done: String(formData.get("work_done") ?? "").trim() || null,
        price: price ? Number(price) : null,
        next_due_date: nextDue,
      })
      .eq("id", String(formData.get("service_id")));
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function deleteService(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("services").delete().eq("id", String(formData.get("service_id")));
    failIf(error, `/customers/${id}`);
    done(`/customers/${id}`);
  }

  async function deleteCustomer() {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("customers").delete().eq("id", id); // instruments and services cascade
    failIf(error, `/customers/${id}`);
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href="/" className="text-sm text-gray-500">← 고객 목록</Link>
      <h1 className="mt-2 text-xl font-bold">{customer.name}</h1>
      <ErrorBanner code={errorCode} stamp={stamp} />
      <p className="text-gray-600">{[customer.phone, customer.address].filter(Boolean).join(" · ")}</p>
      <p className="text-sm text-gray-500">연락 동의: {customer.contact_consent ? "있음" : "없음"}</p>
      {customer.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{customer.notes}</p>}

      <details className="mb-6 mt-2 text-sm">
        <summary className="cursor-pointer text-gray-600 underline">고객 정보 수정</summary>
        <form action={updateCustomer} className="mt-2 flex flex-col gap-2">
          <input name="name" required maxLength={100} defaultValue={customer.name} placeholder="이름" className="rounded border p-2" />
          <input name="phone" maxLength={30} defaultValue={customer.phone ?? ""} placeholder="연락처" className="rounded border p-2" />
          <input name="address" maxLength={300} defaultValue={customer.address ?? ""} placeholder="주소" className="rounded border p-2" />
          <textarea name="notes" maxLength={2000} defaultValue={customer.notes ?? ""} placeholder="메모" rows={3} className="rounded border p-2" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="contact_consent" defaultChecked={customer.contact_consent} /> 연락(재방문 안내) 수신 동의 받음
          </label>
          <SubmitButton className="rounded bg-black p-2 text-white">저장</SubmitButton>
        </form>
      </details>

      {instruments?.map((i) => (
        <section key={i.id} className="mb-6 rounded border p-3">
          <h2 className="font-semibold">
            {i.subtype === "grand" ? "그랜드" : i.subtype === "upright" ? "업라이트" : "피아노"} {i.make_model}
            {i.location && <span className="font-normal text-gray-500"> · {i.location}</span>}
          </h2>
          {i.notes && <p className="whitespace-pre-wrap text-sm text-gray-600">{i.notes}</p>}
          <details className="my-2 text-sm">
            <summary className="cursor-pointer text-gray-600 underline">악기 수정/삭제</summary>
            <form action={updateInstrument} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="instrument_id" value={i.id} />
              <select name="subtype" defaultValue={i.subtype ?? ""} className="rounded border p-2">
                <option value="">종류 모름</option>
                <option value="upright">업라이트</option>
                <option value="grand">그랜드</option>
              </select>
              <input name="make_model" maxLength={100} defaultValue={i.make_model ?? ""} placeholder="제조사/모델" className="rounded border p-2" />
              <input name="location" maxLength={200} defaultValue={i.location ?? ""} placeholder="설치 장소" className="rounded border p-2" />
              <textarea name="notes" maxLength={2000} defaultValue={i.notes ?? ""} placeholder="메모" rows={2} className="rounded border p-2" />
              <SubmitButton className="rounded bg-black p-2 text-white">저장</SubmitButton>
            </form>
            <form action={deleteInstrument} className="mt-3 rounded border border-red-300 p-2">
              <input type="hidden" name="instrument_id" value={i.id} />
              <p className="mb-1 text-gray-600">이 악기와 방문 기록이 모두 삭제돼요. 되돌릴 수 없어요.</p>
              <SubmitButton className="text-red-700 underline">악기 삭제</SubmitButton>
            </form>
          </details>
          <ul className="my-2 text-sm">
            {i.services.map((s: { id: string; visit_date: string; work_type: keyof typeof WORK_TYPES; work_done: string | null; price: number | null; next_due_date: string | null }) => (
              <li key={s.id} className="border-b py-1">
                {s.visit_date} {WORK_TYPES[s.work_type]} {s.price != null && `· ${s.price.toLocaleString()}원`}
                {s.work_done && ` · ${s.work_done}`}
                {s.next_due_date && <span className="text-gray-500"> (다음 {s.next_due_date})</span>}
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-500 underline">수정/삭제</summary>
                  <form action={updateService} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="service_id" value={s.id} />
                    <input type="date" name="visit_date" required defaultValue={s.visit_date} className="rounded border p-2" />
                    <select name="work_type" defaultValue={s.work_type} className="rounded border p-2">
                      {Object.entries(WORK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input name="price" type="number" min={0} defaultValue={s.price ?? ""} placeholder="금액" className="rounded border p-2" />
                    <input name="work_done" maxLength={2000} defaultValue={s.work_done ?? ""} placeholder="작업 내용" className="rounded border p-2" />
                    <label className="flex flex-col gap-1">다음 권장일 (비우면 자동)
                      <input type="date" name="next_due_date" defaultValue={s.next_due_date ?? ""} className="rounded border p-2" />
                    </label>
                    <SubmitButton className="rounded bg-black p-2 text-white">저장</SubmitButton>
                  </form>
                  <form action={deleteService} className="mt-2">
                    <input type="hidden" name="service_id" value={s.id} />
                    <SubmitButton className="text-red-700 underline">이 기록 삭제</SubmitButton>
                  </form>
                </details>
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

      <details className="text-sm">
        <summary className="cursor-pointer text-red-700 underline">고객 삭제</summary>
        <form action={deleteCustomer} className="mt-2 rounded border border-red-300 p-2">
          <p className="mb-1 text-gray-600">{customer.name}님과 모든 악기·방문 기록이 삭제돼요. 되돌릴 수 없어요.</p>
          <SubmitButton className="text-red-700 underline">고객과 모든 기록 삭제</SubmitButton>
        </form>
      </details>
    </main>
  );
}
