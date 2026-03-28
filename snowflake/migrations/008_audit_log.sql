-- ============================================================
-- 008: Immutable Audit Log
-- ============================================================
-- Append-only log of every screening event across all layers.
-- Never updated or deleted — immutable for compliance.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA AUDIT;

CREATE TABLE IF NOT EXISTS LOG (
    log_id              VARCHAR(100)    PRIMARY KEY,
    customer_id         VARCHAR(50)     NOT NULL,
    layer               INTEGER         NOT NULL,       -- 1 | 2 | 3
    event_type          VARCHAR(100)    NOT NULL,
    payload             VARIANT         NOT NULL,       -- Full JSON snapshot
    analyst_id          VARCHAR(100),
    ai_chat_transcript  VARCHAR,
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP()
);

-- Clustering key for time-series queries
ALTER TABLE AUDIT.LOG CLUSTER BY (created_at);