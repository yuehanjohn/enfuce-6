# Hackathon Snowflake Runbook

This runbook captures the exact data setup used for the sanctions screening demo.

## Goal

Build a controlled demo dataset with:

- 19,800 normal customers (from Snowflake sample data)
- 100 exact sanctions matches
- 100 near sanctions matches
- Total customers: 20,000

## Source Datasets

- Customers base: `SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER`
- Sanctions source: `GLOBAL_SANCTIONS_DATA_SET.GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED`

## Prerequisites

- Warehouse exists and is active: `ENFUSE_WH`
- Database exists: `ENFUSE_SCREENING`
- Tables exist:
  - `ENFUSE_SCREENING.CUSTOMERS.ONBOARDING`
  - `ENFUSE_SCREENING.WATCHLIST.SANCTIONS_PEP`

## Step 1: Load sanctions feed into watchlist table

```sql
USE WAREHOUSE ENFUSE_WH;
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA WATCHLIST;

TRUNCATE TABLE SANCTIONS_PEP;

INSERT INTO SANCTIONS_PEP (
  entity_id, sr_no, listing_country, authority, list_name, entity_type,
  entity_name, entity_aliases, effective_date, expiry_date,
  entity_notes, citation_link, address, country,
  nationality_country, citizenship_country, dob, pob,
  call_sign, vessel_type, vessel_flag, vessel_owner, gross_tonnage, gross_registered_tonnage
)
SELECT
  TO_VARCHAR(ENTITY_ID) AS entity_id,
  TRY_TO_NUMBER("Sr No.") AS sr_no,
  TO_VARCHAR(LISTING_COUNTRY) AS listing_country,
  TO_VARCHAR(AUTHORITY) AS authority,
  TO_VARCHAR(LIST_NAME) AS list_name,
  TO_VARCHAR(ENTITY_TYPE) AS entity_type,
  TO_VARCHAR(ENTITY_NAME) AS entity_name,
  TO_VARCHAR(ENTITY_ALIASES) AS entity_aliases,
  EFFECTIVE_DATE AS effective_date,
  EXPIRY_DATE AS expiry_date,
  TO_VARCHAR(ENTITY_NOTES) AS entity_notes,
  TO_VARCHAR(CITATION_LINK) AS citation_link,
  TO_VARCHAR(ADDRESS) AS address,
  TO_VARCHAR(COUNTRY) AS country,
  TO_VARCHAR(NATIONALITY_COUNTRY) AS nationality_country,
  TO_VARCHAR(CITIZENSHIP_COUNTRY) AS citizenship_country,
  TRY_TO_DATE(DOB) AS dob,
  TO_VARCHAR(POB) AS pob,
  TO_VARCHAR(CALL_SIGN) AS call_sign,
  TO_VARCHAR(VESSEL_TYPE) AS vessel_type,
  TO_VARCHAR(VESSEL_FLAG) AS vessel_flag,
  TO_VARCHAR(VESSEL_OWNER) AS vessel_owner,
  TO_VARCHAR(GROSS_TONNAGE) AS gross_tonnage,
  TRY_TO_NUMBER(GROSS_REGISTERED_TONNAGE) AS gross_registered_tonnage
FROM GLOBAL_SANCTIONS_DATA_SET.GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED
WHERE ENTITY_NAME IS NOT NULL
  AND TRIM(ENTITY_NAME) <> '';
```

## Step 2: Build sanctions subset table

Note: use a permanent table, not temp, to avoid session scope issues.

```sql
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA WATCHLIST;

CREATE OR REPLACE TABLE SANCTIONS_SUBSET AS
SELECT
  entity_id,
  entity_name,
  TRY_TO_DATE(dob) AS dob,
  UPPER(TRIM(COALESCE(nationality_country, citizenship_country, country, listing_country))) AS nationality
FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_PEP
WHERE entity_name IS NOT NULL
  AND TRIM(entity_name) <> ''
QUALIFY ROW_NUMBER() OVER (ORDER BY entity_id) <= 500;

SELECT COUNT(*) AS subset_count
FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET;
```

If subset count is 100 in your account, use rows 1..100 for both exact and near injection patterns.

## Step 3: Load 19,800 base customers

```sql
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

TRUNCATE TABLE ONBOARDING;

INSERT INTO ONBOARDING (
  customer_id,
  full_name,
  dob,
  nationality,
  email,
  entity_type
)
SELECT
  C_CUSTOMER_ID AS customer_id,
  TRIM(COALESCE(C_FIRST_NAME, '') || ' ' || COALESCE(C_LAST_NAME, '')) AS full_name,
  TRY_TO_DATE(
    C_BIRTH_YEAR || '-' ||
    LPAD(C_BIRTH_MONTH, 2, '0') || '-' ||
    LPAD(C_BIRTH_DAY, 2, '0')
  ) AS dob,
  UPPER(TRIM(C_BIRTH_COUNTRY)) AS nationality,
  C_EMAIL_ADDRESS AS email,
  'INDIVIDUAL' AS entity_type
FROM SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER
WHERE C_FIRST_NAME IS NOT NULL
  AND C_LAST_NAME IS NOT NULL
QUALIFY ROW_NUMBER() OVER (ORDER BY C_CUSTOMER_ID) <= 19800;
```

