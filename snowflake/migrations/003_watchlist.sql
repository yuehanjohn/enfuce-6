-- ============================================================
-- 003: Sanctions & PEP Watchlist Table
-- ============================================================
-- Reference table for sanctions/PEP records.
-- In production, this is populated from GLOBAL_SANCTIONS_DATA
-- marketplace listing or your own sanctions feed.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA WATCHLIST;

CREATE TABLE IF NOT EXISTS SANCTIONS_PEP (
    entity_id           VARCHAR(100)    PRIMARY KEY,
    sr_no               INTEGER,
    listing_country     VARCHAR(100),
    authority           VARCHAR(100)    NOT NULL,       -- OFAC | UN | EU | PEP
    list_name           VARCHAR(500)    NOT NULL,
    entity_type         VARCHAR(50)     DEFAULT 'Individual',
    entity_name         VARCHAR(500)    NOT NULL,
    entity_aliases      VARCHAR(5000),                  -- Semicolon-separated aliases
    effective_date      DATE,
    expiry_date         DATE,
    entity_notes        TEXT,
    citation_link       VARCHAR(2000),
    address             VARCHAR(1000),
    country             VARCHAR(100),
    nationality_country VARCHAR(100),
    citizenship_country VARCHAR(100),
    dob                 DATE,
    pob                 VARCHAR(500),
    call_sign           VARCHAR(100),
    vessel_type         VARCHAR(100),
    vessel_flag         VARCHAR(100),
    vessel_owner        VARCHAR(500),
    gross_tonnage       VARCHAR(100),
    gross_registered_tonnage NUMBER
);

-- Optional: Create a view over the marketplace data
/*
CREATE OR REPLACE VIEW WATCHLIST.SANCTIONS_FROM_MARKETPLACE AS
SELECT *
FROM GLOBAL_SANCTIONS_DATA.CYBERSYN.SANCTIONS_DATAFEED;
*/
