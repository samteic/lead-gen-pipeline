"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { demoMutationMessage } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { enrichCompany } from "@/lib/enrichment/enrich-company";
import { ingestCompanies, type IngestProblem, type IngestRowInput } from "@/lib/ingest-companies";
import { parseCsv } from "@/lib/crm/csv";
import { describeZodError, emptyToUndefined } from "@/lib/crm/form-helpers";
import { finish, rejectIfDemo } from "@/lib/crm/action-helpers";
import { loadProspectTable } from "@/lib/crm/load-prospects";
import type { ImportState } from "@/lib/crm/import-types";

// ---------- Import companies from CSV ----------

const MAX_BYTES = 1_000_000;
const MAX_ROWS = 2000;
const MAX_PROBLEMS_SHOWN = 50;

const HEADER_ALIASES = {
  name: [
    "company_name",
    "company",
    "name",
    "business",
    "business_name",
    "organization",
    "organization_name",
    "org_name",
    "org",
    "account_name",
    "account",
    "firm",
    "firm_name",
    "client",
    "client_name",
    "lead_name",
    "lead",
    "company_account",
    "target_company",
    "target_name",
    "legal_name",
    "title",
  ],
  website: [
    "website",
    "domain",
    "url",
    "site",
    "web",
    "website_url",
    "company_website",
    "company_domain",
    "company_url",
    "homepage",
    "primary_domain",
    "web_address",
    "website_address",
    "web_url",
    "link",
    "href",
  ],
  industry: [
    "industry",
    "sector",
    "category",
    "vertical",
    "market",
    "business_category",
    "sub_industry",
    "type",
    "business_type",
    "segment",
  ],
  location: [
    "location",
    "city",
    "country",
    "state",
    "address",
    "headquarters",
    "hq",
    "hq_location",
    "hq_city",
    "hq_country",
    "region",
    "country_region",
    "billing_address",
    "billing_city",
    "billing_country",
    "geo",
    "geographic_area",
    "locality",
  ],
  employees: [
    "employees",
    "employee_count",
    "employee",
    "headcount",
    "size",
    "company_size",
    "number_of_employees",
    "num_employees",
    "staff",
    "staff_count",
    "team_size",
    "employee_range",
    "range",
    "total_employees",
  ],
  email: [
    "email",
    "e_mail",
    "contact_email",
    "work_email",
    "business_email",
    "owner_email",
    "primary_email",
    "mail",
  ],
  contactName: [
    "contact_name",
    "full_name",
    "person_name",
    "decision_maker",
    "lead_contact",
    "primary_contact",
    "contact_person",
    "owner",
    "founder",
  ],
  phone: [
    "phone",
    "phone_number",
    "telephone",
    "mobile",
    "cell",
    "tel",
    "contact_phone",
    "business_phone",
    "contact_number",
    "phone_1",
    "phone1",
  ],
  title: ["title", "job_title", "position", "role"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function findColumn(
  headers: string[],
  aliases: string[],
  substringKeywords?: string[],
  excludeKeywords?: string[]
): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }

  if (substringKeywords && substringKeywords.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const isExcluded = excludeKeywords?.some((exc) => h.includes(exc)) ?? false;
      if (!isExcluded && substringKeywords.some((kw) => h.includes(kw))) {
        return i;
      }
    }
  }

  return -1;
}

const RowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  industry: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  location: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  employeeCount: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10000000).optional()),
  email: z.preprocess((val) => {
    const str = emptyToUndefined(val);
    if (!str || typeof str !== "string") return undefined;
    const trimmed = str.trim().toLowerCase();
    return trimmed.includes("@") && trimmed.includes(".") ? trimmed : undefined;
  }, z.string().max(254).optional()),
  contactName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  title: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

function describeRowError(error: z.ZodError): string {
  const field = String(error.issues[0]?.path[0] ?? "row");
  if (field === "name") return "missing or too long company name";
  if (field === "employeeCount") return "employees isn't a whole number";
  return `bad "${field}" value`;
}

