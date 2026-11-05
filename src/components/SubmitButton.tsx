"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the form's server action is running, so double clicks send one request.
export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className ?? ""} disabled:opacity-50`}>
      {pending ? "처리 중..." : children}
    </button>
  );
}
