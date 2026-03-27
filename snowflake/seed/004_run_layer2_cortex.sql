-- ============================================================
-- Seed: Run Layer 2 AI Processing with Snowflake Cortex
-- ============================================================
-- Uses SNOWFLAKE.CORTEX.COMPLETE() to analyze each flagged pair.
-- Requires Cortex LLM Functions to be enabled in your account.
--
-- NOTE: Run this row-by-row or in a Snowflake Task for batching.
-- The example below processes all flags in a single INSERT.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;

-- Step 1: Process each flag with Cortex and insert results
INSERT INTO SCREENING.LAYER2_RESULTS (result_id, flag_id, customer_id, entity_id, ai_confidence, routing, reasoning, matching_signals, conflicting_signals, sources)
SELECT
    'L2-' || f.flag_id                          AS result_id,
    f.flag_id,
    f.customer_id,
    f.entity_id,
    -- Parse AI confidence from Cortex response
    TRY_CAST(
        PARSE_JSON(
            SNOWFLAKE.CORTEX.COMPLETE(
                'claude-3-5-sonnet',
                CONCAT(
                    'You are a compliance screening analyst. Analyze this sanctions match and return ONLY a JSON object.\n\n',
                    'Customer: ', c.full_name, ', DOB: ', COALESCE(TO_CHAR(c.dob), 'unknown'),
                    ', Nationality: ', COALESCE(c.nationality, 'unknown'), '\n',
                    'Watchlist: ', w.entity_name, ' (', w.authority, ' - ', w.list_name, ')',
                    ', DOB: ', COALESCE(TO_CHAR(w.dob), 'unknown'),
                    ', Nationality: ', COALESCE(w.nationality_country, 'unknown'),
                    ', Aliases: ', COALESCE(w.entity_aliases, 'none'),
                    ', Reason: ', COALESCE(w.entity_notes, 'none'), '\n',
                    'Layer 1 Score: ', f.composite_score, ' (name: ', ROUND(f.name_score, 2),
                    ', dob: ', f.dob_score, ', nat: ', f.nationality_score, ')\n\n',
                    'Return JSON: {"ai_confidence": <0-100>, "reasoning": "<text>", ',
                    '"matching_signals": ["<s1>"], "conflicting_signals": ["<s1>"], ',
                    '"sources": [{"label": "<text>", "url": "<url>"}]}'
                )
            )
        ):ai_confidence AS FLOAT
    )                                           AS ai_confidence,
    CASE
        WHEN ai_confidence >= 90 THEN 'AUTO_RESTRICT'
        WHEN ai_confidence <= 10 THEN 'AUTO_CLEAR'
        ELSE 'HUMAN_REVIEW'
    END                                         AS routing,
    TRY_CAST(
        PARSE_JSON(
            SNOWFLAKE.CORTEX.COMPLETE(
                'claude-3-5-sonnet',
                -- (same prompt as above — in practice, cache the response)
                ''
            )
        ):reasoning AS VARCHAR
    )                                           AS reasoning,
    NULL                                        AS matching_signals,
    NULL                                        AS conflicting_signals,
    NULL                                        AS sources
FROM SCREENING.LAYER1_FLAGS f
JOIN CUSTOMERS.ONBOARDING c ON c.customer_id = f.customer_id
JOIN WATCHLIST.SANCTIONS_PEP w ON w.entity_id = f.entity_id;

-- NOTE: The above is simplified. In practice, call Cortex once per row
-- using a stored procedure or Snowflake Task to:
-- 1. Build the full prompt
-- 2. Parse the complete JSON response
-- 3. Insert all fields including matching_signals, sources, etc.
-- See the stored procedure below for the production pattern.

-- ============================================================
-- Production Stored Procedure (recommended approach)
-- ============================================================

