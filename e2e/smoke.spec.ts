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
    
    // Step 4: Fill intake form - Manual entry
    const manualEntryButton = page.getByRole('button', { name: /enter manually/i });
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
    }
    
    // Step 5: Select issuer (Private Parking)
    await page.getByRole('button', { name: /private parking/i }).click();
    
    // Step 6: Select notice type (Parking Charge)
    await page.getByRole('button', { name: /parking charge/i }).click();
    
    // Step 7: Fill dates
    const eventDateInput = page.getByLabel(/date of event/i);
    await eventDateInput.fill('2026-01-15');
    
    const issueDateInput = page.getByLabel(/date of issue/i);
    await issueDateInput.fill('2026-01-20');
    
    // Step 8: Fill VRM
    const vrmInput = page.getByLabel(/vehicle registration/i);
    await vrmInput.fill('AB12CDE');
    
    // Step 9: Continue to review
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Step 10: Verify review page
    await expect(page.getByText(/review/i)).toBeVisible();
    await expect(page.getByText(/private parking/i)).toBeVisible();
    
    // Step 11: Continue to assessment
    await page.getByRole('button', { name: /continue to assessment/i }).click();
    
    // Step 12: Verify assessment page loaded
    // Note: May require auth - test bypass should handle this
    await expect(page).toHaveURL(/\/app/);
    
    // Step 13: Navigate to assessment (if not already there)
    const assessmentLink = page.getByRole('link', { name: /assessment/i });
    if (await assessmentLink.isVisible()) {
      await assessmentLink.click();
    }
    
    // Step 14: Verify assessment renders (may show missing info prompts)
    await expect(page.getByText(/assessment/i)).toBeVisible();
    
    // Step 15: Navigate to deliver page
    const deliverLink = page.getByRole('link', { name: /deliver/i });
    await expect(deliverLink).toBeVisible();
    await deliverLink.click();
    
    // Step 16: Verify deliver page renders without errors
    await expect(page).toHaveURL(/\/deliver/);
    await expect(page.getByText(/deliver/i)).toBeVisible();
    
    // Success: Full journey completed
  });
  
  test('should prevent unauthorized access to admin routes', async ({ page }) => {
    // Verify admin routes are gated
    await page.goto('/admin');
    
    // Should redirect to signin or show access denied
    await expect(page).toHaveURL(/\/(signin|admin)/);
    
    // If on admin page, should show error or redirect
    const url = page.url();
    if (url.includes('/admin')) {
      await expect(page.getByText(/access denied|unauthorized|sign in/i)).toBeVisible();
    }
  });
});
