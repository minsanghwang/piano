"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setDone(true);
    } catch {
      // user cancelled sharing, or clipboard unavailable
    }
  }
  return (
    <button type="button" onClick={copy} className="rounded border px-3 py-1 text-sm">
      {done ? "복사/공유됨" : "복사/공유"}
    </button>
  );
}
