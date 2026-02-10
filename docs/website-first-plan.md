# Website-First Plan: DIY Appeal Builder (£1.99)

## 1. The Pivot
We have decided to pause the full "Managed Service" web app to launch a streamlined **DIY Appeal Builder** website.
- **Product:** A simple website where users answer questions and generate a PDF appeal pack.
- **Price:** £1.99 one-off payment.
- **Delivery:** Immediate download / email.
- **No Account Required:** Guest checkout focus.

## 2. Core Philosophy
- **Ethics Over Pressure:** We do not guarantee outcomes. We sell "Procedural Literacy" and "Best-Effort Drafting".
- **Calm Authority:** The tone is helpful, neutral, and expert. Never aggressive or "lawyer-y".
- **Separation of Concerns:**
  - **The Website** handles UI, user input, payment, and content delivery.
  - **The Engine (This Repo)** defines the *logic* of the assessment and the *prompts* for generation.

## 3. Architecture Split
### What Stays Here (Resolve Engine Repo)
This repo remains the Source of Truth for:
- **Strategy Engine:** The rules that determine `appeal_possible` vs `pay_now`.
- **NotebookLM Contract:** The structure of the JSON payload sent to AI.
- **Prompts:** The actual system prompts and templates used to generate letters.
- **Enforcement Rules:** Validation logic for PCN numbers, dates, etc.

### What Moves to Website Repo
- **Marketing Pages:** Landing page, pricing, FAQ.
- **Simple Intake Form:** A lightweight version of the wizard (likely simplified).
- **Stripe Integration:** Direct one-off payment links or lightweight checkout.
- **PDF Generation:** The actual rendering of the PDF (using content defined by Engine).

## 4. Maintenance Mode
This repository is frozen to ensure the Engine logic remains stable while we iterate fast on the Website UI. We will port logic *from* here *to* the website, or expose this Engine as an API in Phase 2.

**For now: Don't break the Engine. Build the Website separately.**
