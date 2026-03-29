# 100K Screening Dataset SQL Pack

This folder contains the full SQL sequence to rebuild the demo dataset at **100,000 customers** using the same method as the 20K runbook.

## Target Composition

- 99,800 normal customers (from Snowflake sample data)
- 100 exact sanctions matches
- 100 near sanctions matches
- Total: 100,000

## Run Order

Execute files in this exact order:

1. `00_context.sql`
2. `01_load_watchlist.sql`
3. `02_build_sanctions_subset.sql`
4. `03_seed_base_customers_99800.sql`
5. `04_inject_exact_100.sql`
6. `05_inject_near_100.sql`
7. `06_verify_100k_mix.sql`
8. `07_pipeline_smoke_checks.sql`

## Notes

- These scripts assume:
  - warehouse: `ENFUSE_WH`
  - database: `ENFUSE_SCREENING`
  - target tables already exist
- `SANCTIONS_SUBSET` is created as a permanent table to avoid session-scope surprises.
- Near-match injection intentionally mutates names while keeping supporting attributes for realistic Layer 1 hits.
