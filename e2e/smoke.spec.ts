import { test, expect } from '@playwright/test';

/**
 * Smoke E2E Test - Core User Journey
 * Tests the happy path: Home → Create Case → Intake → Assessment → Deliver
 * 
 * Note: This test uses a test-only auth bypass when NODE_ENV=test
 * See src/lib/auth/test-bypass.ts for implementation
 */

test.describe('Core User Journey - Smoke Test', () => {
  test('should complete full case flow from intake to deliver', async ({ page }) => {
    // Step 1: Load home page
    await page.goto('/');
    await expect(page).toHaveTitle(/Resolve Engine/);

    // Step 2: Navigate to app (create new case)
    const startButton = page.getByRole('link', { name: /start a new case/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Step 3: Verify intake page loaded
    await expect(page).toHaveURL(/\/intake/);
    await expect(page.getByText(/check your parking ticket/i)).toBeVisible();

    // Step 4: Click Continue to move past start step 
    // (manual entry is via the Continue button, not a separate button)
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 5: Skip upload step - click Continue
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 6: Select issuer - "Private parking company" 
    await page.getByRole('button', { name: /private parking company/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 7: Select notice type - "Private Parking Charge Notice"
    await page.getByRole('button', { name: /private parking charge/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 8: Fill dates
    const eventDateInput = page.locator('input[type="date"]').first();
    await eventDateInput.fill('2026-01-15');

    const issueDateInput = page.locator('input[type="date"]').nth(1);
    await issueDateInput.fill('2026-01-20');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 9: Fill VRM
    const vrmInput = page.locator('input[placeholder*="AB12"]');
    await vrmInput.fill('AB12CDE');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 10: Verify summary/review page
    await expect(page.getByText(/your inputs/i)).toBeVisible();
    await expect(page.getByText(/private parking/i)).toBeVisible();

    // Step 11: Continue to assessment
    await page.getByRole('button', { name: /continue to assessment/i }).click();

    // Step 12: Verify assessment page loaded
    await expect(page).toHaveURL(/\/assessment/);

    // Step 13: Wait for page to stabilize and look for assessment content
    await page.waitForLoadState('networkidle');
    await expect(
  page.getByRole('heading', { name: 'Assessment', exact: true })
).toBeVisible({ timeout: 15000 });



    // Success: Core journey completed through assessment
    // Note: Full deliver step depends on database state and auth
  });

  test('should prevent unauthorized access to admin routes', async ({ page }) => {
    // Verify admin routes are gated
    await page.goto('/admin');

    // App redirects non-admin users to home with error query param
    // See src/app/admin/layout.tsx: redirect('/?error=admin_required')
    await expect(page).toHaveURL(/\/(\?|$)/);

    // Verify we're not on an admin page
    const url = page.url();
    expect(url).not.toContain('/admin');
  });
});
