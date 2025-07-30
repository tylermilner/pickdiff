// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('PickDiff Application', () => {
  test('should load the main page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('PickDiff');
    
    // Check for main elements
    await expect(page.locator('h1')).toContainText('PickDiff');
    await expect(page.locator('#repo-path-container')).toBeVisible();
    await expect(page.locator('#start-commit')).toBeVisible();
    await expect(page.locator('#end-commit')).toBeVisible();
    await expect(page.locator('#file-tree')).toBeVisible();
  });

  test('should display repository path', async ({ page }) => {
    await page.goto('/');
    
    // Wait for repository path to load
    await expect(page.locator('#repo-path')).not.toBeEmpty();
    const repoPath = await page.locator('#repo-path').textContent();
    expect(repoPath).toBeTruthy();
    
    // Verify that the repo name 'pickdiff' is in the path
    expect(repoPath).toContain('pickdiff');
  });

  test('should load file tree', async ({ page }) => {
    await page.goto('/');
    
    // Wait for file tree to populate
    await page.waitForResponse(response => 
      response.url().includes('/api/files') && response.status() === 200
    );
    
    // Check that file tree has content
    const fileTree = page.locator('#file-tree');
    await expect(fileTree).toBeVisible();
    
    // The file tree should contain some files (at least this test file exists)
    await expect(fileTree.locator('input[type="checkbox"]').first()).toBeVisible();
  });

  test('should validate form inputs before submission', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForResponse(response => 
      response.url().includes('/api/files') && response.status() === 200
    );
    
    // Set up dialog handler to capture the alert
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Try to submit form without inputs
    await page.click('button[type="submit"]');
    
    // Verify that the alert dialog was shown with expected message
    expect(dialogMessage).toBe('Please fill in all fields and select at least one file.');
  });

  test('should allow input in commit fields', async ({ page }) => {
    await page.goto('/');
    
    const startCommit = 'abc123';
    const endCommit = 'def456';
    
    // Fill in commit fields
    await page.fill('#start-commit', startCommit);
    await page.fill('#end-commit', endCommit);
    
    // Verify inputs were filled
    await expect(page.locator('#start-commit')).toHaveValue(startCommit);
    await expect(page.locator('#end-commit')).toHaveValue(endCommit);
  });

  test('should allow file selection', async ({ page }) => {
    await page.goto('/');
    
    // Wait for file tree to load
    await page.waitForResponse(response => 
      response.url().includes('/api/files') && response.status() === 200
    );
    
    // Find and check a file checkbox
    const firstCheckbox = page.locator('#file-tree input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();
    
    // Verify checkbox is checked
    await expect(firstCheckbox).toBeChecked();
  });

  test('should show API error gracefully', async ({ page }) => {
    // Go to a non-existent API endpoint to test error handling
    const response = await page.request.get('/api/nonexistent');
    expect(response.status()).toBe(404);
  });

  test('should persist form data in localStorage', async ({ page }) => {
    await page.goto('/');
    
    const startCommit = 'test123';
    const endCommit = 'test456';
    
    // Fill in form data
    await page.fill('#start-commit', startCommit);
    await page.fill('#end-commit', endCommit);
    
    // Reload page
    await page.reload();
    
    // Check if data persists (the app uses localStorage)
    await expect(page.locator('#start-commit')).toHaveValue(startCommit);
    await expect(page.locator('#end-commit')).toHaveValue(endCommit);
  });
});