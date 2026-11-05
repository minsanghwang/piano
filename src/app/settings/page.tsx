import { SubmitButton } from "@/components/SubmitButton";
import { done, failIf, ACTION_ERRORS } from "@/lib/actionResult";
import Link from "next/link";
import { requireTuner } from "@/lib/tuner";
import { AUTH_ERRORS, AUTH_NOTICES } from "@/lib/authMessages";
import { deleteAccount } from "@/app/account/actions";
import { getOrigin } from "@/lib/origin";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const { supabase, userId } = await requireTuner();

  const [{ data: tuner }, { data: rules }, { data: exceptions }] = await Promise.all([
    supabase.from("tuners").select("name, default_retune_months, booking_slug").eq("id", userId).single(),
    supabase.from("availability_rules").select("*").order("weekday").order("start_time"),
    supabase.from("availability_exceptions").select("*").gte("day", new Date().toISOString().slice(0, 10)).order("day"),
  ]);
  const bookingUrl = `${await getOrigin()}/book/${tuner?.booking_slug}`;

  async function addRule(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("availability_rules").insert({
      weekday: Number(formData.get("weekday")),
      start_time: String(formData.get("start")),
      end_time: String(formData.get("end")),
    });
    failIf(error, "/settings");
    await done("/settings");
  }
  async function removeRule(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("availability_rules").delete().eq("id", String(formData.get("id")));
    failIf(error, "/settings");
    await done("/settings");
  }
  async function addException(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("availability_exceptions").insert({ day: String(formData.get("day")) });
    failIf(error, "/settings");
    await done("/settings");
  }
  async function removeException(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("availability_exceptions").delete().eq("id", String(formData.get("id")));
    failIf(error, "/settings");
    await done("/settings");
  }

  async function save(formData: FormData) {
    "use server";
    const { supabase, userId } = await requireTuner();
    const months = Math.min(60, Math.max(1, Number(formData.get("months")) || 12));
    const { error } = await supabase
      .from("tuners")
      .update({ name: String(formData.get("name") ?? "").trim().slice(0, 100), default_retune_months: months })
      .eq("id", userId);
    failIf(error, "/settings");
    await done("/settings");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">설정</h1>
      {notice && AUTH_NOTICES[notice] && <p role="status" className="mb-3 text-green-700">{AUTH_NOTICES[notice]}</p>}
      {error && <p role="alert" className="mb-3 text-red-700">{AUTH_ERRORS[error] ?? ACTION_ERRORS[error] ?? ACTION_ERRORS.save}</p>}
      <form action={save} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">이름 (고객 메시지에 표시)
          <input name="name" defaultValue={tuner?.name ?? ""} maxLength={100} className="rounded border p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">기본 재조율 주기 (개월)
          <input name="months" type="number" min={1} max={60} defaultValue={tuner?.default_retune_months ?? 12} className="rounded border p-2" />
        </label>
        <SubmitButton className="rounded bg-black p-2 text-white">저장</SubmitButton>
      </form>

      <h2 className="mb-1 mt-8 font-semibold">예약 링크</h2>
      <p className="break-all rounded bg-gray-50 p-2 text-sm">{bookingUrl}</p>
      <p className="mb-4 text-xs text-gray-500">고객에게 이 링크를 보내면 아래 가능 시간 안에서 2시간 단위로 예약할 수 있어요.</p>

      <h2 className="mb-1 font-semibold">가능 시간</h2>
      <ul className="mb-2 text-sm">
        {rules?.map((r) => (
          <li key={r.id} className="flex justify-between border-b py-1">
            <span>{DAYS[r.weekday]}요일 {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</span>
            <form action={removeRule}><input type="hidden" name="id" value={r.id} /><SubmitButton className="text-red-700">삭제</SubmitButton></form>
          </li>
        ))}
        {!rules?.length && <li className="text-gray-500">설정된 시간이 없어요. 예약 링크가 비어 보입니다.</li>}
      </ul>
      <form action={addRule} className="mb-6 flex flex-wrap gap-2 text-sm">
        <select name="weekday" className="rounded border p-1">{DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}</select>
        <input type="time" name="start" defaultValue="09:00" required className="rounded border p-1" />
        <input type="time" name="end" defaultValue="18:00" required className="rounded border p-1" />
        <SubmitButton className="rounded bg-black px-3 text-white">추가</SubmitButton>
      </form>

      <h2 className="mb-1 font-semibold">쉬는 날</h2>
      <ul className="mb-2 text-sm">
        {exceptions?.map((e) => (
          <li key={e.id} className="flex justify-between border-b py-1">
            <span>{e.day}</span>
            <form action={removeException}><input type="hidden" name="id" value={e.id} /><SubmitButton className="text-red-700">삭제</SubmitButton></form>
          </li>
        ))}
      </ul>
      <form action={addException} className="flex gap-2 text-sm">
        <input type="date" name="day" required className="rounded border p-1" />
        <SubmitButton className="rounded bg-black px-3 text-white">추가</SubmitButton>
      </form>

      <h2 className="mb-1 mt-10 font-semibold">계정</h2>
      <p className="mb-6 text-sm"><Link href="/reset-password" prefetch={false} className="underline">비밀번호 변경</Link></p>

      <section className="rounded border border-red-300 p-3">
        <h2 className="mb-1 font-semibold text-red-700">계정 삭제</h2>
        <p className="mb-2 text-sm text-gray-600">
          계정과 함께 고객, 악기, 시술 기록, 예약 요청(예약한 고객의 이름·연락처 포함), 가능 시간이 <b>모두 영구 삭제</b>되고 되돌릴 수 없어요.
          예약 링크도 더 이상 동작하지 않습니다.
        </p>
        <form action={deleteAccount} className="flex flex-wrap gap-2 text-sm">
          <input name="confirm" required autoComplete="off" placeholder='확인을 위해 "삭제" 입력' className="rounded border p-1" />
          <SubmitButton className="rounded bg-red-700 px-3 py-1 text-white">계정 삭제</SubmitButton>
        </form>
      </section>
    </main>
  );
}
