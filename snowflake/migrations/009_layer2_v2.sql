-- ============================================================
-- 009: Layer 2 Results — v2 schema additions
-- ============================================================
-- Adds combined_score, customer_background, sanctions_background
-- to SCREENING.LAYER2_RESULTS to support the redesigned Layer 2
-- pipeline that blends Layer 1 + Layer 2 scores and stores
-- dual per-subject online research summaries.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA SCREENING;

-- Add combined_score column (weighted blend of Layer 1 normalised + AI confidence)
ALTER TABLE LAYER2_RESULTS
    ADD COLUMN IF NOT EXISTS combined_score FLOAT;

-- Backfill existing rows: treat combined_score = ai_confidence for old data
UPDATE LAYER2_RESULTS
SET combined_score = ai_confidence
WHERE combined_score IS NULL;

-- Add customer research summary column
ALTER TABLE LAYER2_RESULTS
    ADD COLUMN IF NOT EXISTS customer_background VARCHAR
        DEFAULT '';

-- Add sanctions entity research summary column
ALTER TABLE LAYER2_RESULTS
    ADD COLUMN IF NOT EXISTS sanctions_background VARCHAR
        DEFAULT '';

-- ============================================================
-- Verify
-- ============================================================
-- Expected: result_id, flag_id, customer_id, entity_id,
--           ai_confidence, combined_score, routing, reasoning,
--           matching_signals, conflicting_signals, sources,
--           customer_background, sanctions_background, processed_at
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'SCREENING'
  AND TABLE_NAME   = 'LAYER2_RESULTS'
ORDER BY ORDINAL_POSITION;
