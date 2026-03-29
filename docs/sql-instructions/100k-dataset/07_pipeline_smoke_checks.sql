-- 07: Optional SQL checks before API runs
USE DATABASE ENFUSE_SCREENING;

-- Layer 1 flags volume (after running /api/screening/run)
SELECT COUNT(*) AS layer1_flags
FROM ENFUSE_SCREENING.SCREENING.LAYER1_FLAGS;

-- Layer 2 outcomes (after running workers or /api/screening/layer2)
SELECT routing, COUNT(*) AS cnt
FROM ENFUSE_SCREENING.SCREENING.LAYER2_RESULTS
GROUP BY routing
ORDER BY routing;

-- Queue depth for analyst review
SELECT COUNT(*) AS pending_review
FROM ENFUSE_SCREENING.QUEUE.PENDING_REVIEW
WHERE status != 'DECIDED';
