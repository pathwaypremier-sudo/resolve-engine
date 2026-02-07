# Stripe Test Plan

This document outlines test scenarios for validating Stripe integration behavior.

## Test Mode Setup

1. Use Stripe **test mode** keys (prefix `sk_test_` / `pk_test_`)
2. Install Stripe CLI: `stripe login`
3. Forward webhooks: `stripe listen --forward-to http://localhost:3000/api/payments/webhook`
4. Set `STRIPE_WEBHOOK_SECRET` to the signing secret from CLI output

---

## Test Scenarios

### 1. Payment Success → Entitlement Granted

**Trigger:** Complete checkout with test card `4242 4242 4242 4242`

**Event:** `checkout.session.completed`

**Expected Behavior:**
- Ledger row inserted: `status=PAID`
- Entitlement: `tier=APPEAL_BUILDER, active=1`
- Audit log: `ENTITLEMENT_GRANTED`

**Verification:**
```powershell
curl.exe "http://localhost:3000/api/dev/payments/debug?actorId=<actorId>"
```

---

### 2. Webhook Retry → No Double Grant (Idempotency)

**Trigger:** Stripe CLI re-delivers the same event (or call webhook twice with same event ID)

**Expected Behavior:**
- First request: ledger insert, entitlement grant
- Second request: `WEBHOOK_IDEMPOTENT_REPLAY` or `WEBHOOK_LEDGER_DUPLICATE`
- Entitlement unchanged
- Response: `{"ok":true,"skipped":true}`

---

### 3. Refund → Entitlement Revoked

**Trigger:** 
1. Complete a payment
2. In Stripe Dashboard (test mode): Payments → Find payment → Refund

**Event:** `charge.refunded`

**Expected Behavior:**
- Ledger row inserted: `status=REFUNDED`
- Entitlement: `tier=NONE, active=0`
- Audit log: `ENTITLEMENT_REVOKED`

**Note:** If `actorId` is not in charge metadata, entitlement won't change (ledger still captures event).

---

### 4. Dispute → Entitlement Revoked

**Trigger:** Use Stripe test card for disputes:
- Card: `4000 0000 0000 9995` (dispute on every charge)

**Event:** `charge.dispute.created`

**Expected Behavior:**
- Ledger row inserted: `status=DISPUTED`
- Entitlement: `tier=NONE, active=0`

---

### 5. Out-of-Order Events → Eventual Consistency

**Scenario:** What if `charge.refunded` arrives before `checkout.session.completed`?

**Behavior:**
- Both events are recorded in ledger
- Entitlement state reflects most recent update
- Final state depends on which event processed last

**Design Note:** Ledger captures complete history; entitlement is current state only.

---

### 6. Unknown Event Type → No Entitlement Change

**Trigger:** `stripe trigger payment_intent.created`

**Expected Behavior:**
- Event verified
- No ledger insert (status unknown)
- Audit log: `WEBHOOK_ACCEPTED_NO_ACTION`
- Response: `{"ok":true}`

---

## How to Trigger Events

### Option A: Real Checkout Flow (Recommended)

```powershell
# 1. Bootstrap session
Invoke-WebRequest -Uri "http://localhost:3000/api/session/bootstrap" -Method POST

# 2. Create checkout
curl.exe -X POST "http://localhost:3000/api/payments/checkout" `
  -H "Content-Type: application/json" `
  -H "Cookie: session=..." `
  -d '{"caseId":"case_1","tier":"APPEAL_BUILDER"}'

# 3. Complete in browser with test card
```

### Option B: Stripe CLI Trigger

```powershell
stripe trigger checkout.session.completed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

> **Note:** CLI triggers don't include your checkout metadata (caseId, actorId, tier), so entitlements won't update. Use for signature verification testing only.

---

## Logging Expectations

### What IS Logged

- Event types and IDs
- Processing decisions (GRANTED, REVOKED, SKIPPED)
- Error categories (not stack traces)
- Rate limit hits

### What is NOT Logged

- Raw webhook payloads
- Stripe signatures
- Session secrets
- Cookie values
- Customer PII

---

## Test Card Reference

| Card Number | Behavior |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Creates dispute |
| `4000 0025 0000 3155` | Requires 3DS |
