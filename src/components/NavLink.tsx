"use client";

import Link, { useLinkStatus } from "next/link";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="ml-1 animate-pulse text-gray-500">…</span> : null;
}

// Shows a pulsing "…" the moment the link is clicked, until the next page is ready.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}>
      {children}
      <Pending />
    </Link>
  );
}
