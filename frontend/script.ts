interface RepoPathResponse { path: string; }
interface DiffResponse { [file: string]: string; }

type FileTreeNode = { [name: string]: FileTreeNode & { isFile?: boolean } } | { isFile?: boolean };

// Utility type guards
function isInput(el: Element | null): el is HTMLInputElement {
  return !!el && el instanceof HTMLInputElement;
}

function isHTMLElement(el: Element | null): el is HTMLElement {
  return !!el && el instanceof HTMLElement;
}

document.addEventListener('DOMContentLoaded', () => {
  const repoPathSpan = document.getElementById('repo-path') as HTMLElement | null;
  const fileTree = document.getElementById('file-tree') as HTMLElement | null;
  const diffForm = document.getElementById('diff-form') as HTMLFormElement | null;
  const diffSummary = document.getElementById('diff-summary') as HTMLElement | null;

  const startCommitInput = document.getElementById('start-commit') as HTMLInputElement | null;
  const endCommitInput = document.getElementById('end-commit') as HTMLInputElement | null;

  if (!repoPathSpan || !fileTree || !diffForm || !diffSummary || !startCommitInput || !endCommitInput) {
    console.error('Missing required DOM elements.');
    return;
  }


  let repoPath = '';

  // Fetch and display the repository path
  fetch('/api/repo-path')
    .then<RepoPathResponse>(response => response.json())
    .then(data => {
      repoPath = data.path;
      repoPathSpan.textContent = repoPath;
      loadSavedData();
    })
    .catch(error => {
      console.error('Error fetching repository path:', error);
      repoPathSpan.textContent = 'Could not load repository path.';
    });

  function loadSavedData(): void {
    const savedStartCommit = localStorage.getItem(`startCommit_${repoPath}`) || '';
    const savedEndCommit = localStorage.getItem(`endCommit_${repoPath}`) || '';
    let savedSelectedFiles: string[] = [];
    try {
      const rawSavedSelectedFiles = localStorage.getItem(`selectedFiles_${repoPath}`);
      savedSelectedFiles = rawSavedSelectedFiles ? JSON.parse(rawSavedSelectedFiles) : [];
      if (!Array.isArray(savedSelectedFiles)) {
        savedSelectedFiles = [];
      }
    } catch (e) {
      console.error('Error parsing saved selected files:', e);
      savedSelectedFiles = [];
    }

    if (savedStartCommit) startCommitInput!.value = savedStartCommit;
    if (savedEndCommit) endCommitInput!.value = savedEndCommit;

    // Fetch files and build the file tree
    fetch('/api/files')
      .then<string[]>(response => response.json())
      .then(files => {
        if (!Array.isArray(files)) {
          throw new Error('Files response is not an array');
        }
        buildFileTree(files, fileTree!);
        // Apply saved selections after the tree is built
        applySavedSelections(savedSelectedFiles);
      })
      .catch(error => {
        console.error('Error fetching files:', error);
        fileTree!.innerHTML = '<p class="text-danger">Could not load file tree.</p>';
      });
  }

  diffForm.addEventListener('submit', async (event: Event) => {
    event.preventDefault();

    const startCommit = startCommitInput.value.trim();
    const endCommit = endCommitInput.value.trim();
    const selectedFiles = getSelectedFiles();

    if (!startCommit || !endCommit || selectedFiles.length === 0) {
      alert('Please fill in all fields and select at least one file.');
      return;
    }

    try {
      const response = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startCommit, endCommit, files: selectedFiles })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || 'Failed to fetch diff');
      }

      const diffs: DiffResponse = await response.json();
      displayDiffs(diffs);

      // Save data after successful diff generation
      localStorage.setItem(`startCommit_${repoPath}`, startCommit);
      localStorage.setItem(`endCommit_${repoPath}`, endCommit);
      localStorage.setItem(`selectedFiles_${repoPath}`, JSON.stringify(selectedFiles));
    } catch (error: unknown) {
      console.error('Error fetching diff:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      diffSummary.innerHTML = `<div class="alert alert-danger">${escapeHtml(message)}</div>`;
    }
  });

  function buildFileTree(files: string[], container: HTMLElement): void {
    type TreeNode = { [key: string]: TreeNode } & { isFile?: boolean };
    const tree: TreeNode = {} as TreeNode;

    files.forEach(file => {
      let currentLevel: any = tree; // iterative building
      const parts = file.split('/');
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
  }

  function createTreeHtml(tree: any, path: string = ''): string {
    let html = '<ul class="list-unstyled">';
    for (const key in tree) {
      if (!Object.prototype.hasOwnProperty.call(tree, key)) continue;
      const newPath = path ? `${path}/${key}` : key;
      if (tree[key].isFile) {
        html += `<li><input type="checkbox" value="${escapeHtml(newPath)}" class="mr-2">${escapeHtml(key)}</li>`;
      } else {
        html += `<li><strong>${escapeHtml(key)}</strong>${createTreeHtml(tree[key], newPath)}</li>`;
      }
    }
    html += '</ul>';
    return html;
  }

  function getSelectedFiles(): string[] {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('#file-tree input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
  }

  function displayDiffs(diffs: DiffResponse): void {
    diffSummary!.innerHTML = '';
    for (const file in diffs) {
      if (!Object.prototype.hasOwnProperty.call(diffs, file)) continue;
      const diffContainer = document.createElement('div');
      diffContainer.className = 'diff-container';

      const header = document.createElement('div');
      header.className = 'diff-header';
      header.textContent = file;

      const content = document.createElement('div');
      content.className = 'diff-content';
      content.innerHTML = formatDiff(diffs[file]);

      diffContainer.appendChild(header);
      diffContainer.appendChild(content);
      diffSummary!.appendChild(diffContainer);
    }
  }

  function applySavedSelections(filesToSelect: string[]): void {
    if (!filesToSelect || filesToSelect.length === 0) return;
    // Wait for the file tree to be rendered before trying to select checkboxes
    // This is a simple delay, a more robust solution might use MutationObserver
    setTimeout(() => {
      const checkboxes = document.querySelectorAll<HTMLInputElement>('#file-tree input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        if (filesToSelect.includes(checkbox.value)) {
          checkbox.checked = true;
        }
      });
    }, 100); // Small delay to ensure elements are rendered
  }

  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDiff(diff: string): string {
    return diff.split('\n').map(line => {
      const escapedLine = escapeHtml(line);
      if (line.startsWith('+')) {
        return `<span class="addition">${escapedLine}</span>`;
      } else if (line.startsWith('-')) {
        return `<span class="deletion">${escapedLine}</span>`;
      }
      return escapedLine;
    }).join('\n');
  }
});
