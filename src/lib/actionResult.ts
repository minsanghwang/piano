import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const ACTION_ERRORS: Record<string, string> = {
  save: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  duplicate: "이미 등록된 항목이에요.",
  badinput: "입력한 값을 확인해 주세요. (예: 끝나는 시간은 시작 시간보다 늦어야 해요)",
};

/** If the database call failed, return to the page with an error banner instead of failing silently. */
export function failIf(error: { code?: string } | null, path: string) {
  if (!error) return;
  const code = error.code === "23505" ? "duplicate" : error.code === "23514" ? "badinput" : "save";
  redirect(`${path}?error=${code}`);
}

/**
 * After a successful change: refresh the data in place. Only when the page we came from still shows an
 * old error/notice in its URL do we navigate to the clean URL (that navigation briefly blanks the page,
 * so it is not done for ordinary saves).
 */
export async function done(path: string, alsoRevalidate: string[] = []) {
  for (const p of [path, ...alsoRevalidate]) revalidatePath(p);
  const referer = (await headers()).get("referer") ?? "";
  if (/[?&](error|notice)=/.test(referer)) redirect(path);
}
