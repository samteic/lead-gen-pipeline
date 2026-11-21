import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeCompanyName, normalizeDomain } from "./normalize";

describe("Data Normalization", () => {
  test("normalizes legal corporate suffixes", () => {
    assert.equal(normalizeCompanyName("Terry-Arnold"), "Terry-Arnold");
    assert.equal(normalizeCompanyName("Terry-Arnold Inc."), "Terry-Arnold Incorporated");
    assert.equal(normalizeCompanyName("Terry-Arnold BV"), "Terry-Arnold BV");
    assert.equal(normalizeCompanyName("Acme Ltd"), "Acme Limited");
    assert.equal(normalizeCompanyName("Global Corp"), "Global Corporation");
    assert.equal(normalizeCompanyName("Innovate LLC"), "Innovate LLC");
  });

  test("normalizes website URLs to canonical domain", () => {
    assert.equal(normalizeDomain("https://shepard.biz/"), "shepard.biz");
    assert.equal(normalizeDomain("http://www.shepard.biz"), "shepard.biz");
    assert.equal(normalizeDomain("shepard.biz"), "shepard.biz");
    assert.equal(normalizeDomain("https://sub.domain.co.uk/path?arg=1"), "sub.domain.co.uk");
  });

  test("handles empty and malformed domains gracefully", () => {
    assert.equal(normalizeDomain(""), null);
    assert.equal(normalizeDomain("invalid domain without dots"), null);
  });
});