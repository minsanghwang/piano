import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";
import { done, failIf } from "@/lib/actionResult";
import { ErrorBanner } from "@/components/ErrorBanner";
import { requireTuner } from "@/lib/tuner";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorCode } = await searchParams;
  const { supabase } = await requireTuner();
  const { data: customers } = await supabase.from("customers").select("id, name, phone").order("name");

  async function addCustomer(formData: FormData) {
    "use server";
    const { supabase } = await requireTuner();
    const { error } = await supabase.from("customers").insert({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      contact_consent: formData.get("contact_consent") === "on",
    });
    failIf(error, "/");
    await done("/");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">고객</h1>
      <ErrorBanner code={errorCode} />
      <ul className="mb-8 divide-y rounded border">
        {customers?.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="flex justify-between p-3 hover:bg-gray-50">
              <span>{c.name}</span>
              <span className="text-gray-500">{c.phone}</span>
            </Link>
          </li>
        ))}
        {!customers?.length && <li className="p-3 text-gray-500">아직 고객이 없어요.</li>}
      </ul>
      <form action={addCustomer} className="flex flex-col gap-2">
        <h2 className="font-semibold">고객 추가</h2>
        <input name="name" required maxLength={100} placeholder="이름" className="rounded border p-2" />
        <input name="phone" maxLength={30} placeholder="연락처" className="rounded border p-2" />
        <input name="address" maxLength={300} placeholder="주소 (필요할 때만)" className="rounded border p-2" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="contact_consent" /> 연락(재방문 안내) 수신 동의 받음
        </label>
        <SubmitButton className="rounded bg-black p-2 text-white">추가</SubmitButton>
      </form>
    </main>
  );
}
