import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { addSuppression } from "@/lib/compliance/suppression";

export interface RetentionCandidate {
  id: string;
  name: string;
  email: string | null;
  companyName: string | null;
  createdAt: string;
  ageDays: number;
  reason: "stale_uncontacted" | "inactive_outreach" | "unsubscribed_retention";
}

export interface RetentionReport {
  staleUncontactedCount: number;
  inactiveOutreachCount: number;
  unsubscribedRetentionCount: number;
  totalEligible: number;
  retentionWindowDays: number;
  candidates: RetentionCandidate[];
}

const RETENTION_WINDOW_DAYS = 180;
const UNSUBSCRIBE_RETENTION_DAYS = 90;

/**
 * Generates an audit report of records eligible for pruning under data retention rules.
 */
export async function loadRetentionReport(): Promise<RetentionReport> {
  const now = Date.now();
  const retentionCutoff = new Date(now - RETENTION_WINDOW_DAYS * 86_400_000).toISOString();
  const unsubCutoff = new Date(now - UNSUBSCRIBE_RETENTION_DAYS * 86_400_000).toISOString();

  // 1. Stale contacts created > 180 days ago that were never contacted and not already erased/pruned
  const { data: staleContacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, company_id, created_at, do_not_contact, do_not_contact_reason")
    .lt("created_at", retentionCutoff)
    .not("first_name", "in", "([Erased],[Pruned])")
    .limit(200);

  // 2. Fetch companies map for context
  const companyIds = (staleContacts ?? []).map((c) => c.company_id).filter(Boolean) as string[];
  const companyMap = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, company_name")
      .in("id", companyIds);
    (companies ?? []).forEach((comp) => companyMap.set(comp.id, comp.company_name));
  }

  // 3. Check which contacts have had outreach or active deals
  const contactIds = (staleContacts ?? []).map((c) => c.id);
  const activeContactIds = new Set<string>();

  if (contactIds.length > 0) {
    const [{ data: sentMessages }, { data: activeDeals }] = await Promise.all([
      supabase.from("outreach_messages").select("contact_id").in("contact_id", contactIds).in("status", ["SENT", "DELIVERED", "REPLIED"]),
      supabase.from("opportunities").select("contact_id").in("contact_id", contactIds).not("stage", "in", "(lost)"),
    ]);

    (sentMessages ?? []).forEach((m) => activeContactIds.add(m.contact_id));
    (activeDeals ?? []).forEach((d) => d.contact_id && activeContactIds.add(d.contact_id));
  }

  const candidates: RetentionCandidate[] = [];
  let staleUncontactedCount = 0;
  let inactiveOutreachCount = 0;
  let unsubscribedRetentionCount = 0;

  for (const c of staleContacts ?? []) {
    const ageDays = Math.floor((now - new Date(c.created_at).getTime()) / 86_400_000);
    const companyName = c.company_id ? companyMap.get(c.company_id) ?? null : null;
    const name = `${c.first_name} ${c.last_name}`;

    if (c.do_not_contact && c.created_at < unsubCutoff) {
      unsubscribedRetentionCount++;
      candidates.push({
        id: c.id,
        name,
        email: c.email,
        companyName,
        createdAt: c.created_at,
        ageDays,
        reason: "unsubscribed_retention",
      });
    } else if (!activeContactIds.has(c.id)) {
      staleUncontactedCount++;
      candidates.push({
        id: c.id,
        name,
        email: c.email,
        companyName,
        createdAt: c.created_at,
        ageDays,
        reason: "stale_uncontacted",
      });
    } else {
      inactiveOutreachCount++;
    }
  }

  return {
    staleUncontactedCount,
    inactiveOutreachCount,
    unsubscribedRetentionCount,
    totalEligible: staleUncontactedCount + unsubscribedRetentionCount,
    retentionWindowDays: RETENTION_WINDOW_DAYS,
    candidates: candidates.slice(0, 15),
  };
}

/**
 * Prunes stale/unengaged contacts according to the retention policy.
 * Preserves suppression hashes so they can never be re-emailed, while wiping PII.
 */
export async function pruneStaleContacts(
  performedById: string,
  batchLimit = 100
): Promise<{ ok: true; prunedCount: number; message: string } | { ok: false; error: string }> {
  const report = await loadRetentionReport();
  const toPrune = report.candidates.slice(0, batchLimit);

  if (toPrune.length === 0) {
    return { ok: true, prunedCount: 0, message: "Database is clean: no stale records exceeded the retention window." };
  }

  const now = new Date().toISOString();
  let prunedCount = 0;

  for (const c of toPrune) {
    try {
      // 1. If email existed, ensure suppression hash is preserved
      if (c.email) {
        await addSuppression({
          email: c.email,
          reason: "objected",
          source: "manual",
          createdById: performedById,
        });
      }

      // 2. Anonymize contact row
      const redactedEmail = `pruned-${c.id.slice(0, 8)}@retention.invalid`;
      await supabase
        .from("contacts")
        .update({
          first_name: "[Pruned]",
          last_name: "Contact",
          email: redactedEmail,
          job_title: null,
          department: null,
          seniority: null,
          do_not_contact: true,
          do_not_contact_reason: `Pruned per Retention Policy (>${c.ageDays}d old) on ${now.slice(0, 10)}`,
          do_not_contact_at: now,
          lawful_basis: null,
          lawful_basis_note: "PII anonymized per Data Retention Policy.",
          updated_at: now,
        })
        .eq("id", c.id);

      prunedCount++;
    } catch (err) {
      logger.error("Failed to prune contact", { contactId: c.id, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  logger.info("Retention pruning batch completed", {
    performedBy: performedById,
    prunedCount,
  });

  return {
    ok: true,
    prunedCount,
    message: `Successfully pruned and anonymized ${prunedCount} stale contact${prunedCount === 1 ? "" : "s"}.`,
  };
}
