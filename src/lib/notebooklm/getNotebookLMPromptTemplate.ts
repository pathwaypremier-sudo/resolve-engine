
import { buildNotebookLMPromptV1 } from "./promptBuilder";
import type { AssessmentInput } from "@/lib/assessment/AssessmentInput";
import type { AssessmentResult, StrengthSignal } from "@/lib/assessment/AssessmentResult";
import type { NoticeType, UserIntent, ProceedAdvice } from "@/lib/notebooklm-contract";

/**
 * Generates the contract-compliant prompt for NotebookLM interactions.
 * Maps existing Assessment state (Input/Result) to the strict prompt requirement.
 */
export function getNotebookLMPromptTemplate(
   input?: AssessmentInput | null,
   result?: AssessmentResult | null
): string {
   // 1. Map Notice Type
   let noticeType: NoticeType = "COUNCIL_PCN";
   // Basic mapping, assuming input strings match contract
   if (input?.disputeType === "PRIVATE_PARKING") noticeType = "PRIVATE_PARKING";
   // 'CAMERA_MATTER' mapping if needed, or default to COUNCIL_PCN for now

   // 2. Map Intent (Assessment Page is fundamentally about CHALLENGE)
   const userIntent: UserIntent = "CHALLENGE";

   // 3. Map Strategy
   // Default values if result not yet ready
   const strategy = result?.chosen_strategy || "Standard Appeal";
   const path = result?.deliverable_type || "Generic_Path";
   const strength: StrengthSignal = result?.strength_signal || "MIXED";

   // 4. Map Verdict to Advice
   let advice: ProceedAdvice = "PROCEED_WITH_CAUTION";
   if (result?.verdict === "APPEAL_POSSIBLE") advice = "PROCEED";
   if (result?.verdict === "PAY_DISCOUNT") advice = "DO_NOT_PROCEED";
   if (result?.verdict === "UNSUPPORTED") advice = "DO_NOT_PROCEED";

   const approvedSources = ["case-summary.md", "evidence-index.md", "evidence-merged.txt"];
   // If we had specific doc names, we could add them here: input?.evidence.docs.map(d => d.filename)

   return buildNotebookLMPromptV1({
      contract_version: "v1",
      notice_type: noticeType,
      user_intent: userIntent,
      strategy_summary: {
         selected_path: path,
         selected_strategy: strategy,
         strength_signal: strength as any, // Cast if type mismatch (Result vs Contract types might differ slightly)
         proceed_advice: advice,
      },
      approved_sources_labels: approvedSources,
   });
}
