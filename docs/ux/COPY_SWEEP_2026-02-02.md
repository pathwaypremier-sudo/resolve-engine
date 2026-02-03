# UX Copy Sweep Checklist (2026-02-02)

## Principles
- **Factual, not advisory**: "This document records" vs "You should".
- **Calm & Administrative**: Avoid "Success!", "Win", "Finally". Use "Completed", "Processed", "Ready".
- **No Promises**: Never say "ensure", "guarantee", "will result in".
- **Verified Provenance**: Emphasize that data is "as entered" or "as scanned", confirming the user's role in verification.
- **Vertical-Specific (Parking)**: Ensure terminology matches PCN/Parking contexts (e.g. "Issuer", "PCN", not "Claimant").

## Terms to Avoid
- "Guarantee"
- "We will win" / "You will win"
- "Legal advice"
- "Strategy"
- "Expert help" (unless referring to the software capabilities strictly)
- "Deadline" (unless citing a specific date field from a notice)

## Approved Phrases
- "Administrative process"
- "Procedural compliance"
- "Based on the information provided"
- "Your record"
- "Review and confirm"

## Page-by-Page Targets

### /app/case/[id]/intake/scan
- [ ] OCR Microcopy: Explicitly state "Unverified until you confirm".
- [ ] Avoid suggesting the scan is "magic" or "infallible".

### /app/case/[id]/assessment
- [ ] Intro text: "Assess facts" -> "Record facts against criteria".
- [ ] Help text: Remove "we recommend".

### /app/case/[id]/deliver
- [ ] Missing Facts Gating: "You cannot proceed" -> "Further information required".
- [ ] Final Export Gating: Plain description of what the export contains.
- [ ] Export Microcopy: "What's included" list should be factual.

## Done Criteria
- [ ] All "forbidden" terms removed.
- [ ] Gating panels use neutral language.
- [ ] OCR scan emphasizes user verification.
- [ ] Build passes (`rc-final`).
