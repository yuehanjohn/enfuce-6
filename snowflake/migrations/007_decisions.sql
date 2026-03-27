-- ============================================================
-- 007: Decisions (Restrictions & Clearances)
-- ============================================================
-- Final decisions — both auto (from Layer 2) and human (Layer 3).
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA DECISIONS;

CREATE TABLE IF NOT EXISTS RESTRICTIONS (
    decision_id         VARCHAR(100)    PRIMARY KEY,
    customer_id         VARCHAR(50)     NOT NULL,
    result_id           VARCHAR(100)    NOT NULL,
    trigger_type        VARCHAR(10)     NOT NULL,       -- AUTO | HUMAN
    analyst_id          VARCHAR(100),
    reason_category     VARCHAR(500),
    analyst_note        VARCHAR,
    decided_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS CLEARANCES (
    decision_id         VARCHAR(100)    PRIMARY KEY,
    customer_id         VARCHAR(50)     NOT NULL,
    result_id           VARCHAR(100)    NOT NULL,
    trigger_type        VARCHAR(10)     NOT NULL,       -- AUTO | HUMAN
    analyst_id          VARCHAR(100),
    reason_category     VARCHAR(500),
    analyst_note        VARCHAR,
    decided_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);