# Integrations Handoff — Resolve Engine (Parking V1)

## Release readiness
- rc-final: PASS on 2026-02-02
- Scope: Motoring disputes (Parking penalties) only
- Hidden verticals: present but UI-contained (leak checks enforced)

## Audit posture
- Append-only events
- Export pack includes provenance_index (docs + OCR provenance + facts where recorded)

## Key commands
- npm run rc-smoke
- npm run rc-final

## Integration constraints
- No legal advice
- No outcome promises
- No invented deadlines
- All integration actions must emit append-only provenance events and be exportable
