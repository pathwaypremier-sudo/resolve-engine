# User Acceptance Testing (UAT) Guide

This document provides step-by-step instructions for validating the payments integration.

## Preconditions

### Required Environment Variables

Copy `.env.example` to `.env.local` and set:

```bash
# Minimum for UAT
SESSION_SECRET=your-dev-secret-32-chars-min
APP_BASE_URL=http://localhost:3000

# For Stripe checkout tests
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_APPEAL_BUILDER=price_...
STRIPE_PRICE_MANAGED=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_ANNUAL_ACCESS=price_...

# For webhook tests
STRIPE_WEBHOOK_SECRET=whsec_... (from `stripe listen`)
WEBHOOK_SECRET=testsecret123 (dev HMAC fallback)
WEBHOOK_RL_PER_MINUTE=60
```

### Stripe CLI

Install and login to Stripe CLI:
```powershell
stripe login
```

---

## UAT Steps

### A) Health Check

```powershell
curl.exe "http://localhost:3000/api/health"
```

**Expected:** `200 OK`
```json
{"ok":true,"env":"development","timeIso":"...","webhookEnabled":true}
```

---

### B) Session Bootstrap

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/session/bootstrap" -Method POST
$response.Headers["Set-Cookie"]
$response.Content
```

**Expected:**
- `Set-Cookie: session=...` header present
- Body: `{"ok":true,"actorId":"actor_...","isNew":true}`

---

### C) Checkout Endpoint

```powershell
$cookie = "session=<paste from step B>"
$body = '{"caseId":"case_test_1","tier":"APPEAL_BUILDER"}'

curl.exe -X POST "http://localhost:3000/api/payments/checkout" `
  -H "Content-Type: application/json" `
  -H "Cookie: $cookie" `
  -d $body
```

**Expected:** `200 OK`
```json
{"ok":true,"checkoutUrl":"https://checkout.stripe.com/..."}
```

---

### D) Complete Payment + Webhook Verification

1. **Start webhook listener:**
   ```powershell
   stripe listen --forward-to http://localhost:3000/api/payments/webhook
   ```
   Note the `webhook signing secret` printed.

2. **Complete checkout:** Open `checkoutUrl` in browser, use test card `4242 4242 4242 4242`.

3. **Verify entitlement:**
   ```powershell
   $actorId = "actor_..." # from step B
   curl.exe "http://localhost:3000/api/dev/payments/debug?actorId=$actorId"
   ```

**Expected:**
```json
{
  "ok": true,
  "actorId": "actor_...",
  "entitlement": {
    "tier": "APPEAL_BUILDER",
    "active": true,
    "sourceEventId": "evt_...",
    "updatedAtIso": "..."
  },
  "recentPaymentEvents": [...]
}
```

---

### E) Rate Limit Check

```powershell
# Set low limit
$env:WEBHOOK_RL_PER_MINUTE = "3"

# Send 5 requests quickly
1..5 | ForEach-Object {
    $sig = "invalid"
    curl.exe -s -o NUL -w "%{http_code}" -X POST `
      "http://localhost:3000/api/payments/webhook" `
      -H "x-webhook-signature: $sig" `
      -d "{}"
}
```

**Expected:** First 3 return `401`, remaining return `429`.

---

## Expected HTTP Codes

| Endpoint | Success | Auth Failed | Config Error | Rate Limited |
|----------|---------|-------------|--------------|--------------|
| `/api/health` | 200 | N/A | 500 | N/A |
| `/api/session/bootstrap` | 200 | N/A | 500 | N/A |
| `/api/payments/checkout` | 200 | 401 | 500 | N/A |
| `/api/payments/webhook` | 200 | 401 | 500 | 429 |

---

## Troubleshooting

### 401 Unauthorized

| Symptom | Cause | Fix |
|---------|-------|-----|
| Webhook returns 401 | Invalid `stripe-signature` | Check `STRIPE_WEBHOOK_SECRET` matches `stripe listen` output |
| Checkout returns 401 | Missing session cookie | Call `/api/session/bootstrap` first |

### 404 Not Found

| Symptom | Cause | Fix |
|---------|-------|-----|
| Webhook returns 404 | `WEBHOOK_ENABLED=0` in prod | Set `WEBHOOK_ENABLED=1` |

### 500 Misconfigured

| Symptom | Cause | Fix |
|---------|-------|-----|
| Any route returns 500 | Missing required env var | Check `.env.local` against `.env.example` |

### 429 Rate Limited

| Symptom | Cause | Fix |
|---------|-------|-----|
| Webhook returns 429 | Too many requests per minute | Wait 60s or increase `WEBHOOK_RL_PER_MINUTE` |
