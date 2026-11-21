import { supabase } from "./supabase";
import { logger } from "./logger";
import { fetchAll } from "./crm/fetch-all";
import { normalizeCompanyName, normalizeDomain, normalizeLocation, normalizeIndustry } from "./normalize";
import { checkDuplicate, type ExistingCompany } from "./dedupe";

export interface IngestRowInput {
  rowNumber: number;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  employeeCount?: number;
  email?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
}

export interface IngestProblem {
  row: number;
  name: string;
  reason: string;
}

export interface IngestResult {
  inserted: number;
  contactsCreated: number;
  duplicates: number;
  invalid: number;
  failed: number;
  problems: IngestProblem[];
}

interface ExistingRow {
  id: string;
  company_name: string;
  normalized_name: string;
  domain: string | null;
  location: string | null;
}

const INSERT_CHUNK = 100;

const DUPLICATE_REASONS: Record<string, string> = {
  domain_match: "same website",
  name_and_location_match: "same name and location",
  name_similarity_only: "very similar name, possible duplicate",
};

async function createContactAndDealForCompany(
  companyId: string,
  companyName: string,
  row: IngestRowInput,
  source: string
): Promise<boolean> {
  if (!row.email && !row.contactName && !row.firstName) return false;

  let firstName = row.firstName?.trim() || "";
  let lastName = row.lastName?.trim() || "";

  if (!firstName && !lastName && row.contactName) {
    const nameParts = row.contactName.trim().split(/\s+/);
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  if (!firstName) firstName = row.contactName || "Primary";
  if (!lastName) lastName = "Contact";

  try {
    const cleanEmail = row.email ? row.email.toLowerCase().trim() : null;
    let contactId: string | null = null;

    if (cleanEmail) {
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      }
    }

    if (!contactId) {
      const { data: createdContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          job_title: row.title || "Decision Maker",
          email: cleanEmail,
          email_status: cleanEmail ? "verified" : "unknown",
          email_source: "csv_import",
          contact_source: source || "csv_import",
          lawful_basis: "legitimate_interest",
          lawful_basis_note: "B2B commercial prospect record ingested via CSV import",
          collected_from: source || "csv_import",
        })
        .select("id")
        .maybeSingle();

      if (contactError) {
        logger.error("Failed to insert contact for company", { companyId, error: contactError.message });
        return false;
      }

      if (createdContact) contactId = createdContact.id;
    }

    if (contactId) {
      const dealName = `${companyName} - Qualification Pipeline`;

      const { data: existingDeal } = await supabase
        .from("opportunities")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingDeal) {
        await supabase
          .from("opportunities")
          .update({
            contact_id: contactId,
            stage: "new",
            name: dealName,
          })
          .eq("id", existingDeal.id);
      } else {
        const { error: oppError } = await supabase.from("opportunities").insert({
          company_id: companyId,
          contact_id: contactId,
          name: dealName,
          stage: "new",
          source: source || "csv_import",
        });

        if (oppError) {
          logger.error("Failed to insert opportunity for company", { companyId, error: oppError.message });
        }
      }

      if (row.website) {
        await supabase.from("company_enrichments").insert([
          { company_id: companyId, field_name: "website_title", field_value: companyName, source: "csv_import" },
          {
            company_id: companyId,
            field_name: "contact_signals",
            field_value: cleanEmail ? "email_detected" : "none",
            source: "csv_import",
          },
        ]);
      }

      return true;
    }
    return false;
  } catch (err) {
    logger.warn("Could not auto-create contact/deal for imported company", {
      companyId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

// Same steps as the ingestion API route (validate, normalize, deduplicate,
// insert), but for a batch uploaded from the CRM. Rows are checked against
// every existing company AND against earlier rows in the same file.
export async function ingestCompanies(rows: IngestRowInput[], source: string): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, contactsCreated: 0, duplicates: 0, invalid: 0, failed: 0, problems: [] };

  const existingRows = await fetchAll<ExistingRow>(
    (from, to) =>
      supabase
        .from("companies")
        .select("id, company_name, normalized_name, domain, location")
        .order("id")
        .range(from, to),
    "existing companies"
  );

  const names = new Map<string, string>(existingRows.map((r): [string, string] => [r.id, r.company_name]));
  const known: ExistingCompany[] = existingRows.map((r) => ({
    id: r.id,
    normalized_name: r.normalized_name,
    domain: r.domain,
    location: r.location ?? "",
  }));

  const accepted: Array<{ row: IngestRowInput; record: Record<string, unknown> }> = [];
  let pending = 0;

  for (const row of rows) {
    let website: string | null = null;
    let domain: string | null = null;

    if (row.website) {
      const rawSite = row.website.trim();
      domain = normalizeDomain(rawSite);
      if (!domain || !domain.includes(".")) {
        result.invalid++;
        result.problems.push({ row: row.rowNumber, name: row.name, reason: "the website isn't a real address" });
        continue;
      }
      website = /^https?:\/\//i.test(rawSite) ? rawSite : `https://${rawSite}`;
    }

    const location = row.location ? normalizeLocation(row.location) : "";
    const duplicate = checkDuplicate({ company_name: row.name, website: website ?? "", location }, known);

    if (duplicate.isDuplicate !== false) {
      result.duplicates++;
      if (duplicate.matchedId && !duplicate.matchedId.startsWith("pending-") && (row.email || row.contactName || row.firstName)) {
        const added = await createContactAndDealForCompany(duplicate.matchedId, names.get(duplicate.matchedId) ?? row.name, row, source);
        if (added) result.contactsCreated++;
      }
      result.problems.push({
        row: row.rowNumber,
        name: row.name,
        reason: `duplicate of ${names.get(duplicate.matchedId) ?? "an existing company"} (${DUPLICATE_REASONS[duplicate.reason] ?? duplicate.reason})`,
      });
      continue;
    }

    const normalizedName = normalizeCompanyName(row.name);
    const pendingId = `pending-${pending++}`;
    names.set(pendingId, row.name);
    known.push({ id: pendingId, normalized_name: normalizedName, domain, location });

    accepted.push({
      row,
      record: {
        company_name: row.name,
        normalized_name: normalizedName,
        website,
        domain,
        industry: row.industry ? normalizeIndustry(row.industry) : null,
        location: row.location ? location : null,
        employee_count: row.employeeCount ?? null,
        source,
        status: "active",
      },
    });
  }

  for (let i = 0; i < accepted.length; i += INSERT_CHUNK) {
    const chunk = accepted.slice(i, i + INSERT_CHUNK);
    const { data: insertedCompanies, error } = await supabase
      .from("companies")
      .insert(chunk.map((item) => item.record))
      .select("id, company_name, domain");

    if (!error && insertedCompanies) {
      result.inserted += chunk.length;
      for (let idx = 0; idx < insertedCompanies.length; idx++) {
        const ins = insertedCompanies[idx];
        const item = chunk[idx] || chunk.find((c) => c.record.company_name === ins.company_name);
        if (item) {
          const added = await createContactAndDealForCompany(ins.id, ins.company_name, item.row, source);
          if (added) result.contactsCreated++;
        }
      }
      continue;
    }

    // One bad row shouldn't sink the other 99, so retry one by one to isolate it.
    for (const item of chunk) {
      const { data: singleCreated, error: rowError } = await supabase
        .from("companies")
        .insert(item.record)
        .select("id, company_name")
        .maybeSingle();

      if (rowError) {
        result.failed++;
        result.problems.push({
          row: item.row.rowNumber,
          name: item.row.name,
          reason: rowError.code === "23505" ? "that website is already used by another company" : "could not be saved",
        });
        logger.error("Import row failed", { row: item.row.rowNumber, error: rowError.message });
      } else {
        result.inserted++;
        if (singleCreated) {
          const added = await createContactAndDealForCompany(singleCreated.id, singleCreated.company_name, item.row, source);
          if (added) result.contactsCreated++;
        }
      }
    }
  }

  result.problems.sort((a, b) => a.row - b.row);
  return result;
}
