-- ============================================================
-- 004: Layer 1 Screening Flags
-- ============================================================
-- Output of deterministic Jaro-Winkler + DOB + nationality
-- scoring. Each row is a customer–watchlist pair that exceeded
-- the composite score threshold (≥ 50).
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA SCREENING;

CREATE TABLE IF NOT EXISTS LAYER1_FLAGS (
    flag_id             VARCHAR(100)    PRIMARY KEY,
    customer_id         VARCHAR(50)     NOT NULL,
    entity_id           VARCHAR(100)    NOT NULL,
    composite_score     INTEGER         NOT NULL,
    name_score          FLOAT           NOT NULL,
    dob_score           INTEGER         NOT NULL,
    nationality_score   INTEGER         NOT NULL,
    created_at          TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT fk_l1_customer FOREIGN KEY (customer_id)
        REFERENCES CUSTOMERS.ONBOARDING(customer_id),
    CONSTRAINT fk_l1_watchlist FOREIGN KEY (entity_id)
        REFERENCES WATCHLIST.SANCTIONS_PEP(entity_id)
);

-- Note:
-- Traditional CREATE INDEX is not supported for standard Snowflake tables.
-- Those statements were removed from this migration.

-- ============================================================
-- Jaro-Winkler UDF for Layer 1 name matching
-- ============================================================

CREATE OR REPLACE FUNCTION SCREENING.JARO_WINKLER_SIMILARITY(s1 VARCHAR, s2 VARCHAR)
RETURNS FLOAT
LANGUAGE JAVASCRIPT
STRICT
AS
$$
    if (S1 === S2) return 1.0;
    if (!S1 || !S2) return 0.0;

    var s1 = S1.toLowerCase();
    var s2 = S2.toLowerCase();
    var s1Len = s1.length;
    var s2Len = s2.length;
    var matchDist = Math.floor(Math.max(s1Len, s2Len) / 2) - 1;
    var s1Matches = new Array(s1Len).fill(false);
    var s2Matches = new Array(s2Len).fill(false);
    var matches = 0;
    var transpositions = 0;

    for (var i = 0; i < s1Len; i++) {
        var start = Math.max(0, i - matchDist);
        var end = Math.min(i + matchDist + 1, s2Len);
        for (var j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    var k = 0;
    for (var i = 0; i < s1Len; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    var jaro = (matches / s1Len + matches / s2Len + (matches - transpositions / 2) / matches) / 3;
    var prefix = 0;

    for (var i = 0; i < Math.min(4, s1Len, s2Len); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
$$;

-- ============================================================
-- Layer 1 Screening Query
-- ============================================================
-- Run this to populate LAYER1_FLAGS from CUSTOMERS × WATCHLIST.
-- Adjust the threshold (50) as needed.
-- ============================================================

/*
INSERT INTO SCREENING.LAYER1_FLAGS (
    flag_id,
    customer_id,
    entity_id,
    composite_score,
    name_score,
    dob_score,
    nationality_score
)
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
                SELECT 1
                FROM TABLE(SPLIT_TO_TABLE(w.entity_aliases, ';')) AS a
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
            WHEN c.nationality IS NULL OR w.nationality_country IS NULL THEN 0
            WHEN UPPER(c.nationality) = UPPER(w.nationality_country) THEN 20
            ELSE -10
        END AS nat_points

    FROM CUSTOMERS.ONBOARDING c
    CROSS JOIN WATCHLIST.SANCTIONS_PEP w
    WHERE SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) >= 0.75
       OR EXISTS (
           SELECT 1
           FROM TABLE(SPLIT_TO_TABLE(w.entity_aliases, ';')) AS a
           WHERE SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, TRIM(a.VALUE)) >= 0.75
       )
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
*/