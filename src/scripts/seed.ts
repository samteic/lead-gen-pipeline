import { supabase } from "@/lib/supabase";
import { normalizeCompanyName, normalizeDomain } from "@/lib/normalize";
import { hashEmail } from "@/lib/compliance/suppression";
import type { OpportunityStage } from "@/lib/crm/opportunity-state-machine";

interface SeedCompany {
  name: string;
  website: string;
  industry: string;
  location: string;
  employees: number;
  source: string;
  enrichments: {
    websiteTitle: string;
    metaDescription: string | null;
    bodyTextSample: string;
    contactSignals: string;
    businessModel: string;
    customerType: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    department: string;
    seniority: string;
    email: string;
    emailStatus: "verified" | "risky" | "unknown";
    lawfulBasis: "legitimate_interest" | "consent" | "existing_customer" | "test_data";
  };
  score: {
    fit: number;
    intent: number;
    priority: "HIGH" | "MEDIUM" | "LOW" | "REJECT";
    reasoning: string;
  };
  deal?: {
    name: string;
    stage: OpportunityStage;
    value: number;
    actualValue?: number;
    probability?: number;
  };
  outreach?: {
    subject: string;
    body: string;
    status: "DRAFT" | "APPROVED" | "DELIVERED" | "REPLIED";
    qualityPassed: boolean;
    qualityIssues: string[];
    personalizationUsed: string[];
    claims: Array<{ text: string; source: string }>;
  };
  task?: {
    title: string;
    type: "follow_up" | "schedule_meeting" | "review_reply" | "send_proposal" | "general";
    priority: "high" | "normal" | "low";
    status: "pending" | "completed";
    dueInDays: number;
  };
}

