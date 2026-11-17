import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanAppCode, cleanBackupCode, manualKey, mustUseTwoFactor } from "./two-factor";

test("two-step: required for admins and editors, optional for writers", () => {
  assert.equal(mustUseTwoFactor("admin"), true);
  assert.equal(mustUseTwoFactor("editor"), true);
  assert.equal(mustUseTwoFactor("writer"), false);
});

test("two-step: app codes accept spaces and dashes, nothing else", () => {
  assert.equal(cleanAppCode("123456"), "123456");
  assert.equal(cleanAppCode(" 123 456 "), "123456");
  assert.equal(cleanAppCode("123-456"), "123456");
  for (const bad of ["12345", "1234567", "12a456", ""]) assert.equal(cleanAppCode(bad), null, bad);
});

test("two-step: backup codes", () => {
  assert.equal(cleanBackupCode(" AbC12-dEf34 "), "AbC12-dEf34");
  assert.equal(cleanBackupCode("x"), null);
  assert.equal(cleanBackupCode("abc;drop"), null);
});

test("two-step: manual key is the URI secret in groups of four", () => {
  assert.equal(manualKey("otpauth://totp/BX%20Newsroom:a%40b.c?secret=ABCDEFGHIJKL&issuer=BX"), "ABCD EFGH IJKL");
  assert.equal(manualKey("not a uri"), "");
});
