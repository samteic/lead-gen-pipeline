import { supabase } from "../supabase";
import { OutreachContext } from "./types";

// Fixed, verifiable description of the B2B offering — never hallucinated or inferred.
const B2B_OFFER = {
  description: "A lead intelligence and prospect qualification platform for B2B revenue teams.",
  valueProposition:
    "We turn scattered company data into enriched, verified, AI-qualified opportunities with compliance-first governance.",
};

export async function buildOutreachContext(companyId: string, contactId: string): Promise<OutreachContext | null> {
  const { data: company } = await supabase
    .from("companies")
    .select("company_name, industry, location")
    .eq("id", companyId)
    .single();

  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name, job_title")
    .eq("id", contactId)
    .single();

  if (!company || !contact) return null;

  const { data: enrichments } = await supabase
    .from("company_enrichments")
    .select("field_name, field_value")
    .eq("company_id", companyId)
    .in("field_name", ["meta_description", "industry", "business_model", "customer_type", "website_title"]);

  const signals: OutreachContext["signals"] = (enrichments ?? [])
    .filter((e) => e.field_value && e.field_value.trim().length > 0)
    .map((e) => ({
      name: e.field_name,
      evidence: e.field_value,
    }));

  const description = enrichments?.find((e) => e.field_name === "meta_description")?.field_value;

  return {
    company: {
      name: company.company_name,
      industry: company.industry ?? undefined,
      location: company.location ?? undefined,
      description: description ?? undefined,
    },
    contact: {
      firstName: contact.first_name,
      jobTitle: contact.job_title ?? "there",
    },
    signals,
    offer: B2B_OFFER,
  };
}
