# Launch Gates Checklist

Go/No-Go criteria for enabling production payments.

---

## Pre-Launch Checklist

### Environment Configuration

| Gate | Command/Verification | Pass |
|------|---------------------|------|
| Health endpoint passes | `curl /api/health` → 200 | ☐ |
| `SESSION_SECRET` set (32+ chars) | Not empty in prod env | ☐ |
| `APP_BASE_URL` set | Correct prod domain | ☐ |
| `STRIPE_SECRET_KEY` set | Starts with `sk_live_` | ☐ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set | Starts with `pk_live_` | ☐ |
| All `STRIPE_PRICE_*` vars set | Non-empty for each tier | ☐ |
| `STRIPE_WEBHOOK_SECRET` set | From Stripe Dashboard webhook config | ☐ |
| `WEBHOOK_ENABLED=0` (pre-launch) | Webhook returns 404 in prod | ☐ |

### Stripe Dashboard Configuration

| Gate | Verification | Pass |
|------|-------------|------|
| Webhook endpoint registered | `https://yourdomain.com/api/payments/webhook` | ☐ |
| Events selected | `checkout.session.completed`, `charge.refunded`, `charge.dispute.created` | ☐ |
| Signing secret copied | Matches `STRIPE_WEBHOOK_SECRET` | ☐ |

### Functional Tests (Test Mode)

| Gate | Test | Pass |
|------|------|------|
| Checkout creates session | Returns `checkoutUrl` | ☐ |
| Payment success grants entitlement | `active=1, tier=APPEAL_BUILDER` | ☐ |
| Webhook idempotency | Replay doesn't double-grant | ☐ |
| Refund revokes entitlement | `active=0, tier=NONE` | ☐ |
| Rate limiting works | 429 after threshold | ☐ |

### Security Gates

| Gate | Verification | Pass |
|------|-------------|------|
| Production requires session cookie | Checkout returns 401 without cookie | ☐ |
| Invalid signature rejected | Webhook returns 401 on bad sig | ☐ |
| Dev endpoints disabled in prod | `/api/dev/*` returns 404 | ☐ |
| No secrets in logs | Audit logs clean | ☐ |

---

## Launch Procedure

```powershell
# 1. Deploy with webhook disabled
$env:WEBHOOK_ENABLED = "0"

# 2. Verify health
curl https://yourdomain.com/api/health
# Expected: {"ok":true,"env":"production","webhookEnabled":false}

# 3. Test checkout flow (live mode)
# - Bootstrap session
# - Create checkout
# - Complete with real card (low amount product)
# - Verify in Stripe Dashboard

# 4. Enable webhook
$env:WEBHOOK_ENABLED = "1"
# Redeploy

# 5. Verify webhook receives events
# Check Stripe Dashboard → Developers → Webhooks → Recent deliveries
```

---

## Rollback / Disable Procedure

### Disable Webhook Processing

```bash
WEBHOOK_ENABLED=0  # Webhook returns 404
```

### Disable Checkout (Emergency)

Option A: Remove `STRIPE_SECRET_KEY` → checkout returns 500

Option B: Deploy code change to guard route

### Revert Entitlement

```sql
-- Direct DB correction if needed
UPDATE entitlements SET tier='NONE', active=0 WHERE actor_id='...';
```

---

## Post-Launch Monitoring

### Stripe Dashboard

- [ ] Webhook delivery success rate > 99%
- [ ] No repeated failures (signature mismatch)
- [ ] Payment volume as expected

### Audit Logs

Monitor for spikes in:

| Event | Indicates |
|-------|-----------|
| `WEBHOOK_UNAUTHENTICATED` | Signature mismatch (key rotation issue?) |
| `WEBHOOK_RATE_LIMITED` | Possible abuse or retry storm |
| `WEBHOOK_CONFIG_ERROR` | Missing env vars |
| `CHECKOUT_UNAUTHORIZED` | Session cookie issues |

### Database

- [ ] `payments_events` rows growing with each transaction
- [ ] `entitlements` correctly reflecting paid users
- [ ] No duplicate `provider_event_id` (UNIQUE enforced)

---

## Contacts

| Role | Contact |
|------|---------|
| On-call Engineer | TBD |
| Stripe Account Owner | TBD |
| Platform Lead | TBD |
