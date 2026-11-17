// Two-step sign-in rules (D-033). Codes come from a free authenticator app.
import type { Role } from "./permissions";

/** Roles that can publish or manage staff must use two-step sign-in. */
export const TWO_FACTOR_REQUIRED: readonly Role[] = ["admin", "editor"];

export function mustUseTwoFactor(role: Role) {
  return TWO_FACTOR_REQUIRED.includes(role);
}

/** "123 456", "123-456" -> "123456". Null unless it is six digits. */
export function cleanAppCode(input: string) {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Backup codes are letters and digits; people may type them with spaces or in lower case. */
export function cleanBackupCode(input: string) {
  const code = input.replace(/\s/g, "");
  return /^[A-Za-z0-9-]{6,32}$/.test(code) ? code : null;
}

/** The key people type into an authenticator app by hand when they cannot scan the QR code. */
export function manualKey(totpUri: string) {
  try {
    const secret = new URL(totpUri).searchParams.get("secret") ?? "";
    return secret.replace(/(.{4})/g, "$1 ").trim();
  } catch {
    return "";
  }
}