const SEED_DATA: SeedCompany[] = [
  {
    name: "Apex Cloud Systems",
    website: "https://apexcloud.io",
    industry: "Cloud Infrastructure",
    location: "San Francisco, CA",
    employees: 140,
    source: "github_acquisition",
    enrichments: {
      websiteTitle: "Apex Cloud Systems — Multi-Region Kubernetes Telemetry",
      metaDescription: "Real-time distributed cluster observability and cost governance for enterprise DevOps teams.",
      bodyTextSample:
        "Apex Cloud Systems helps platform engineering teams automate Kubernetes cluster scaling, reduce telemetry overhead, and standardize compliance across AWS and GCP workloads. Contact us to request an enterprise walkthrough.",
      contactSignals: "contact_page,work_email",
      businessModel: "B2B SaaS",
      customerType: "Enterprise DevOps, Platform Engineering",
    },
    contact: {
      firstName: "Sarah",
      lastName: "Chen",
      jobTitle: "VP of Engineering",
      department: "Engineering",
      seniority: "vp",
      email: "sarah.chen@apexcloud.io",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 94,
      intent: 88,
      priority: "HIGH",
      reasoning: "Mid-market B2B cloud infrastructure team (140 employees) with active hiring and explicit enterprise workflow signals.",
    },
    deal: {
      name: "Apex Cloud — Enterprise Data Pipeline",
      stage: "meeting_booked",
      value: 36000,
      probability: 65,
    },
    outreach: {
      subject: "Structuring enterprise prospect intelligence for Apex Cloud",
      body: "Hi Sarah,\n\nSaw Apex Cloud Systems focuses on multi-region Kubernetes telemetry for platform engineering teams. We built a lead intelligence pipeline that unifies domain deduplication, website signal extraction, and verifiable AI qualification.\n\nWould it make sense to compare notes briefly on Thursday?",
      status: "REPLIED",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["industry", "meta_description"],
      claims: [
        { text: "Apex Cloud Systems provides multi-region Kubernetes telemetry for platform engineering teams.", source: "meta_description" },
        { text: "Operates in the Cloud Infrastructure B2B SaaS vertical.", source: "industry" },
      ],
    },
    task: {
      title: "Run technical architecture walkthrough with Sarah Chen",
      type: "schedule_meeting",
      priority: "high",
      status: "pending",
      dueInDays: 2,
    },
  },
  {
    name: "Beacon Health Tech",
    website: "https://beaconhealth.co",
    industry: "Digital Health SaaS",
    location: "Boston, MA",
    employees: 85,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Beacon Health Tech | Clinical Workflow Software",
      metaDescription: null,
      bodyTextSample: "Beacon Health Tech delivers digital intake workflows for outpatient clinics.",
      contactSignals: "none",
      businessModel: "B2B SaaS",
      customerType: "Healthcare Clinics, Medical Groups",
    },
    contact: {
      firstName: "Marcus",
      lastName: "Vance",
      jobTitle: "Head of Growth",
      department: "Growth",
      seniority: "director",
      email: "m.vance@beaconhealth.co",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 88,
      intent: 76,
      priority: "HIGH",
      reasoning: "Series A healthtech B2B company with strict GDPR/audit requirements and clear website metadata gaps.",
    },
    deal: {
      name: "Beacon Health — Privacy-First Prospect Intelligence",
      stage: "contacted",
      value: 24000,
      probability: 40,
    },
    outreach: {
      subject: "Audit-ready prospect qualification for Beacon Health",
      body: "Hi Marcus,\n\nNoticed Beacon Health Tech builds clinical intake workflows for outpatient medical groups. Our lead intelligence workflow records lawful basis on every contact, enforces hashed GDPR suppression, and scores accounts transparently.\n\nWorth a brief 10-minute review next week?",
      status: "DELIVERED",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["industry", "business_model"],
      claims: [
        { text: "Beacon Health Tech builds digital intake workflows for outpatient clinics.", source: "body_text_sample" },
        { text: "Operates a B2B SaaS model serving healthcare clinics.", source: "business_model" },
      ],
    },
    task: {
      title: "Review webhook delivery telemetry & schedule follow-up",
      type: "follow_up",
      priority: "normal",
      status: "pending",
      dueInDays: 3,
    },
  },
  {
    name: "Vanguard Freight Logistics",
    website: "https://vanguardfreight.com",
    industry: "Logistics & Supply Chain",
    location: "Chicago, IL",
    employees: 320,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Vanguard Freight Logistics — Regional Carrier Network",
      metaDescription: "Dedicated freight brokerage and regional carrier coordination across the Midwest.",
      bodyTextSample:
        "Vanguard Freight Logistics connects shippers with regional carriers across 28 states with live load visibility and automated exception alerts. Contact us for carrier onboarding or shipper enterprise quotes.",
      contactSignals: "contact_form,phone",
      businessModel: "B2B Services",
      customerType: "Enterprise Shippers, Supply Chain Teams",
    },
    contact: {
      firstName: "Elena",
      lastName: "Rostova",
      jobTitle: "Director of Operations",
      department: "Operations",
      seniority: "director",
      email: "e.rostova@vanguardfreight.com",
      emailStatus: "verified",
      lawfulBasis: "existing_customer",
    },
    score: {
      fit: 91,
      intent: 82,
      priority: "HIGH",
      reasoning: "Mid-market freight brokerage actively expanding shipper acquisition and account research automation.",
    },
    deal: {
      name: "Vanguard — Shipper Intelligence & Enrichment",
      stage: "won",
      value: 48000,
      actualValue: 48000,
      probability: 100,
    },
    outreach: {
      subject: "Automating shipper account qualification at Vanguard",
      body: "Hi Elena,\n\nSaw Vanguard Freight coordinates regional carriers across 28 states. We helped structure raw shipper lists into deduplicated, enriched, and scored accounts ready for sales handoff.\n\nOpen to exploring a pilot for your enterprise logistics desk?",
      status: "REPLIED",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["meta_description", "industry"],
      claims: [
        { text: "Vanguard Freight Logistics operates regional freight brokerage across the Midwest.", source: "meta_description" },
      ],
    },
    task: {
      title: "Completed onboarding handoff and CSV schema alignment",
      type: "schedule_meeting",
      priority: "high",
      status: "completed",
      dueInDays: -2,
    },
  },
  {
    name: "Starlight FinTech",
    website: "https://starlightpay.com",
    industry: "Financial Services",
    location: "New York, NY",
    employees: 50,
    source: "github_acquisition",
    enrichments: {
      websiteTitle: "Starlight Pay — Cross-Border B2B Treasury APIs",
      metaDescription: "Programmable FX settlement and webhook-driven treasury rails for software platforms.",
      bodyTextSample:
        "Starlight FinTech provides multi-currency settlement APIs, idempotent webhook notifications, and automated ledger reconciliation for global B2B platforms. Email us to request sandbox API keys.",
      contactSignals: "work_email,docs_page",
      businessModel: "B2B API",
      customerType: "SaaS Platforms, Global Marketplaces",
    },
    contact: {
      firstName: "David",
      lastName: "Kim",
      jobTitle: "Chief Technology Officer",
      department: "Technology",
      seniority: "c_level",
      email: "david@starlightpay.com",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 85,
      intent: 74,
      priority: "HIGH",
      reasoning: "API-first B2B fintech matching ICP size (50 employees) with strong engineering and GTM data needs.",
    },
    deal: {
      name: "Starlight Pay — Lead Scoring & Webhook Pipeline",
      stage: "qualified",
      value: 18000,
      probability: 35,
    },
    outreach: {
      subject: "Structured GTM intelligence for Starlight Pay's API expansion",
      body: "Hi David,\n\nNoticed Starlight Pay builds programmable FX settlement and webhook-driven treasury rails for software platforms. We engineered a lead intelligence pipeline that identifies high-fit SaaS platforms, enriches public signals, and evaluates scoring precision against ground-truth benchmarks.\n\nWorth a brief look this week?",
      status: "APPROVED",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["meta_description", "business_model"],
      claims: [
        { text: "Starlight Pay offers programmable FX settlement and webhook-driven treasury rails.", source: "meta_description" },
        { text: "Targets SaaS platforms and global marketplaces via B2B APIs.", source: "business_model" },
      ],
    },
    task: {
      title: "Review approved draft and confirm sandbox validation",
      type: "follow_up",
      priority: "normal",
      status: "pending",
      dueInDays: 1,
    },
  },
  {
    name: "Nexus Media Labs",
    website: "https://nexusmedialab.io",
    industry: "Digital Media & Publishing",
    location: "Austin, TX",
    employees: 28,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Nexus Media Labs",
      metaDescription: null,
      bodyTextSample: "Boutique digital media studio in Austin.",
      contactSignals: "none",
      businessModel: "B2B Agency",
      customerType: "Tech Brands, Publishers",
    },
    contact: {
      firstName: "Jordan",
      lastName: "Taylor",
      jobTitle: "Founder & CEO",
      department: "Executive",
      seniority: "founder",
      email: "jordan@nexusmedialab.io",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 78,
      intent: 68,
      priority: "MEDIUM",
      reasoning: "Growing B2B agency with thin site metadata and high website opportunity gap score.",
    },
    deal: {
      name: "Nexus Media — Prospect Research Workflow",
      stage: "proposal",
      value: 16000,
      probability: 75,
    },
    outreach: {
      subject: "Structured prospect qualification for Nexus Media Labs",
      body: "Hi Jordan,\n\nSaw Nexus Media Labs partners with tech brands out of Austin. We built an automated prospect intelligence workflow that cleans messy CSVs, enriches website signals, and ranks best-fit accounts before your team spends time researching.\n\nWould a quick walkthrough be useful?",
      status: "DRAFT",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["industry", "business_model"],
      claims: [
        { text: "Nexus Media Labs operates a B2B digital media studio in Austin.", source: "body_text_sample" },
        { text: "Serves tech brands and publishers.", source: "business_model" },
      ],
    },
    task: {
      title: "Send customized prospect research pilot proposal",
      type: "send_proposal",
      priority: "high",
      status: "pending",
      dueInDays: 1,
    },
  },
  {
    name: "Veritas Cyber Defense",
    website: "https://veritasec.com",
    industry: "Cybersecurity",
    location: "Washington, DC",
    employees: 110,
    source: "github_acquisition",
    enrichments: {
      websiteTitle: "Veritas Cyber Defense — SOC2 & Continuous Compliance",
      metaDescription: "Automated security posture audits, SOC2 readiness, and cloud access reviews for regulated enterprises.",
      bodyTextSample:
        "Veritas Cyber Defense advises regulated SaaS and defense contractors on zero-trust architecture, Postgres row-level isolation, and continuous compliance telemetry. Contact us to speak with an advisory architect.",
      contactSignals: "contact_page,work_email",
      businessModel: "B2B Consulting & SaaS",
      customerType: "Regulated SaaS, Enterprise Security Teams",
    },
    contact: {
      firstName: "Rachel",
      lastName: "Adams",
      jobTitle: "Head of Business Development",
      department: "Sales",
      seniority: "director",
      email: "rachel.adams@veritasec.com",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 92,
      intent: 85,
      priority: "HIGH",
      reasoning: "Security-first enterprise firm aligning strongly with RLS, GDPR suppression, and deterministic governance.",
    },
    deal: {
      name: "Veritas — Governed Enterprise Intelligence Engine",
      stage: "interested",
      value: 30000,
      probability: 55,
    },
    outreach: {
      subject: "Compliance-first lead intelligence with 16-table RLS",
      body: "Hi Rachel,\n\nGiven Veritas Cyber Defense's focus on SOC2 readiness and zero-trust governance, wanted to share how our lead intelligence architecture enforces Postgres RLS, SHA-256 suppression hashing, and auditable claim provenance.\n\nOpen to a brief 10-minute intro?",
      status: "DELIVERED",
      qualityPassed: true,
      qualityIssues: [],
      personalizationUsed: ["meta_description", "industry"],
      claims: [
        { text: "Veritas Cyber Defense specializes in SOC2 readiness and automated security posture audits.", source: "meta_description" },
      ],
    },
    task: {
      title: "Book architecture discovery call with Rachel Adams",
      type: "schedule_meeting",
      priority: "high",
      status: "pending",
      dueInDays: 2,
    },
  },
  {
    name: "Meridian Industrial Robotics",
    website: "https://meridianrobotics.wixsite.com/portal",
    industry: "Industrial Automation",
    location: "Detroit, MI",
    employees: 64,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Meridian Industrial Robotics",
      metaDescription: null,
      bodyTextSample: "Warehouse automation and conveyor sensor integrators serving Midwest plants.",
      contactSignals: "none",
      businessModel: "B2B Hardware & Integration",
      customerType: "Manufacturing Plants, Warehouses",
    },
    contact: {
      firstName: "Daniel",
      lastName: "Okafor",
      jobTitle: "Sales Director",
      department: "Sales",
      seniority: "director",
      email: "d.okafor@meridianrobotics.com",
      emailStatus: "risky",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 82,
      intent: 62,
      priority: "MEDIUM",
      reasoning: "Strong B2B manufacturing ICP with maximum website opportunity signals (free-hosted subdomain, missing meta description, thin content).",
    },
    deal: {
      name: "Meridian Robotics — Distributor Lead Intelligence",
      stage: "qualified",
      value: 21000,
      probability: 30,
    },
    outreach: {
      subject: "Quick question about Meridian's Series B expansion",
      body: "Hi Daniel,\n\nCongrats on Meridian's recent Series B expansion across Europe! Would love to discuss how our platform can double your industrial pipeline overnight.\n\nFree tomorrow?",
      status: "DRAFT",
      qualityPassed: false,
      qualityIssues: [
        'Claim references unknown signal source "funding_round" — not present in verified company enrichments.',
        'Contains unverified hype phrasing ("double your industrial pipeline overnight").',
      ],
      personalizationUsed: ["funding_round"],
      claims: [
        { text: "Meridian recently raised a Series B and expanded across Europe.", source: "funding_round" },
      ],
    },
    task: {
      title: "Fix flagged unverified claim in Meridian Robotics draft",
      type: "review_reply",
      priority: "high",
      status: "pending",
      dueInDays: 1,
    },
  },
  {
    name: "Northstar BioAnalytics",
    website: "https://northstarbio.ai",
    industry: "Biotech & Life Sciences",
    location: "Seattle, WA",
    employees: 95,
    source: "github_acquisition",
    enrichments: {
      websiteTitle: "Northstar BioAnalytics — Genomic Pipeline Software",
      metaDescription: "High-throughput sequencing pipelines and structured assay analytics for biopharma labs.",
      bodyTextSample:
        "Northstar BioAnalytics accelerates translational research teams with reproducible cloud pipelines, assay quality controls, and structured lab telemetry. Contact us to schedule a technical evaluation.",
      contactSignals: "contact_page,work_email",
      businessModel: "B2B SaaS",
      customerType: "Biopharma R&D, Clinical Labs",
    },
    contact: {
      firstName: "Priya",
      lastName: "Nair",
      jobTitle: "Head of Marketing",
      department: "Marketing",
      seniority: "director",
      email: "priya.nair@northstarbio.ai",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 86,
      intent: 78,
      priority: "HIGH",
      reasoning: "Technical B2B SaaS org with clear ICP alignment and structured enterprise buying committee.",
    },
    deal: {
      name: "Northstar Bio — Target Account Enrichment",
      stage: "new",
      value: 22000,
      probability: 20,
    },
    task: {
      title: "Review enriched signals and qualify Northstar BioAnalytics",
      type: "follow_up",
      priority: "normal",
      status: "pending",
      dueInDays: 4,
    },
  },
  {
    name: "Harborline Maritime Analytics",
    website: "https://harborline.io",
    industry: "Supply Chain Software",
    location: "Rotterdam, NL",
    employees: 72,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Harborline — Port Congestion & Vessel Telemetry",
      metaDescription: "Predictive ETA models and container routing visibility for European freight operators.",
      bodyTextSample: "Harborline builds maritime routing intelligence for European ports and logistics desks.",
      contactSignals: "work_email",
      businessModel: "B2B SaaS",
      customerType: "Freight Forwarders, Maritime Operators",
    },
    contact: {
      firstName: "Lukas",
      lastName: "Van Der Berg",
      jobTitle: "Head of Sales",
      department: "Sales",
      seniority: "director",
      email: "lukas@harborline.io",
      emailStatus: "verified",
      lawfulBasis: "legitimate_interest",
    },
    score: {
      fit: 84,
      intent: 70,
      priority: "MEDIUM",
      reasoning: "European B2B maritime SaaS team requiring strict EU GDPR compliance and structured lead enrichment.",
    },
    deal: {
      name: "Harborline — EU Compliant Prospect Pipeline",
      stage: "replied",
      value: 26000,
      probability: 45,
    },
    task: {
      title: "Follow up on EU GDPR architecture questions",
      type: "review_reply",
      priority: "normal",
      status: "pending",
      dueInDays: 2,
    },
  },
  {
    name: "Cornerstone Local Bakery",
    website: "https://cornerstonebakery.example",
    industry: "Food & Beverage Retail",
    location: "Portland, OR",
    employees: 9,
    source: "csv_import",
    enrichments: {
      websiteTitle: "Cornerstone Local Bakery — Fresh Bread Daily",
      metaDescription: "Neighborhood artisan sourdough and pastries in downtown Portland.",
      bodyTextSample:
        "Visit our bakery every morning for fresh sourdough, espresso, and seasonal pastries. Call us for custom birthday cake orders.",
      contactSignals: "phone",
      businessModel: "B2C Retail",
      customerType: "Local Consumers",
    },
    contact: {
      firstName: "Hannah",
      lastName: "Brooks",
      jobTitle: "Owner",
      department: "Operations",
      seniority: "founder",
      email: "hello@cornerstonebakery.example",
      emailStatus: "verified",
      lawfulBasis: "test_data",
    },
    score: {
      fit: 18,
      intent: 10,
      priority: "REJECT",
      reasoning: "Local B2C brick-and-mortar retailer outside B2B target ICP; automatically filtered out before outreach.",
    },
  },
];

