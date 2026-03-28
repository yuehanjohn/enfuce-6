import { z } from "zod";

const envSchema = z.object({
  // Demo auth credentials
  DEMO_EMAIL: z.string().email().default("analyst@enfuse.demo"),
  DEMO_PASSWORD: z.string().min(1).default("enfuse2026"),

  // Snowflake (optional — falls back to mock data when not set)
  SNOWFLAKE_ACCOUNT: z.string().optional(),
  SNOWFLAKE_WAREHOUSE: z.string().default("COMPUTE_WH"),
  SNOWFLAKE_DATABASE: z.string().default("SCREENING_DB"),
  SNOWFLAKE_SCHEMA: z.string().default("PUBLIC"),
  SNOWFLAKE_API_TOKEN: z.string().optional(),
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
