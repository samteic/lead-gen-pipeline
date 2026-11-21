"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth-client";
import { DEMO_COOKIE_NAME } from "@/lib/demo";
import { checkRateLimit } from "@/lib/rate-limit";

export async function login(formData: FormData) {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headerList.get("cf-connecting-ip") ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";

  const limit = checkRateLimit(`login:${ip}`, { maxRequests: 5, windowSeconds: 60 });
  if (!limit.success) {
    redirect("/login?error=ratelimited");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=missing");

  const authClient = await createAuthClient();
  const { error } = await authClient.auth.signInWithPassword({ email, password });

  // Same message for "no such user" and "wrong password" on purpose.
  if (error) redirect("/login?error=invalid");

  // Clear sandbox cookie if upgrading to an authenticated admin session.
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE_NAME);

  redirect("/crm/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  const wasDemo = cookieStore.get(DEMO_COOKIE_NAME)?.value === "1";
  cookieStore.delete(DEMO_COOKIE_NAME);

  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    try {
      const authClient = await createAuthClient();
      await authClient.auth.signOut();
    } catch {
      // Ignore sign-out errors if no Supabase session exists.
    }
  }

  redirect(wasDemo ? "/" : "/login");
}