## Step 4: Inject exact matches

```sql
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

INSERT INTO ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
  (customer_id, full_name, dob, nationality, email, entity_type)
SELECT
  'POS_EXACT_' || LPAD(ROW_NUMBER() OVER (ORDER BY entity_id), 6, '0') AS customer_id,
  entity_name AS full_name,
  TRY_TO_DATE(dob) AS dob,
  nationality,
  'exact_' || LPAD(ROW_NUMBER() OVER (ORDER BY entity_id), 6, '0') || '@demo.local' AS email,
  'INDIVIDUAL' AS entity_type
FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET
QUALIFY ROW_NUMBER() OVER (ORDER BY entity_id) <= 100;
```

## Step 5: Inject near matches

If subset_count is at least 200, use rn between 101 and 200.
If subset_count is 100, use rn <= 100.

```sql
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

DELETE FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
WHERE customer_id LIKE 'POS_NEAR_%';

WITH ranked AS (
  SELECT
    entity_id,
    entity_name,
    TRY_TO_DATE(dob) AS dob,
    nationality,
    ROW_NUMBER() OVER (ORDER BY entity_id) AS rn
  FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET
)
INSERT INTO ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
  (customer_id, full_name, dob, nationality, email, entity_type)
SELECT
  'POS_NEAR_' || LPAD(rn, 6, '0') AS customer_id,
  CASE
    WHEN POSITION(' ' IN entity_name) > 0 THEN
      SPLIT_PART(entity_name, ' ', 1) || ' ' ||
      LEFT(SPLIT_PART(entity_name, ' ', 2), GREATEST(LENGTH(SPLIT_PART(entity_name, ' ', 2)) - 1, 1))
    ELSE
      LEFT(entity_name, GREATEST(LENGTH(entity_name) - 1, 1))
  END AS full_name,
  dob,
  nationality,
  'near_' || LPAD(rn, 6, '0') || '@demo.local' AS email,
  'INDIVIDUAL' AS entity_type
FROM ranked
WHERE rn <= 100;
```

## Step 6: Verify final composition

```sql
SELECT
  SUM(IFF(customer_id LIKE 'POS_EXACT_%', 1, 0)) AS exact_injected,
  SUM(IFF(customer_id LIKE 'POS_NEAR_%', 1, 0)) AS near_injected,
  SUM(IFF(customer_id NOT LIKE 'POS_EXACT_%' AND customer_id NOT LIKE 'POS_NEAR_%', 1, 0)) AS normal_customers,
  COUNT(*) AS total_customers
FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING;
```

Expected:

- exact_injected = 100
- near_injected = 100
- normal_customers = 19800
- total_customers = 20000

## Step 7: Run app pipeline

- Start app: `npm run dev`
- Trigger run endpoint: `POST /api/screening/run`
- Check queue endpoint: `GET /api/screening/queue`
- Check health endpoint: `GET /api/screening/health`

## Common Errors and Fixes

### Error: SANCTIONS_SUBSET does not exist or not authorized

Cause:

- Temp table lost due to session/context changes.

Fix:

- Create `ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET` as a normal table.
- Always reference with fully qualified name.

### Error: 0 rows inserted for near matches

Cause:

- Subset has only 100 rows and query asks for 101..200.

Fix:

- Use ranked CTE and `WHERE rn <= 100` for near-match insert.

### Concern: Cortex caused data issue

Clarification:

- Cortex does not control these insert counts.
- Count mismatch is from subset size and rn filter logic.

## Baseline Run - 2026-03-28 12:24 UTC

- Health endpoint:
  - Request: `GET /api/screening/health`
  - Response: `{"ok":true,"connected":true,"source":"snowflake","latency_ms":134,"row_count":1,"value":"1"}`
  - HTTP: `200`
  - Total time: `0.196s`
- Run endpoint:
  - Request: `POST /api/screening/run`
  - Response summary:
    - `success: true`
    - `customers_screened: 20000`
    - `flags_count: 536`
    - `source: snowflake`
- Queue endpoint:
  - Request: `GET /api/screening/queue?limit=10`
  - Response: `{"queue":[],"count":0,"source":"snowflake"}`
- Snowflake SQL checks:
  - Dataset mix: `exact_injected=100, near_injected=100, total_customers=20000`
  - Layer 1 flags: `536`
