import { NavLink } from "@/components/NavLink";
import { SubmitButton } from "@/components/SubmitButton";
import { getSessionUser } from "@/lib/tuner";
import { signOut } from "@/app/login/actions";

export async function Nav() {
  const { user } = await getSessionUser();
  if (!user) return null;
  return (
    <nav className="mx-auto flex max-w-xl flex-wrap items-center gap-4 p-4 pb-0 text-sm">
      <NavLink href="/today">오늘</NavLink>
      <NavLink href="/bookings">예약</NavLink>
      <NavLink href="/reminders">재방문</NavLink>
      <NavLink href="/">고객</NavLink>
      <NavLink href="/settings">설정</NavLink>
      <NavLink href="/help">사용법</NavLink>
      <form action={signOut} className="ml-auto flex items-center gap-2">
        <span className="max-w-40 truncate text-gray-500">{user.email}</span>
        <SubmitButton className="rounded border px-2 py-1">로그아웃</SubmitButton>
      </form>
    </nav>
  );
}
