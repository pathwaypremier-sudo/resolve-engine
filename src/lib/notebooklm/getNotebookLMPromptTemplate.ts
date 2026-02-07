
/**
 * Generates a guided prompt for the user to paste into NotebookLM
 * alongside the source pack.
 */
export function getNotebookLMPromptTemplate(): string {
    return `You are an expert legal assistant helping me fight a parking charge notice (PCN). 
I have uploaded a "Source Pack" containing the case summary, evidence index, and full text of my documents.

Please perform the following tasks using ONLY the provided sources:

1. **Case Summary**: validly summarize the key facts (Date, Location, Contravention, Issuer).
2. **Evidence Analysis**: reliability review of the evidence. specific focus on:
   - Does the Notice to Keeper comply with POFA 2012 deadlines? (Check "case-summary.md" for dates)
   - Are the signage terms clear based on the evidence descriptions?
3. **Draft Appeal**: detailed appeal letter. 
   - Use a formal, assertive tone.
   - Cite specific documents (e.g., "Referencing Document 1...") where applicable.
   - Focus on the strongest points identified in the Assessment Verdict.

If you find missing information, please list specific questions I should answer to strengthen the case.
`;
}
