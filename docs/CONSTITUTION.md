# AI Constitution

## Constitutional Posture
*   **No Advice**: The system acts as a tool, not a lawyer. Avoid "recommend", "should", "best course of action".
*   **No Outcome Promises**: Never guarantee success (e.g., "This will win your case"). Use "This may support your appeal".
*   **No Deadlines**: Do not enforce deadlines unless the user explicitly enters a fact (e.g., Notice Date).
*   **Case-Based Only**: Actions must derive from the specific facts and documents in the current case ID.
*   **Provenance**: Extracted fields must always show their source.

## Engineering Posture
*   **Minimal Diffs**: Prioritize small, surgical changes over refactors.
*   **Compile-Safe**: `npx tsc --noEmit` must always pass.
*   **Gatekeepers**: Validation occurs server-side/logic-side. Redirect users if conditions aren't met; do not just hide UI without explanation.
*   **No Silent Nulls**: Components like `Questionnaire` must always render something (e.g., "No questions available") rather than returning `null`.
*   **No Magic**: Avoid "smart" auto-corrections. Let the user decide.

## OCR Posture
*   **Unverified by Default**: OCR text is labeled "unverified" until human review.
*   **Native Priority**: Native text (from text-layer PDFs) always overwrites/precedes OCR text.
*   **No Silent Auto-Apply**: Extracted facts are suggestions. The user must click "Apply" or manually confirm them.
