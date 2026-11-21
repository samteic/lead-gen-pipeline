import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { canTransition, assertTransition } from "./state-machine";

describe("Outreach State Machine", () => {
  test("allows valid transitions", () => {
    assert.equal(canTransition("DRAFT", "APPROVED"), true);
    assert.equal(canTransition("APPROVED", "SCHEDULED"), true);
    assert.equal(canTransition("APPROVED", "SENT"), true);
    assert.equal(canTransition("SCHEDULED", "SENT"), true);
    assert.equal(canTransition("SENT", "DELIVERED"), true);
    assert.equal(canTransition("SENT", "BOUNCED"), true);
    assert.equal(canTransition("DELIVERED", "REPLIED"), true);
    assert.equal(canTransition("DELIVERED", "NO_REPLY"), true);
    assert.equal(canTransition("REPLIED", "QUALIFIED"), true);
  });

  test("rejects invalid skipping transitions", () => {
    // Cannot skip approval directly to SENT
    assert.equal(canTransition("DRAFT", "SENT"), false);
    // Cannot revive from terminal BOUNCED state
    assert.equal(canTransition("BOUNCED", "SENT"), false);
    // Cannot skip delivered to converted
    assert.equal(canTransition("DELIVERED", "CONVERTED"), false);
  });

  test("assertTransition throws readable error on invalid transition", () => {
    assert.throws(
      () => assertTransition("BOUNCED", "SENT"),
      /Invalid state transition: BOUNCED → SENT/
    );
  });
});