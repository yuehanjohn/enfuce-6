-- ============================================================
-- Seed: Demo Customer Records
-- ============================================================
-- 5 customers designed to test different screening scenarios.
-- In production, populate from your onboarding pipeline.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;
USE SCHEMA CUSTOMERS;

INSERT INTO ONBOARDING (customer_id, full_name, dob, nationality, email, entity_type) VALUES
    ('AAAAAAAAGOKAAAAA', 'Ahmad Al-Hassan',        '1978-03-15', 'LEBANON',       'ahmad.alhassan@example.com',  'INDIVIDUAL'),
    ('AAAAAAAABPKAAAAA', 'Viktor Petrov',           '1965-11-22', 'RUSSIA',        'v.petrov@example.com',        'INDIVIDUAL'),
    ('AAAAAAAACNKAAAAA', 'John Smith',              '1990-06-10', 'UNITED STATES', 'john.smith@example.com',      'INDIVIDUAL'),
    ('AAAAAAAADLKAAAAA', 'Maria Santos Rodriguez',  '1985-09-03', 'MEXICO',        'm.santos@example.com',        'INDIVIDUAL'),
    ('AAAAAAAAEKKAAAAA', 'Chen Wei',                '1972-01-28', 'CHINA',         'chen.wei@example.com',        'INDIVIDUAL');
