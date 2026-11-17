"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { requireStaff } from "@/lib/session";
import { cleanAppCode, manualKey, mustUseTwoFactor } from "@/lib/two-factor";

export type SetupState = {
  error?: string;
  qrSvg?: string;
  key?: string;
  backupCodes?: string[];
};

export type CodesState = { error?: string; backupCodes?: string[] };

const wrongPassword = (error: unknown) => error instanceof Error && /password/i.test(error.message);

async function log(actorId: string, action: string) {
  await getDb().insert(auditLog).values({ actorId, action, entity: "user", entityId: actorId, details: {} });
}

/** Step 1: confirm the password; returns the QR code, the typed key and backup codes. */
export async function startSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const staff = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  if (staff.twoFactorEnabled) return { error: "Two-step sign-in is already on." };
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Type your password to continue." };
  try {
    const result = await getAuth().api.enableTwoFactor({ body: { password }, headers: await headers() });
    if (!("totpURI" in result) || !result.totpURI) return { error: "Two-step sign-in could not be started. Try again." };
    const qrSvg = await QRCode.toString(result.totpURI, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    return { qrSvg, key: manualKey(result.totpURI), backupCodes: result.backupCodes ?? [] };
  } catch (error) {
    if (wrongPassword(error)) return { error: "That password is not right." };
    console.error("Two-step setup failed", error);
    return { error: "Two-step sign-in could not be started. Try again." };
  }
}

/** Step 2: a code from the app proves it is set up correctly; this switches two-step on. */
export async function confirmSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const staff = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  const code = cleanAppCode(String(formData.get("code") ?? ""));
  if (!code) return { error: "Type the 6-digit code shown in the app." };
  try {
    await getAuth().api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch {
    return { error: "That code did not work. Check the phone's time is set automatically and use the newest code." };
  }
  await log(staff.id, "security.two_factor_on");
  redirect("/newsroom/security?on=1");
}

export async function newBackupCodes(_prev: CodesState, formData: FormData): Promise<CodesState> {
  const staff = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Type your password to continue." };
  try {
    const result = await getAuth().api.generateBackupCodes({ body: { password }, headers: await headers() });
    await log(staff.id, "security.backup_codes");
    return { backupCodes: result.backupCodes };
  } catch (error) {
    if (wrongPassword(error)) return { error: "That password is not right." };
    return { error: "New backup codes could not be made. Try again." };
  }
}

/** Writers may turn two-step off again; admins and editors may not. */
export async function turnOff(_prev: CodesState, formData: FormData): Promise<CodesState> {
  const staff = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  if (mustUseTwoFactor(staff.role)) return { error: "Administrators and editors must keep two-step sign-in on." };
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Type your password to continue." };
  try {
    await getAuth().api.disableTwoFactor({ body: { password }, headers: await headers() });
  } catch (error) {
    if (wrongPassword(error)) return { error: "That password is not right." };
    return { error: "Two-step sign-in could not be turned off. Try again." };
  }
  await log(staff.id, "security.two_factor_off");
  redirect("/newsroom/security?off=1");
}
