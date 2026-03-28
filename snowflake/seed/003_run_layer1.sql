-- ============================================================
-- Seed: Run Layer 1 Screening on Demo Data
-- ============================================================
-- Execute this after seeding customers and watchlist.
-- Populates SCREENING.LAYER1_FLAGS with flagged pairs.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;

TRUNCATE TABLE ENFUSE_SCREENING.SCREENING.LAYER1_FLAGS;

INSERT INTO SCREENING.LAYER1_FLAGS
    (flag_id, customer_id, entity_id, composite_score, name_score, dob_score, nationality_score)

WITH base AS (
    SELECT
        c.customer_id,
        c.full_name,
        c.dob AS customer_dob,
        c.nationality,
        w.entity_id,
        w.entity_name,
        w.entity_aliases,
        w.dob AS watchlist_dob,
        w.nationality_country,
        w.citizenship_country,
        SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) AS name_sim
    FROM CUSTOMERS.ONBOARDING c
    CROSS JOIN WATCHLIST.SANCTIONS_PEP w
),

alias_scores AS (
    SELECT
        b.customer_id,
        b.entity_id,
        MAX(
            SCREENING.JARO_WINKLER_SIMILARITY(
                b.full_name,
                TRIM(a.VALUE)
            )
        ) AS best_alias_sim
    FROM base b,
         LATERAL SPLIT_TO_TABLE(b.entity_aliases, ';') a
    GROUP BY b.customer_id, b.entity_id
),

scored AS (
    SELECT
        b.customer_id,
        b.entity_id,
        b.name_sim,

        CASE
            WHEN b.name_sim >= 0.92 THEN 70
            WHEN b.name_sim >= 0.82 THEN 50
            ELSE 0
        END AS name_points,

        CASE
            WHEN COALESCE(a.best_alias_sim, 0) >= 0.82 THEN 25
            ELSE 0
        END AS alias_points,

        CASE
            WHEN b.customer_dob IS NULL OR b.watchlist_dob IS NULL THEN 0
            WHEN b.customer_dob = b.watchlist_dob THEN 30
            WHEN ABS(DATEDIFF('year', b.customer_dob, b.watchlist_dob)) <= 1 THEN 15
            ELSE 0
        END AS dob_points,

        CASE
            WHEN b.nationality IS NULL OR COALESCE(b.nationality_country, b.citizenship_country) IS NULL THEN 0
            WHEN UPPER(b.nationality) = UPPER(COALESCE(b.nationality_country, b.citizenship_country)) THEN 20
            ELSE -10
        END AS nat_points

    FROM base b
    LEFT JOIN alias_scores a
        ON b.customer_id = a.customer_id
       AND b.entity_id = a.entity_id
)

SELECT
    'FLAG-' || customer_id || '-' || entity_id AS flag_id,
    customer_id,
    entity_id,
    name_points + alias_points + dob_points + nat_points AS composite_score,
    name_sim AS name_score,
    dob_points AS dob_score,
    nat_points AS nationality_score
FROM scored
WHERE name_points + alias_points + dob_points + nat_points >= 50;