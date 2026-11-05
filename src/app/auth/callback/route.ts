import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A password-reset email signs the user in with the "recovery" method: send them to choose a new password.
      const claims = JSON.parse(Buffer.from(data.session.access_token.split(".")[1], "base64url").toString()) as {
        amr?: { method: string }[];
      };
      const isRecovery = claims.amr?.some((a) => a.method === "recovery");
      return NextResponse.redirect(`${origin}${isRecovery ? "/reset-password" : "/"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
