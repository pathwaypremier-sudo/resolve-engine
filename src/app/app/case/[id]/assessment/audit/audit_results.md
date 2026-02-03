# Questionnaire Audit Results

**Generated:** 2026-02-01
**Version:** 2026-01-31-01 (Question Set)
**Scope:** Dynamic Questionnaire Integrity

## Firing Matrix

### S1: Council + PROVIDED + Strong Extraction
**Context:**
- Dispute Type: `COUNCIL_PCN`
- Evidence: `PROVIDED`
- Facts: Issuer=Y, Dates=Y, Ref=Y, VRN=Y, PCN=Y, Amount=Y

| ID | Status | Reason | Auto-Selected | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| `dispute_type_guess` | **Skipped** | disputeType is defined | No | N/A |
| `issuer` | **Active** | Always | **Yes** | Extracted |
| `reference` | **Active** | Always | **Yes** | Extracted |
| `notice_date` | **Active** | Always | **Yes** | Extracted |
| `event_date` | **Active** | Always | **Yes** | Extracted |
| `summary` | **Active** | Always | No | - |
| `ref_check` | Skipped | Reference exists | No | - |
| `copies_kept` | Skipped | Evidence PROVIDED | No | - |
| `contact_status` | **Active** | Always | No | - |
| `contact_copy` | Skipped | Depend on contact_status | No | - |
| `response_received` | Skipped | Depend on contact_status | No | - |
| `response_date` | Skipped | Depend on response_received | No | - |
| `council_stage` | **Active** | Type is COUNCIL_PCN | No | - |
| `council_appealed` | **Active** | Type is COUNCIL_PCN | No | - |
| `private_notice_type` | Skipped | Type mismatch | No | - |
| `private_appealed` | Skipped | Type mismatch | No | - |
| `desired_outcome` | **Active** | Always | No | - |

### S2: Council + NONE_DECLARED + Manual
**Context:**
- Dispute Type: `COUNCIL_PCN`
- Evidence: `NONE_DECLARED`
- Facts: Ref=Y (Manual), others N

| ID | Status | Reason | Auto-Selected | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| `dispute_type_guess` | **Skipped** | disputeType is defined | No | N/A |
| `issuer` | **Active** | Always | No | - |
| `reference` | **Active** | Always | **Yes** | Manual |
| `notice_date` | **Active** | Always | No | - |
| `event_date` | **Active** | Always | No | - |
| `summary` | **Active** | Always | No | - |
| `ref_check` | **Active** | Always | No | - |
| `copies_kept` | **Active** | Always | No | - |
| `contact_status` | **Active** | Always | No | - |
| `contact_copy` | Skipped | Depend on contact_status | No | - |
| `council_stage` | **Active** | Type is COUNCIL_PCN | No | - |
| `council_appealed` | **Active** | Type is COUNCIL_PCN | No | - |
| `desired_outcome` | **Active** | Always | No | - |

### S3: Private + PROVIDED + Partial
**Context:**
- Dispute Type: `PRIVATE_PARKING`
- Evidence: `PROVIDED`
- Facts: VRN=Y, PCN=Y (Not mapped to Qs), Issuer=Y

| ID | Status | Reason | Auto-Selected | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| `dispute_type_guess` | **Skipped** | disputeType is defined | No | N/A |
| `issuer` | **Active** | Always | **Yes** | Extracted |
| `reference` | **Active** | Always | No | - |
| `notice_date` | **Active** | Always | No | - |
| `event_date` | **Active** | Always | No | - |
| `summary` | **Active** | Always | No | - |
| `ref_check` | **Active** | Always | No | - |
| `copies_kept` | **Active** | Always | No | - |
| `contact_status` | **Active** | Always | No | - |
| `council_stage` | Skipped | Type mismatch | No | - |
| `private_notice_type` | **Active** | Type is PRIVATE_PARKING | No | - |
| `private_appealed` | **Active** | Type is PRIVATE_PARKING | No | - |
| `desired_outcome` | **Active** | Always | No | - |

### S4: Not Sure + PROVIDED + Conflicting Hints
**Context:**
- Dispute Type: `NOT_SURE`
- Evidence: `PROVIDED`
- Facts: Issuer=Y (Simulated hint)

| ID | Status | Reason | Auto-Selected | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| `dispute_type_guess` | **Active** | Type is NOT_SURE | No | - |
| `issuer` | **Active** | Always | **Yes** | Extracted |
| `reference` | **Active** | Always | No | - |
| `notice_date` | **Active** | Always | No | - |
| `summary` | **Active** | Always | No | - |
| `ref_check` | **Active** | Always | No | - |
| `copies_kept` | Skipped | Evidence PROVIDED | No | - |
| `council_stage` | **Active** | Type unknown (Spine check) | No | - |
| `private_notice_type` | Skipped | Type unknown | No | - |
| `desired_outcome` | **Active** | Always | No | - |

### S5: Not Sure + NONE_DECLARED + Minimal
**Context:**
- Dispute Type: `NOT_SURE`
- Evidence: `NONE_DECLARED`
- Facts: None

| ID | Status | Reason | Auto-Selected | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| `dispute_type_guess` | **Active** | Type is NOT_SURE | No | - |
| `issuer` | **Active** | Always | No | - |
| `reference` | **Active** | Always | No | - |
| `notice_date` | **Active** | Always | No | - |
| `summary` | **Active** | Always | No | - |
| `council_stage` | **Active** | Type unknown (Spine check) | No | - |
| `private_notice_type` | Skipped | Type unknown | No | - |
| `desired_outcome` | **Active** | Always | No | - |

## Defect List / Findings

### 1. Missing Sync with Evidence Status
**Observation:**
Questions like `copies_kept` ("Have you kept copies of the notice...?") appear even when `evidenceStatus` is `PROVIDED`.
**Impact:**
User is asked if they kept copies immediately after uploading them.
**Correction:**
Conditionally hide `copies_kept` (or default to YES) if `evidenceStatus === "PROVIDED"`.

### 2. Redundant Reference Check
**Observation:**
`ref_check` ("Do you have the reference number exactly as shown?") appears even when `reference` is auto-filled from extraction.
**Impact:**
User is asked to verify a number that was just extracted.
**Correction:**
Hide `ref_check` if `reference` is present and high confidence (though confidence metric is not currently available in `Ctx`).

### 3. "Not Sure" State traps Procedure Questions
**Observation:**
In S4/S5 (Not Sure), neither `council_stage` nor `private_notice_type` appear.
**Impact:**
Users who are "Not Sure" about the type never get asked about the stage or method of service, which might be critical for determining the type (e.g. "Notice to Owner" implies Council).
**Correction:**
Consider moving some procedure questions to `CORE` or allowing them to trigger if `dispute_type_guess` provides a provisional answer (which it does via local state in `AssessmentQuestionnaire.tsx` but `questions.ts` only sees `ctx.disputeType` input).

### 4. Zero-Data State
**Observation:**
In S5, the user sees `dispute_type_guess` and `issuer`.
**Impact:**
This is correct behavior. No defects found in minimal pathway.

## Assessment → Deliver Integrity Notes

### 1. Hardened Gating
-   **Blocking**: Case cannot be exported if Dispute Type, Issuer, or Summary are missing.
-   **Warnings**: User warned if Reference or Dates are missing.
-   **Implementation**: `deriveDeliverableReadiness` enforces these checks.

### 2. Consistency Checks
-   **Evidence Mismatch**: Warning if `evidenceStatus` is PROVIDED but no documents exist.
-   **Type Safety**: `AppealBuilder` is masked if blocking checks fail.
