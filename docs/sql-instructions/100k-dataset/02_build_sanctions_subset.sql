-- 02: Build reusable sanctions subset for injections
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

-- Keep this at >= 100. If less, resolve source-data constraints first.
