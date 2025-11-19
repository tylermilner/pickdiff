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
    // Find and check a file checkbox (not a folder checkbox)
    const firstCheckbox = page
      .locator("#file-tree input.file-checkbox")
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
      .locator("#file-tree input.file-checkbox")
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
      throw new Error(
        ".json files not found - update test to find some files from partial match",
      );
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

  test("should display select all checkbox", async ({ page }) => {
    // Act
    await page.goto("/");

    // Assert
    const selectAllCheckbox = page.locator("#select-all");
    await expect(selectAllCheckbox).toBeVisible();

    // Check that the label is correct
    const label = page.locator('label[for="select-all"]');
    await expect(label).toHaveText("Select All");
  });

  test("should select all visible files when select all is checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Get all visible file checkboxes
    const fileCheckboxes = page.locator(
      "#file-tree input.file-checkbox:visible",
    );
    const totalCount = await fileCheckboxes.count();

    // Ensure we have checkboxes to test with
    expect(totalCount).toBeGreaterThan(0);

    // Act
    const selectAllCheckbox = page.locator("#select-all");
    await selectAllCheckbox.check();

    // Assert
    // All visible file checkboxes should be checked
    for (let i = 0; i < totalCount; i++) {
      await expect(fileCheckboxes.nth(i)).toBeChecked();
    }
  });

  test("should deselect all files when select all is unchecked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    const selectAllCheckbox = page.locator("#select-all");

    // First select all
    await selectAllCheckbox.check();

    // Verify some are checked
    const fileCheckboxes = page.locator(
      "#file-tree input.file-checkbox:visible",
    );
    const totalCount = await fileCheckboxes.count();
    await expect(fileCheckboxes.first()).toBeChecked();

    // Act
    await selectAllCheckbox.uncheck();

    // Assert
    // All file checkboxes should be unchecked
    for (let i = 0; i < totalCount; i++) {
      await expect(fileCheckboxes.nth(i)).not.toBeChecked();
    }
  });

  test("should update select all checkbox state when individual files are checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    const selectAllCheckbox = page.locator("#select-all");
    const fileCheckboxes = page.locator(
      "#file-tree input.file-checkbox:visible",
    );
    const totalCount = await fileCheckboxes.count();

    // Ensure we have at least 2 files to test with
    expect(totalCount).toBeGreaterThan(1);

    // Act & Assert
    // Initially, select all should be unchecked
    await expect(selectAllCheckbox).not.toBeChecked();

    // Check first file - select all should become indeterminate
    const firstCheckbox = fileCheckboxes.first();
    await firstCheckbox.check();

    // Check if indeterminate (we can't directly check indeterminate state in Playwright easily,
    // but we can verify it's not fully checked)
    const isChecked = await selectAllCheckbox.isChecked();
    expect(isChecked).toBe(false); // Should be indeterminate, not fully checked

    // Check all files manually
    await selectAllCheckbox.check();

    // Now select all should be fully checked
    await expect(selectAllCheckbox).toBeChecked();
  });

  test("should only affect visible files when filtered", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Filter to show only .ts files
    await page.fill("#file-search", ".ts");

    // Get visible checkboxes after filtering
    const visibleCheckboxes = page.locator(
      "#file-tree input.file-checkbox:visible",
    );
    const visibleCount = await visibleCheckboxes.count();
    expect(visibleCount).toBeGreaterThan(0);

    // Act
    const selectAllCheckbox = page.locator("#select-all");
    await selectAllCheckbox.check();

    // Assert
    // All visible (filtered) checkboxes should be checked
    for (let i = 0; i < visibleCount; i++) {
      await expect(visibleCheckboxes.nth(i)).toBeChecked();
    }

    // Clear the filter
    await page.fill("#file-search", "");

    // Get all checkboxes
    const allCheckboxes = page.locator(
      "#file-tree input.file-checkbox:visible",
    );
    const allCount = await allCheckboxes.count();

    // Count how many are checked
    let checkedCount = 0;
    for (let i = 0; i < allCount; i++) {
      if (await allCheckboxes.nth(i).isChecked()) {
        checkedCount++;
      }
    }

    // Not all files should be checked (only the .ts files)
    expect(checkedCount).toBeLessThan(allCount);
    expect(checkedCount).toBeGreaterThan(0);
  });

  test("should display folder checkboxes", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Assert
    // Check that folder checkboxes exist
    const folderCheckboxes = page.locator("#file-tree input.folder-checkbox");
    const folderCount = await folderCheckboxes.count();

    // Should have at least one folder (e.g., src, tests, frontend, etc.)
    expect(folderCount).toBeGreaterThan(0);
  });

  test("should select all files in folder when folder checkbox is checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find a folder that has files (frontend folder has script.ts)
    const frontendFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="frontend"]',
    );

    // Verify the folder checkbox exists
    await expect(frontendFolderCheckbox).toBeVisible();

    // Get the file checkbox within the frontend folder before checking
    const frontendFileCheckbox = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );

    // Initially, the file should not be checked
    await expect(frontendFileCheckbox).not.toBeChecked();

    // Act
    // Check the folder checkbox
    await frontendFolderCheckbox.check();

    // Assert
    // The file within the folder should now be checked
    await expect(frontendFileCheckbox).toBeChecked();

    // The folder checkbox should be fully checked
    await expect(frontendFolderCheckbox).toBeChecked();
  });

  test("should deselect all files in folder when folder checkbox is unchecked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find and check the frontend folder checkbox
    const frontendFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="frontend"]',
    );
    await frontendFolderCheckbox.check();

    // Verify the file is checked
    const frontendFileCheckbox = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );
    await expect(frontendFileCheckbox).toBeChecked();

    // Act
    // Uncheck the folder checkbox
    await frontendFolderCheckbox.uncheck();

    // Assert
    // The file within the folder should now be unchecked
    await expect(frontendFileCheckbox).not.toBeChecked();

    // The folder checkbox should be unchecked
    await expect(frontendFolderCheckbox).not.toBeChecked();
  });

  test("should update folder checkbox to indeterminate when some files are checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find the public folder which has multiple files (index.html, styles.css)
    const publicFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="public"]',
    );

    // Get one file checkbox within the public folder
    const indexFileCheckbox = page.locator(
      'input.file-checkbox[value="public/index.html"]',
    );

    // Initially, folder should not be checked
    await expect(publicFolderCheckbox).not.toBeChecked();

    // Act
    // Check only one file in the folder
    await indexFileCheckbox.check();

    // Assert
    // The folder checkbox should be indeterminate (not fully checked, but has some children checked)
    // We can't directly test indeterminate state in Playwright, but we can check it's not fully checked
    const isChecked = await publicFolderCheckbox.isChecked();
    expect(isChecked).toBe(false); // Should be indeterminate, not fully checked

    // But at least one file is checked
    await expect(indexFileCheckbox).toBeChecked();
  });

  test("should update parent folder checkbox when nested folder is checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find nested folders (tests/e2e for example)
    const testsFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="tests"]',
    );
    const e2eFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="tests/e2e"]',
    );

    // Verify both folder checkboxes exist
    if (
      (await testsFolderCheckbox.count()) > 0 &&
      (await e2eFolderCheckbox.count()) > 0
    ) {
      // Initially, both should not be checked
      await expect(testsFolderCheckbox).not.toBeChecked();
      await expect(e2eFolderCheckbox).not.toBeChecked();

      // Act
      // Check the nested e2e folder
      await e2eFolderCheckbox.check();

      // Assert
      // The nested e2e folder should be checked
      await expect(e2eFolderCheckbox).toBeChecked();

      // The parent tests folder should be indeterminate (not fully checked)
      const isParentChecked = await testsFolderCheckbox.isChecked();
      expect(isParentChecked).toBe(false); // Should be indeterminate
    } else {
      throw new Error("Folder structure does not match expected structure");
    }
  });

  test("should select all files including nested folders when parent folder is checked", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find the .github folder which has both direct files and nested subfolders
    const githubFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path=".github"]',
    );

    // Get all file checkboxes within the .github folder (including nested folders)
    const githubFileCheckboxes = page.locator(
      'input.file-checkbox[value^=".github/"]',
    );

    const fileCount = await githubFileCheckboxes.count();
    expect(fileCount).toBeGreaterThan(0);

    // Ensure all files are initially unchecked by unchecking the folder first
    const isChecked = await githubFolderCheckbox.isChecked();
    if (isChecked) {
      await githubFolderCheckbox.uncheck();
    }

    // Act
    // Click the folder checkbox to check it
    await githubFolderCheckbox.click();

    // Assert
    // All files within the folder (including those in nested subfolders) should be checked
    for (let i = 0; i < fileCount; i++) {
      await expect(githubFileCheckboxes.nth(i)).toBeChecked();
    }
  });

  test("should display folder toggle icons", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Assert
    // Check that folder toggle icons exist
    const folderToggles = page.locator("#file-tree .folder-toggle");
    const toggleCount = await folderToggles.count();

    // Should have at least one toggle (e.g., src, tests, frontend, etc.)
    expect(toggleCount).toBeGreaterThan(0);

    // Verify the icon content is a triangle
    const firstToggle = folderToggles.first();
    const toggleText = await firstToggle.textContent();
    expect(toggleText).toMatch(/[▼▶]/);
  });

  test("should collapse folder when toggle is clicked", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find a folder with files (frontend folder)
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    await expect(frontendToggle).toBeVisible();

    // Get the folder item
    const frontendFolderItem = page.locator(".folder-item").filter({
      has: frontendToggle,
    });

    // Get a file within the frontend folder
    const frontendFile = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );

    // Initially, the folder should be expanded and file should be visible
    await expect(frontendFile).toBeVisible();

    // Act
    // Click the toggle to collapse the folder
    await frontendToggle.click();

    // Assert
    // The folder should now be collapsed
    await expect(frontendFolderItem).toHaveClass(/collapsed/);

    // The file should be hidden
    await expect(frontendFile).not.toBeVisible();

    // The toggle icon should change to right-pointing
    const toggleText = await frontendToggle.textContent();
    expect(toggleText).toBe("▶");
  });

  test("should expand folder when toggle is clicked again", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find the frontend folder toggle
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    await expect(frontendToggle).toBeVisible();

    const frontendFolderItem = page.locator(".folder-item").filter({
      has: frontendToggle,
    });

    const frontendFile = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );

    // First, collapse the folder
    await frontendToggle.click();
    await expect(frontendFolderItem).toHaveClass(/collapsed/);

    // Act
    // Click the toggle again to expand the folder
    await frontendToggle.click();

    // Assert
    // The folder should no longer be collapsed
    const hasCollapsedClass = await frontendFolderItem.evaluate((el) =>
      el.classList.contains("collapsed"),
    );
    expect(hasCollapsedClass).toBe(false);

    // The file should be visible again
    await expect(frontendFile).toBeVisible();

    // The toggle icon should change back to down-pointing
    const toggleText = await frontendToggle.textContent();
    expect(toggleText).toBe("▼");
  });

  test("should auto-expand folders when searching for files", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find the frontend folder toggle and collapse it
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    await frontendToggle.click();

    // Verify it's collapsed
    const frontendFolderItem = page.locator(".folder-item").filter({
      has: frontendToggle,
    });
    await expect(frontendFolderItem).toHaveClass(/collapsed/);

    // Act
    // Search for a file in the frontend folder
    await page.fill("#file-search", "script.ts");

    // Assert
    // The folder should be auto-expanded
    const hasCollapsedClass = await frontendFolderItem.evaluate((el) =>
      el.classList.contains("collapsed"),
    );
    expect(hasCollapsedClass).toBe(false);

    // The file should be visible
    const frontendFile = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );
    await expect(frontendFile).toBeVisible();

    // The toggle should show expanded state
    const toggleText = await frontendToggle.textContent();
    expect(toggleText).toBe("▼");
  });

  test("should keep folder collapsed state independent across different folders", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find two different folders
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    const srcToggle = page.locator('.folder-toggle[data-folder-path="src"]');

    // Verify both exist
    await expect(frontendToggle).toBeVisible();
    await expect(srcToggle).toBeVisible();

    // Verify both are expanded at the start
    const frontendFolderItem = page.locator(".folder-item").filter({
      has: frontendToggle,
    });
    const srcFolderItem = page.locator(".folder-item").filter({
      has: srcToggle,
    });

    // Both folder items should not have the collapsed class initially
    const frontendIsCollapsedInitially = await frontendFolderItem.evaluate(
      (el) => el.classList.contains("collapsed"),
    );
    const srcIsCollapsedInitially = await srcFolderItem.evaluate((el) =>
      el.classList.contains("collapsed"),
    );

    expect(frontendIsCollapsedInitially).toBe(false);
    expect(srcIsCollapsedInitially).toBe(false);

    // Act
    // Collapse only the frontend folder
    await frontendToggle.click();

    // Assert
    // Frontend should be collapsed
    await expect(frontendFolderItem).toHaveClass(/collapsed/);

    // Src should still be expanded
    const srcHasCollapsedClass = await srcFolderItem.evaluate((el) =>
      el.classList.contains("collapsed"),
    );
    expect(srcHasCollapsedClass).toBe(false);
  });

  test("should allow selecting files in collapsed folders via folder checkbox", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Find the frontend folder
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    const frontendFolderCheckbox = page.locator(
      'input.folder-checkbox[data-folder-path="frontend"]',
    );

    // Collapse the folder
    await frontendToggle.click();

    // Act
    // Check the folder checkbox while it's collapsed
    await frontendFolderCheckbox.check();

    // Assert
    // The folder checkbox should be checked
    await expect(frontendFolderCheckbox).toBeChecked();

    // Expand the folder to verify the file is checked
    await frontendToggle.click();

    const frontendFile = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );
    await expect(frontendFile).toBeChecked();
  });

  test("should preserve collapsed state when clearing search", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Wait for file tree to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Collapse the frontend folder
    const frontendToggle = page.locator(
      '.folder-toggle[data-folder-path="frontend"]',
    );
    await frontendToggle.click();

    // Collapse the src folder
    const srcToggle = page.locator('.folder-toggle[data-folder-path="src"]');
    await srcToggle.click();

    // Verify folders are collapsed
    const frontendFolderItem = page.locator(".folder-item").filter({
      has: frontendToggle,
    });
    const srcFolderItem = page.locator(".folder-item").filter({
      has: srcToggle,
    });

    await expect(frontendFolderItem).toHaveClass(/collapsed/);
    await expect(srcFolderItem).toHaveClass(/collapsed/);

    // Act
    // Search for a file
    await page.fill("#file-search", "package.json");

    // Clear the search
    await page.fill("#file-search", "");

    // Assert
    // The folders should still be collapsed
    await expect(frontendFolderItem).toHaveClass(/collapsed/);
    await expect(srcFolderItem).toHaveClass(/collapsed/);

    // Files within collapsed folders should not be visible
    const frontendFile = page.locator(
      'input.file-checkbox[value="frontend/script.ts"]',
    );
    await expect(frontendFile).not.toBeVisible();
  });
});
