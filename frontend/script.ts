interface RepoPathResponse {
  path: string;
}
interface DiffResponse {
  [file: string]: string;
}

type FileTreeNode = { [name: string]: FileTreeNode } & { isFile?: boolean };

document.addEventListener("DOMContentLoaded", () => {
  const repoPathSpan = document.getElementById(
    "repo-path",
  ) as HTMLElement | null;
  const fileTree = document.getElementById("file-tree") as HTMLElement | null;
  const diffForm = document.getElementById(
    "diff-form",
  ) as HTMLFormElement | null;
  const diffSummary = document.getElementById(
    "diff-summary",
  ) as HTMLElement | null;

  const startCommitInput = document.getElementById(
    "start-commit",
  ) as HTMLInputElement | null;
  const endCommitInput = document.getElementById(
    "end-commit",
  ) as HTMLInputElement | null;
  const fileSearchInput = document.getElementById(
    "file-search",
  ) as HTMLInputElement | null;
  const selectAllCheckbox = document.getElementById(
    "select-all",
  ) as HTMLInputElement | null;

  if (
    !repoPathSpan ||
    !fileTree ||
    !diffForm ||
    !diffSummary ||
    !startCommitInput ||
    !endCommitInput ||
    !fileSearchInput ||
    !selectAllCheckbox
  ) {
    console.error("Missing required DOM elements.");
    return;
  }

  let repoPath = "";

  // Store the collapsed state of folders before auto-expanding during search
  const savedCollapsedState = new Map<Element, boolean>();
  let isSearchActive = false; // Track if a search is currently active

  // Fetch and display the repository path
  fetch("/api/repo-path")
    .then<RepoPathResponse>((response) => response.json())
    .then((data) => {
      repoPath = data.path;
      repoPathSpan.textContent = repoPath;
      loadSavedData();
    })
    .catch((error) => {
      console.error("Error fetching repository path:", error);
      repoPathSpan.textContent = "Could not load repository path.";
    });

  // Add search functionality
  fileSearchInput.addEventListener("input", () => {
    filterFileTree(fileSearchInput.value.toLowerCase());
    updateSelectAllState();
  });

  // Add select all functionality
  selectAllCheckbox.addEventListener("change", () => {
    const isChecked = selectAllCheckbox.checked;
    const checkboxes = getVisibleFileCheckboxes();
    checkboxes.forEach((checkbox) => {
      checkbox.checked = isChecked;
    });
  });

  function filterFileTree(searchTerm: string): void {
    if (!fileTree) return;

    const allItems = fileTree.querySelectorAll("li");

    if (!searchTerm) {
      // Show all items if search is empty and restore collapsed states
      allItems.forEach((item) => {
        const htmlItem = item as HTMLElement;
        htmlItem.style.display = "";

        // Restore the original collapsed state if it was saved during search
        if (htmlItem.classList.contains("folder-item")) {
          const wasCollapsed = savedCollapsedState.get(htmlItem);
          if (wasCollapsed !== undefined) {
            const nestedList =
              htmlItem.querySelector<HTMLElement>(":scope > ul");
            const toggle =
              htmlItem.querySelector<HTMLElement>(".folder-toggle");

            if (wasCollapsed) {
              // Restore to collapsed state
              htmlItem.classList.add("collapsed");
              if (nestedList) nestedList.style.display = "none";
              if (toggle) toggle.textContent = "▶";
            } else {
              // Restore to expanded state
              htmlItem.classList.remove("collapsed");
              if (nestedList) nestedList.style.display = "";
              if (toggle) toggle.textContent = "▼";
            }
          } else if (htmlItem.classList.contains("collapsed")) {
            // If no saved state, but folder is collapsed, re-hide its nested content
            const nestedList =
              htmlItem.querySelector<HTMLElement>(":scope > ul");
            if (nestedList) {
              nestedList.style.display = "none";
            }
          }
        }
      });

      // Clear the saved state and reset the search active flag
      savedCollapsedState.clear();
      isSearchActive = false;
      return;
    }

    // Save the current collapsed state only when transitioning from no search to search
    if (!isSearchActive) {
      allItems.forEach((item) => {
        if ((item as HTMLElement).classList.contains("folder-item")) {
          const isCollapsed = (item as HTMLElement).classList.contains(
            "collapsed",
          );
          savedCollapsedState.set(item, isCollapsed);
        }
      });
      isSearchActive = true;
    }

    allItems.forEach((item) => {
      const fileCheckbox = item.querySelector("input.file-checkbox");
      if (fileCheckbox) {
        // This is a file item
        const filePath = (fileCheckbox as HTMLInputElement).value.toLowerCase();
        if (filePath.includes(searchTerm)) {
          (item as HTMLElement).style.display = "";
          // Show all parent folders and expand them
          let parent = item.parentElement;
          while (parent && parent !== fileTree) {
            if (parent.tagName === "LI") {
              (parent as HTMLElement).style.display = "";
              // Auto-expand parent folders when searching
              if (parent.classList.contains("folder-item")) {
                parent.classList.remove("collapsed");
                const nestedList =
                  parent.querySelector<HTMLElement>(":scope > ul");
                const toggle =
                  parent.querySelector<HTMLElement>(".folder-toggle");
                if (nestedList) nestedList.style.display = "";
                if (toggle) toggle.textContent = "▼";
              }
            }
            parent = parent.parentElement;
          }
        } else {
          (item as HTMLElement).style.display = "none";
        }
      } else {
        // This is a folder item - initially hide it
        // It will be shown if any of its children match
        (item as HTMLElement).style.display = "none";
      }
    });
  }

  function loadSavedData(): void {
    const savedStartCommit =
      localStorage.getItem(`startCommit_${repoPath}`) || "";
    const savedEndCommit = localStorage.getItem(`endCommit_${repoPath}`) || "";
    let savedSelectedFiles: string[] = [];
    try {
      const rawSavedSelectedFiles = localStorage.getItem(
        `selectedFiles_${repoPath}`,
      );
      savedSelectedFiles = rawSavedSelectedFiles
        ? JSON.parse(rawSavedSelectedFiles)
        : [];
      if (!Array.isArray(savedSelectedFiles)) {
        savedSelectedFiles = [];
      }
    } catch (e) {
      console.error("Error parsing saved selected files:", e);
      savedSelectedFiles = [];
    }

    if (savedStartCommit && startCommitInput) {
      startCommitInput.value = savedStartCommit;
    }
    if (savedEndCommit && endCommitInput) {
      endCommitInput.value = savedEndCommit;
    }

    // Fetch files and build the file tree
    fetch("/api/files")
      .then<string[]>((response) => response.json())
      .then((files) => {
        if (!Array.isArray(files)) {
          throw new Error("Files response is not an array");
        }
        if (fileTree) {
          buildFileTree(files, fileTree);
        }
        // Apply saved selections after the tree is built
        applySavedSelections(savedSelectedFiles);
      })
      .catch((error) => {
        console.error("Error fetching files:", error);
        if (fileTree) {
          fileTree.innerHTML =
            '<p class="text-danger">Could not load file tree.</p>';
        }
      });
  }

  function handleFolderToggle(toggleElement: HTMLElement): void {
    const folderItem = toggleElement.closest(".folder-item");
    if (!folderItem) return;

    const nestedList = folderItem.querySelector<HTMLElement>(":scope > ul");
    if (!nestedList) return;

    // Toggle the collapsed state
    const isCollapsed = folderItem.classList.contains("collapsed");

    if (isCollapsed) {
      // Expand the folder
      folderItem.classList.remove("collapsed");
      nestedList.style.display = "";
      toggleElement.textContent = "▼";
    } else {
      // Collapse the folder
      folderItem.classList.add("collapsed");
      nestedList.style.display = "none";
      toggleElement.textContent = "▶";
    }
  }

  diffForm.addEventListener("submit", async (event: Event) => {
    event.preventDefault();

    const startCommit = startCommitInput.value.trim();
    const endCommit = endCommitInput.value.trim();
    const selectedFiles = getSelectedFiles();

    if (!startCommit || !endCommit || selectedFiles.length === 0) {
      alert("Please fill in all fields and select at least one file.");
      return;
    }

    try {
      const response = await fetch("/api/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startCommit, endCommit, files: selectedFiles }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to fetch diff");
      }

      const diffs: DiffResponse = await response.json();
      displayDiffs(diffs);

      // Save data after successful diff generation
      localStorage.setItem(`startCommit_${repoPath}`, startCommit);
      localStorage.setItem(`endCommit_${repoPath}`, endCommit);
      localStorage.setItem(
        `selectedFiles_${repoPath}`,
        JSON.stringify(selectedFiles),
      );
    } catch (error: unknown) {
      console.error("Error fetching diff:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      diffSummary.innerHTML = `<div class="alert alert-danger">${escapeHtml(message)}</div>`;
    }
  });

  function buildFileTree(files: string[], container: HTMLElement): void {
    const tree: FileTreeNode = {};

    files.forEach((file) => {
      let currentLevel = tree; // iterative building
      const parts = file.split("/");
      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        if (index === parts.length - 1) {
          currentLevel[part].isFile = true;
        }
        currentLevel = currentLevel[part];
      });
    });

    container.innerHTML = createTreeHtml(tree);

    // Add event listeners to folder toggle icons
    const folderToggles =
      container.querySelectorAll<HTMLElement>(".folder-toggle");
    folderToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        handleFolderToggle(toggle);
      });
    });

    // Add event listeners to file checkboxes to update select all state and folder states
    const fileCheckboxes = container.querySelectorAll<HTMLInputElement>(
      "input.file-checkbox",
    );
    fileCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        updateFolderCheckboxStates();
        updateSelectAllState();
      });
    });

    // Add event listeners to folder checkboxes to select/deselect all files in folder
    const folderCheckboxes = container.querySelectorAll<HTMLInputElement>(
      "input.folder-checkbox",
    );
    folderCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        handleFolderCheckboxChange(checkbox);
      });
    });

    // Initialize folder checkbox states and select all state
    updateFolderCheckboxStates();
    updateSelectAllState();
  }

  function createTreeHtml(tree: FileTreeNode, path: string = ""): string {
    let html = '<ul class="list-unstyled">';
    for (const key in tree) {
      if (!Object.keys(tree).includes(key)) continue;
      const newPath = path ? `${path}/${key}` : key;
      if (tree[key].isFile) {
        html += `<li><input type="checkbox" value="${escapeHtml(newPath)}" class="file-checkbox mr-2">${escapeHtml(key)}</li>`;
      } else {
        html += `<li class="folder-item">
          <span class="folder-toggle" data-folder-path="${escapeHtml(newPath)}">▼</span>
          <input type="checkbox" class="folder-checkbox mr-2" data-folder-path="${escapeHtml(newPath)}">
          <strong>${escapeHtml(key)}</strong>
          ${createTreeHtml(tree[key], newPath)}
        </li>`;
      }
    }
    html += "</ul>";
    return html;
  }

  function getSelectedFiles(): string[] {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      "#file-tree input.file-checkbox:checked",
    );
    return Array.from(checkboxes).map((checkbox) => checkbox.value);
  }

  function getVisibleFileCheckboxes(): HTMLInputElement[] {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      "#file-tree input.file-checkbox",
    );
    return Array.from(checkboxes).filter((checkbox) => {
      const listItem = checkbox.closest("li");
      return listItem && (listItem as HTMLElement).style.display !== "none";
    });
  }

  function updateSelectAllState(): void {
    if (!selectAllCheckbox) return;

    const visibleCheckboxes = getVisibleFileCheckboxes();
    if (visibleCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    const checkedCount = visibleCheckboxes.filter(
      (checkbox) => checkbox.checked,
    ).length;

    if (checkedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === visibleCheckboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  function handleFolderCheckboxChange(folderCheckbox: HTMLInputElement): void {
    const folderPath = folderCheckbox.getAttribute("data-folder-path");
    if (!folderPath) return;

    const isChecked = folderCheckbox.checked;

    // Find the parent <li> element
    const folderListItem = folderCheckbox.closest("li");
    if (!folderListItem) return;

    // Get all file checkboxes within this folder (direct and nested)
    const fileCheckboxes = folderListItem.querySelectorAll<HTMLInputElement>(
      "input.file-checkbox",
    );

    // Update all file checkboxes within this folder
    fileCheckboxes.forEach((checkbox) => {
      checkbox.checked = isChecked;
    });

    // Update folder checkbox states (this will also update nested folders)
    updateFolderCheckboxStates();
    updateSelectAllState();
  }

  function updateFolderCheckboxStates(): void {
    // Get all folder checkboxes, process from deepest to shallowest
    const folderCheckboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>("input.folder-checkbox"),
    );

    // Sort by depth (deepest first) to ensure child folders are processed before parents
    folderCheckboxes.sort((a, b) => {
      const depthA = (a.getAttribute("data-folder-path") || "").split(
        "/",
      ).length;
      const depthB = (b.getAttribute("data-folder-path") || "").split(
        "/",
      ).length;
      return depthB - depthA;
    });

    folderCheckboxes.forEach((folderCheckbox) => {
      const folderListItem = folderCheckbox.closest("li");
      if (!folderListItem) return;

      // Get all file checkboxes within this folder
      const fileCheckboxes = folderListItem.querySelectorAll<HTMLInputElement>(
        "input.file-checkbox",
      );

      // If no files in this folder, check for nested folders
      if (fileCheckboxes.length === 0) {
        // This folder only has subfolders, check the subfolders' states
        const subfolderCheckboxes = Array.from(
          folderListItem.querySelectorAll<HTMLInputElement>(
            "input.folder-checkbox",
          ),
        ).filter((cb) => cb !== folderCheckbox);

        if (subfolderCheckboxes.length === 0) {
          // Empty folder
          folderCheckbox.checked = false;
          folderCheckbox.indeterminate = false;
          return;
        }

        const allSubfoldersChecked = subfolderCheckboxes.every(
          (cb) => cb.checked && !cb.indeterminate,
        );
        const someSubfoldersChecked = subfolderCheckboxes.some(
          (cb) => cb.checked || cb.indeterminate,
        );

        if (allSubfoldersChecked) {
          folderCheckbox.checked = true;
          folderCheckbox.indeterminate = false;
        } else if (someSubfoldersChecked) {
          folderCheckbox.checked = false;
          folderCheckbox.indeterminate = true;
        } else {
          folderCheckbox.checked = false;
          folderCheckbox.indeterminate = false;
        }
        return;
      }

      // Count checked files
      const checkedCount = Array.from(fileCheckboxes).filter(
        (cb) => cb.checked,
      ).length;

      // Also check if there are any subfolders with checked/indeterminate states
      const subfolderCheckboxes = Array.from(
        folderListItem.querySelectorAll<HTMLInputElement>(
          "input.folder-checkbox",
        ),
      ).filter((cb) => cb !== folderCheckbox);

      const someSubfoldersChecked = subfolderCheckboxes.some(
        (cb) => cb.checked || cb.indeterminate,
      );

      if (checkedCount === 0 && !someSubfoldersChecked) {
        folderCheckbox.checked = false;
        folderCheckbox.indeterminate = false;
      } else if (
        checkedCount === fileCheckboxes.length &&
        !someSubfoldersChecked
      ) {
        folderCheckbox.checked = true;
        folderCheckbox.indeterminate = false;
      } else {
        folderCheckbox.checked = false;
        folderCheckbox.indeterminate = true;
      }
    });
  }

  function displayDiffs(diffs: DiffResponse): void {
    if (diffSummary) diffSummary.innerHTML = "";
    for (const file in diffs) {
      if (!Object.keys(diffs).includes(file)) continue;
      const diffContainer = document.createElement("div");
      diffContainer.className = "diff-container";

      const header = document.createElement("div");
      header.className = "diff-header";
      header.textContent = file;

      const content = document.createElement("div");
      content.className = "diff-content";
      content.innerHTML = formatDiff(diffs[file]);

      diffContainer.appendChild(header);
      diffContainer.appendChild(content);
      diffSummary?.appendChild(diffContainer);
    }
  }

  function applySavedSelections(filesToSelect: string[]): void {
    if (!filesToSelect || filesToSelect.length === 0) return;
    // Wait for the file tree to be rendered before trying to select checkboxes
    // This is a simple delay, a more robust solution might use MutationObserver
    setTimeout(() => {
      const checkboxes = document.querySelectorAll<HTMLInputElement>(
        "#file-tree input.file-checkbox",
      );
      checkboxes.forEach((checkbox) => {
        if (filesToSelect.includes(checkbox.value)) {
          checkbox.checked = true;
        }
      });
      // Update folder checkbox states after applying saved selections
      updateFolderCheckboxStates();
    }, 100); // Small delay to ensure elements are rendered
  }

  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDiff(diff: string): string {
    return diff
      .split("\n")
      .map((line) => {
        const escapedLine = escapeHtml(line);
        if (line.startsWith("+")) {
          return `<span class="addition">${escapedLine}</span>`;
        } else if (line.startsWith("-")) {
          return `<span class="deletion">${escapedLine}</span>`;
        }
        return escapedLine;
      })
      .join("\n");
  }
});
