import test, { describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifyWebhookSignature } from "./webhook-verification";

describe("Webhook Cryptographic Signature Verification", () => {
  const secret = "duhudfhudshfoisajpoi0aISOSK8U83Y7HEWD";

  test("verifies valid Svix HMAC-SHA256 signature", () => {
    const svixId = "msg_valid_01";
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify({ provider_message_id: "resend_123", event_type: "delivered" });

    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const sig = crypto.createHmac("sha256", Buffer.from(secret)).update(toSign).digest("base64");

    const headers = new Headers({
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": `v1,${sig}`,
    });

    const result = verifyWebhookSignature({ rawBody, headers, secret });
    assert.equal(result.valid, true);
  });

  test("rejects replay attacks with expired timestamps (> 5 minutes old)", () => {
    const svixId = "msg_old_01";
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // > 6 mins ago
    const rawBody = JSON.stringify({ provider_message_id: "resend_123", event_type: "delivered" });

    const toSign = `${svixId}.${oldTimestamp}.${rawBody}`;
    const sig = crypto.createHmac("sha256", Buffer.from(secret)).update(toSign).digest("base64");

    const headers = new Headers({
      "svix-id": svixId,
      "svix-timestamp": oldTimestamp,
      "svix-signature": `v1,${sig}`,
    });

    const result = verifyWebhookSignature({ rawBody, headers, secret });
    assert.equal(result.valid, false);
    assert.match(result.reason || "", /timestamp expired/i);
  });

  test("rejects tampered payload content", () => {
    const svixId = "msg_tampered_01";
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const originalBody = JSON.stringify({ amount: 100 });
    const tamperedBody = JSON.stringify({ amount: 99999 });

    const toSign = `${svixId}.${svixTimestamp}.${originalBody}`;
    const sig = crypto.createHmac("sha256", Buffer.from(secret)).update(toSign).digest("base64");

    const headers = new Headers({
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": `v1,${sig}`,
    });

    const result = verifyWebhookSignature({ rawBody: tamperedBody, headers, secret });
    assert.equal(result.valid, false);
    assert.match(result.reason || "", /mismatch/i);
  });

  test("accepts valid fallback x-webhook-secret header", () => {
    const rawBody = JSON.stringify({ test: true });
    const headers = new Headers({
      "x-webhook-secret": secret,
    });

    const result = verifyWebhookSignature({ rawBody, headers, secret });
    assert.equal(result.valid, true);
  });
});
