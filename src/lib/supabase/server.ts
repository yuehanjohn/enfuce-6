// Server-side Supabase client for screening data access
// Uses service role key to bypass RLS (screening uses demo auth, not Supabase auth)

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function isSupabaseConfigured(): boolean {
  return !!(getSupabaseUrl() && getServiceRoleKey());
}

export function getServiceClient() {
  if (client) return client;

  const url = getSupabaseUrl();
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error("Supabase URL and service role key are required");
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return client;
}
