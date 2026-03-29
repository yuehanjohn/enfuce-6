-- 04: Inject 100 exact sanctions matches
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

INSERT INTO ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
  (customer_id, full_name, dob, nationality, email, entity_type)
SELECT
  'POS_EXACT_' || LPAD(ROW_NUMBER() OVER (ORDER BY entity_id), 6, '0') AS customer_id,
  entity_name AS full_name,
  TRY_TO_DATE(dob) AS dob,
  nationality,
  'exact_' || LPAD(ROW_NUMBER() OVER (ORDER BY entity_id), 6, '0') || '@demo.local' AS email,
  'INDIVIDUAL' AS entity_type
FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET
QUALIFY ROW_NUMBER() OVER (ORDER BY entity_id) <= 100;

SELECT COUNT(*) AS exact_customers
FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
WHERE customer_id LIKE 'POS_EXACT_%';
