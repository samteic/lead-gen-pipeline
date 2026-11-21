import { z } from "zod";

const EnvSchema = z.object({
  // Supabase Infrastructure
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("")),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),

  // External APIs (AI & Email)
  GEMINI_API_KEY: z.string().optional().or(z.literal("")),
  RESEND_API_KEY: z.string().optional().or(z.literal("")),

  // Security, Tokens & Webhooks
  WEBHOOK_SECRET: z.string().optional().or(z.literal("")),
  API_SECRET_KEY: z.string().optional().or(z.literal("")),
  CRON_SECRET: z.string().optional().or(z.literal("")),
  UNSUBSCRIBE_SECRET: z.string().optional().or(z.literal("")),

  // Legal & Compliance Identity (with safe defaults)
  SENDER_NAME: z.string().default("Lead Intelligence Team"),
  BUSINESS_NAME: z.string().default("Lead Intelligence Platform"),
  BUSINESS_ADDRESS: z.string().default("San Francisco, CA"),
  APP_BASE_URL: z.string().default(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  PRIVACY_NOTICE_URL: z.string().default(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/privacy`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/privacy`
      : "http://localhost:3000/privacy"
  ),

  // Runtime environment & feature flags
  ALLOW_LEGITIMATE_INTEREST_SENDS: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  // During build / CI / static generation, never crash the deployment
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    Boolean(process.env.VERCEL && !process.env.VERCEL_ENV);

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails: string[] = [];
    const formatted = result.error.format();

    for (const [key, val] of Object.entries(formatted)) {
      if (key !== "_errors" && val && typeof val === "object" && "_errors" in val) {
        const issues = (val as { _errors: string[] })._errors;
        if (issues && issues.length > 0) {
          errorDetails.push(`  ⚠️  ${key}: ${issues.join("; ")}`);
        }
      }
    }

    console.warn(`\n[ENV NOTICE] Missing or unconfigured environment variables:\n${errorDetails.join("\n")}\n`);
  }

  // Check for critical missing secrets and log non-fatal warnings
  const missingSecrets: string[] = [];
  if (!process.env.SUPABASE_URL) missingSecrets.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingSecrets.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.API_SECRET_KEY) missingSecrets.push("API_SECRET_KEY");
  if (!process.env.CRON_SECRET) missingSecrets.push("CRON_SECRET");

  if (missingSecrets.length > 0) {
    console.warn(
      `[ENV WARNING] Running with unconfigured secrets: ${missingSecrets.join(
        ", "
      )}. Configure these in your Vercel project settings.`
    );
  }

  return (result.success ? result.data : process.env) as unknown as Env;
}

export const env = validateEnv();