export async function seedDatabase() {
  console.log("Seeding Lead Intelligence Platform dataset...");
  const now = new Date();
  const nowIso = now.toISOString();

  // Ensure a default showcase campaign exists (outreach_messages.campaign_id is NOT NULL)
  const { data: existingCampaign } = await supabase
    .from("outreach_campaigns")
    .select("id")
    .eq("name", "Lead Intelligence Showcase")
    .limit(1)
    .maybeSingle();

  let campaignId = existingCampaign?.id ?? null;
  if (!campaignId) {
    const { data: createdCampaign, error: campErr } = await supabase
      .from("outreach_campaigns")
      .insert({ name: "Lead Intelligence Showcase", status: "active" })
      .select("id")
      .single();
    if (campErr || !createdCampaign) {
      console.error("Failed to create showcase campaign:", campErr?.message);
    } else {
      campaignId = createdCampaign.id;
    }
  }

  for (const item of SEED_DATA) {
    const domain = normalizeDomain(item.website);
    const normalizedName = normalizeCompanyName(item.name);

    // 1. Upsert Company
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    let companyId = existingCompany?.id;

    if (!companyId) {
      const { data: newCompany, error: compErr } = await supabase
        .from("companies")
        .insert({
          company_name: item.name,
          normalized_name: normalizedName,
          website: item.website,
          domain,
          industry: item.industry,
          location: item.location,
          employee_count: item.employees,
          source: item.source,
          status: item.score.priority === "REJECT" ? "active" : "qualified",
        })
        .select("id")
        .single();

      if (compErr || !newCompany) {
        console.error(`Failed to insert company ${item.name}:`, compErr?.message);
        continue;
      }
      companyId = newCompany.id;
      console.log(`+ Seeded company: ${item.name}`);
    } else {
      console.log(`= Company exists: ${item.name}`);
    }

    // 2. Seed Company Enrichments (idempotent)
    const { data: existingEnrich } = await supabase
      .from("company_enrichments")
      .select("id")
      .eq("company_id", companyId)
      .limit(1);

    if (!existingEnrich || existingEnrich.length === 0) {
      const enrichmentRows: Array<{
        company_id: string;
        field_name: string;
        field_value: string;
        source: string;
        confidence?: number;
        observed_at: string;
      }> = [
        {
          company_id: companyId,
          field_name: "website_title",
          field_value: item.enrichments.websiteTitle,
          source: "website_scrape",
          observed_at: nowIso,
        },
        {
          company_id: companyId,
          field_name: "body_text_sample",
          field_value: item.enrichments.bodyTextSample,
          source: "website_scrape",
          observed_at: nowIso,
        },
        {
          company_id: companyId,
          field_name: "contact_signals",
          field_value: item.enrichments.contactSignals,
          source: "website_scrape",
          observed_at: nowIso,
        },
        {
          company_id: companyId,
          field_name: "industry",
          field_value: item.industry,
          source: "llm_classification",
          confidence: 0.92,
          observed_at: nowIso,
        },
        {
          company_id: companyId,
          field_name: "business_model",
          field_value: item.enrichments.businessModel,
          source: "llm_classification",
          confidence: 0.9,
          observed_at: nowIso,
        },
        {
          company_id: companyId,
          field_name: "customer_type",
          field_value: item.enrichments.customerType,
          source: "llm_classification",
          confidence: 0.88,
          observed_at: nowIso,
        },
      ];

      if (item.enrichments.metaDescription) {
        enrichmentRows.push({
          company_id: companyId,
          field_name: "meta_description",
          field_value: item.enrichments.metaDescription,
          source: "website_scrape",
          observed_at: nowIso,
        });
      }

      const { error: enrichErr } = await supabase.from("company_enrichments").insert(enrichmentRows);
      if (enrichErr) console.error(`  Failed to insert enrichments for ${item.name}:`, enrichErr.message);
    }

    // 3. Upsert Contact
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", item.contact.email)
      .maybeSingle();

    let contactId = existingContact?.id;

    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({
          company_id: companyId,
          first_name: item.contact.firstName,
          last_name: item.contact.lastName,
          job_title: item.contact.jobTitle,
          department: item.contact.department,
          seniority: item.contact.seniority,
          email: item.contact.email,
          email_status: item.contact.emailStatus,
          lawful_basis: item.contact.lawfulBasis,
          lawful_basis_note: "Documented B2B legitimate interest assessment for relevant commercial research.",
          lawful_basis_recorded_at: nowIso,
          collected_from: "Public corporate website",
          contact_source: "website_discovery",
          contact_score: item.score.fit,
        })
        .select("id")
        .single();

      if (contactErr || !newContact) {
        console.error(`  Failed to insert contact ${item.contact.email}:`, contactErr?.message);
        continue;
      }
      contactId = newContact.id;
    }

    // 4. Upsert Lead Score
    const { data: existingScore } = await supabase
      .from("lead_scores")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!existingScore) {
      const priorityScore = Math.round(item.score.fit * 0.5 + item.score.intent * 0.5);
      const signals = [
        { name: "b2b_business_model", category: "fit", points: item.score.priority === "REJECT" ? 0 : 30, matched: item.score.priority !== "REJECT" },
        { name: "target_company_size", category: "fit", points: item.employees >= 20 ? 25 : 0, matched: item.employees >= 20 },
        { name: "verified_domain_presence", category: "fit", points: 20, matched: Boolean(domain) },
        { name: "growth_and_ops_signals", category: "intent", points: item.score.intent >= 70 ? 35 : 15, matched: item.score.intent >= 70 },
      ];
      const { error: scoreErr } = await supabase.from("lead_scores").insert({
        company_id: companyId,
        fit_score: item.score.fit,
        intent_score: item.score.intent,
        priority_score: priorityScore,
        priority: item.score.priority,
        signals,
        explanation: item.score.reasoning,
        needs_review: false,
        scoring_version: "v1",
        created_at: nowIso,
      });
      if (scoreErr) console.error(`  Failed to insert lead score for ${item.name}:`, scoreErr.message);
    }

    // 5. Upsert Deal (Opportunity)
    if (item.deal) {
      const { data: existingDeal } = await supabase
        .from("opportunities")
        .select("id")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle();

      let dealId = existingDeal?.id;

      if (!dealId) {
        const { data: newDeal, error: dealErr } = await supabase
          .from("opportunities")
          .insert({
            company_id: companyId,
            contact_id: contactId,
            name: item.deal.name,
            stage: item.deal.stage,
            estimated_value: item.deal.value,
            actual_value: item.deal.actualValue ?? null,
            probability: item.deal.probability ?? null,
            source: item.source,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select("id")
          .single();

        if (dealErr || !newDeal) {
          console.error(`  Failed to insert deal ${item.deal.name}:`, dealErr?.message);
        } else {
          dealId = newDeal.id;
          await supabase.from("opportunity_events").insert({
            opportunity_id: dealId,
            event_type: "stage_changed",
            to_stage: item.deal.stage,
            metadata: { seeded: true },
          });
        }
      }

      // 6. Seed Task (idempotent by title + opportunity)
      if (item.task && dealId) {
        const { data: existingTask } = await supabase
          .from("tasks")
          .select("id")
          .eq("opportunity_id", dealId)
          .eq("title", item.task.title)
          .maybeSingle();

        if (!existingTask) {
          const dueDate = new Date(now.getTime() + item.task.dueInDays * 86_400_000).toISOString();
          const { error: taskErr } = await supabase.from("tasks").insert({
            opportunity_id: dealId,
            contact_id: contactId,
            company_id: companyId,
            title: item.task.title,
            type: item.task.type,
            priority: item.task.priority,
            status: item.task.status,
            due_at: dueDate,
          });
          if (taskErr) console.error(`  Failed to insert task ${item.task.title}:`, taskErr.message);
        }
      }
    }

    // 7. Seed Outreach Message (with grounded claims + quality gate metadata)
    if (item.outreach) {
      const { data: existingMsg } = await supabase
        .from("outreach_messages")
        .select("id")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!existingMsg && campaignId) {
        const { error: msgErr } = await supabase.from("outreach_messages").insert({
          campaign_id: campaignId,
          company_id: companyId,
          contact_id: contactId,
          subject: item.outreach.subject,
          body: item.outreach.body,
          status: item.outreach.status,
          quality_check_passed: item.outreach.qualityPassed,
          quality_issues: item.outreach.qualityIssues,
          personalization_used: item.outreach.personalizationUsed,
          claims: item.outreach.claims,
          sent_at: item.outreach.status === "DELIVERED" || item.outreach.status === "REPLIED" ? nowIso : null,
        });
        if (msgErr) console.error(`  Failed to insert outreach draft for ${item.name}:`, msgErr.message);
      } else if (existingMsg) {
        // Ensure seeded drafts have claims & quality metadata populated
        await supabase
          .from("outreach_messages")
          .update({
            quality_check_passed: item.outreach.qualityPassed,
            quality_issues: item.outreach.qualityIssues,
            personalization_used: item.outreach.personalizationUsed,
            claims: item.outreach.claims,
          })
          .eq("id", existingMsg.id);
      }
    }

    // 8. Seed Realistic LLM Classification & Enrichment Usage Costs (idempotent)
    const { data: existingCost } = await supabase
      .from("usage_costs")
      .select("id")
      .eq("company_id", companyId)
      .limit(1);

    if (!existingCost || existingCost.length === 0) {
      await supabase.from("usage_costs").insert([
        {
          service: "gemini",
          operation: "classification",
          units: 1,
          unit_cost: 0.0042,
          purpose: "company_enrichment_classification",
          company_id: companyId,
        },
        ...(item.outreach
          ? [
              {
                service: "gemini",
                operation: "draft_generation",
                units: 1,
                unit_cost: 0.0068,
                purpose: "grounded_outreach_draft",
                company_id: companyId,
              },
            ]
          : []),
      ]);
    }
  }

  // 9. Seed Sample Suppressions (SHA-256 hashed email + domain suppression)
  const sampleHashedEmail = hashEmail("opted-out-demo@example-enterprise.test");
  const { data: existingHashSup } = await supabase
    .from("suppressions")
    .select("id")
    .eq("email_hash", sampleHashedEmail)
    .maybeSingle();

  if (!existingHashSup) {
    await supabase.from("suppressions").insert({
      email_hash: sampleHashedEmail,
      reason: "erased",
      source: "gdpr_art17",
    });
  }

  const { data: existingDomainSup } = await supabase
    .from("suppressions")
    .select("id")
    .eq("domain", "competitor-example.test")
    .maybeSingle();

  if (!existingDomainSup) {
    await supabase.from("suppressions").insert({
      domain: "competitor-example.test",
      reason: "manual",
      source: "compliance_policy",
    });
  }

  console.log("\nSeed completed successfully.");
}

if (process.argv[1]?.includes("seed")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal seed error:", err);
      process.exit(1);
    });
}
