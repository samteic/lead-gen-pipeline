export const DEMO_COOKIE_NAME = "li_sandbox";

export const GITHUB_REPO_URL = "https://github.com/samteic/lead-gen-pipeline";

export function githubFileUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, "");
  return `${GITHUB_REPO_URL}/blob/main/${clean}`;
}

export function isDemoEnabled(): boolean {
  return process.env.DISABLE_DEMO_MODE !== "true";
}

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export const DEMO_USER_INFO = {
  id: DEMO_USER_ID,
  email: "reviewer@lead-intelligence.demo",
  fullName: "Demo Visitor",
  isDemo: true as const,
};

export function demoMutationMessage(action?: string): string {
  const what = action ? `${action} is` : "Changes are";
  return `Demo mode: ${what} view-only so sample data stays clean. Search, filters, CSV exports, and GDPR JSON downloads work live.`;
}

export function safeDemoDestination(value: string | null): string {
  if (!value) return "/crm/dashboard";
  if (value.startsWith("/crm") && !value.startsWith("//") && !value.includes("\\")) {
    return value;
  }
  return "/crm/dashboard";
}
