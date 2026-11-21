-- ==============================================================================
-- Migration: 20261016_enable_rls.sql
-- Description: Enforce Row Level Security (RLS) across all lead pipeline tables.
--              Prevents public anon keys from accessing sensitive lead and CRM data
--              directly via Supabase's auto-generated REST API.
-- ==============================================================================

-- 1. Helper function: verify if the authenticated user is approved
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND approved = true
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_approved_user() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved_user() FROM anon;

-- ==============================================================================
-- 2. Profiles Table Security
-- ==============================================================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own non-sensitive profile info" ON public.profiles;
CREATE POLICY "Users can update own non-sensitive profile info"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. Core Lead & CRM Tables: Enable RLS and Restrict to Approved Users
-- ==============================================================================

-- List of CRM tables
-- - companies
-- - contacts
-- - lead_scores
-- - company_enrichments
-- - enrichment_runs
-- - opportunities
-- - opportunity_events
-- - outreach_campaigns
-- - outreach_messages
-- - outreach_events
-- - outreach_replies
-- - suppressions
-- - tasks
-- - usage_costs

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'companies',
    'contacts',
    'lead_scores',
    'company_enrichments',
    'enrichment_runs',
    'opportunities',
    'opportunity_events',
    'outreach_campaigns',
    'outreach_messages',
    'outreach_events',
    'outreach_replies',
    'suppressions',
    'tasks',
    'usage_costs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only proceed if the table exists in public schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Drop existing policy if present
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Approved users full access to ' || tbl, tbl);

      -- Create comprehensive CRUD policy for approved authenticated users
      EXECUTE format('
        CREATE POLICY %I ON public.%I
          FOR ALL
          TO authenticated
          USING (public.is_approved_user())
          WITH CHECK (public.is_approved_user());
      ', 'Approved users full access to ' || tbl, tbl);

      -- Explicitly revoke public anon access
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);
    END IF;
  END LOOP;
END $$;
