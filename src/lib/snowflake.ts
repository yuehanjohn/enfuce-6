// Snowflake SQL API client via REST
// Uses JWT auth with keypair or OAuth token
// All screening data reads/writes go through this client

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
    database: process.env.SNOWFLAKE_DATABASE ?? "SCREENING_DB",
    schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
    token: process.env.SNOWFLAKE_API_TOKEN ?? "",
  };
}

export interface SnowflakeResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  bindings?: Record<string, string | number | boolean | null>,
): Promise<SnowflakeResult<T>> {
  const config = getConfig();

  // If no token configured, we're in demo mode — use mock data
  if (!config.token) {
    console.warn("[Snowflake] No API token configured — using mock data layer");
    return { rows: [], rowCount: 0 };
  }

  const url = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

  const body: Record<string, unknown> = {
    statement: sql,
    timeout: 60,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
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

  const result = await response.json();

  // Snowflake SQL API returns data in a specific format
  // Map column names to row values
  const columns: string[] = (result.resultSetMetaData?.rowType ?? []).map(
    (col: { name: string }) => col.name.toLowerCase(),
  );
  const data: string[][] = result.data ?? [];

  const rows = data.map((row: string[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });

  return { rows, rowCount: rows.length };
}

// Helper to execute multiple statements (for inserts/updates)
export async function executeStatement(sql: string): Promise<void> {
  await executeQuery(sql);
}
