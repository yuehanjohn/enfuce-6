// Snowflake SQL API client via REST
// Docs: https://docs.snowflake.com/en/developer-guide/sql-api
//
// When SNOWFLAKE_ACCOUNT + SNOWFLAKE_API_TOKEN are set, all queries
// go to the real Snowflake SQL API. Otherwise, falls back to mock data.

interface SnowflakeConfig {
  account: string;
  warehouse: string;
  database: string;
  schema: string;
  token: string;
}

function getConfig(): SnowflakeConfig {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT ?? "",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE ?? "COMPUTE_WH",
    database: process.env.SNOWFLAKE_DATABASE ?? "ENFUSE_SCREENING",
    schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
    token: process.env.SNOWFLAKE_API_TOKEN ?? "",
  };
}

/** Whether a real Snowflake connection is configured */
export function isSnowflakeConfigured(): boolean {
  const config = getConfig();
  return !!(config.account && config.token);
}

export interface SnowflakeResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

// Snowflake SQL API can return async handles for long queries.
// We poll until the statement completes.
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 120; // 60 seconds max

async function pollForResult(
  statementHandle: string,
  config: SnowflakeConfig,
): Promise<Record<string, unknown>> {
  const url = `https://${config.account}.snowflakecomputing.com/api/v2/statements/${statementHandle}`;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Snowflake poll failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // Check execution status
    if (result.code === "090001") {
      // Still running — wait and retry
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    return result;
  }

  throw new Error(`Snowflake query timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`);
}

/**
 * Execute a SQL query against Snowflake SQL API.
 * Returns empty result set if Snowflake is not configured (mock mode).
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  bindings?: Record<string, string | number | boolean | null>,
): Promise<SnowflakeResult<T>> {
  const config = getConfig();

  if (!isSnowflakeConfigured()) {
    return { rows: [], rowCount: 0 };
  }

  const url = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

  const body: Record<string, unknown> = {
    statement: sql,
    timeout: 60,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    resultSetMetaData: { format: "jsonv2" },
  };

  if (bindings) {
    body.bindings = Object.fromEntries(
      Object.entries(bindings).map(([key, value]) => [
        key,
        { type: typeof value === "number" ? "FIXED" : "TEXT", value: String(value ?? "") },
      ]),
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Snowflake query failed (${response.status}): ${errorText}`);
  }

  let result = await response.json();

  // If async execution, poll for completion
  if (result.code === "090001" && result.statementHandle) {
    result = await pollForResult(result.statementHandle, config);
  }

  // Map column names to row values
  const columns: string[] = (result.resultSetMetaData?.rowType ?? []).map(
    (col: { name: string }) => col.name.toLowerCase(),
  );
  const data: string[][] = result.data ?? [];

  const rows = data.map((row: string[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      // Parse VARIANT/ARRAY columns as JSON
      const colMeta = result.resultSetMetaData?.rowType?.[i];
      const rawVal = row[i];
      if (rawVal != null && colMeta && (colMeta.type === "variant" || colMeta.type === "array")) {
        try {
          obj[col] = JSON.parse(rawVal);
        } catch {
          obj[col] = rawVal;
        }
      } else {
        obj[col] = rawVal;
      }
    });
    return obj as T;
  });

  return { rows, rowCount: rows.length };
}

/** Execute a write statement (INSERT/UPDATE/DELETE). Returns affected row count. */
export async function executeStatement(sql: string): Promise<number> {
  const result = await executeQuery(sql);
  return result.rowCount;
}
