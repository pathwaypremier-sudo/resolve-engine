# AI Working Method

## Core Rules
1.  **One Step at a Time**: Break complex requests into sequential phases.
2.  **One Prompt per Step**: Do not overload context.
3.  **Return A/B/C/D**: Use the standard report format (Files, Changes, Tests, Build) for every task.

## Workflow
1.  **Locate Files**: Verify file paths and content before editing.
2.  **Plan**: create `implementation_plan.md` or similar if complex.
3.  **Implement**: Apply edits.
4.  **Test**: Verify logic (mental model) and run build checks.
5.  **Report**: Summarize actions clearly.

## "No Vibe Coding"
*   **Do not change more than asked.**
*   **Never accept large refactors** unless explicitly the primary objective.
*   **Stability over cleverness.**
