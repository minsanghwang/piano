"use server";

import { redirect } from "next/navigation";
import { requireTuner } from "@/lib/tuner";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 72) redirect("/reset-password?error=weak");
  if (password !== String(formData.get("password2") ?? "")) redirect("/reset-password?error=mismatch");
  const { supabase } = await requireTuner();
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password") redirect("/reset-password?error=same");
  if (error?.code === "weak_password") redirect("/reset-password?error=weak");
  if (error) redirect("/reset-password?error=failed");
  redirect("/settings?notice=password");
}

export async function deleteAccount(formData: FormData) {
  if (String(formData.get("confirm") ?? "").trim() !== "삭제") redirect("/settings?error=confirm");
  const { supabase } = await requireTuner();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) redirect("/settings?error=delete");
  await supabase.auth.signOut(); // clears the cookies of the now-deleted account
  redirect("/login?sent=deleted");
}
