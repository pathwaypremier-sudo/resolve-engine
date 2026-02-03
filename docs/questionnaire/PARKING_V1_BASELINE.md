# Parking Questionnaire V1 Baseline Snapshot

## Group: CLASSIFICATION

### dispute_type_guess
**Label**: Can you identify the type of notice?
**Help**: Local authorities issue PCNs. Private companies issue Parking Charge Notices.
**Condition**: If dispute type is unknown/unsure.

## Group: CORE

### issuer
**Label**: Who issued the notice?
**Help**: Council name or parking operator (e.g. APCOA, Euro Car Parks).
**Condition**: Always.

### reference
**Label**: Reference number (optional)
**Help**: If you're not sure, leave blank.
**Condition**: Always.

### notice_date
**Label**: Date on the notice
**Help**: Used for timeline calculation.
**Condition**: Always.

### event_date
**Label**: Date of the parking event (if different)
**Help**: (None)
**Condition**: Always.

### summary
**Label**: In one sentence: what happened?
**Help**: Keep it factual and specific (this anchors your timeline).
**Condition**: Always.

### ref_check
**Label**: Do you have the reference number exactly as shown on the notice?
**Help**: (None)
**Condition**: If reference not entered.

### copies_kept
**Label**: Have you kept copies of the notice and any letters/emails sent or received?
**Help**: (None)
**Condition**: If evidence not provided.

### contact_status
**Label**: Have you contacted the issuer already?
**Help**: Written correspondence can be retained as part of the case record.
**Condition**: Always.

### contact_copy
**Label**: Do you have a copy of what you sent?
**Help**: (None)
**Condition**: If contacted in writing.

### response_received
**Label**: Have you received a written response?
**Help**: (None)
**Condition**: If contacted (writing or phone).

### response_date
**Label**: If yes, what date is shown on the response (if known)?
**Help**: (None)
**Condition**: If response received.

## Group: PROCEDURE

### council_stage
**Label**: Which stage are you at?
**Help**: (None)
**Condition**: If Council PCN or Unsure.

### council_appealed
**Label**: Have you already made a formal representation/appeal?
**Help**: (None)
**Condition**: If Council PCN.

### private_notice_type
**Label**: How did you receive it?
**Help**: (None)
**Condition**: If Private Parking.

### private_appealed
**Label**: Have you already appealed to the operator?
**Help**: (None)
**Condition**: If Private Parking.

### desired_outcome
**Label**: What outcome do you want?
**Help**: (None)
**Condition**: Always.
