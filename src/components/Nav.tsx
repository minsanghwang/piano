import { NavLink } from "@/components/NavLink";
import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return (
    <nav className="mx-auto flex max-w-xl gap-4 p-4 pb-0 text-sm">
      <NavLink href="/today">오늘</NavLink>
      <NavLink href="/bookings">예약</NavLink>
      <NavLink href="/reminders">재방문</NavLink>
      <NavLink href="/">고객</NavLink>
      <NavLink href="/settings">설정</NavLink>
    </nav>
  );
}
