import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { AUTH_ERRORS } from "@/lib/authMessages";
import { signUp } from "../login/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">회원가입</h1>
      {error && <p role="alert" className="mb-3 text-red-700">{AUTH_ERRORS[error] ?? AUTH_ERRORS.failed}</p>}
      <form action={signUp} className="flex flex-col gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="이메일" className="rounded border p-2" />
        <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="비밀번호 (8자 이상)" className="rounded border p-2" />
        <input name="password2" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="비밀번호 확인" className="rounded border p-2" />
        <SubmitButton className="rounded bg-black p-2 text-white">가입하기</SubmitButton>
      </form>
      <p className="mt-4 text-sm">
        이미 계정이 있나요? <Link href="/login" className="underline">로그인</Link>
      </p>
    </main>
  );
}
