import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { AUTH_ERRORS, AUTH_NOTICES } from "@/lib/authMessages";
import { signInWithLink, signInWithPassword } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">로그인</h1>
      {sent && AUTH_NOTICES[sent] && <p role="status" className="mb-3 text-green-700">{AUTH_NOTICES[sent]}</p>}
      {error && <p role="alert" className="mb-3 text-red-700">{AUTH_ERRORS[error] ?? AUTH_ERRORS.invalid}</p>}
      <form action={signInWithPassword} className="flex flex-col gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="이메일" className="rounded border p-2" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="비밀번호" className="rounded border p-2" />
        <SubmitButton className="rounded bg-black p-2 text-white">로그인</SubmitButton>
      </form>
      <p className="mt-3 text-sm"><Link href="/forgot-password" className="underline">비밀번호를 잊으셨나요?</Link></p>
      <p className="mt-2 text-sm">
        계정이 없나요? <Link href="/signup" className="underline">회원가입</Link>
      </p>
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-gray-600">비밀번호 없이 이메일 링크로 로그인</summary>
        <form action={signInWithLink} className="mt-3 flex flex-col gap-3">
          <input name="email" type="email" required placeholder="이메일" className="rounded border p-2" />
          <SubmitButton className="rounded border p-2">로그인 링크 받기</SubmitButton>
        </form>
      </details>
    </main>
  );
}