export async function importCompaniesCsv(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireUser();
  if (user.isDemo) {
    return { status: "error", message: demoMutationMessage("CSV bulk import") };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a CSV file first." };
  if (file.size > MAX_BYTES) return { status: "error", message: "That file is over 1 MB. Split it into smaller files." };

  const source =
    String(formData.get("source") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "csv_import";

  let table: string[][];
  try {
    table = parseCsv(await file.text());
  } catch {
    return { status: "error", message: "Couldn't read that file as CSV." };
  }
  if (table.length < 2) return { status: "error", message: "The file needs a header row and at least one company." };

  const headers = table[0].map(normalizeHeader);
  const columns = {
    name: findColumn(
      headers,
      HEADER_ALIASES.name,
      ["company", "business", "organization", "account", "firm"],
      ["website", "domain", "url", "email", "phone", "size", "employee", "count"]
    ),
    website: findColumn(headers, HEADER_ALIASES.website, ["website", "domain", "homepage", "url", "web_address"]),
    industry: findColumn(headers, HEADER_ALIASES.industry, ["industry", "sector", "vertical", "category"]),
    location: findColumn(headers, HEADER_ALIASES.location, ["location", "address", "city", "country", "headquarter", "hq", "region"]),
    employees: findColumn(headers, HEADER_ALIASES.employees, ["employee", "headcount", "staff", "team_size"]),
    email: findColumn(headers, HEADER_ALIASES.email, ["email", "mail"], ["status", "confidence", "score", "validation", "verified"]),
    contactName: findColumn(
      headers,
      HEADER_ALIASES.contactName,
      ["full_name", "contact_name", "person_name", "decision_maker"],
      ["account", "company", "id", "status", "stage", "source", "title"]
    ),
    firstName: findColumn(headers, ["first_name", "firstname", "first", "fname"], ["first_name", "first"]),
    lastName: findColumn(headers, ["last_name", "lastname", "last", "lname", "surname"], ["last_name", "surname"]),
    phone: findColumn(headers, HEADER_ALIASES.phone, ["phone", "tel", "mobile"]),
    title: findColumn(headers, HEADER_ALIASES.title, ["title", "job_title", "role", "position"]),
  };

  if (columns.name === -1) {
    const foundHeaders = table[0].map((h) => `"${h.trim()}"`).join(", ");
    return {
      status: "error",
      message: `Could not identify a company name column from your headers: [${foundHeaders}]. Please include a column such as "Company", "Organization", or "Account Name".`,
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_ROWS) {
    return { status: "error", message: `That file has ${dataRows.length} rows. The limit is ${MAX_ROWS} per import.` };
  }

  const cell = (row: string[], index: number): string | undefined => (index === -1 ? undefined : row[index]?.trim());

  const valid: IngestRowInput[] = [];
  const problems: IngestProblem[] = [];
  let invalid = 0;

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;

    const firstName = cell(row, columns.firstName);
    const lastName = cell(row, columns.lastName);
    let contactName = cell(row, columns.contactName);
    if (!contactName && (firstName || lastName)) {
      contactName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    }

    const parsed = RowSchema.safeParse({
      name: cell(row, columns.name),
      website: cell(row, columns.website),
      industry: cell(row, columns.industry),
      location: cell(row, columns.location),
      employeeCount: cell(row, columns.employees)?.replace(/,/g, ""),
      email: cell(row, columns.email),
      contactName,
      phone: cell(row, columns.phone),
      title: cell(row, columns.title),
    });

    if (!parsed.success) {
      invalid++;
      problems.push({ row: rowNumber, name: cell(row, columns.name) ?? "", reason: describeRowError(parsed.error) });
      return;
    }
    valid.push({ rowNumber, ...parsed.data, firstName, lastName });
  });

  let result;
  try {
    result = await ingestCompanies(valid, source);
  } catch (err) {
    logger.error("CSV import failed", { error: err instanceof Error ? err.message : "unknown" });
    return { status: "error", message: "The import failed before anything was saved. Try again." };
  }

  const allProblems = [...problems, ...result.problems].sort((a, b) => a.row - b.row);

  return {
    status: "done",
    source,
    inserted: result.inserted,
    contactsCreated: result.contactsCreated,
    duplicates: result.duplicates,
    invalid: invalid + result.invalid,
    failed: result.failed,
    problems: allProblems.slice(0, MAX_PROBLEMS_SHOWN),
    truncated: allProblems.length > MAX_PROBLEMS_SHOWN,
  };
}

// ---------- Enrich the next batch ----------

const BATCH_SIZE = 5;
const TIME_BUDGET_MS = 90_000;

const EnrichSchema = z.object({
  source: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
});

export async function enrichProspects(formData: FormData): Promise<void> {
  const user = await requireUser();
  const returnTo = "/crm/prospects";
  rejectIfDemo(user, returnTo, "Running live website enrichment");

  const parsed = EnrichSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish(returnTo, { ok: false, error: describeZodError(parsed.error) });
  const wantedSource = parsed.data.source;

  const table = await loadProspectTable();
  const candidates = table.waiting.filter((w) => !wantedSource || w.source === wantedSource);
  if (candidates.length === 0) finish(returnTo, { ok: true, message: "Nothing is waiting for enrichment." });

  const started = Date.now();
  let attempted = 0;
  let enriched = 0;
  let failed = 0;

  for (const company of candidates.slice(0, BATCH_SIZE)) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    attempted++;

    let status: "enriched" | "failed" = "failed";
    try {
      const result = await enrichCompany(company.id);
      status = result.status === "enriched" || result.status === "skipped_fresh" ? "enriched" : "failed";
    } catch (err) {
      logger.error("enrichProspects: enrichment threw", {
        companyId: company.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }

    await supabase
      .from("companies")
      .update({ last_enrich_attempt_at: new Date().toISOString(), last_enrich_status: status })
      .eq("id", company.id);

    if (status === "enriched") enriched++;
    else failed++;
  }

  const remaining = candidates.length - attempted;
  finish(returnTo, {
    ok: true,
    message: `Enriched ${enriched}, couldn't fetch ${failed}. ${remaining} still waiting${wantedSource ? ` from ${wantedSource}` : ""}.`,
  });
}
