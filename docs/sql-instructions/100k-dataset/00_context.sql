-- Set execution context
USE WAREHOUSE ENFUSE_WH;
USE DATABASE ENFUSE_SCREENING;

-- Optional quick sanity
SELECT CURRENT_WAREHOUSE() AS warehouse_name, CURRENT_DATABASE() AS database_name;
