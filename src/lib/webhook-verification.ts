import crypto from "crypto";

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verifies a webhook signature using the standard Svix / Resend HMAC-SHA256 signature scheme,
 * with backwards-compatible fallback to x-webhook-secret for local/manual testing.
 */
export function verifyWebhookSignature({
  rawBody,
  headers,
  secret,
}: {
  rawBody: string;
  headers: Headers;
  secret: string;
}): WebhookVerificationResult {
  if (!secret) {
    return { valid: false, reason: "Server WEBHOOK_SECRET is not configured" };
  }

  // 1. Direct secret header fallback (for curl/manual testing)
  const legacySecret = headers.get("x-webhook-secret");
  if (legacySecret) {
    try {
      const bufA = Buffer.from(legacySecret);
      const bufB = Buffer.from(secret);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { valid: true };
      }
    } catch {
      // Fall through to signature check
    }
  }

  // 2. Cryptographic signature check (Resend / Svix standard)
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return {
      valid: false,
      reason: "Missing signature headers (svix-id, svix-timestamp, svix-signature) or x-webhook-secret",
    };
  }

  // Replay attack tolerance: reject requests older than 5 minutes (300s)
  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) {
    return { valid: false, reason: "Invalid svix-timestamp header" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const TOLERANCE_SECONDS = 300;
  if (Math.abs(nowSec - timestampSec) > TOLERANCE_SECONDS) {
    return { valid: false, reason: "Webhook timestamp expired (replay attack prevention)" };
  }

  // Verify HMAC-SHA256 signature
  try {
    let keyBuffer: Buffer;
    if (secret.startsWith("whsec_")) {
      keyBuffer = Buffer.from(secret.slice(6), "base64");
    } else {
      keyBuffer = Buffer.from(secret, "utf-8");
    }

    const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", keyBuffer)
      .update(signedPayload)
      .digest("base64");

    // svix-signature may contain space-separated versions e.g. "v1,abc v1,def"
    const passedSignatures = svixSignature.split(" ");
    let matched = false;

    for (const item of passedSignatures) {
      const [version, sig] = item.split(",");
      if (version === "v1" && sig) {
        const bufExpected = Buffer.from(expectedSig);
        const bufSig = Buffer.from(sig);
        if (bufExpected.length === bufSig.length && crypto.timingSafeEqual(bufExpected, bufSig)) {
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      return { valid: false, reason: "Signature mismatch" };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "Error verifying signature",
    };
  }
}
