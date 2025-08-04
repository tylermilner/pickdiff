// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('PickDiff Application', () => {
  test('should load the main page successfully', async ({ page }) => {
    // Act
    await page.goto('/');
    
    // Assert
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
    // Act
    await page.goto('/');
    
    // Assert
    // Wait for repository path to load
    await expect(page.locator('#repo-path')).not.toBeEmpty();
    const repoPath = await page.locator('#repo-path').textContent();
    expect(repoPath).toBeTruthy();
    
    // Verify that the repo name 'pickdiff' is in the path
    expect(repoPath).toContain('pickdiff');
  });

  test('should load file tree', async ({ page }) => {
    // Act
    await page.goto('/');
    
    // Wait for file tree to populate
    await page.waitForResponse(response => 
      response.url().includes('/api/files') && response.status() === 200
    );
    
    // Assert
    // Check that file tree has content
    const fileTree = page.locator('#file-tree');
    await expect(fileTree).toBeVisible();
    
    // The file tree should contain some files (at least this test file exists)
    await expect(fileTree.locator('input[type="checkbox"]').first()).toBeVisible();
  });

  test('should validate form inputs before submission', async ({ page }) => {
    // Arrange
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
    
    // Act
    // Try to submit form without inputs
    await page.click('button[type="submit"]');
    
    // Assert
    // Verify that the alert dialog was shown with expected message
    expect(dialogMessage).toBe('Please fill in all fields and select at least one file.');
  });

  test('should allow input in commit fields', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    const startCommit = 'abc123';
    const endCommit = 'def456';
    
    // Act
    // Fill in commit fields
    await page.fill('#start-commit', startCommit);
    await page.fill('#end-commit', endCommit);
    
    // Assert
    // Verify inputs were filled
    await expect(page.locator('#start-commit')).toHaveValue(startCommit);
    await expect(page.locator('#end-commit')).toHaveValue(endCommit);
  });

  test('should allow file selection', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Wait for file tree to load
    await page.waitForResponse(response => 
      response.url().includes('/api/files') && response.status() === 200
    );
    
    // Act
    // Find and check a file checkbox
    const firstCheckbox = page.locator('#file-tree input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();
    
    // Assert
    // Verify checkbox is checked
    await expect(firstCheckbox).toBeChecked();
  });

  test('should show API error gracefully', async ({ page }) => {
    // Act
    // Go to a non-existent API endpoint to test error handling
    const response = await page.request.get('/api/nonexistent');

    // Assert
    expect(response.status()).toBe(404);
  });

  test('should persist form data in localStorage', async ({ page }) => {
    // Arrange
    const { execSync } = require('child_process');
    const repoPath = require('path').join(__dirname, '../../');
    const commits = execSync('git log --oneline -2 --format="%H"', {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim().split('\n');
    const [endCommit, startCommit] = commits;
    
    await page.goto('/');

    // Fill in form data with real commit hashes
    await page.fill('#start-commit', startCommit);
    await page.fill('#end-commit', endCommit);
    
    // Select at least one file (required for form submission)
    const firstCheckbox = page.locator('#file-tree input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for diff to be displayed (ensures form submission completed)
    await expect(page.locator('.diff-container')).toBeVisible();

    // Act
    // Reload page
    await page.reload();
    
    // Assert
    // Check if data persists (the app uses localStorage)
    await expect(page.locator('#start-commit')).toHaveValue(startCommit);
    await expect(page.locator('#end-commit')).toHaveValue(endCommit);
  });
});