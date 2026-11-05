import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in tuner's client and id.
// The middleware has already verified the user with Supabase and refreshed the cookie on this request,
// so we only read the id from the session cookie here (no extra network round trip).
// Data access stays protected by RLS regardless: Postgres checks the JWT itself.
export async function requireTuner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) redirect("/login");
  const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub as string;
  return { supabase, userId };
}
