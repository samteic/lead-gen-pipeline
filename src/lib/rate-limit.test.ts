import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "./rate-limit";

describe("Sliding Window Rate Limiter", () => {
  test("allows requests within threshold and blocks excess", () => {
    const id = `test_ip_${Date.now()}`;
    const config = { maxRequests: 3, windowSeconds: 60 };

    const req1 = checkRateLimit(id, config);
    assert.equal(req1.success, true);
    assert.equal(req1.remaining, 2);

    const req2 = checkRateLimit(id, config);
    assert.equal(req2.success, true);
    assert.equal(req2.remaining, 1);

    const req3 = checkRateLimit(id, config);
    assert.equal(req3.success, true);
    assert.equal(req3.remaining, 0);

    // 4th request must be rejected
    const req4 = checkRateLimit(id, config);
    assert.equal(req4.success, false);
    assert.equal(req4.remaining, 0);
  });
});
