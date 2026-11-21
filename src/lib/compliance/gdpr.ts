import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { addSuppression } from "@/lib/compliance/suppression";

export interface GdprSubjectData {
  exported_at: string;
  subject: {
    id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    department: string | null;
    seniority: string | null;
    email: string | null;
    email_status: string | null;
    contact_source: string | null;
    lawful_basis: string | null;
    lawful_basis_note: string | null;
    lawful_basis_recorded_at: string | null;
    collected_from: string | null;
    do_not_contact: boolean;
    do_not_contact_reason: string | null;
    do_not_contact_at: string | null;
    created_at: string;
  };
  company: {
    id: string;
    name: string;
    website: string | null;
    domain: string | null;
    industry: string | null;
    location: string | null;
  } | null;
  outreach_messages: Array<{
    id: string;
    subject: string | null;
    body_text: string | null;
    status: string;
    created_at: string;
    sent_at: string | null;
  }>;
  opportunities: Array<{
    id: string;
    name: string;
    stage: string;
    value: number | null;
    created_at: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    created_at: string;
  }>;
}

export type GdprExportResult =
  | { ok: true; data: GdprSubjectData; filename: string }
  | { ok: false; error: string };

export type GdprEraseResult =
  | { ok: true; message: string; erasedContactId: string }
  | { ok: false; error: string };

/**
 * Finds a contact by either UUID or exact/case-insensitive email.
 */
async function findContact(query: string) {
  const trimmed = query.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  if (isUuid) {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", trimmed)
      .maybeSingle();
    return data;
  }

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .ilike("email", trimmed)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * GDPR Article 15 (Right of Access) & Article 20 (Data Portability)
 * Compiles all personal and activity data stored on a contact into an exportable structure.
 */
export async function exportPersonData(query: string): Promise<GdprExportResult> {
  const contact = await findContact(query);
  if (!contact) {
    return { ok: false, error: `No contact found for "${query.trim()}".` };
  }

  // Load company
  let companyData = null;
  if (contact.company_id) {
    const { data: comp } = await supabase
      .from("companies")
      .select("id, company_name, website, domain, industry, location")
      .eq("id", contact.company_id)
      .maybeSingle();

    if (comp) {
      companyData = {
        id: comp.id,
        name: comp.company_name,
        website: comp.website,
        domain: comp.domain,
        industry: comp.industry,
        location: comp.location,
      };
    }
  }

  // Load outreach messages
  const { data: messages } = await supabase
    .from("outreach_messages")
    .select("id, subject, body_text, status, created_at, sent_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false });

  // Load opportunities
  const { data: deals } = await supabase
    .from("opportunities")
    .select("id, name, stage, value, created_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false });

  // Load tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, created_at")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false });

  const exportPayload: GdprSubjectData = {
    exported_at: new Date().toISOString(),
    subject: {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      job_title: contact.job_title ?? null,
      department: contact.department ?? null,
      seniority: contact.seniority ?? null,
      email: contact.email ?? null,
      email_status: contact.email_status ?? null,
      contact_source: contact.contact_source ?? null,
      lawful_basis: contact.lawful_basis ?? null,
      lawful_basis_note: contact.lawful_basis_note ?? null,
      lawful_basis_recorded_at: contact.lawful_basis_recorded_at ?? null,
      collected_from: contact.collected_from ?? null,
      do_not_contact: Boolean(contact.do_not_contact),
      do_not_contact_reason: contact.do_not_contact_reason ?? null,
      do_not_contact_at: contact.do_not_contact_at ?? null,
      created_at: contact.created_at,
    },
    company: companyData,
    outreach_messages: messages ?? [],
    opportunities: deals ?? [],
    tasks: tasks ?? [],
  };

  const safeIdentifier = (contact.email || contact.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `gdpr-export-${safeIdentifier}.json`;

  return { ok: true, data: exportPayload, filename };
}

/**
 * GDPR Article 17 (Right to be Forgotten / Erasure)
 * Irreversibly anonymizes all personal identifiers, cancels unsent drafts,
 * and adds an encrypted SHA-256 hash to the suppression list so they are never re-scraped or contacted.
 */
export async function erasePersonData(query: string, performedById: string): Promise<GdprEraseResult> {
  const contact = await findContact(query);
  if (!contact) {
    return { ok: false, error: `No contact found for "${query.trim()}".` };
  }

  const originalEmail = contact.email;
  const now = new Date().toISOString();

  // 1. Add email hash to suppression list if an email existed
  if (originalEmail) {
    const suppressed = await addSuppression({
      email: originalEmail,
      reason: "erased",
      source: "erasure_request",
      createdById: performedById,
    });

    if (!suppressed.ok) {
      logger.error("Failed to add suppression during erasure", { error: suppressed.error });
      return { ok: false, error: `Could not complete erasure: ${suppressed.error}` };
    }
  }

  // 2. Anonymize contact record in database
  const redactedEmail = `erased-${contact.id.slice(0, 8)}@redacted.invalid`;
  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      first_name: "[Erased]",
      last_name: "Subject",
      email: redactedEmail,
      job_title: null,
      department: null,
      seniority: null,
      do_not_contact: true,
      do_not_contact_reason: `GDPR Article 17 Erasure request executed on ${now.slice(0, 10)}`,
      do_not_contact_at: now,
      lawful_basis: null,
      lawful_basis_note: "Personal details wiped per Data Subject Erasure Request.",
      updated_at: now,
    })
    .eq("id", contact.id);

  if (updateError) {
    logger.error("Failed to anonymize contact row", { error: updateError.message });
    return { ok: false, error: "Database error while updating contact." };
  }

  // 3. Cancel unsent outreach messages
  await supabase
    .from("outreach_messages")
    .update({
      status: "UNSUBSCRIBED",
      body_text: "[Personal message content erased]",
      subject: "[Erased]",
    })
    .eq("contact_id", contact.id)
    .in("status", ["DRAFT", "APPROVED"]);

  // 4. Close associated deals
  await supabase
    .from("opportunities")
    .update({
      stage: "lost",
      lost_reason: "Contact requested GDPR erasure",
      updated_at: now,
    })
    .eq("contact_id", contact.id)
    .not("stage", "in", "(won,lost)");

  logger.info("GDPR Article 17 Erasure completed", {
    contactId: contact.id,
    performedBy: performedById,
  });

  return {
    ok: true,
    message: `Personal data for ${originalEmail || contact.id} has been erased and suppressed.`,
    erasedContactId: contact.id,
  };
}
