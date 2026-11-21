import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canTransitionStage, assertStageTransition, nextStages, isOpenStage } from "./crm/opportunity-state-machine";
import { runQualityGate } from "./outreach/quality-gate";
import { scoreToPriority } from "./scoring/score-company";
import { extractWebsiteSignals } from "./website-scoring/website-signals";
import { scoreWebsiteOpportunity } from "./website-scoring/score-website-opportunity";
import { scoreContactRole } from "./contacts/role-rules";
import { parseCsv, csvCell, toCsv } from "./crm/csv";
import { evaluateScoring } from "./evaluation/evaluate-scoring";
import { evaluateContactSelection } from "./evaluation/evaluate-contact-selection";
import { runRegressionSuite } from "./evaluation/regression-suite";
import { safeDemoDestination } from "./demo";

describe("Opportunity State Machine", () => {
  it("allows valid forward stage transitions", () => {
    assert.equal(canTransitionStage("new", "qualified"), true);
    assert.equal(canTransitionStage("qualified", "contacted"), true);
    assert.equal(canTransitionStage("contacted", "lost"), true);
    assert.ok(nextStages("qualified").includes("contacted"));
  });

  it("blocks invalid stage skips and terminal regressions", () => {
    assert.equal(canTransitionStage("new", "won"), false);
    assert.equal(canTransitionStage("won", "qualified"), false);
    assert.equal(canTransitionStage("lost", "new"), false);
    assert.equal(isOpenStage("won"), false);
    assert.equal(isOpenStage("lost"), false);
    assert.equal(isOpenStage("qualified"), true);
    assert.throws(() => assertStageTransition("new", "won"), /invalid|cannot|transition/i);
  });
});

describe("Outreach Quality Gate & Claim Provenance", () => {
  const baseContext = {
    company: { name: "Apex Cloud Systems" },
    contact: { firstName: "Sarah", jobTitle: "VP of Engineering" },
    signals: [
      { name: "industry", evidence: "Cloud Infrastructure" },
      { name: "meta_description", evidence: "Multi-region Kubernetes telemetry" },
    ],
    offer: {
      description: "Lead intelligence and qualification platform",
      valueProposition: "Structured B2B prospect research and scoring",
    },
  };

  it("passes a grounded message with verified claim sources", () => {
    const clean = {
      subject: "Quick question about Kubernetes telemetry",
      body: "Hi Sarah, noticed Apex Cloud Systems works on multi-region Kubernetes telemetry. Worth a brief conversation?",
      personalization_used: ["meta_description"],
      claims: [{ text: "Apex Cloud Systems builds Kubernetes telemetry.", source: "meta_description" }],
    };
    const result = runQualityGate(clean, baseContext, "sarah@apexcloud.io", false, false);
    assert.equal(result.passed, true);
    assert.equal(result.issues.length, 0);
  });

  it("flags claims referencing fabricated or unverified signal sources", () => {
    const fabricated = {
      subject: "Congrats on Series B",
      body: "Hi Sarah, heard you are expanding rapidly — worth discussing?",
      personalization_used: ["funding_round"],
      claims: [{ text: "Raised Series B", source: "funding_round" }],
    };
    const result = runQualityGate(fabricated, baseContext, "sarah@apexcloud.io", false, false);
    assert.equal(result.passed, false);
    assert.ok(result.issues.length > 0);
  });

  it("blocks duplicate outreach to already-contacted or opted-out recipients", () => {
    const clean = {
      subject: "Quick question",
      body: "Hi Sarah, would it make sense to connect briefly?",
      personalization_used: ["industry"],
      claims: [{ text: "Cloud Infrastructure company", source: "industry" }],
    };
    const duplicate = runQualityGate(clean, baseContext, "sarah@apexcloud.io", true, false);
    const unsub = runQualityGate(clean, baseContext, "sarah@apexcloud.io", false, true);
    assert.equal(duplicate.passed, false);
    assert.equal(unsub.passed, false);
  });
});

