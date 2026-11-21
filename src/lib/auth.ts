import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "./auth-client";
import { DEMO_COOKIE_NAME, DEMO_USER_INFO, isDemoEnabled } from "./demo";
import { supabase } from "./supabase";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  isDemo: boolean;
}

export type AuthState =
  | { status: "signed_out" }
  | { status: "unapproved" }
  | { status: "ok"; user: CurrentUser };

async function hasDemoCookie(): Promise<boolean> {
  if (!isDemoEnabled()) return false;
  try {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_COOKIE_NAME)?.value === "1";
  } catch {
    return false;
  }
}

export async function getAuthState(): Promise<AuthState> {
  // Check real Supabase session first whenever Supabase auth env vars exist.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    try {
      const authClient = await createAuthClient();

      // getClaims() verifies the session token. getSession() must never be
      // trusted in server code.
      const { data, error } = await authClient.auth.getClaims();
      const claims = data?.claims as { sub?: string } | undefined;

      if (!error && claims?.sub) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, approved")
          .eq("id", claims.sub)
          .maybeSingle();

        if (profileError) throw new Error(`Could not load profile: ${profileError.message}`);
        if (!profile || !profile.approved) return { status: "unapproved" };

        return {
          status: "ok",
          user: {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            isDemo: false,
          },
        };
      }
    } catch {
      // Fall through to sandbox cookie check if Supabase Auth is unavailable.
    }
  }

  if (await hasDemoCookie()) {
    return { status: "ok", user: { ...DEMO_USER_INFO } };
  }

  return { status: "signed_out" };
}

// Call this at the top of every page AND every server action. proxy.ts only
// does a coarse signed-in check and does not protect server actions.
export async function requireUser(): Promise<CurrentUser> {
  const state = await getAuthState();
  if (state.status === "signed_out") redirect("/login");
  if (state.status === "unapproved") redirect("/login?error=unapproved");
  return state.user;
}
