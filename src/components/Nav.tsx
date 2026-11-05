import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return (
    <nav className="mx-auto flex max-w-xl gap-4 p-4 pb-0 text-sm">
      <Link href="/today">오늘</Link>
      <Link href="/bookings">예약</Link>
      <Link href="/reminders">재방문</Link>
      <Link href="/">고객</Link>
      <Link href="/settings">설정</Link>
    </nav>
  );
}