CREATE OR REPLACE PROCEDURE SCREENING.PROCESS_LAYER2_BATCH()
RETURNS VARCHAR
LANGUAGE JAVASCRIPT
EXECUTE AS CALLER
AS
$$
    // Get all unprocessed flags
    var flagsStmt = snowflake.createStatement({
        sqlText: `
            SELECT f.flag_id, f.customer_id, f.entity_id, f.composite_score,
                   f.name_score, f.dob_score, f.nationality_score,
                   c.full_name AS cust_name, c.dob AS cust_dob, c.nationality AS cust_nat, c.email AS cust_email,
                   w.entity_name, w.entity_aliases, w.dob AS watch_dob,
                   w.nationality_country, w.citizenship_country, w.authority,
                   w.list_name, w.entity_notes, w.citation_link, w.pob, w.address
            FROM SCREENING.LAYER1_FLAGS f
            JOIN CUSTOMERS.ONBOARDING c ON c.customer_id = f.customer_id
            JOIN WATCHLIST.SANCTIONS_PEP w ON w.entity_id = f.entity_id
            WHERE f.flag_id NOT IN (SELECT flag_id FROM SCREENING.LAYER2_RESULTS)
        `
    });
    var flags = flagsStmt.execute();
    var processed = 0;

    while (flags.next()) {
        var prompt = [
            'You are a compliance screening analyst. Analyze this sanctions match.',
            '',
            '## Customer',
            '- Name: ' + flags.getColumnValue('CUST_NAME'),
            '- DOB: ' + (flags.getColumnValue('CUST_DOB') || 'unknown'),
            '- Nationality: ' + (flags.getColumnValue('CUST_NAT') || 'unknown'),
            '',
            '## Watchlist Match',
            '- Entity: ' + flags.getColumnValue('ENTITY_NAME') + ' (' + flags.getColumnValue('AUTHORITY') + ')',
            '- DOB: ' + (flags.getColumnValue('WATCH_DOB') || 'unknown'),
            '- Nationality: ' + (flags.getColumnValue('NATIONALITY_COUNTRY') || 'unknown'),
            '- Aliases: ' + (flags.getColumnValue('ENTITY_ALIASES') || 'none'),
            '- Designation: ' + (flags.getColumnValue('ENTITY_NOTES') || 'none'),
            '',
            '## Layer 1 Score: ' + flags.getColumnValue('COMPOSITE_SCORE'),
            '- Name similarity: ' + Number(flags.getColumnValue('NAME_SCORE')).toFixed(2),
            '- DOB score: ' + flags.getColumnValue('DOB_SCORE'),
            '- Nationality score: ' + flags.getColumnValue('NATIONALITY_SCORE'),
            '',
            'Return ONLY valid JSON: {"ai_confidence": <0-100>, "reasoning": "<detailed text>",',
            '"matching_signals": ["<signal>"], "conflicting_signals": ["<signal>"],',
            '"sources": [{"label": "<text>", "url": "<url>"}]}'
        ].join('\n');

        // Escape for SQL
        var escapedPrompt = prompt.replace(/'/g, "''");

        // Call Cortex
        var cortexStmt = snowflake.createStatement({
            sqlText: "SELECT SNOWFLAKE.CORTEX.COMPLETE('claude-3-5-sonnet', '" + escapedPrompt + "') AS response"
        });
        var cortexResult = cortexStmt.execute();
        cortexResult.next();
        var rawResponse = cortexResult.getColumnValue('RESPONSE');

        // Parse JSON from response
        var analysis;
        try {
            // Handle Cortex response format
            var parsed = JSON.parse(rawResponse);
            var text = parsed.choices ? parsed.choices[0].messages || parsed.choices[0].message.content : rawResponse;
            var jsonMatch = text.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { ai_confidence: 50, reasoning: text, matching_signals: [], conflicting_signals: [], sources: [] };
        } catch (e) {
            analysis = { ai_confidence: 50, reasoning: rawResponse, matching_signals: [], conflicting_signals: [], sources: [] };
        }

        var confidence = analysis.ai_confidence || 50;
        var routing = confidence >= 90 ? 'AUTO_RESTRICT' : confidence <= 10 ? 'AUTO_CLEAR' : 'HUMAN_REVIEW';

        // Insert result
        var insertStmt = snowflake.createStatement({
            sqlText: `
                INSERT INTO SCREENING.LAYER2_RESULTS
                    (result_id, flag_id, customer_id, entity_id, ai_confidence, routing, reasoning, matching_signals, conflicting_signals, sources)
                VALUES (?, ?, ?, ?, ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), PARSE_JSON(?))
            `,
            binds: [
                'L2-' + flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('CUSTOMER_ID'),
                flags.getColumnValue('ENTITY_ID'),
                confidence,
                routing,
                analysis.reasoning || '',
                JSON.stringify(analysis.matching_signals || []),
                JSON.stringify(analysis.conflicting_signals || []),
                JSON.stringify(analysis.sources || [])
            ]
        });
        insertStmt.execute();

        // Route: add to queue or decisions
        if (routing === 'HUMAN_REVIEW') {
            var queueStmt = snowflake.createStatement({
                sqlText: `
                    INSERT INTO QUEUE.PENDING_REVIEW (queue_id, result_id, customer_id, entity_id, ai_confidence, status)
                    VALUES (?, ?, ?, ?, ?, 'PENDING')
                `,
                binds: [
                    'Q-' + flags.getColumnValue('FLAG_ID'),
                    'L2-' + flags.getColumnValue('FLAG_ID'),
                    flags.getColumnValue('CUSTOMER_ID'),
                    flags.getColumnValue('ENTITY_ID'),
                    confidence
                ]
            });
            queueStmt.execute();
        } else if (routing === 'AUTO_RESTRICT') {
            snowflake.createStatement({
                sqlText: `INSERT INTO DECISIONS.RESTRICTIONS (decision_id, customer_id, result_id, trigger_type) VALUES (?, ?, ?, 'AUTO')`,
                binds: ['DEC-AUTO-' + flags.getColumnValue('FLAG_ID'), flags.getColumnValue('CUSTOMER_ID'), 'L2-' + flags.getColumnValue('FLAG_ID')]
            }).execute();
        }

        // Audit log
        snowflake.createStatement({
            sqlText: `INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload) VALUES (?, ?, 2, ?, PARSE_JSON(?))`,
            binds: [
                'AUDIT-L2-' + flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('CUSTOMER_ID'),
                'LAYER2_' + routing,
                JSON.stringify({ result_id: 'L2-' + flags.getColumnValue('FLAG_ID'), ai_confidence: confidence, routing: routing })
            ]
        }).execute();

        processed++;
    }

    return 'Processed ' + processed + ' cases';
$$;

-- To run: CALL SCREENING.PROCESS_LAYER2_BATCH();
