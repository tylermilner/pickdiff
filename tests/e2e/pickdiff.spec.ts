import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("PickDiff Application", () => {
  test("should load the main page successfully", async ({ page }) => {
    // Act
    await page.goto("/");

    // Assert
    // Check that the page title is correct
    await expect(page).toHaveTitle("PickDiff");

    // Check for main elements
    await expect(page.locator("h1")).toContainText("PickDiff");
    await expect(page.locator("#repo-path-container")).toBeVisible();
    await expect(page.locator("#start-commit")).toBeVisible();
    await expect(page.locator("#end-commit")).toBeVisible();
    await expect(page.locator("#file-tree")).toBeVisible();
  });

  test("should display repository path", async ({ page }) => {
    // Act
    await page.goto("/");

    // Assert
    // Wait for repository path to load
    await expect(page.locator("#repo-path")).not.toBeEmpty();
    const repoPath: string | null = await page
      .locator("#repo-path")
      .textContent();
    expect(repoPath).toBeTruthy();

    // Verify that the repo name 'pickdiff' is in the path
    expect(repoPath).toContain("pickdiff");
  });

  test("should load file tree", async ({ page }) => {
    // Act
    await page.goto("/");

    // Wait for file tree to populate
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Assert
    // Check that file tree has content
    const fileTree = page.locator("#file-tree");
    await expect(fileTree).toBeVisible();

    // The file tree should contain some files (at least this test file exists)
    await expect(
      fileTree.locator('input[type="checkbox"]').first(),
    ).toBeVisible();
  });

  test("should validate form inputs before submission", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for page to fully load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Set up dialog handler to capture the alert
    let dialogMessage: string = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Act
    // Try to submit form without inputs
    await page.click('button[type="submit"]');

    // Assert
    // Verify that the alert dialog was shown with expected message
    expect(dialogMessage).toBe(
      "Please fill in all fields and select at least one file.",
    );
  });

  test("should allow input in commit fields", async ({ page }) => {
    // Arrange
    await page.goto("/");

    const startCommit: string = "abc123";
    const endCommit: string = "def456";

    // Act
    // Fill in commit fields
    await page.fill("#start-commit", startCommit);
    await page.fill("#end-commit", endCommit);

    // Assert
    // Verify inputs were filled
    await expect(page.locator("#start-commit")).toHaveValue(startCommit);
    await expect(page.locator("#end-commit")).toHaveValue(endCommit);
  });

  test("should allow file selection", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Find and check a file checkbox
    const firstCheckbox = page
      .locator('#file-tree input[type="checkbox"]')
      .first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();

    // Assert
    // Verify checkbox is checked
    await expect(firstCheckbox).toBeChecked();
  });

  test("should show API error gracefully", async ({ page }) => {
    // Act
    // Go to a non-existent API endpoint to test error handling
    const response = await page.request.get("/api/nonexistent");

    // Assert
    expect(response.status()).toBe(404);
  });

  test("should persist form data in localStorage", async ({ page }) => {
    // Arrange
    const repoPath: string = path.join(__dirname, "../../");
    const commits: string[] = execSync('git log --oneline -2 --format="%H"', {
      cwd: repoPath,
      encoding: "utf8",
    })
      .trim()
      .split("\n");
    const [endCommit, startCommit] = commits;

    await page.goto("/");

    // Fill in form data with real commit hashes
    await page.fill("#start-commit", startCommit);
    await page.fill("#end-commit", endCommit);

    // Select at least one file (required for form submission)
    const firstCheckbox = page
      .locator('#file-tree input[type="checkbox"]')
      .first();
    await firstCheckbox.check();

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for diff to be displayed (ensures form submission completed)
    await expect(page.locator(".diff-container")).toBeVisible();

    // Act
    // Reload page
    await page.reload();

    // Assert
    // Check if data persists (the app uses localStorage)
    await expect(page.locator("#start-commit")).toHaveValue(startCommit);
    await expect(page.locator("#end-commit")).toHaveValue(endCommit);
  });

  test("should display search input for filtering files", async ({ page }) => {
    // Act
    await page.goto("/");

    // Assert
    // Check that search input exists
    const searchInput = page.locator("#file-search");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", "Search files...");
  });

  test("should filter files when typing in search input", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Search for a specific file that should exist (package.json)
    await page.fill("#file-search", "package.json");

    // Assert
    // Should contain package.json if it exists
    const packageJsonCheckbox = page.locator(
      '#file-tree input[value*="package.json"]',
    );
    if ((await packageJsonCheckbox.count()) > 0) {
      await expect(packageJsonCheckbox).toBeVisible();
    } else {
      throw new Error("package.json checkbox not found");
    }
  });

  test("should show all files when search is cleared", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Get initial count
    const initialCheckboxes = page.locator(
      '#file-tree input[type="checkbox"]:visible',
    );
    const initialCount = await initialCheckboxes.count();
    expect(initialCount).toBeGreaterThan(0);

    // Search for something specific
    await page.fill("#file-search", "package.json");

    // Act
    // Clear the search
    await page.fill("#file-search", "");

    // Assert
    // Should show all files again
    const finalCheckboxes = page.locator(
      '#file-tree input[type="checkbox"]:visible',
    );
    const finalCount = await finalCheckboxes.count();
    expect(finalCount).toBe(initialCount);
  });

  test("should filter files case-insensitively", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Search with uppercase
    await page.fill("#file-search", "PACKAGE.JSON");

    // Assert
    // Should still find package.json (case-insensitive)
    const packageJsonCheckbox = page.locator(
      '#file-tree input[value*="package.json"]',
    );
    if ((await packageJsonCheckbox.count()) > 0) {
      await expect(packageJsonCheckbox).toBeVisible();
    } else {
      throw new Error("package.json checkbox not found");
    }
  });

  test("should filter files with partial matches", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Search with partial match
    await page.fill("#file-search", ".json");

    // Assert
    // Should show files ending with .json
    const jsonFiles = page.locator('#file-tree input[value*=".json"]:visible');
    const jsonFileCount = await jsonFiles.count();

    // Should show at least package.json if it exists
    if (jsonFileCount > 0) {
      await expect(jsonFiles.first()).toBeVisible();
    } else {
      throw new Error(".json files not found - update test to find some files from partial match");
    }
  });

  test("should hide non-matching files", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Search for a very specific term that shouldn't match many files
    await page.fill("#file-search", "nonexistentfile12345");

    // Assert
    // Should hide most or all files
    const visibleCheckboxes = page.locator(
      '#file-tree input[type="checkbox"]:visible',
    );
    const visibleCount = await visibleCheckboxes.count();
    expect(visibleCount).toBe(0);
  });

  test("should show parent folders when child files match", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Act
    // Search for a file in a subdirectory (like src/server.ts)
    await page.fill("#file-search", "server.ts");

    // Assert
    // The src folder should be visible (if server.ts exists in src/)
    const srcFolder = page.locator('#file-tree strong:has-text("src")');
    if ((await srcFolder.count()) > 0) {
      await expect(srcFolder).toBeVisible();
    } else {
      throw new Error("src folder not found");
    }

    // The server.ts file should be visible
    const serverTsFile = page.locator('#file-tree input[value*="server.ts"]');
    if ((await serverTsFile.count()) > 0) {
      await expect(serverTsFile).toBeVisible();
    } else {
      throw new Error("server.ts file not found");
    }
  });
});
