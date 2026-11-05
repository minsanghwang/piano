import { ACTION_ERRORS } from "@/lib/actionResult";

export function ErrorBanner({ code }: { code?: string }) {
  if (!code) return null;
  return <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-red-700">{ACTION_ERRORS[code] ?? ACTION_ERRORS.save}</p>;
}
