-- Seed data for screening demo (matches mock data in src/lib/screening/data.ts)

-- ── Customers ──────────────────────────────────────────────────────
insert into public.screening_customers (customer_id, full_name, dob, nationality, email, entity_type, created_at) values
  ('AAAAAAAAGOKAAAAA', 'Ahmad Al-Hassan',        '1978-03-15', 'LEBANON',       'ahmad.alhassan@example.com', 'INDIVIDUAL', '2026-03-27T08:00:00Z'),
  ('AAAAAAAABPKAAAAA', 'Viktor Petrov',           '1965-11-22', 'RUSSIA',        'v.petrov@example.com',       'INDIVIDUAL', '2026-03-27T08:00:00Z'),
  ('AAAAAAAACNKAAAAA', 'John Smith',              '1990-06-10', 'UNITED STATES', 'john.smith@example.com',     'INDIVIDUAL', '2026-03-27T08:00:00Z'),
  ('AAAAAAAADLKAAAAA', 'Maria Santos Rodriguez',  '1985-09-03', 'MEXICO',        'm.santos@example.com',       'INDIVIDUAL', '2026-03-27T08:00:00Z'),
  ('AAAAAAAAEKKAAAAA', 'Chen Wei',                '1972-01-28', 'CHINA',         'chen.wei@example.com',       'INDIVIDUAL', '2026-03-27T08:00:00Z');

-- ── Watchlist ──────────────────────────────────────────────────────
insert into public.screening_watchlist (entity_id, sr_no, listing_country, authority, list_name, entity_type, entity_name, entity_aliases, effective_date, expiry_date, entity_notes, citation_link, address, country, nationality_country, citizenship_country, dob, pob) values
  ('OFAC-12345', 1, 'US',   'OFAC', 'SDN List',                          'Individual', 'Ahmad Al-Hassan',            'Ahmad Hassan; Ahmed Al Hassan; Abu Ahmad',          '2023-01-15', null, 'Designated for providing financial facilitation services to designated entities in the Middle East region.', 'https://ofac.treasury.gov/recent-actions/20230115', 'Beirut, Lebanon',   'LB', 'LB', 'LB', '1976-05-20', 'Tripoli, Lebanon'),
  ('OFAC-67890', 2, 'US',   'OFAC', 'SDN List',                          'Individual', 'Viktor Sergeyevich Petrov',  'Viktor Petrov; V. Petrov; Виктор Петров',            '2022-06-10', null, 'Designated pursuant to E.O. 14024 for operating in the financial services sector of the Russian Federation economy. Known associate of sanctioned oligarch network.', 'https://ofac.treasury.gov/recent-actions/20220610', 'Moscow, Russia',    'RU', 'RU', 'RU', '1965-11-22', 'Saint Petersburg, Russia'),
  ('UN-54321',   3, 'INTL', 'UN',   'UN Security Council Consolidated List', 'Individual', 'John Michael Smith',    'J. Smith',                                           '2019-08-22', null, 'Listed for involvement in proliferation financing activities.',                                              'https://www.un.org/securitycouncil/sanctions/list',  'London, United Kingdom', 'GB', 'GB', 'GB', '1970-02-14', 'London, UK'),
  ('EU-11111',   4, 'EU',   'EU',   'EU Sanctions List',                 'Individual', 'Maria Santos',               'M. Santos; Maria S. Rodriguez',                      '2024-03-01', null, 'Listed for involvement in drug trafficking networks operating across Central America.',                     'https://ec.europa.eu/sanctions',                     'Mexico City, Mexico', 'MX', 'MX', 'MX', '1983-12-18', 'Guadalajara, Mexico'),
  ('OFAC-99999', 5, 'US',   'OFAC', 'SDN List',                          'Individual', 'Chen Wei Lin',               'Chen Wei; C.W. Lin',                                 '2024-09-15', null, 'Designated for facilitating technology transfer to entities supporting advanced weapons programs.',          'https://ofac.treasury.gov/recent-actions/20240915', 'Shenzhen, China',   'CN', 'CN', 'CN', '1972-01-28', 'Shanghai, China');

-- ── Layer 1 Flags ──────────────────────────────────────────────────
insert into public.screening_layer1_flags (flag_id, customer_id, entity_id, composite_score, name_score, dob_score, nationality_score, created_at) values
  ('FLAG-001', 'AAAAAAAAGOKAAAAA', 'OFAC-12345', 85,  0.95, 15, 20, '2026-03-27T08:05:00Z'),
  ('FLAG-002', 'AAAAAAAABPKAAAAA', 'OFAC-67890', 120, 0.88, 30, 20, '2026-03-27T08:05:00Z'),
  ('FLAG-003', 'AAAAAAAACNKAAAAA', 'UN-54321',   50,  0.82, 0,  -10, '2026-03-27T08:05:00Z'),
  ('FLAG-004', 'AAAAAAAADLKAAAAA', 'EU-11111',   75,  0.85, 15, 20, '2026-03-27T08:05:00Z'),
  ('FLAG-005', 'AAAAAAAAEKKAAAAA', 'OFAC-99999', 120, 0.92, 30, 20, '2026-03-27T08:05:00Z');

