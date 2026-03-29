-- 05: Inject 100 near matches (slight name mutation)
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

DELETE FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
WHERE customer_id LIKE 'POS_NEAR_%';

WITH ranked AS (
  SELECT
    entity_id,
    entity_name,
    TRY_TO_DATE(dob) AS dob,
    nationality,
    ROW_NUMBER() OVER (ORDER BY entity_id) AS rn
  FROM ENFUSE_SCREENING.WATCHLIST.SANCTIONS_SUBSET
)
INSERT INTO ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
  (customer_id, full_name, dob, nationality, email, entity_type)
SELECT
  'POS_NEAR_' || LPAD(rn, 6, '0') AS customer_id,
  CASE
    WHEN POSITION(' ' IN entity_name) > 0 THEN
      SPLIT_PART(entity_name, ' ', 1) || ' ' ||
      LEFT(SPLIT_PART(entity_name, ' ', 2), GREATEST(LENGTH(SPLIT_PART(entity_name, ' ', 2)) - 1, 1))
    ELSE
      LEFT(entity_name, GREATEST(LENGTH(entity_name) - 1, 1))
  END AS full_name,
  dob,
  nationality,
  'near_' || LPAD(rn, 6, '0') || '@demo.local' AS email,
  'INDIVIDUAL' AS entity_type
FROM ranked
WHERE rn <= 100;

SELECT COUNT(*) AS near_customers
FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING
WHERE customer_id LIKE 'POS_NEAR_%';
