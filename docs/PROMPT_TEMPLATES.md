# Prompt Templates

## Standard Anti-Gravity Skeleton

```markdown
PROJECT IDX AI — [TASK NAME]

ROLE
You are [ROLE DESCRIPTION].
[CONSTRAINTS: e.g. Minimal diffs, No advice].

MANDATORY REPORT FORMAT
A) Files created/edited
B) What changed
C) How to test
D) Build status (`npx tsc --noEmit`)

---------------------------------------------------------
PHASE 1 — [PHASE NAME]
[INSTRUCTIONS]

---------------------------------------------------------
PHASE 2 — [PHASE NAME]
[INSTRUCTIONS]

---------------------------------------------------------
PHASE X — BUILD CHECK
Run:
  npx tsc --noEmit

---------------------------------------------------------
PHASE Y — REPORT BACK
A) Files created/edited
B) What changed
C) How to test
D) Build status
```

## Checklists

### Copy Compliance
- [ ] No "recommend" / "highly recommend"
- [ ] No "should" (unless technical requirement)
- [ ] No "best course of action"
- [ ] No "guarantee"
- [ ] Use factual, neutral tone

### Provenance
- [ ] Native text > OCR text
- [ ] OCR text labeled "(unverified)"
- [ ] User must confirm/apply extracted values

### Gating
- [ ] Never block silently (return `null`)
- [ ] Explain *why* a feature is unavailable (e.g., "Add a notice first")
- [ ] Provide a clear path to resolve the block
