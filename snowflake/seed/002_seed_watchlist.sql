-- ============================================================
-- Seed: Demo Sanctions & PEP Watchlist
-- ============================================================
-- 5 watchlist entries matched to the demo customers.
-- In production, use GLOBAL_SANCTIONS_DATA marketplace listing.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA WATCHLIST;

INSERT INTO SANCTIONS_PEP (
    entity_id, sr_no, listing_country, authority, list_name, entity_type,
    entity_name, entity_aliases, effective_date, expiry_date,
    entity_notes, citation_link, address, country,
    nationality_country, citizenship_country, dob, pob
) VALUES
(
    'OFAC-12345', 1, 'US', 'OFAC', 'SDN List', 'Individual',
    'Ahmad Al-Hassan',
    'Ahmad Hassan; Ahmed Al Hassan; Abu Ahmad',
    '2023-01-15', NULL,
    'Designated for providing financial facilitation services to designated entities in the Middle East region.',
    'https://ofac.treasury.gov/recent-actions/20230115',
    'Beirut, Lebanon', 'LB', 'LB', 'LB',
    '1976-05-20', 'Tripoli, Lebanon'
),
(
    'OFAC-67890', 2, 'US', 'OFAC', 'SDN List', 'Individual',
    'Viktor Sergeyevich Petrov',
    'Viktor Petrov; V. Petrov',
    '2022-06-10', NULL,
    'Designated pursuant to E.O. 14024 for operating in the financial services sector of the Russian Federation economy. Known associate of sanctioned oligarch network.',
    'https://ofac.treasury.gov/recent-actions/20220610',
    'Moscow, Russia', 'RU', 'RU', 'RU',
    '1965-11-22', 'Saint Petersburg, Russia'
),
(
    'UN-54321', 3, 'INTL', 'UN', 'UN Security Council Consolidated List', 'Individual',
    'John Michael Smith',
    'J. Smith',
    '2019-08-22', NULL,
    'Listed for involvement in proliferation financing activities.',
    'https://www.un.org/securitycouncil/sanctions/list',
    'London, United Kingdom', 'GB', 'GB', 'GB',
    '1970-02-14', 'London, UK'
),
(
    'EU-11111', 4, 'EU', 'EU', 'EU Sanctions List', 'Individual',
    'Maria Santos',
    'M. Santos; Maria S. Rodriguez',
    '2024-03-01', NULL,
    'Listed for involvement in drug trafficking networks operating across Central America.',
    'https://ec.europa.eu/sanctions',
    'Mexico City, Mexico', 'MX', 'MX', 'MX',
    '1983-12-18', 'Guadalajara, Mexico'
),
(
    'OFAC-99999', 5, 'US', 'OFAC', 'SDN List', 'Individual',
    'Chen Wei Lin',
    'Chen Wei; C.W. Lin',
    '2024-09-15', NULL,
    'Designated for facilitating technology transfer to entities supporting advanced weapons programs.',
    'https://ofac.treasury.gov/recent-actions/20240915',
    'Shenzhen, China', 'CN', 'CN', 'CN',
    '1972-01-28', 'Shanghai, China'
);
