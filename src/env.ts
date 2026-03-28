import { z } from "zod";

const envSchema = z.object({
  // Demo auth credentials
  DEMO_EMAIL: z.string().email().default("analyst@enfuce.demo"),
  DEMO_PASSWORD: z.string().min(1).default("enfuce2026"),

  // Supabase (optional — falls back to mock data when not set)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // OpenRouter (optional — falls back to mock data when not set)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-sonnet-4"),

  // Bright Data (optional — search falls back to empty results)
  BRIGHTDATA_API_TOKEN: z.string().optional(),
  BRIGHTDATA_ZONE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check server logs.");
  }

  return parsed.data;
}

export const env = validateEnv();
