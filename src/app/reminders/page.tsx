import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";
import { done, failIf } from "@/lib/actionResult";
import { ErrorBanner } from "@/components/ErrorBanner";
import { requireTuner } from "@/lib/tuner";
import { getOrigin } from "@/lib/origin";
import { CopyButton } from "@/components/CopyButton";
import { draftMessage, isReminderDue, todayKST } from "@/lib/reminders";

type Svc = { visit_date: string; next_due_date: string | null; created_at: string };

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorCode } = await searchParams;
  const { supabase, userId } = await requireTuner();
  const today = todayKST();
  const [{ data: tuner }, { data: instruments }] = await Promise.all([
    supabase.from("tuners").select("name, booking_slug").eq("id", userId).single(),
    supabase
      .from("instruments")
      .select("id, subtype, make_model, customers(id, name, contact_consent), services(visit_date, next_due_date, created_at), reminder_logs(sent_at)"),
  ]);

  const bookingUrl = `${await getOrigin()}/book/${tuner?.booking_slug}`;
  const items = (instruments ?? [])
    .map((i) => {
      const services = [...(i.services as Svc[])].sort((a, b) => b.visit_date.localeCompare(a.visit_date));
      const last = services[0];
      const customer = i.customers as unknown as { id: string; name: string; contact_consent: boolean } | null;
      const logs = i.reminder_logs as { sent_at: string }[];
      // Already handled once the tuner has confirmed a reminder after the latest service was recorded.
      const handled = last && logs.some((l) => l.sent_at > last.created_at);
      return { i, last, customer, handled };
    })
    .filter((x) => x.last?.next_due_date && x.customer && !x.handled && isReminderDue(x.last.next_due_date, today))
    .sort((a, b) => a.last!.next_due_date!.localeCompare(b.last!.next_due_date!));

  async function markSent(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("reminder_logs").insert({ instrument_id: String(formData.get("instrument_id")) });
    failIf(error, "/reminders");
    done("/reminders");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-xl font-bold">재방문 안내</h1>
      <ErrorBanner code={errorCode} />
      <p className="mb-4 text-sm text-gray-500">다음 조율일이 4주 안으로 다가왔거나 지난 악기입니다. 메시지를 보낸 뒤 &quot;보냈어요&quot;를 눌러 주세요.</p>
      {!items.length && <p className="text-gray-500">지금 안내할 고객이 없어요.</p>}
      {items.map(({ i, last, customer }) => {
        const name = `${i.subtype === "grand" ? "그랜드" : i.subtype === "upright" ? "업라이트" : "피아노"}${i.make_model ? ` (${i.make_model})` : ""}`;
        const text = draftMessage({ tuner: tuner?.name ?? "", customer: customer!.name, instrument: name, lastVisit: last!.visit_date, bookingUrl });
        return (
          <section key={i.id} className="mb-4 rounded border p-3">
            <div className="flex justify-between">
              <Link href={`/customers/${customer!.id}`} className="font-semibold">{customer!.name} · {name}</Link>
              <span className="text-sm text-gray-500">권장일 {last!.next_due_date}</span>
            </div>
            {!customer!.contact_consent && <p className="text-sm text-amber-700">연락 동의가 기록되지 않았어요. 보내기 전에 확인해 주세요.</p>}
            <pre className="my-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm">{text}</pre>
            <div className="flex gap-2">
              <CopyButton text={text} />
              <form action={markSent}>
                <input type="hidden" name="instrument_id" value={i.id} />
                <SubmitButton className="rounded bg-black px-3 py-1 text-sm text-white">보냈어요</SubmitButton>
              </form>
            </div>
          </section>
        );
      })}
    </main>
  );
}