describe("Scoring Thresholds & Website Opportunity Signals", () => {
  it("enforces deterministic priority threshold boundaries", () => {
    assert.equal(scoreToPriority(80), "HIGH");
    assert.equal(scoreToPriority(79), "MEDIUM");
    assert.equal(scoreToPriority(60), "MEDIUM");
    assert.equal(scoreToPriority(59), "LOW");
    assert.equal(scoreToPriority(40), "LOW");
    assert.equal(scoreToPriority(39), "REJECT");
  });

  it("scores deterministic website gaps accurately", () => {
    const weakSite = scoreWebsiteOpportunity(
      extractWebsiteSignals("meridian.wixsite.com", null, "Short text.", false)
    );
    const strongSite = scoreWebsiteOpportunity(
      extractWebsiteSignals(
        "apexcloud.io",
        "Enterprise Kubernetes observability platform.",
        "Apex Cloud Systems delivers multi-region distributed tracing, cost attribution, and security posture governance for enterprise platform engineering teams worldwide.",
        true
      )
    );

    assert.equal(weakSite.score, 70);
    assert.equal(strongSite.score, 0);
    assert.ok(weakSite.signals.some((s) => s.name === "free_hosted_site" && s.matched));
    assert.ok(weakSite.signals.some((s) => s.name === "no_meta_description" && s.matched));
  });

  it("ranks decision-maker titles higher than generic roles", () => {
    const ceo = scoreContactRole({
      firstName: "Jordan",
      lastName: "Taylor",
      jobTitle: "Founder & CEO",
      department: "Executive",
      seniority: "founder",
      email: "jordan@nexusmedialab.io",
      source: "manual",
    });
    const director = scoreContactRole({
      firstName: "Daniel",
      lastName: "Okafor",
      jobTitle: "Sales Director",
      department: "Sales",
      seniority: "director",
      email: "d.okafor@meridian.com",
      source: "manual",
    });
    const other = scoreContactRole({
      firstName: "Alex",
      lastName: "Smith",
      jobTitle: "Office Coordinator",
      department: "Admin",
      seniority: null,
      email: "alex@example.com",
      source: "manual",
    });

    assert.ok(ceo.score > director.score);
    assert.ok(director.score > other.score);
  });
});

describe("CSV Parser & Formula Injection Protection", () => {
  it("parses quoted cells and regional delimiters cleanly", () => {
    const rows = parseCsv('Company;Website;Notes\n"Apex, Inc.";apex.io;"Line with ""quotes"""\n');
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[1], ["Apex, Inc.", "apex.io", 'Line with "quotes"']);
  });

  it("neutralizes spreadsheet formula injection on export", () => {
    assert.equal(csvCell('=HYPERLINK("http://evil.test","Click")'), '"\'=HYPERLINK(""http://evil.test"",""Click"")"');
    assert.equal(csvCell(-42), "-42");
    const output = toCsv([{ key: "name", header: "Company" }], [{ name: "+SUM(1,2)" }]);
    assert.ok(output.includes("'+SUM(1,2)"));
  });
});

describe("AI Evaluation Harness & Regression Suite", () => {
  it("passes 100% of locked regression invariants", () => {
    const regression = runRegressionSuite();
    assert.equal(regression.allPassed, true);
    assert.equal(regression.failedCount, 0);
    assert.ok(regression.results.length >= 8);
  });

  it("computes valid precision, recall, F1, and contact selection accuracy", () => {
    const scoring = evaluateScoring();
    const contacts = evaluateContactSelection();
    assert.ok(scoring.accuracy > 0 && scoring.accuracy <= 1);
    assert.notEqual(scoring.precision, null);
    assert.notEqual(scoring.recall, null);
    assert.notEqual(scoring.f1, null);
    assert.ok(contacts.accuracy > 0 && contacts.accuracy <= 1);
  });
});

describe("Sandbox Routing Safety", () => {
  it("restricts demo redirects to internal /crm routes", () => {
    assert.equal(safeDemoDestination("/crm/pipeline"), "/crm/pipeline");
    assert.equal(safeDemoDestination("https://evil.example"), "/crm/dashboard");
    assert.equal(safeDemoDestination("//evil.example"), "/crm/dashboard");
    assert.equal(safeDemoDestination(null), "/crm/dashboard");
  });
});
