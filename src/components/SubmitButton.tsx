"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// Disables itself while the form's server action is running, so double clicks send one request.
// If it is still waiting after a while, say so: the save has usually gone through and a refresh shows it.
export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [pending]);
  return (
    <>
      <button disabled={pending} className={`${className ?? ""} disabled:opacity-50`}>
        {pending ? "처리 중..." : children}
      </button>
      {pending && slow && (
        <span role="status" className="basis-full text-sm text-amber-700">
          응답이 늦어지고 있어요. 저장은 됐을 수 있으니{" "}
          <button type="button" onClick={() => window.location.reload()} className="underline">
            새로고침
          </button>
          해서 확인해 주세요.
        </span>
      )}
    </>
  );
}
