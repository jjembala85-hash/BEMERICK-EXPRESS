"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { cleanAppCode, cleanBackupCode } from "@/lib/two-factor";
import { clearLoginFailures, loginBlocked, loginKeys, recordLoginFailure } from "@/lib/login-throttle";

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const keys = loginKeys(email, ip);
  // Too many failures: refuse without even checking the password, so guessing gains nothing.
  if (await loginBlocked(keys)) {
    return { error: "Too many failed attempts. Wait 15 minutes, then try again, or ask an administrator for a new link." };
  }

  let needsCode = false;
  try {
    const result = await getAuth().api.signInEmail({
      body: { email, password },
      headers: h,
    });
    // Two-step sign-in is on: the password was right, now the app code is needed.
    needsCode = Boolean(result && typeof result === "object" && "twoFactorRedirect" in result && result.twoFactorRedirect);
  } catch {
    await recordLoginFailure(keys);
    // Same message for every failure, so the form never reveals which emails exist.
    return { error: "Incorrect email or password." };
  }
  await clearLoginFailures(keys);
  redirect(needsCode ? "/newsroom/login/code" : "/newsroom");
}

export type CodeState = { error?: string; expired?: boolean };

/** Second step of sign-in: a 6-digit app code, or one of the backup codes. */
export async function verifySignInCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const useBackup = formData.get("method") === "backup";
  const trustDevice = formData.get("trustDevice") === "on";
  const raw = String(formData.get("code") ?? "");
  const code = useBackup ? cleanBackupCode(raw) : cleanAppCode(raw);
  if (!code) return { error: useBackup ? "Type one of your backup codes." : "Type the 6-digit code from your authenticator app." };

  try {
    const auth = getAuth();
    const request = { body: { code, trustDevice }, headers: await headers() };
    if (useBackup) await auth.api.verifyBackupCode(request);
    else await auth.api.verifyTOTP(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cookie|expired/i.test(message)) {
      return { error: "This sign-in took too long. Start again with your email and password.", expired: true };
    }
    if (/lock|too many/i.test(message)) {
      return { error: "Too many wrong codes. Wait 15 minutes, then sign in again." };
    }
    return {
      error: useBackup
        ? "That backup code did not work. Each code works only once."
        : "That code did not work. Check the phone's time is set automatically and use the newest code.",
    };
  }
  redirect("/newsroom");
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/newsroom/login");
}
