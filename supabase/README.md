# Supabase Database Migrations

This directory contains version-controlled, idempotent SQL migrations for the Lead Intelligence Platform.

## Migration Files

| Order | Migration File | Description |
| :---: | :--- | :--- |
| **01** | [`migrations/20261010_initial_schema.sql`](migrations/20261010_initial_schema.sql) | Complete database architecture: all 16 tables (`companies`, `contacts`, `opportunities`, `outreach_messages`, etc.), primary keys, foreign keys, and performant indexes. |
| **02** | [`migrations/20261016_enable_rls.sql`](migrations/20261016_enable_rls.sql) | Enables Row Level Security (RLS) across all public tables, prevents public `anon` key database dumps, and restricts client mutations to approved authenticated users. |

## How to Apply Migrations

### Method A: Supabase Dashboard SQL Editor (Quickest)
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Run `migrations/20261010_initial_schema.sql` first.
4. Run `migrations/20261016_enable_rls.sql` second.

### Method B: Supabase CLI
```bash
# Link project
npx supabase link --project-ref <your-project-ref>

# Push migrations to remote database
npx supabase db push
```
