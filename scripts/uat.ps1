# Resolve Engine UAT Script
# Usage: .\scripts\uat.ps1
# Validates payments integration endpoints

$ErrorActionPreference = "Stop"
$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resolve Engine UAT Script" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Track failures
$failures = @()

# ============================================================
# Step 1: Validate Environment
# ============================================================
Write-Host "[1/5] Validating Environment..." -ForegroundColor Yellow

if (-not $env:SESSION_SECRET) {
    Write-Host "  WARNING: SESSION_SECRET not set (required for production)" -ForegroundColor DarkYellow
} else {
    Write-Host "  SESSION_SECRET: Set" -ForegroundColor Green
}

$hasStripe = $false
if ($env:STRIPE_SECRET_KEY -and $env:STRIPE_PRICE_APPEAL_BUILDER) {
    Write-Host "  Stripe config: Set" -ForegroundColor Green
    $hasStripe = $true
} else {
    Write-Host "  Stripe config: Not set (checkout tests will be skipped)" -ForegroundColor DarkYellow
}

Write-Host ""

# ============================================================
# Step 2: Health Check
# ============================================================
Write-Host "[2/5] Health Check..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    if ($healthResponse.ok) {
        Write-Host "  Status: OK" -ForegroundColor Green
        Write-Host "  Env: $($healthResponse.env)" -ForegroundColor Gray
        Write-Host "  Webhook Enabled: $($healthResponse.webhookEnabled)" -ForegroundColor Gray
    } else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "Health check failed"
    }
} catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Health check error"
}

Write-Host ""

# ============================================================
# Step 3: Session Bootstrap
# ============================================================
Write-Host "[3/5] Session Bootstrap..." -ForegroundColor Yellow

$sessionCookie = $null
$actorId = $null

try {
    $bootstrapResponse = Invoke-WebRequest -Uri "$baseUrl/api/session/bootstrap" -Method POST
    $bootstrapBody = $bootstrapResponse.Content | ConvertFrom-Json
    
    if ($bootstrapBody.ok) {
        $actorId = $bootstrapBody.actorId
        Write-Host "  Status: OK" -ForegroundColor Green
        Write-Host "  Actor ID: $actorId" -ForegroundColor Gray
        Write-Host "  Is New: $($bootstrapBody.isNew)" -ForegroundColor Gray
        
        # Extract session cookie
        $setCookie = $bootstrapResponse.Headers["Set-Cookie"]
        if ($setCookie) {
            # Handle array or string
            $cookieValue = if ($setCookie -is [array]) { $setCookie[0] } else { $setCookie }
            if ($cookieValue -match "session=([^;]+)") {
                $sessionCookie = "session=$($Matches[1])"
                Write-Host "  Cookie: Extracted" -ForegroundColor Green
            }
        }
        
        if (-not $sessionCookie -and $bootstrapBody.isNew -eq $false) {
            Write-Host "  Cookie: Using existing session" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "Session bootstrap failed"
    }
} catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Session bootstrap error"
}

Write-Host ""

# ============================================================
# Step 4: Checkout (if Stripe configured)
# ============================================================
Write-Host "[4/5] Checkout..." -ForegroundColor Yellow

$checkoutUrl = $null

if (-not $hasStripe) {
    Write-Host "  SKIPPED: Stripe not configured" -ForegroundColor DarkYellow
    Write-Host "  Set STRIPE_SECRET_KEY and STRIPE_PRICE_APPEAL_BUILDER to test checkout" -ForegroundColor Gray
} elseif (-not $sessionCookie -and -not $actorId) {
    Write-Host "  SKIPPED: No session available" -ForegroundColor DarkYellow
} else {
    try {
        $checkoutBody = @{
            caseId = "uat_case_$(Get-Random)"
            tier = "APPEAL_BUILDER"
        } | ConvertTo-Json
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        if ($sessionCookie) {
            $headers["Cookie"] = $sessionCookie
        } elseif ($actorId) {
            $headers["x-actor-id"] = $actorId
        }
        
        $checkoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/payments/checkout" `
            -Method POST `
            -Headers $headers `
            -Body $checkoutBody
        
        if ($checkoutResponse.ok -and $checkoutResponse.checkoutUrl) {
            $checkoutUrl = $checkoutResponse.checkoutUrl
            Write-Host "  Status: OK" -ForegroundColor Green
            Write-Host "  Checkout URL: $checkoutUrl" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  ACTION REQUIRED:" -ForegroundColor Yellow
            Write-Host "  1. Open the URL above in your browser" -ForegroundColor White
            Write-Host "  2. Complete payment with test card: 4242 4242 4242 4242" -ForegroundColor White
            Write-Host "  3. Ensure 'stripe listen' is running to capture webhook" -ForegroundColor White
        } else {
            Write-Host "  Status: FAILED - No checkout URL" -ForegroundColor Red
            $failures += "Checkout failed"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status: ERROR ($statusCode) - $($_.Exception.Message)" -ForegroundColor Red
        $failures += "Checkout error"
    }
}

Write-Host ""

# ============================================================
# Step 5: Entitlement Debug
# ============================================================
Write-Host "[5/5] Entitlement Debug..." -ForegroundColor Yellow

if (-not $actorId) {
    Write-Host "  SKIPPED: No actor ID available" -ForegroundColor DarkYellow
} else {
    try {
        $debugUrl = "$baseUrl/api/dev/payments/debug?actorId=$actorId"
        $debugResponse = Invoke-RestMethod -Uri $debugUrl -Method GET
        
        if ($debugResponse.ok) {
            Write-Host "  Status: OK" -ForegroundColor Green
            Write-Host "  Entitlement:" -ForegroundColor Gray
            Write-Host "    Tier: $($debugResponse.entitlement.tier)" -ForegroundColor White
            Write-Host "    Active: $($debugResponse.entitlement.active)" -ForegroundColor White
            Write-Host "  Payment Events: $($debugResponse.recentPaymentEvents.Count)" -ForegroundColor Gray
        } else {
            Write-Host "  Status: No data" -ForegroundColor DarkYellow
        }
    } catch {
        Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  (This endpoint is dev-only; may not exist in production)" -ForegroundColor Gray
    }
}

Write-Host ""

# ============================================================
# Summary
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UAT Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($failures.Count -eq 0) {
    Write-Host "All critical checks passed!" -ForegroundColor Green
    if ($checkoutUrl) {
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Complete payment at: $checkoutUrl" -ForegroundColor White
        Write-Host "2. Re-run this script to verify entitlement" -ForegroundColor White
    }
    exit 0
} else {
    Write-Host "Failures:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "  - $failure" -ForegroundColor Red
    }
    exit 1
}
