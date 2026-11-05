import { SubmitButton } from "@/components/SubmitButton";
import { AUTH_ERRORS } from "@/lib/authMessages";
import { requireTuner } from "@/lib/tuner";
import { updatePassword } from "../account/actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireTuner(); // reached via the emailed link (recovery session) or while signed in
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">새 비밀번호 정하기</h1>
      {error && <p role="alert" className="mb-3 text-red-700">{AUTH_ERRORS[error] ?? AUTH_ERRORS.failed}</p>}
      <form action={updatePassword} className="flex flex-col gap-3">
        <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)" className="rounded border p-2" />
        <input name="password2" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="새 비밀번호 확인" className="rounded border p-2" />
        <SubmitButton className="rounded bg-black p-2 text-white">비밀번호 변경</SubmitButton>
      </form>
    </main>
  );
}
