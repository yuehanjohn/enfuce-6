-- 01: Load sanctions source into WATCHLIST.SANCTIONS_PEP
USE WAREHOUSE ENFUSE_WH;
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA WATCHLIST;

TRUNCATE TABLE SANCTIONS_PEP;

INSERT INTO SANCTIONS_PEP (
  entity_id, sr_no, listing_country, authority, list_name, entity_type,
  entity_name, entity_aliases, effective_date, expiry_date,
  entity_notes, citation_link, address, country,
  nationality_country, citizenship_country, dob, pob,
  call_sign, vessel_type, vessel_flag, vessel_owner, gross_tonnage, gross_registered_tonnage
)
SELECT
  TO_VARCHAR(ENTITY_ID) AS entity_id,
  TRY_TO_NUMBER("Sr No.") AS sr_no,
  TO_VARCHAR(LISTING_COUNTRY) AS listing_country,
  TO_VARCHAR(AUTHORITY) AS authority,
  TO_VARCHAR(LIST_NAME) AS list_name,
  TO_VARCHAR(ENTITY_TYPE) AS entity_type,
  TO_VARCHAR(ENTITY_NAME) AS entity_name,
  TO_VARCHAR(ENTITY_ALIASES) AS entity_aliases,
  EFFECTIVE_DATE AS effective_date,
  EXPIRY_DATE AS expiry_date,
  TO_VARCHAR(ENTITY_NOTES) AS entity_notes,
  TO_VARCHAR(CITATION_LINK) AS citation_link,
  TO_VARCHAR(ADDRESS) AS address,
  TO_VARCHAR(COUNTRY) AS country,
  TO_VARCHAR(NATIONALITY_COUNTRY) AS nationality_country,
  TO_VARCHAR(CITIZENSHIP_COUNTRY) AS citizenship_country,
  TRY_TO_DATE(DOB) AS dob,
  TO_VARCHAR(POB) AS pob,
  TO_VARCHAR(CALL_SIGN) AS call_sign,
  TO_VARCHAR(VESSEL_TYPE) AS vessel_type,
  TO_VARCHAR(VESSEL_FLAG) AS vessel_flag,
  TO_VARCHAR(VESSEL_OWNER) AS vessel_owner,
  TO_VARCHAR(GROSS_TONNAGE) AS gross_tonnage,
  TRY_TO_NUMBER(GROSS_REGISTERED_TONNAGE) AS gross_registered_tonnage
FROM GLOBAL_SANCTIONS_DATA_SET.GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED
WHERE ENTITY_NAME IS NOT NULL
  AND TRIM(ENTITY_NAME) <> '';

SELECT COUNT(*) AS watchlist_rows
FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_PEP;
