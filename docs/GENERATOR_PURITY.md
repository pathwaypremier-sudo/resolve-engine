# Generator Purity Contract

## "Pure Generator" Definition
A pure generator in this repository:
1. Must NOT depend on `window` or `localStorage` for its output integrity.
2. Must accept all necessary data via function arguments (dependency injection).
3. If environment globals are missing (e.g. Node CI), it must produce valid output using injected data.

## CaseIdentity Seam
- **Shared Helper**: `src/lib/case/identity.ts`
- **When to use**: Always use `deriveCaseIdentityFromPacket(packet)` when generating artifacts from a `CasePacket`.
- **Goal**: Ensures consistent formatting of "Case ID", "Issuer", "Reference", and "Dispute Type" across all documents.

## Header Requirements
All artifacts must start with the identifiers-first block:
```section
Resolve Engine — <Artifact Name>
Based on current case entries.
Case ID:      <ID>
Issuer:       <Name>
Reference:    <Ref>
Dispute type: <Type>
```

## Share-Safe Rules
- If `shareSafe` mode is active, sensitive fields (names, extra refs) must be omitted or redacted.
- Do NOT mask fields unless existing logic explicitly requires it (e.g. reference redaction).
- If a section is removed for privacy, the generator should handle it silently (no "OMITTED" placeholders unless specified).

## Banned Phrases
- Code must never generate the phrase: `"Legacy Timeline Facts Warning"`.
- This ensures legacy data handling is fully resolved or silent.
