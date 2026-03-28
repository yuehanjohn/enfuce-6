// Snowflake SQL API client via REST
// Docs: https://docs.snowflake.com/en/developer-guide/sql-api
//
// When SNOWFLAKE_ACCOUNT + SNOWFLAKE_API_TOKEN are set, all queries
// go to the real Snowflake SQL API. Otherwise, falls back to mock data.
// Supports key-pair JWT auto-generation to avoid manual token rotation.

import { createSign } from "node:crypto";

interface SnowflakeConfig {
  account: string;
  warehouse: string;
  database: string;
  schema: string;
  token: string;
  user?: string;
  privateKey?: string;
  publicKeyFingerprint?: string;
}

function getConfig(): SnowflakeConfig {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT ?? "",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE ?? "COMPUTE_WH",
    database: process.env.SNOWFLAKE_DATABASE ?? "ENFUSE_SCREENING",
    schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
    token: process.env.SNOWFLAKE_API_TOKEN ?? "",
    user: process.env.SNOWFLAKE_USER ?? "",
    privateKey: (process.env.SNOWFLAKE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    publicKeyFingerprint: process.env.SNOWFLAKE_PUBLIC_KEY_FINGERPRINT ?? "",
  };
}

let cachedGeneratedToken = "";
let cachedGeneratedTokenExpMs = 0;

function base64UrlEncode(value: string | Buffer): string {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function canGenerateKeyPairJwt(config: SnowflakeConfig): boolean {
  return !!(config.account && config.user && config.privateKey && config.publicKeyFingerprint);
}

function generateKeyPairJwt(config: SnowflakeConfig): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + 59 * 60; // 59 minute lifetime

  const account = config.account.toUpperCase();
  const user = config.user!.toUpperCase();

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: `${account}.${user}.${config.publicKeyFingerprint}`,
    sub: `${account}.${user}`,
    iat: nowSeconds,
    exp: expSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(config.privateKey!);
  const token = `${signingInput}.${base64UrlEncode(signature)}`;

  cachedGeneratedToken = token;
  cachedGeneratedTokenExpMs = expSeconds * 1000;
  return token;
}

function getAuthToken(config: SnowflakeConfig): string {
  // Prefer explicit static token if provided
  if (config.token) {
    return config.token;
  }

  // Fall back to auto-generated key-pair JWT
  if (!canGenerateKeyPairJwt(config)) {
    return "";
  }

  // Reuse cached token until 60s before expiry
  if (cachedGeneratedToken && Date.now() < cachedGeneratedTokenExpMs - 60_000) {
    return cachedGeneratedToken;
  }

  return generateKeyPairJwt(config);
}

function isKeyPairJwt(config: SnowflakeConfig): boolean {
  // If using a static token, it's only a KEYPAIR_JWT if we didn't generate it
  if (config.token && !canGenerateKeyPairJwt(config)) {
    // Static PAT token - not a KEYPAIR_JWT
    return false;
  }
  // If we're generating JWTs, it's a KEYPAIR_JWT
  return canGenerateKeyPairJwt(config);
}

/** Whether a real Snowflake connection is configured */
export function isSnowflakeConfigured(): boolean {
  const config = getConfig();
  const authToken = getAuthToken(config);
  return !!(config.account && authToken);
}

export interface SnowflakeResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

// Snowflake SQL API can return async handles for long queries.
// We poll until the statement completes.
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 600; // 300 seconds (5 min) max

async function pollForResult(
  statementHandle: string,
  config: SnowflakeConfig,
  authToken: string
): Promise<Record<string, unknown>> {
  const url = `https://${config.account}.snowflakecomputing.com/api/v2/statements/${statementHandle}`;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${authToken}`,
    };
    if (isKeyPairJwt(config)) {
      headers["X-Snowflake-Authorization-Token-Type"] = "KEYPAIR_JWT";
    }
    const response = await fetch(url, {
      method: "GET",
      headers,
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
  bindings?: Record<string, string | number | boolean | null>
): Promise<SnowflakeResult<T>> {
  const config = getConfig();
  const authToken = getAuthToken(config);

  if (!(config.account && authToken)) {
    return { rows: [], rowCount: 0 };
  }

  const url = `https://${config.account}.snowflakecomputing.com/api/v2/statements`;

  const body: Record<string, unknown> = {
    statement: sql,
    timeout: 300,
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
      ])
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };
  if (isKeyPairJwt(config)) {
    headers["X-Snowflake-Authorization-Token-Type"] = "KEYPAIR_JWT";
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Snowflake query failed (${response.status}): ${errorText}`);
  }

  let result = await response.json();

  // Poll only when Snowflake returned async status without result rows yet.
  if (result.code === "090001" && result.statementHandle && !Array.isArray(result.data)) {
    result = await pollForResult(result.statementHandle, config, authToken);
  }

  // Map column names to row values
  const columns: string[] = (result.resultSetMetaData?.rowType ?? []).map((col: { name: string }) =>
    col.name.toLowerCase()
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
