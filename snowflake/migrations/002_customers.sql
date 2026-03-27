-- ============================================================
-- 002: Customer Onboarding Table
-- ============================================================
-- Normalized customer records for screening.
-- In production, this may be a view over SNOWFLAKE_SAMPLE_DATA
-- or populated from your onboarding pipeline.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

CREATE TABLE IF NOT EXISTS ONBOARDING (
    customer_id     VARCHAR(50)     PRIMARY KEY,
    full_name       VARCHAR(500)    NOT NULL,
    dob             DATE,
    nationality     VARCHAR(100),
    email           VARCHAR(500),
    entity_type     VARCHAR(20)     DEFAULT 'INDIVIDUAL',  -- INDIVIDUAL | BUSINESS
    created_at      TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

-- Optional: Create a view that normalizes from SNOWFLAKE_SAMPLE_DATA
-- This allows using TPC-DS sample customers directly for demo
/*
CREATE OR REPLACE VIEW CUSTOMERS.ONBOARDING_FROM_SAMPLE AS
SELECT
    C_CUSTOMER_ID                                           AS customer_id,
    TRIM(COALESCE(C_FIRST_NAME, '') || ' ' || COALESCE(C_LAST_NAME, ''))
                                                            AS full_name,
    TRY_TO_DATE(
        C_BIRTH_YEAR || '-' ||
        LPAD(C_BIRTH_MONTH, 2, '0') || '-' ||
        LPAD(C_BIRTH_DAY, 2, '0')
    )                                                       AS dob,
    C_BIRTH_COUNTRY                                         AS nationality,
    C_EMAIL_ADDRESS                                         AS email,
    'INDIVIDUAL'                                            AS entity_type,
    CURRENT_TIMESTAMP()                                     AS created_at
FROM SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER
WHERE C_FIRST_NAME IS NOT NULL
  AND C_LAST_NAME IS NOT NULL;
*/
