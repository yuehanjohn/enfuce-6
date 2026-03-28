-- ============================================================
-- 005: Layer 2 AI Results
-- ============================================================
-- Stores Snowflake Cortex AI analysis for each flagged pair.
-- Populated by the Layer 2 batch processing job.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA SCREENING;

CREATE TABLE IF NOT EXISTS LAYER2_RESULTS (
    result_id           VARCHAR(100)    PRIMARY KEY,
    flag_id             VARCHAR(100)    NOT NULL,
    customer_id         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    ai_confidence       FLOAT           NOT NULL,       -- 0-100
    routing             VARCHAR(20)     NOT NULL,       -- AUTO_RESTRICT | AUTO_CLEAR | HUMAN_REVIEW
    reasoning           VARCHAR         NOT NULL,
    matching_signals    VARIANT,                        -- JSON array of strings
    conflicting_signals VARIANT,                        -- JSON array of strings
    sources             VARIANT,                        -- JSON array of {label, url}
    processed_at        TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT fk_l2_flag FOREIGN KEY (flag_id)
        REFERENCES SCREENING.LAYER1_FLAGS(flag_id)
);