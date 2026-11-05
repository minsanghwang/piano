import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; wait?: string }> }) {
  const { sent, error, wait } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const origin = (await headers()).get("origin");
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    
    if (error?.code === "over_email_send_rate_limit") redirect("/login?wait=1");
    redirect(error ? "/login?error=1" : "/login?sent=1");
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">조율사 로그인</h1>
      {sent && <p className="mb-3 text-green-700">메일로 로그인 링크를 보냈어요.</p>}
      {wait && <p className="mb-3 text-amber-700">메일을 너무 자주 요청했어요. 1분쯤 뒤에 한 번만 다시 눌러 주세요. 먼저 받은편지함과 스팸함에 이미 온 메일이 있는지 확인해 보세요.</p>}
      {error && <p className="mb-3 text-red-700">로그인에 실패했어요. 다시 시도해 주세요.</p>}
      <form action={signIn} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="이메일" className="rounded border p-2" />
        <SubmitButton className="rounded bg-black p-2 text-white">로그인 링크 받기</SubmitButton>
      </form>
    </main>
  );
}
