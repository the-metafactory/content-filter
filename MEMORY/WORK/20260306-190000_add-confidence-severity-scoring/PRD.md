---
task: Add confidence severity scoring model to detections
slug: 20260306-190000_add-confidence-severity-scoring
effort: standard
phase: complete
progress: 12/12
mode: interactive
started: 2026-03-06T19:00:00+01:00
updated: 2026-03-06T19:05:00+01:00
---

## Context

GitHub Issue #4 requested a confidence/severity scoring model for pattern detections. After investigating the codebase, I discovered this feature was already fully implemented with:

1. **Types defined** (types.ts:97-120): `ScoredDetection`, `SeverityTier`, optional fields in `FilterResult`
2. **Scoring logic** (scoring.ts): `scoreDetections()` and `overallScore()` functions
3. **Pipeline integration** (content-filter.ts:107-108, 147-148): Scoring called and results attached to `FilterResult`
4. **Comprehensive tests** (scoring.test.ts): 26 tests covering all scenarios, all passing

The implementation matches the issue's requested interface exactly and provides:
- Base confidence by pattern severity + category
- Proximity boosting (0.15 per co-located pattern)
- Four severity tiers (CRITICAL, HIGH, MEDIUM, LOW)
- Backward compatibility (optional fields in `FilterResult`)
- Full test coverage with real pattern integration tests

This is a documentation/verification task rather than an implementation task.

### Risks

None identified. Implementation is complete, tested, and working.

## Criteria

- [x] ISC-1: ScoredDetection interface includes pattern_id field
- [x] ISC-2: ScoredDetection interface includes confidence field 0.0-1.0
- [x] ISC-3: ScoredDetection interface includes severity tier field
- [x] ISC-4: Block injection patterns map to CRITICAL severity
- [x] ISC-5: Block exfiltration patterns map to CRITICAL severity
- [x] ISC-6: Block tool_invocation patterns map to HIGH severity
- [x] ISC-7: Block pii patterns map to HIGH severity
- [x] ISC-8: Review patterns map to MEDIUM severity
- [x] ISC-9: Placeholder-skipped patterns map to LOW severity
- [x] ISC-10: Multiple patterns on same line boost confidence by 0.15 each
- [x] ISC-11: FilterResult includes optional scored_detections array
- [x] ISC-12: FilterResult includes optional overall_confidence and overall_severity fields

## Decisions

None required. Implementation already complete and follows the issue specification exactly.

## Verification

### ISC-1: ScoredDetection interface includes pattern_id field
**Evidence**: types.ts:102-106 defines `ScoredDetection` with `pattern_id: string`

### ISC-2: ScoredDetection interface includes confidence field 0.0-1.0
**Evidence**: types.ts:104 defines `confidence: number` with comment "0.0 - 1.0"

### ISC-3: ScoredDetection interface includes severity tier field
**Evidence**: types.ts:105 defines `severity: SeverityTier` (CRITICAL|HIGH|MEDIUM|LOW)

### ISC-4: Block injection patterns map to CRITICAL severity
**Evidence**: scoring.ts:24-30 returns `{ confidence: 0.7, severity: "CRITICAL" }` for block+injection

### ISC-5: Block exfiltration patterns map to CRITICAL severity
**Evidence**: scoring.ts:27 includes exfiltration in CRITICAL mapping

### ISC-6: Block tool_invocation patterns map to HIGH severity
**Evidence**: scoring.ts:31 returns `{ confidence: 0.6, severity: "HIGH" }` for non-injection/exfil block patterns

### ISC-7: Block pii patterns map to HIGH severity
**Evidence**: scoring.ts:31 returns HIGH for block+pii (confirmed by test at scoring.test.ts:76-92)

### ISC-8: Review patterns map to MEDIUM severity
**Evidence**: scoring.ts:35 returns `{ confidence: 0.4, severity: "MEDIUM" }` for review severity

### ISC-9: Placeholder-skipped patterns map to LOW severity
**Evidence**: scoring.ts:20-22 returns `{ confidence: 0.2, severity: "LOW" }` when `placeholder_skipped` is true

### ISC-10: Multiple patterns on same line boost confidence by 0.15 each
**Evidence**: scoring.ts:61-62 implements `proximityBoost(colocatedCount) = colocatedCount * 0.15`

### ISC-11: FilterResult includes optional scored_detections array
**Evidence**: types.ts:117 defines `scored_detections?: ScoredDetection[]` in FilterResult

### ISC-12: FilterResult includes optional overall_confidence and overall_severity fields
**Evidence**: types.ts:118-119 defines `overall_confidence?: number` and `overall_severity?: SeverityTier`

### Test Coverage Verification
**Evidence**: All 26 tests in scoring.test.ts pass, plus 476 other tests for total of 502 passing tests across the entire codebase.
