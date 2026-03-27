-- ============================================================
-- Enfuse Sanctions & PEP Screening — Snowflake Schema Setup
-- ============================================================
-- Run this first to create the database and schemas.
-- Requires ACCOUNTADMIN or equivalent privileges.
-- ============================================================

-- Create the screening database
CREATE DATABASE IF NOT EXISTS ENFUSE_SCREENING;
USE DATABASE ENFUSE_SCREENING;

-- Create schemas matching the three-layer architecture
CREATE SCHEMA IF NOT EXISTS CUSTOMERS;      -- Input customer data
CREATE SCHEMA IF NOT EXISTS WATCHLIST;       -- Reference sanctions/PEP data
CREATE SCHEMA IF NOT EXISTS SCREENING;      -- Layer 1 & 2 processing results
CREATE SCHEMA IF NOT EXISTS QUEUE;          -- Human review queue
CREATE SCHEMA IF NOT EXISTS DECISIONS;      -- Final decisions (restrictions & clearances)
CREATE SCHEMA IF NOT EXISTS AUDIT;          -- Immutable audit log

-- Grant usage (adjust role as needed)
-- GRANT USAGE ON DATABASE ENFUSE_SCREENING TO ROLE SYSADMIN;
-- GRANT USAGE ON ALL SCHEMAS IN DATABASE ENFUSE_SCREENING TO ROLE SYSADMIN;
