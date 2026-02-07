/**
 * Brain Prompt Pack Generator
 * Formats case state into a structured prompt for LLMs (NotebookLM).
 * HARDENED for PR11: Grace periods, Source Laws, Managed Tier.
 */

import { CaseState } from "@/lib/coverage/caseStateAdapter";
import { CoverageResult } from "@/lib/coverage/coverageEngine";

function getLogicBlock(state: CaseState): string {
    const blocks: string[] = [];

    // GRACE PERIOD LOGIC
    if (state.disputeType === "COUNCIL_PCN" && state.contraventionType === "PARKING") {
        blocks.push(`
**GRACE PERIOD CHECK**: 
- If this was a paid bay or permit bay, cite the **10-minute grace period** (Civil Enforcement of Parking Contraventions Regulations).
- Verify if the PCN was issued within 10 minutes of the paid time expiring.
`);
    }

    // PRIVATE PARKING LOGIC
    if (state.disputeType === "PRIVATE_PARKING") {
         blocks.push(`
**POFA 2012 CHECK**:
- Verify 'Notice to Keeper' timelines (Day 15-56 for windscreen, Day 14 for postal).
- Apply BPA/IPC Code of Practice points regarding signage visibility.
`);
    }

    // EVIDENCE LOGIC
    if (state.evidence.hasVideo) {
        blocks.push(`- **VIDEO EVIDENCE**: Client has viewed the CCTV. Reference specific frames if mentioned.`);
    } else if (state.contraventionType === "MOVING_TRAFFIC") {
        blocks.push(`- **WARNING**: Video evidence not yet viewed. Advise client to request/view it immediately.`);
    }

    return blocks.join("\n");
}

function getNextSteps(state: CaseState, roadmap: any, isManaged: boolean): string {
    const ladder = state.disputeType === "COUNCIL_PCN"
        ? "Informal Challenge -> Formal Reps (NTO) -> Tribunal (Adjudicator)"
        : "Operator Appeal -> POPLA/IAS (ADR) -> Landowner Cancellation -> Court Defense";

    let steps = `**ESCALATION LADDER**: ${ladder}\n\n**NEXT STEPS**:`;

    if (isManaged) {
        steps += `
1. **Resolve Action**: We will draft and submit the appeal based on these facts.
2. **Resolve Action**: We will log the case in our tracking system.
3. **Resolve Action**: We will monitor for the authority's response (up to 56 days).
4. **Client Action**: Upload any new mail received immediately.
        `;
    } else {
        steps += `
1. **Action**: Submit the drafted appeal to the authority via their website/post.
2. **Deadline**: Ensure this is done by ${roadmap.nextDeadline || "the date on the notice"}.
3. **Monitor**: Wait for a response (usually 14-56 days).
4. **Next**: If rejected, upload the rejection notice here for next steps.
        `;
    }
    return steps;
}

export function buildBrainPromptPack(state: CaseState, coverage: CoverageResult, tier: string = "STANDARD"): string {
    const isManaged = tier === "MANAGED";
    const userEmail = state.rawAnswers["case_email_address"] || "Allocated on submission";

    return `
# CASE PROMPT PACK (BRAIN V1)
**Generated**: ${new Date().toISOString()}
**Type**: ${state.disputeType || "Unknown"} / ${state.contraventionType || "Unknown"}
**Stage**: ${coverage.roadmap.stage}
**Tier**: ${tier} ${isManaged ? "(MANAGED SERVICE)" : ""}

## 1. CORE FACTS
- **VRM**: ${state.vehicle.reg || "Unknown"}
- **Location**: ${state.location || "Unknown"}
- **Date**: ${state.date.event || "Unknown"}
- **Reference**: ${state.reference || "Unknown"}

## 2. EVIDENCE INVENTORY
- Notice Copy: ${state.evidence.hasNotice ? "YES" : "NO"}
- Video Evidence: ${state.evidence.hasVideo ? "YES (Viewed)" : "NO / Not Required"}
- Signage Photos: ${state.evidence.hasSignage ? "YES" : "NO"}

## 3. GROUNDS FOR APPEAL
- **Primary Ground**: ${state.grounds.selected || "None selected"}
- **Details**: 
  ${state.grounds.details.mitigation || state.grounds.details.technical || "N/A"}

## 4. APPLICABLE LOGIC
${getLogicBlock(state)}

## 5. PROCEDURAL ROADMAP & ACTIONS
${getNextSteps(state, coverage.roadmap, isManaged)}

${isManaged ? `
## MANAGED SERVICE REASSURANCE
- **Case Email**: ${userEmail} (Monitored by Resolve)
- **Assurance**: "Resolve will submit on your behalf. We track deadlines. We handle rejections."
` : ""}

## INSTRUCTIONS FOR BRAIN
Based on the above:
1. Draft a formal appeal letter addressing the specific ground.
2. Cite the **Legal Citations** provided in the core docs where relevant (e.g. Grace Period).
3. Keep the tone calm, factual, and authoritative.
`.trim();
}
