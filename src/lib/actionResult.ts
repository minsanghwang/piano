import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACTION_ERRORS } from "@/lib/actionMessages";

export { ACTION_ERRORS };

/** If the database call failed, return to the page with an error banner instead of failing silently. */
export function failIf(error: { code?: string } | null, path: string) {
  if (!error) return;
  const code = error.code === "23505" ? "duplicate" : error.code === "23514" ? "badinput" : "save";
  // `t` makes every failure a new URL, so the banner shows again even for the same kind of error.
  redirect(`${path}?error=${code}&t=${Date.now()}`);
}

/** After a successful change: refresh the page data in place (no navigation, so the page doesn't blank). */
export function done(path: string, alsoRevalidate: string[] = []) {
  for (const p of [path, ...alsoRevalidate]) revalidatePath(p);
}
