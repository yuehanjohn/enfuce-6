-- ============================================================
-- Seed: Run Layer 1 Screening on Demo Data
-- ============================================================
-- Execute this after seeding customers and watchlist.
-- Populates SCREENING.LAYER1_FLAGS with flagged pairs.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;

INSERT INTO SCREENING.LAYER1_FLAGS (flag_id, customer_id, entity_id, composite_score, name_score, dob_score, nationality_score)
WITH scored AS (
    SELECT
        c.customer_id,
        w.entity_id,
        SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) AS name_sim,
        CASE
            WHEN SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) >= 0.92 THEN 70
            WHEN SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) >= 0.82 THEN 50
            ELSE 0
        END AS name_points,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM TABLE(SPLIT_TO_TABLE(w.entity_aliases, ';')) AS a
                WHERE SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, TRIM(a.VALUE)) >= 0.82
            ) THEN 25
            ELSE 0
        END AS alias_points,
        CASE
            WHEN c.dob IS NULL OR w.dob IS NULL THEN 0
            WHEN c.dob = w.dob THEN 30
            WHEN ABS(DATEDIFF('year', c.dob, w.dob)) <= 1 THEN 15
            ELSE 0
        END AS dob_points,
        CASE
            WHEN c.nationality IS NULL OR COALESCE(w.nationality_country, w.citizenship_country) IS NULL THEN 0
            WHEN UPPER(c.nationality) = UPPER(COALESCE(w.nationality_country, w.citizenship_country)) THEN 20
            ELSE -10
        END AS nat_points
    FROM CUSTOMERS.ONBOARDING c
    CROSS JOIN WATCHLIST.SANCTIONS_PEP w
)
SELECT
    'FLAG-' || customer_id || '-' || entity_id  AS flag_id,
    customer_id,
    entity_id,
    name_points + alias_points + dob_points + nat_points AS composite_score,
    name_sim AS name_score,
    dob_points AS dob_score,
    nat_points AS nationality_score
FROM scored
WHERE name_points + alias_points + dob_points + nat_points >= 50;
