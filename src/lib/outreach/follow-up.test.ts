import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateFollowUp } from "./follow-up";

describe("Follow-Up Cadence & Safety Rules", () => {
  test("prevents following up too quickly", () => {
    const decision = evaluateFollowUp("DELIVERED", 1, 0);
    assert.equal(decision.shouldFollowUp, false);
    assert.match(decision.reason, /too soon|required/i);
  });

  test("triggers first follow-up at 3 days", () => {
    const decision = evaluateFollowUp("DELIVERED", 3, 0);
    assert.equal(decision.shouldFollowUp, true);
  });

  test("triggers second follow-up at 7 days", () => {
    const decision = evaluateFollowUp("NO_REPLY", 7, 1);
    assert.equal(decision.shouldFollowUp, true);
  });

  test("enforces maximum 2 follow-ups rule", () => {
    const decision = evaluateFollowUp("NO_REPLY", 10, 2);
    assert.equal(decision.shouldFollowUp, false);
    assert.match(decision.reason, /Maximum follow-up count/i);
  });

  test("never follows up once a prospect replies or unsubscribes", () => {
    assert.equal(evaluateFollowUp("REPLIED", 30, 0).shouldFollowUp, false);
    assert.equal(evaluateFollowUp("UNSUBSCRIBED", 30, 0).shouldFollowUp, false);
    assert.equal(evaluateFollowUp("BOUNCED", 30, 0).shouldFollowUp, false);
  });
});