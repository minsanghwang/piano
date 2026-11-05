import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { AUTH_ERRORS } from "@/lib/authMessages";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-xl font-bold">비밀번호 재설정</h1>
      <p className="mb-4 text-sm text-gray-600">가입한 이메일을 입력하면 비밀번호를 새로 정하는 링크를 보내 드려요.</p>
      {sent && (
        <p role="status" className="mb-3 text-green-700">
          해당 이메일로 가입한 계정이 있다면 재설정 링크를 보냈어요. 링크는 <b>이 브라우저에서</b> 열어 주세요. 스팸함도 확인해 보세요.
        </p>
      )}
      {error && <p role="alert" className="mb-3 text-red-700">{AUTH_ERRORS[error] ?? AUTH_ERRORS.failed}</p>}
      <form action={requestPasswordReset} className="flex flex-col gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="이메일" className="rounded border p-2" />
        <SubmitButton className="rounded bg-black p-2 text-white">재설정 링크 받기</SubmitButton>
      </form>
      <p className="mt-4 text-sm"><Link href="/login" className="underline">로그인으로 돌아가기</Link></p>
    </main>
  );
}
