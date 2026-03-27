// Simple hardcoded auth for demo — no external auth provider needed
// Credentials come from DEMO_EMAIL and DEMO_PASSWORD env vars

import { cookies } from "next/headers";

const SESSION_COOKIE = "enfuse_session";
const SESSION_VALUE = "authenticated";

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_EMAIL ?? "analyst@enfuse.demo",
    password: process.env.DEMO_PASSWORD ?? "enfuse2026",
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export async function setSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
