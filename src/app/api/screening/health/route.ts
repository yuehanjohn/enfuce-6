// GET /api/screening/health — Quick Snowflake connectivity check
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake";
import { hasSnowflakeConnection } from "@/lib/screening/snowflake-queries";

export async function GET() {
  if (!hasSnowflakeConnection()) {
    return NextResponse.json({
      ok: false,
      connected: false,
      source: "not-configured",
      message: "Snowflake credentials are not configured",
    });
  }

  const start = Date.now();

  try {
    const result = await Promise.race([
      executeQuery<{ ok: string }>("SELECT 1 AS ok"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check timed out")), 8000)
      ),
    ]);

    return NextResponse.json({
      ok: true,
      connected: true,
      source: "snowflake",
      latency_ms: Date.now() - start,
      row_count: result.rowCount,
      value: result.rows[0]?.ok ?? null,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      connected: false,
      source: "snowflake",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
