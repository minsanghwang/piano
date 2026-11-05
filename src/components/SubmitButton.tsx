"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the form's server action is running, so double clicks send one request.
// If it is still waiting after 8 seconds, say so: the save has usually gone through and a refresh shows it.
// The delay is pure CSS (see .slow-notice): changing React state from a timer here broke the form's pending state.
export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button disabled={pending} className={`${className ?? ""} disabled:opacity-50`}>
        {pending ? "처리 중..." : children}
      </button>
      {pending && (
        <span role="status" className="slow-notice basis-full text-sm text-amber-700">
          응답이 늦어지고 있어요. 저장은 됐을 수 있으니{" "}
          <a href="" className="underline">
            새로고침
          </a>
          해서 확인해 주세요.
        </span>
      )}
    </>
  );
}
