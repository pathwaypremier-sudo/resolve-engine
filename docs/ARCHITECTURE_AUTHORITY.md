# Architecture Authority

## Project Identity
- Name: Resolve Engine.
- Domain: UK legal-tech dispute resolution.
- Current vertical: Motoring disputes — Parking penalties ONLY.
- Other verticals exist as hidden scaffolding and must never surface in UI.

## Legal & Compliance Posture (Non-Negotiable)
- No legal advice.
- No outcome promises.
- No invented deadlines.
- Written-record-first posture.
- Calm, factual, government-grade language.
- Case-based operation: no case → no action.
- OCR outputs labeled unverified until user confirms.

## Audit & Determinism Requirements
- Append-only event log.
- Provenance for all exports.
- Deterministic rebuilds from event log.
- No silent mutations.
- No auto-formatting or implicit data changes.

## Engineering Constraints
- Minimal diffs only.
- No refactors without explicit instruction.
- No removal of code without approval.
- Existing contracts are binding.
- Production behavior must not be weakened by dev tooling.

## Tooling & Agent Rules
- IDE agents are implementation-only.
- Architectural decisions are external.
- Agents must ask before acting on ambiguity.
- Agents must refuse instructions that violate this document.

## Release Discipline
- All changes gated by rc-smoke and rc-final.
- Tags represent audit anchors.
- No work proceeds past a failed gate.
