# Governance: Maintenance Mode

> **Effective Date:** 2026-02-10
> **Status:** Active
> **Authority:** Repo Steward

## 1. Purpose
The Resolve Engine application is being placed in **Maintenance Mode** to shift engineering focus to the **Website-First DIY Appeal Builder (£1.99)**. This decision prioritizes immediate user value (low-cost, self-service appeals) over the complex, fully managed web application.

This repository now serves as the **Reference System** for:
- Core Strategy Logic (Assessment Engine)
- NotebookLM Prompts & Contracts
- Legal/Compliance Text (Enforcement)

## 2. Allowed Changes
You may ONLY modify this repository for:
- **Bug Fixes**: Critical logical errors in the engine or breaking UI bugs.
- **Security Patches**: Vulnerability fixes in dependencies or code.
- **Test Fixes**: Repairing broken E2E or unit tests to maintain green CI.
- **Documentation**: Updating knowledge base, plans, or governance docs.

## 3. Forbidden Changes
- **New Features**: No new pages, workflows, or complex UI components.
- **UX Expansion**: Do not polish or expand the intake/assessment flow.
- **Infrastructure**: No changes to Vercel, Hetzner, Docker, or CI/CD pipelines.
- **Database**: No schema migrations or new tables.
- **Payments**: Do not activate Stripe webhooks or checkout flows in this app.

## 4. Branch Discipline
- **Feature Branches**: `fix/*`, `chore/*`, `docs/*`. Avoid `feat/*` unless authorized by Steward.
- **Target Branch**: Always open PRs against `staging`.
- **Merge Strategy**: Squash and Merge.
- **Cleanup**: Delete source branch immediately after merge.

## 5. Website-First Proposals
If you are working on the Website V1:
- Do not build it in this repo.
- Creates issues or docs here labeled `website-v1` if they relate to extracting logic from the Engine.
- Refer to `docs/website-first-plan.md` for architectural split.
