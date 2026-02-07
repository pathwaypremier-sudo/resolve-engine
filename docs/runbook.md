# Operational Runbook

## Common Issues & Diagnostics

### 1. Assessment Page Stuck Loading
- **Symptoms**: User sees "Loading assessment result..." indefinitely.
- **Diagnosis**: 
  - Check browser console for network errors.
  - Check server logs for `[ERROR] Engine failed`.
  - Is `loadAssessmentInput` failing? Likely bad local storage data or missing case ID.
- **Recovery**: Ask user to hard refresh or clear local storage for that case.

### 2. "Missing Information" Alert Won't Clear
- **Symptoms**: User supplied info but alert persists.
- **Diagnosis**:
  - `loadAssessmentInput` might be caching old data or `getCaseFacts` precedence logic is ignoring the new input.
  - Check if source is marked "NOT_SURE" in questionnaire.
- **Recovery**: User must provide specific answer in Questionnaire (not "I'm not sure").

### 3. NotebookLM Pack Download Fails
- **Symptoms**: Button visible but clicks error out.
- **Diagnosis**: 
  - Feature flag might be enabled in UI but backend generation code is missing or erroring.
  - Check `NEXT_PUBLIC_NOTEBOOKLM_ENABLED` is intended to be true.

## Monitoring

- **Health Endpoint**: `/api/health`
- **Key Log Patterns**:
  - `[INFO] Assessment Input Loaded`: Normal success.
  - `[WARN]`: Non-blocking issues (e.g., missing optional doc metadata).
  - `[ERROR]`: Service degradation. Note the `context` object for Case ID.
