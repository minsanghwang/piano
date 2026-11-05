import { revalidatePath } from "next/cache";
import { requireTuner } from "@/lib/tuner";
import { getOrigin } from "@/lib/origin";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function SettingsPage() {
  const { supabase, userId } = await requireTuner();
  const { data: tuner } = await supabase.from("tuners").select("name, default_retune_months, booking_slug").eq("id", userId).single();

  const [{ data: rules }, { data: exceptions }] = await Promise.all([
    supabase.from("availability_rules").select("*").order("weekday").order("start_time"),
    supabase.from("availability_exceptions").select("*").gte("day", new Date().toISOString().slice(0, 10)).order("day"),
  ]);
  const bookingUrl = `${await getOrigin()}/book/${tuner?.booking_slug}`;

  async function addRule(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("availability_rules").insert({
      weekday: Number(formData.get("weekday")),
      start_time: String(formData.get("start")),
      end_time: String(formData.get("end")),
    });
    revalidatePath("/settings");
  }
  async function removeRule(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("availability_rules").delete().eq("id", String(formData.get("id")));
    revalidatePath("/settings");
  }
  async function addException(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("availability_exceptions").insert({ day: String(formData.get("day")) });
    revalidatePath("/settings");
  }
  async function removeException(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    await supabase.from("availability_exceptions").delete().eq("id", String(formData.get("id")));
    revalidatePath("/settings");
  }

  async function save(formData: FormData) {
    "use server";
    const { supabase, userId } = await requireTuner();
    const months = Math.min(60, Math.max(1, Number(formData.get("months")) || 12));
    await supabase
      .from("tuners")
      .update({ name: String(formData.get("name") ?? "").trim().slice(0, 100), default_retune_months: months })
      .eq("id", userId);
    revalidatePath("/settings");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">설정</h1>
      <form action={save} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">이름 (고객 메시지에 표시)
          <input name="name" defaultValue={tuner?.name ?? ""} maxLength={100} className="rounded border p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">기본 재조율 주기 (개월)
          <input name="months" type="number" min={1} max={60} defaultValue={tuner?.default_retune_months ?? 12} className="rounded border p-2" />
        </label>
        <button className="rounded bg-black p-2 text-white">저장</button>
      </form>

      <h2 className="mb-1 mt-8 font-semibold">예약 링크</h2>
      <p className="break-all rounded bg-gray-50 p-2 text-sm">{bookingUrl}</p>
      <p className="mb-4 text-xs text-gray-500">고객에게 이 링크를 보내면 아래 가능 시간 안에서 2시간 단위로 예약할 수 있어요.</p>

      <h2 className="mb-1 font-semibold">가능 시간</h2>
      <ul className="mb-2 text-sm">
        {rules?.map((r) => (
          <li key={r.id} className="flex justify-between border-b py-1">
            <span>{DAYS[r.weekday]}요일 {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</span>
            <form action={removeRule}><input type="hidden" name="id" value={r.id} /><button className="text-red-700">삭제</button></form>
          </li>
        ))}
        {!rules?.length && <li className="text-gray-500">설정된 시간이 없어요. 예약 링크가 비어 보입니다.</li>}
      </ul>
      <form action={addRule} className="mb-6 flex flex-wrap gap-2 text-sm">
        <select name="weekday" className="rounded border p-1">{DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}</select>
        <input type="time" name="start" defaultValue="09:00" required className="rounded border p-1" />
        <input type="time" name="end" defaultValue="18:00" required className="rounded border p-1" />
        <button className="rounded bg-black px-3 text-white">추가</button>
      </form>

      <h2 className="mb-1 font-semibold">쉬는 날</h2>
      <ul className="mb-2 text-sm">
        {exceptions?.map((e) => (
          <li key={e.id} className="flex justify-between border-b py-1">
            <span>{e.day}</span>
            <form action={removeException}><input type="hidden" name="id" value={e.id} /><button className="text-red-700">삭제</button></form>
          </li>
        ))}
      </ul>
      <form action={addException} className="flex gap-2 text-sm">
        <input type="date" name="day" required className="rounded border p-1" />
        <button className="rounded bg-black px-3 text-white">추가</button>
      </form>
    </main>
  );
}