-- ── Layer 2 Results ────────────────────────────────────────────────
insert into public.screening_layer2_results (result_id, flag_id, customer_id, entity_id, ai_confidence, routing, reasoning, matching_signals, conflicting_signals, sources, processed_at) values
  ('L2-001', 'FLAG-001', 'AAAAAAAAGOKAAAAA', 'OFAC-12345', 58, 'HUMAN_REVIEW',
   'Name and nationality match exactly. DOB differs by 2 years — could indicate data entry error or deliberate obfuscation. Online search found no public reporting linking this individual to financial crimes. OFAC record cites 2023 designation for financial facilitation. Alias ''Ahmad Hassan'' matches customer''s known alias per bank records. Insufficient certainty to auto-restrict or auto-clear.',
   '["name_exact", "nationality_match", "alias_partial_match"]'::jsonb,
   '["dob_2yr_discrepancy", "no_public_corroboration"]'::jsonb,
   '[{"label": "OFAC SDN Designation Notice — Jan 2023", "url": "https://ofac.treasury.gov/recent-actions/20230115"}, {"label": "Reuters — OFAC designates Lebanese financial facilitator", "url": "https://reuters.com/world/middle-east/ofac-sanctions-2023-01-15"}]'::jsonb,
   '2026-03-27T08:10:00Z'),
  ('L2-002', 'FLAG-002', 'AAAAAAAABPKAAAAA', 'OFAC-67890', 95, 'AUTO_RESTRICT',
   'Very high confidence match. Full name ''Viktor Petrov'' closely matches sanctioned ''Viktor Sergeyevich Petrov''. Exact DOB match (1965-11-22). Nationality matches (Russian Federation). Multiple independent sources corroborate: Reuters and Financial Times both report on this individual''s designation under E.O. 14024. Customer''s passport number format consistent with Russian Federation issuance. Auto-restricting based on overwhelming evidence.',
   '["name_high_similarity", "dob_exact", "nationality_match", "multiple_source_corroboration"]'::jsonb,
   '[]'::jsonb,
   '[{"label": "OFAC SDN Designation — June 2022", "url": "https://ofac.treasury.gov/recent-actions/20220610"}, {"label": "Reuters — Russia sanctions expansion", "url": "https://reuters.com/business/finance/russia-sanctions-2022"}, {"label": "Financial Times — Oligarch network exposed", "url": "https://ft.com/content/russia-oligarch-network-2022"}]'::jsonb,
   '2026-03-27T08:10:00Z'),
  ('L2-003', 'FLAG-003', 'AAAAAAAACNKAAAAA', 'UN-54321', 6, 'AUTO_CLEAR',
   'Very low confidence match. While the surname ''Smith'' matches, this is an extremely common name. Customer is a 35-year-old US citizen; watchlist entry is a 56-year-old UK citizen. DOB differs by 20 years. Nationality does not match. No aliases overlap. Online search reveals no connection between customer and any sanctioned activity. This is a clear name collision false positive.',
   '["surname_match_only"]'::jsonb,
   '["dob_20yr_discrepancy", "nationality_mismatch", "no_alias_overlap", "age_mismatch", "no_public_connection"]'::jsonb,
   '[{"label": "UN Security Council Consolidated List", "url": "https://www.un.org/securitycouncil/sanctions/list"}]'::jsonb,
   '2026-03-27T08:10:00Z'),
  ('L2-004', 'FLAG-004', 'AAAAAAAADLKAAAAA', 'EU-11111', 42, 'HUMAN_REVIEW',
   'Moderate confidence. Customer ''Maria Santos Rodriguez'' partially matches EU-listed ''Maria Santos''. Nationality matches (Mexican). DOB differs by approximately 2 years. The alias ''Maria S. Rodriguez'' on the watchlist is close to the customer''s full name. However, ''Maria Santos'' is a relatively common Hispanic name. Online search found limited information linking either individual to the specific drug trafficking allegations. Further investigation warranted.',
   '["name_partial_match", "nationality_match", "alias_similarity"]'::jsonb,
   '["dob_2yr_discrepancy", "common_name", "limited_corroboration"]'::jsonb,
   '[{"label": "EU Sanctions List — Council Regulation", "url": "https://ec.europa.eu/sanctions"}, {"label": "DEA Report — Central American drug networks", "url": "https://dea.gov/reports/central-america-2024"}]'::jsonb,
   '2026-03-27T08:10:00Z'),
  ('L2-005', 'FLAG-005', 'AAAAAAAAEKKAAAAA', 'OFAC-99999', 72, 'HUMAN_REVIEW',
   'High-moderate confidence. Customer ''Chen Wei'' matches sanctioned ''Chen Wei Lin'' — the customer name appears to be a substring. Exact DOB match. Nationality matches (Chinese). The alias ''Chen Wei'' on the sanctions list exactly matches the customer''s full name. However, ''Chen Wei'' is an extremely common Chinese name. OFAC designation is for technology transfer activities. Customer''s occupation and business dealings should be verified. One news article from South China Morning Post references the OFAC designation.',
   '["name_substring_match", "dob_exact", "nationality_match", "alias_exact_match"]'::jsonb,
   '["extremely_common_name", "occupation_unverified"]'::jsonb,
   '[{"label": "OFAC SDN Designation — Sep 2024", "url": "https://ofac.treasury.gov/recent-actions/20240915"}, {"label": "SCMP — US sanctions Chinese tech facilitators", "url": "https://scmp.com/tech/us-sanctions-china-2024"}]'::jsonb,
   '2026-03-27T08:10:00Z');

-- ── Queue (human review cases only) ────────────────────────────────
insert into public.screening_queue (queue_id, result_id, customer_id, entity_id, ai_confidence, assigned_to, queued_at, status) values
  ('Q-001', 'L2-001', 'AAAAAAAAGOKAAAAA', 'OFAC-12345', 58, null, '2026-03-27T08:11:00Z', 'PENDING'),
  ('Q-002', 'L2-004', 'AAAAAAAADLKAAAAA', 'EU-11111',   42, null, '2026-03-27T08:11:00Z', 'PENDING'),
  ('Q-003', 'L2-005', 'AAAAAAAAEKKAAAAA', 'OFAC-99999', 72, null, '2026-03-27T08:11:00Z', 'PENDING');
