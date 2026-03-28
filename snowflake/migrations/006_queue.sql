-- ============================================================
-- 006: Human Review Queue
-- ============================================================
-- Cases routed to human review (10-90% AI confidence).
-- Populated automatically after Layer 2 processing.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA QUEUE;

CREATE TABLE IF NOT EXISTS PENDING_REVIEW (
    queue_id            VARCHAR(100)    PRIMARY KEY,
    result_id           VARCHAR(100)    NOT NULL,
    customer_id         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    ai_confidence       FLOAT           NOT NULL,
    assigned_to         VARCHAR(100),                   -- analyst user id
    queued_at           TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
    status              VARCHAR(20)     DEFAULT 'PENDING',  -- PENDING | IN_REVIEW | DECIDED

    CONSTRAINT fk_q_result FOREIGN KEY (result_id)
        REFERENCES SCREENING.LAYER2_RESULTS(result_id)
);

