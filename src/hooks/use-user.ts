"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const p = profile as { full_name?: string | null; avatar_url?: string | null } | null;
      return {
        id: user.id,
        email: user.email!,
        fullName: p?.full_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    },
  });
}
