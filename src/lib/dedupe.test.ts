import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { checkDuplicate, ExistingCompany } from "./dedupe";

describe("Multi-Tier Deduplication Engine", () => {
  const existing: ExistingCompany[] = [
    { id: "comp-1", normalized_name: "Terry-Arnold", domain: "shepard.biz", location: "Nicaragua" },
    { id: "comp-2", normalized_name: "Mckay Limited", domain: "valencia.com", location: "Palestinian Territory" },
  ];

  test("Tier 1: Identifies high-confidence match on identical domain", () => {
    const result = checkDuplicate(
      { company_name: "Terry-Arnold Inc.", website: "http://www.shepard.biz/", location: "Nicaragua" },
      existing
    );

    assert.equal(result.isDuplicate, true);
    if (result.isDuplicate === true) {
      assert.equal(result.confidence, "high");
      assert.equal(result.reason, "domain_match");
      assert.equal(result.matchedId, "comp-1");
    }
  });

  test("Tier 2: Identifies medium-confidence match on similar name + identical location", () => {
    const result = checkDuplicate(
      { company_name: "Mckay Ltd", website: "https://unknown-domain.org", location: "Palestinian Territory" },
      existing
    );

    assert.equal(result.isDuplicate, true);
    if (result.isDuplicate === true) {
      assert.equal(result.confidence, "medium");
      assert.equal(result.reason, "name_and_location_match");
      assert.equal(result.matchedId, "comp-2");
    }
  });

  test("Identifies unique non-duplicate companies correctly", () => {
    const result = checkDuplicate(
      { company_name: "Barnes-Robles", website: "https://garcia.com/", location: "Jordan" },
      existing
    );

    assert.equal(result.isDuplicate, false);
  });
});