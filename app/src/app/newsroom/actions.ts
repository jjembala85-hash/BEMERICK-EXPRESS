"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  try {
    await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    // Same message for every failure, so the form never reveals which emails exist.
    return { error: "Incorrect email or password." };
  }
  redirect("/newsroom");
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/newsroom/login");
}
