import { revalidatePath } from "next/cache";
import { requireTuner } from "@/lib/tuner";

export default async function SettingsPage() {
  const { supabase, userId } = await requireTuner();
  const { data: tuner } = await supabase.from("tuners").select("name, default_retune_months").eq("id", userId).single();

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
    </main>
  );
}
