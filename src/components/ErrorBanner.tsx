"use client";

import { useEffect, useState } from "react";
import { ACTION_ERRORS } from "@/lib/actionMessages";

// Shows the error from the URL, and hides it as soon as the user submits any form again
// (so an old error never sits next to a later success).
export function ErrorBanner({ code, message, stamp }: { code?: string; message?: string; stamp?: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    const hide = () => setHidden(true);
    document.addEventListener("submit", hide, true);
    return () => document.removeEventListener("submit", hide, true);
  }, [code, stamp]);
  if (!code || hidden) return null;
  return <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-red-700">{message ?? ACTION_ERRORS[code] ?? ACTION_ERRORS.save}</p>;
}
