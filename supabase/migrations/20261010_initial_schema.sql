-- ==============================================================================
-- Migration: 20261010_initial_schema.sql
-- Description: Complete initial database schema for the Lead Generation Pipeline & CRM.
--              Includes all core tables, constraints, indexes, and relations.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  website TEXT,
  domain TEXT,
  industry TEXT,
  location TEXT,
  employee_count INTEGER,
  source TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON public.companies(normalized_name);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);

-- 3. Contacts / Prospects
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  seniority TEXT,
  email TEXT,
  email_status TEXT DEFAULT 'unverified',
  phone TEXT,
  linkedin_url TEXT,
  contact_source TEXT,
  contact_score NUMERIC,
  do_not_contact BOOLEAN DEFAULT FALSE,
  do_not_contact_reason TEXT,
  do_not_contact_at TIMESTAMPTZ,
  lawful_basis TEXT,
  lawful_basis_note TEXT,
  lawful_basis_recorded_at TIMESTAMPTZ,
  lawful_basis_recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  collected_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_do_not_contact ON public.contacts(do_not_contact);

-- 4. Lead Scoring
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fit_score NUMERIC,
  intent_score NUMERIC,
  priority TEXT,
  reasoning TEXT,
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_company_id ON public.lead_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_priority ON public.lead_scores(priority);

-- 5. Company Enrichments
CREATE TABLE IF NOT EXISTS public.company_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  value JSONB,
  source TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_enrichments_company_id ON public.company_enrichments(company_id);

-- 6. Enrichment Runs
CREATE TABLE IF NOT EXISTS public.enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  companies_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. Ingestion Runs (Acquisition Tracking)
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  records_fetched INTEGER DEFAULT 0,
  records_valid INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_duplicate INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  last_cursor TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 8. Sales Opportunities (Deals)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'discovered',
  value NUMERIC,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);

-- 9. Opportunity Audit Events
CREATE TABLE IF NOT EXISTS public.opportunity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_events_opp_id ON public.opportunity_events(opportunity_id);

-- 10. Outreach Campaigns
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  target_industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Outreach Messages
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  scheduled_for TIMESTAMPTZ,
  sending_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_messages_contact ON public.outreach_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_provider_id ON public.outreach_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_status ON public.outreach_messages(status);

-- 12. Outreach Events (Webhook Log)
CREATE TABLE IF NOT EXISTS public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_message_id ON public.outreach_events(message_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_event_type ON public.outreach_events(event_type);

-- 13. Outreach Inbound Replies
CREATE TABLE IF NOT EXISTS public.outreach_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  from_email TEXT,
  subject TEXT,
  body TEXT,
  sentiment TEXT,
  intent TEXT,
  suggested_action TEXT,
  applied_action TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Email Suppressions (Unsubscribes & Erasures)
CREATE TABLE IF NOT EXISTS public.suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT,
  domain TEXT,
  reason TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ,
  removed_reason TEXT,
  removed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppressions_hash ON public.suppressions(email_hash);
CREATE INDEX IF NOT EXISTS idx_suppressions_domain ON public.suppressions(domain);

-- 15. CRM Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 16. Usage & API Cost Tracking
CREATE TABLE IF NOT EXISTS public.usage_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  cost_usd NUMERIC NOT NULL,
  units_consumed INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
