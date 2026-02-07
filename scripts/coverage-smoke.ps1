# Motoring Coverage Engine Smoke Test
# Usage: .\scripts\coverage-smoke.ps1

$ErrorActionPreference = "Stop"
$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Motoring Coverage Smoke Test" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$failures = @()
$caseId = "coverage_test_$(Get-Random)"

# Helper to normalize DB calls (using persistence set via API or we just mock fetch)
# For this smoke test, since we rely on persistence which is server-side, 
# and we don't have a direct "update case state" API that is generic,
# we might need to rely on the fact that loadCaseState reads from persistence.
# But we can't write to persistence easily from outside without a helper.
# 
# Workaround: valid case flow usually goes through intake.
# We will check an EMPTY case first (should be incomplete).

# ============================================================
# Step 1: Check Empty Case (Coverage)
# ============================================================
Write-Host "[1/2] Checking Empty Case Coverage..." -ForegroundColor Yellow
Write-Host "  Case ID: $caseId" -ForegroundColor Gray

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/cases/coverage/status?caseId=$caseId" -Method GET
    
    if ($res.ok) {
        if ($res.coverage.isComplete -eq $false) {
            Write-Host "  Pass: Case is correctly identified as incomplete" -ForegroundColor Green
            Write-Host "  Completeness: $($res.coverage.completeness)%" -ForegroundColor Gray
            Write-Host "  Missing: $($res.coverage.missingRequired.Count) items" -ForegroundColor Gray
        }
        else {
            Write-Host "  FAILED: Empty case marked as complete!" -ForegroundColor Red
            $failures += "Empty case completeness check failed"
        }
        
        if ($res.coverage.roadmap.stage) {
            Write-Host "  Stage: $($res.coverage.roadmap.stage)" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "API error on empty case"
    }
}
catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "API call error"
}

Write-Host ""

# ============================================================
# Step 2: Check Brain Prompt Generation
# ============================================================
Write-Host "[2/2] Checking Brain Prompt Generation..." -ForegroundColor Yellow

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/brain/prompt?caseId=$caseId" -Method GET
    
    if ($res.ok) {
        if ($res.prompt.Length -gt 50) {
            Write-Host "  Pass: Prompt generated successfully" -ForegroundColor Green
            # Write-Host "Preview: $($res.prompt.Substring(0, 50))..." -ForegroundColor Gray
        }
        else {
            Write-Host "  FAILED: Prompt is too short or empty" -ForegroundColor Red
            $failures += "Prompt generation failed"
        }
    }
    else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "API error on prompt gen"
    }
}
catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "API call error (prompt)"
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
    Write-Host "Failures encountered." -ForegroundColor Red
    exit 1
}
