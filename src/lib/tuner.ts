import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in tuner's client and id; creates the tuner profile row on first visit.
export async function requireTuner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  await supabase.from("tuners").upsert({ id: data.user.id }, { onConflict: "id", ignoreDuplicates: true });
  return { supabase, userId: data.user.id };
}
