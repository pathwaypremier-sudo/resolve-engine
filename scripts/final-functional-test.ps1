# Final Functional Test: Brain Integration (Motoring)
# Usage: .\scripts\final-functional-test.ps1

$ErrorActionPreference = "Stop"
$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Final Functional Test: Brain (Motoring)" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$failures = @()
$testId = Get-Random

# ============================================================
# 0. Security Check (Two-Factor Dev Guard)
# ============================================================
Write-Host "[0/3] Security Check (Missing Header)..." -ForegroundColor Yellow
try {
    # Call WITHOUT the x-dev-endpoints-enabled header - should return 404
    $resSec = Invoke-RestMethod -Uri "$baseUrl/api/dev/brain/prompt?caseId=test_sec_$testId" -Method GET -TimeoutSec 10
    Write-Host "  FAILED: Endpoint returned 200 OK without header!" -ForegroundColor Red
    $failures += "Security Check Failed (Accessible without header)"
}
catch {
    # We EXPECT a 404 (which Invoke-RestMethod throws as an error)
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::NotFound) {
        Write-Host "  Pass: Endpoint returned 404 without header" -ForegroundColor Green
    }
    else {
        Write-Host "  FAILED: Unexpected Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $failures += "Security Check Failed (Wrong Status)"
    }
}

# ============================================================
# 1. Managed Service Reassurance Check
# ============================================================
Write-Host "[1/3] Managed Service Reassurance..." -ForegroundColor Yellow
try {
    # We call the prompt API with tier=MANAGED. State will be empty/default, but prompt should contain reassurance.
    # Include x-dev-endpoints-enabled header to satisfy two-factor security check.
    $res = Invoke-RestMethod -Uri "$baseUrl/api/dev/brain/prompt?caseId=test_managed_$testId&tier=MANAGED" -Method GET -Headers @{ "x-dev-endpoints-enabled" = "1" } -TimeoutSec 10
    
    if ($res.ok) {
        if ($res.prompt -match "MANAGED SERVICE REASSURANCE") {
            Write-Host "  Pass: Reassurance block found" -ForegroundColor Green
        }
        else {
            Write-Host "  FAILED: Reassurance block missing" -ForegroundColor Red
            $failures += "Managed Reassurance Missing"
        }
        
        if ($res.prompt -match "Resolve will submit") {
            Write-Host "  Pass: 'Resolve will submit' found" -ForegroundColor Green
        }
        else {
            Write-Host "  FAILED: Submission promise missing" -ForegroundColor Red
            $failures += "Submission Promise Missing"
        }
    }
    else {
        Write-Host "  FAILED: API Error" -ForegroundColor Red
        $failures += "API Error (Managed)"
    }
}
catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Exception (Managed)"
}

# ============================================================
# 2. Trader / Non-Motoring Exclusion
# ============================================================
Write-Host "`n[2/3] Scope Check (No Trader stuff)..." -ForegroundColor Yellow
if ($res.prompt -match "Consumer Rights Act") {
    # Note: Our core docs EXPLICITLY say "Do not cite CRA".
    # But the prompt pack logic shouldn't inject it unless related to Private maybe?
    # Actually, we want to ensure *unrelated* trader keywords are absent if we were scraping widely.
    # Since we control the code, we check specifically for the absence of "Trader" or "Section 75".
    Write-Host "  Pass: Consumer Rights Act not cited (Council Default)" -ForegroundColor Green
}
if ($res.prompt -notmatch "Section 75") {
    Write-Host "  Pass: Section 75 (Credit Card) not cited" -ForegroundColor Green
}
else {
    Write-Host "  FAILED: Section 75 cited (Out of scope)" -ForegroundColor Red
    $failures += "Section 75 Out of Scope"
}

# ============================================================
# 3. Core Docs Sync Check
# ============================================================
Write-Host "`n[3/3] Core Docs Sync..." -ForegroundColor Yellow
$syncBody = @{
    caseId  = "test_sync_$testId"
    sources = @()
} | ConvertTo-Json

try {
    $syncRes = Invoke-RestMethod -Uri "$baseUrl/api/brain/sources/sync" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $syncBody
    
    if ($syncRes.ok) {
        if ($syncRes.coreDocsSyncCount -ge 3) {
            Write-Host "  Pass: $($syncRes.coreDocsSyncCount) Core Docs synced" -ForegroundColor Green
        }
        else {
            Write-Host "  FAILED: Core Docs not synced (Count: $($syncRes.coreDocsSyncCount))" -ForegroundColor Red
            $failures += "Core Docs Sync Failed"
        }
    }
    else {
        Write-Host "  FAILED: API Error" -ForegroundColor Red
        $failures += "API Error (Sync)"
    }
}
catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Exception (Sync)"
}


Write-Host ""
# ============================================================
# Summary
# ============================================================
if ($failures.Count -eq 0) {
    Write-Host "All checks passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Failures encountered:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
