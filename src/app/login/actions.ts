"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

async function origin() {
  return (await headers()).get("origin") ?? "";
}

export async function signInWithPassword(formData: FormData) {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!EMAIL.test(email) || !password) redirect("/login?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") redirect("/login?error=unconfirmed");
  if (error?.code === "over_request_rate_limit") redirect("/login?error=wait");
  if (error) redirect("/login?error=invalid"); // same message for unknown email and wrong password
  redirect("/");
}

export async function signInWithLink(formData: FormData) {
  const email = field(formData, "email").trim();
  if (!EMAIL.test(email)) redirect("/login?error=email");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error?.code === "over_email_send_rate_limit") redirect("/login?error=wait");
  redirect(error ? "/login?error=link" : "/login?sent=link");
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!EMAIL.test(email)) redirect("/signup?error=email");
  if (password.length < 8 || password.length > 72) redirect("/signup?error=weak");
  if (password !== field(formData, "password2")) redirect("/signup?error=mismatch");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error?.code === "user_already_exists") redirect("/signup?error=exists");
  if (error?.code === "weak_password") redirect("/signup?error=weak");
  if (error?.code === "over_email_send_rate_limit") redirect("/signup?error=wait");
  if (error) redirect("/signup?error=failed");
  if (data.session) redirect("/"); // email confirmation is off: signed in right away
  // With confirmation on, an already-registered email comes back as a user with no identities.
  if (data.user?.identities?.length === 0) redirect("/signup?error=exists");
  redirect("/login?sent=signup");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?sent=signout");
}
