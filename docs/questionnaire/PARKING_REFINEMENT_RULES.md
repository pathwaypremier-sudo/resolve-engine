# Parking Questionnaire Refinement Rules

## Purpose
- Improve clarity and user experience without changing legal meaning or system behavior.

## Non-goals
- No legal guidance.
- No outcome prediction.
- No strategy recommendations.
- No new procedural paths.

## Allowed changes
- Plain-English rewording for clarity.
- Shortening long questions.
- Removing ambiguity.
- Improving helper text.
- Improving labels for factual accuracy.

## Forbidden changes
- Adding or removing questions.
- Changing trigger conditions.
- Reordering questions across trigger boundaries.
- Introducing advice verbs (recommend, should, must).
- Introducing deadlines not entered by the user.

## Quality rules
- One fact per question.
- Neutral tense (“record”, “state”, “confirm”).
- Questions must be answerable with evidence or personal knowledge.
- No compound questions.

## Audit requirements
- Every refinement step must:
  - reference this document
  - include before → after text
  - keep trigger IDs unchanged

## Change Log — Step 37 (Group 1)

### dispute_type_guess
- **Before**: "Can you identify the type of notice?" (Help: "Local authorities issue PCNs. Private companies issue Parking Charge Notices.")
- **After**: "What type of notice did you receive?" (Help: "Check the top of the notice: 'Penalty Charge Notice' (Council) or 'Parking Charge Notice' (Private).")
- **Reason**: Improved clarity and directness; explicitly guides user to check the document header.

## Change Log — Step 38 (Group 2: Issuer & Reference)

### issuer
- **Before**: "Who issued the notice?" (Help: "Council name or parking operator...")
- **After**: "Name of the enforcement authority" (Help: "The organization named at the top...")
- **Reason**: clearer terminology ("enforcement authority") and location cue ("top of the notice").

### reference
- **Before**: "Reference number (optional)" (Help: "If you're not sure, leave blank.")
- **After**: "Notice Reference Number (optional)" (Help: "Usually labeled 'PCN Number' or 'Ref'...")
- **Reason**: Added "Notice" to distinguish from case ref; added visual cues.

### notice_date
- **Before**: "Date on the notice" (Help: "Used for timeline calculation.")
- **After**: "Date of Issue" (Help: "The date printed on the notice...")
- **Reason**: Formal terminology matched to document; removed internal system logic ("timeline calculation").

### event_date
- **Before**: "Date of the parking event (if different)"
- **After**: "Date of Contravention (if different)" (Help: "The date the parking event actually occurred.")
- **Reason**: Standard terminology ("Contravention") is more precise than "event".

### summary
- **Before**: "In one sentence: what happened?"
- **After**: "Briefly describe the event"
- **Reason**: More neutral instruction.

### ref_check
- **Before**: "Do you have the reference number exactly as shown on the notice?"
- **After**: "Can you locate the reference number on the notice?"
- **Reason**: Simplified.

### copies_kept
- **Before**: "Have you kept copies of the notice and any letters/emails sent or received?"
- **After**: "Do you have copies of the notice and correspondence?"
- **Reason**: "Correspondence" covers all types concisely.

### contact_status
- **Before**: "Have you contacted the issuer already?"
- **After**: "Have you already contacted the enforcement authority?"

## Change Log — Step 39 (Group 3: Dates & Timing)

### notice_date
- **Before**: "Date of Issue" (Help: "The date printed on the notice (not necessarily today's date).")
- **After**: "Date of Issue" (Help: "Usually near the top or next to the reference number. Record the date printed (even if you received it later).")
- **Reason**: Added location guidance ("near the top") and clarified distinction between issue vs receipt date.

### event_date
- **Before**: "Date of Contravention (if different)" (Help: "The date the parking event actually occurred.")
- **After**: "Date of Contravention (if different)" (Help: "When the parking event happened. Often the same as Date of Issue. Leave blank if unsure.")
- **Reason**: Explicitly permitted uncertainty ("Leave blank if unsure") and clarified relationship to issue date.

## Change Log — Step 41 (Contact Details & Response)

### contact_copy
- **Before**: "Do you have a copy of what you sent?" (Help: None)
- **After**: "Do you have a record of the correspondence?" (Help: "e.g. a sent email, screenshot, copy of letter, or proof of posting.")
- **Reason**: More precise ("record of correspondence") and provides examples of valid records.

### response_received
- **Before**: "Have you received a written response?" (Help: None)
- **After**: "Has the enforcement authority responded?" (Help: "Any letter or email reply (even an automated acknowledgment).")
- **Reason**: Clarifies sender ("enforcement authority") and scope (includes automated replies).

### response_date
- **Before**: "If yes, what date is shown on the response (if known)?" (Help: None)
- **After**: "Date of Response" (Help: "The date printed on their letter or email.")
- **Reason**: Standardized label to "Date of..." format; removed verbose conditional text from label.

## Change Log — Step 42 (Group: Procedure)

### council_stage
- **Before**: "Which stage are you at?" (Help: None)
- **After**: "What is the current status of the penalty?" (Help: "Check the latest document received...")
- **Reason**: More formal and guides user to check the document status.

### council_appealed
- **Before**: "Have you already made a formal representation/appeal?" (Help: None)
- **After**: "Have you submitted a formal representation?" (Help: "This is the official written challenge sent to the council.")
- **Reason**: Clarifies terminology ("formal representation") vs generic appeal.

### private_notice_type
- **Before**: "How did you receive it?" (Help: None)
- **After**: "How was the parking charge issued?" (Help: "Was it affixed to the vehicle or received by post?")
- **Reason**: Neutral phrasing focusing on the mechanism of issue.

### private_appealed
- **Before**: "Have you already appealed to the operator?" (Help: None)
- **After**: "Have you appealed to the operator?" (Help: "The initial appeal sent to the parking company.")
- **Reason**: Simplified label; helper text defines "operator appeal".

### desired_outcome
- **Before**: "What outcome do you want?" (Help: None)
- **After**: "What is your primary objective?" (Help: "Select the outcome you are seeking.")
- **Reason**: More professional phrasing ("primary objective").
