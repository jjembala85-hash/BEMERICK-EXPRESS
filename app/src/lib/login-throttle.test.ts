import { test } from "node:test";
import assert from "node:assert/strict";
import { loginKeys } from "./login-throttle";

test("login keys: same email in any case gives the same key; keys change daily and never contain the email", () => {
  const a = loginKeys("Editor@Example.com ", "1.2.3.4", "2026-11-20");
  const b = loginKeys("editor@example.com", "5.6.7.8", "2026-11-20");
  assert.equal(a.email, b.email);
  assert.notEqual(a.address, b.address);
  assert.notEqual(a.email, loginKeys("editor@example.com", "1.2.3.4", "2026-11-21").email);
  assert.ok(!a.email.includes("example") && /^[0-9a-f]{64}$/.test(a.email));
  assert.notEqual(a.email, a.address);
});
