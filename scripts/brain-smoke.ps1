# Brain Smoke Test
# Usage: .\scripts\brain-smoke.ps1
# Validates Brain bootstrap, sync, and status endpoints

$ErrorActionPreference = "Stop"
$baseUrl = if ($env:APP_BASE_URL) { $env:APP_BASE_URL } else { "http://localhost:3000" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Brain Smoke Test" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$failures = @()
$caseId = "brain_test_case_$(Get-Random)"

# ============================================================
# Step 1: Bootstrap Brain
# ============================================================
Write-Host "[1/3] Bootstrapping Brain..." -ForegroundColor Yellow
Write-Host "  Case ID: $caseId" -ForegroundColor Gray

try {
    $bootBody = @{ caseId = $caseId } | ConvertTo-Json
    $bootResponse = Invoke-RestMethod -Uri "$baseUrl/api/brain/bootstrap" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $bootBody

    if ($bootResponse.ok) {
        Write-Host "  Status: OK" -ForegroundColor Green
        Write-Host "  Provider: $($bootResponse.provider)" -ForegroundColor Gray
        Write-Host "  Notebook URL: $($bootResponse.notebookUrl)" -ForegroundColor Gray
    }
    else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "Bootstrap failed"
    }
}
catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Bootstrap error"
}

Write-Host ""

# ============================================================
# Step 2: Sync Sources
# ============================================================
Write-Host "[2/3] Syncing Sources..." -ForegroundColor Yellow

try {
    $syncBody = @{
        caseId  = $caseId
        sources = @(
            @{
                sourceKey  = "smoke_test_doc"
                sourceType = "text"
                content    = "This is a smoke test document content."
            }
        )
    } | ConvertTo-Json

    $syncResponse = Invoke-RestMethod -Uri "$baseUrl/api/brain/sources/sync" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $syncBody

    if ($syncResponse.ok) {
        Write-Host "  Status: OK" -ForegroundColor Green
        Write-Host "  Added Count: $($syncResponse.addedCount)" -ForegroundColor Gray
    }
    else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "Sync failed"
    }
}
catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Sync error"
}

Write-Host ""

# ============================================================
# Step 3: Check Status
# ============================================================
Write-Host "[3/3] Checking Brain Status..." -ForegroundColor Yellow

try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/brain/status?caseId=$caseId" -Method GET

    if ($statusResponse.ok) {
        Write-Host "  Status: OK" -ForegroundColor Green
        Write-Host "  Linked: $($statusResponse.linked)" -ForegroundColor Gray
        Write-Host "  Sources Count: $($statusResponse.sourcesCount)" -ForegroundColor Gray
        
        if ($statusResponse.sourcesCount -lt 1) {
            Write-Host "  FAILED: Sources count unexpected" -ForegroundColor Red
            $failures += "Status check failed (count)"
        }
    }
    else {
        Write-Host "  Status: FAILED" -ForegroundColor Red
        $failures += "Status check failed"
    }
}
catch {
    Write-Host "  Status: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $failures += "Status check error"
}

Write-Host ""

# ============================================================
# Summary
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Brain Smoke Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($failures.Count -eq 0) {
    Write-Host "All checks passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Failures:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "  - $failure" -ForegroundColor Red
    }
    exit 1
}
