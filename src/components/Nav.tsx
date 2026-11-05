import Link from "next/link";

export function Nav() {
  return (
    <nav className="mx-auto flex max-w-xl gap-4 p-4 pb-0 text-sm">
      <Link href="/">고객</Link>
      <Link href="/reminders">재방문</Link>
      <Link href="/settings">설정</Link>
    </nav>
  );
}
