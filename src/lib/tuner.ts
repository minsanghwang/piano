import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Reads the signed-in user's id/email from the session cookie, with no network round trip.
 * The middleware has already verified the user with Supabase and refreshed the cookie on this request,
 * and data access stays protected by RLS regardless: Postgres checks the JWT itself.
 * Use this only for identifying/displaying the user, never as the sole gate for sensitive data.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { supabase, user: null };
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { sub: string; email?: string };
  return { supabase, user: { id: claims.sub, email: claims.email ?? "" } };
}

// Returns the signed-in tuner's client and id, or sends the visitor to /login.
export async function requireTuner() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}
