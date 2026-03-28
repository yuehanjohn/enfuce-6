-- ============================================================
-- Seed: Run Layer 2 AI Processing with Snowflake Cortex
-- ============================================================
-- Creates the Layer 2 batch procedure and runs it.
-- ============================================================

USE DATABASE ENFUSE_SCREENING;

CREATE OR REPLACE PROCEDURE SCREENING.PROCESS_LAYER2_BATCH()
RETURNS VARCHAR
LANGUAGE JAVASCRIPT
EXECUTE AS CALLER
AS
$$
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
            '- Nationality: ' + (flags.getColumnValue('NATIONALITY_COUNTRY') || flags.getColumnValue('CITIZENSHIP_COUNTRY') || 'unknown'),
            '- Aliases: ' + (flags.getColumnValue('ENTITY_ALIASES') || 'none'),
            '- Designation: ' + (flags.getColumnValue('ENTITY_NOTES') || 'none'),
            '',
            '## Layer 1 Score: ' + flags.getColumnValue('COMPOSITE_SCORE'),
            '- Name similarity: ' + Number(flags.getColumnValue('NAME_SCORE')).toFixed(2),
            '- DOB score: ' + flags.getColumnValue('DOB_SCORE'),
            '- Nationality score: ' + flags.getColumnValue('NATIONALITY_SCORE'),
            '',
            'Return ONLY valid JSON in this exact shape:',
            '{"ai_confidence": 0, "reasoning": "", "matching_signals": [], "conflicting_signals": [], "sources": []}',
            '"ai_confidence" must be a NUMBER from 0 to 100, not text.'
        ].join('\n');

        var escapedPrompt = prompt.replace(/'/g, "''");

        var cortexStmt = snowflake.createStatement({
            sqlText: "SELECT SNOWFLAKE.CORTEX.COMPLETE('claude-3-5-sonnet', '" + escapedPrompt + "') AS response"
        });

        var cortexResult = cortexStmt.execute();
        cortexResult.next();
        var rawResponse = cortexResult.getColumnValue('RESPONSE');

        var analysis;
        try {
            var parsed = JSON.parse(rawResponse);
            var text;

            if (parsed.choices && parsed.choices.length > 0) {
                text = parsed.choices[0].message && parsed.choices[0].message.content
                    ? parsed.choices[0].message.content
                    : rawResponse;
            } else {
                text = rawResponse;
            }

            var jsonMatch = text.match(/\{[\s\S]*\}/);
            analysis = jsonMatch
                ? JSON.parse(jsonMatch[0])
                : { ai_confidence: 50, reasoning: text, matching_signals: [], conflicting_signals: [], sources: [] };
        } catch (e) {
            analysis = { ai_confidence: 50, reasoning: rawResponse, matching_signals: [], conflicting_signals: [], sources: [] };
        }

        var rawConfidence = analysis.ai_confidence;
        var confidence = 50;

        if (typeof rawConfidence === 'number') {
            confidence = rawConfidence;
        } else if (typeof rawConfidence === 'string') {
            var upper = rawConfidence.trim().toUpperCase();

            if (!isNaN(Number(rawConfidence))) {
                confidence = Number(rawConfidence);
            } else if (upper === 'HIGH') {
                confidence = 90;
            } else if (upper === 'MEDIUM') {
                confidence = 50;
            } else if (upper === 'LOW') {
                confidence = 10;
            }
        }

        if (confidence < 0) confidence = 0;
        if (confidence > 100) confidence = 100;

        analysis.reasoning = (analysis.reasoning || '').toString();

        var routing = confidence >= 90 ? 'AUTO_RESTRICT' : confidence <= 10 ? 'AUTO_CLEAR' : 'HUMAN_REVIEW';

        snowflake.createStatement({
            sqlText: `
                INSERT INTO SCREENING.LAYER2_RESULTS
                (result_id, flag_id, customer_id, entity_id, ai_confidence, routing, reasoning, matching_signals, conflicting_signals, sources)
                SELECT ?, ?, ?, ?, ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), PARSE_JSON(?)
            `,
            binds: [
                'L2-' + flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('CUSTOMER_ID'),
                flags.getColumnValue('ENTITY_ID'),
                confidence,
                routing,
                analysis.reasoning,
                JSON.stringify(analysis.matching_signals || []),
                JSON.stringify(analysis.conflicting_signals || []),
                JSON.stringify(analysis.sources || [])
            ]
        }).execute();

        if (routing === 'HUMAN_REVIEW') {
            snowflake.createStatement({
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
            }).execute();
        } else if (routing === 'AUTO_RESTRICT') {
            snowflake.createStatement({
                sqlText: `
                    INSERT INTO DECISIONS.RESTRICTIONS (decision_id, customer_id, result_id, trigger_type)
                    VALUES (?, ?, ?, 'AUTO')
                `,
                binds: [
                    'DEC-AUTO-' + flags.getColumnValue('FLAG_ID'),
                    flags.getColumnValue('CUSTOMER_ID'),
                    'L2-' + flags.getColumnValue('FLAG_ID')
                ]
            }).execute();
        } else if (routing === 'AUTO_CLEAR') {
            snowflake.createStatement({
                sqlText: `
                    INSERT INTO DECISIONS.CLEARANCES (decision_id, customer_id, result_id, trigger_type)
                    VALUES (?, ?, ?, 'AUTO')
                `,
                binds: [
                    'DEC-CLEAR-' + flags.getColumnValue('FLAG_ID'),
                    flags.getColumnValue('CUSTOMER_ID'),
                    'L2-' + flags.getColumnValue('FLAG_ID')
                ]
            }).execute();
        }

        snowflake.createStatement({
            sqlText: `
                INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload)
                SELECT ?, ?, 2, ?, PARSE_JSON(?)
            `,
            binds: [
                'AUDIT-L2-' + flags.getColumnValue('FLAG_ID'),
                flags.getColumnValue('CUSTOMER_ID'),
                'LAYER2_' + routing,
                JSON.stringify({
                    result_id: 'L2-' + flags.getColumnValue('FLAG_ID'),
                    ai_confidence: confidence,
                    routing: routing
                })
            ]
        }).execute();

        processed++;
    }

    return 'Processed ' + processed + ' cases';
$$;

TRUNCATE TABLE ENFUSE_SCREENING.SCREENING.LAYER2_RESULTS;
TRUNCATE TABLE ENFUSE_SCREENING.QUEUE.PENDING_REVIEW;
TRUNCATE TABLE ENFUSE_SCREENING.DECISIONS.RESTRICTIONS;
TRUNCATE TABLE ENFUSE_SCREENING.DECISIONS.CLEARANCES;
TRUNCATE TABLE ENFUSE_SCREENING.AUDIT.LOG;

CALL SCREENING.PROCESS_LAYER2_BATCH();

