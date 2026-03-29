-- 06: Verify final 100K composition
USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

SELECT
  SUM(IFF(customer_id LIKE 'POS_EXACT_%', 1, 0)) AS exact_injected,
  SUM(IFF(customer_id LIKE 'POS_NEAR_%', 1, 0)) AS near_injected,
  SUM(IFF(customer_id NOT LIKE 'POS_EXACT_%' AND customer_id NOT LIKE 'POS_NEAR_%', 1, 0)) AS normal_customers,
  COUNT(*) AS total_customers
FROM ENFUSE_SCREENING.CUSTOMERS.ONBOARDING;

-- Expected:
-- exact_injected = 100
-- near_injected = 100
-- normal_customers = 99800
-- total_customers = 100000
