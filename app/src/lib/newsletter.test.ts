import { test } from "node:test";
import assert from "node:assert/strict";
import { checkToken, issueEmail, linkToken, normaliseEmail } from "./newsletter";

test("emails are cleaned and checked", () => {
  assert.equal(normaliseEmail("  Reader@Example.CO.UG "), "reader@example.co.ug");
  for (const bad of ["", "no-at-sign", "a@b", "a@b.c", "two@@example.com", "a..b@example.com", "x@example.com<script>", `${"a".repeat(250)}@x.com`]) {
    assert.equal(normaliseEmail(bad), null, bad);
  }
});

test("link tokens only work for their purpose and subscriber", () => {
  const key = "test-secret";
  const id = "0b5f2c5e-1111-4222-8333-444455556666";
  const t = linkToken("unsubscribe", id, key);
  assert.ok(checkToken("unsubscribe", id, t, key));
  assert.equal(checkToken("confirm", id, t, key), false);
  assert.equal(checkToken("unsubscribe", "0b5f2c5e-1111-4222-8333-444455556667", t, key), false);
  assert.equal(checkToken("unsubscribe", id, "short", key), false);
  assert.equal(checkToken("unsubscribe", id, t, "other-secret"), false);
});

test("edition email escapes text and carries the unsubscribe link", () => {
  process.env.BETTER_AUTH_SECRET ??= "test-secret";
  const email = issueEmail(
    { subject: "Morning briefing", intro: "Hello <b>Kampala</b>", stories: [{ headline: "Fuel & tax <update>", standfirst: null, section: "Business", path: "/business/fuel" }] },
    "0b5f2c5e-1111-4222-8333-444455556666",
  );
  assert.ok(email.html.includes("Fuel &amp; tax &lt;update&gt;"));
  assert.ok(email.html.includes("Hello &lt;b&gt;Kampala&lt;/b&gt;"));
  assert.ok(!email.html.includes("<b>Kampala"));
  assert.ok(email.html.includes("/newsletter/unsubscribe?id=0b5f2c5e-1111-4222-8333-444455556666&amp;t="));
  assert.ok(email.text.includes("Unsubscribe: "));
});
