interface RepoPathResponse {
    path: string;
}

interface DiffRequest {
    startCommit: string;
    endCommit: string;
    files: string[];
}

interface DiffResponse {
    [fileName: string]: string;
}

interface FileTree {
    [key: string]: FileTree & { isFile?: boolean };
}

document.addEventListener('DOMContentLoaded', (): void => {
    const repoPathSpan = document.getElementById('repo-path') as HTMLSpanElement;
    const fileTree = document.getElementById('file-tree') as HTMLDivElement;
    const diffForm = document.getElementById('diff-form') as HTMLFormElement;
    const diffSummary = document.getElementById('diff-summary') as HTMLDivElement;

    const startCommitInput = document.getElementById('start-commit') as HTMLInputElement;
    const endCommitInput = document.getElementById('end-commit') as HTMLInputElement;

    let repoPath: string = '';

    // Fetch and display the repository path
    fetch('/api/repo-path')
        .then((response: Response) => response.json())
        .then((data: unknown) => {
            const repoData = data as RepoPathResponse;
            repoPath = repoData.path;
            repoPathSpan.textContent = repoPath;
            loadSavedData();
        })
        .catch((error: Error) => {
            console.error('Error fetching repository path:', error);
            repoPathSpan.textContent = 'Could not load repository path.';
        });

    function loadSavedData(): void {
        const savedStartCommit = localStorage.getItem(`startCommit_${repoPath}`);
        const savedEndCommit = localStorage.getItem(`endCommit_${repoPath}`);
        let savedSelectedFiles: string[] = [];
        try {
            savedSelectedFiles = JSON.parse(localStorage.getItem(`selectedFiles_${repoPath}`) || '[]') || [];
        } catch (e) {
            console.error("Error parsing saved selected files:", e);
            savedSelectedFiles = [];
        }

        if (savedStartCommit) {
            startCommitInput.value = savedStartCommit;
        }
        if (savedEndCommit) {
            endCommitInput.value = savedEndCommit;
        }

        // Fetch files and build the file tree
        fetch('/api/files')
            .then((response: Response) => response.json())
            .then((files: unknown) => {
                const fileList = files as string[];
                buildFileTree(fileList, fileTree);
                // Apply saved selections after the tree is built
                applySavedSelections(savedSelectedFiles);
            })
            .catch((error: Error) => {
                console.error('Error fetching files:', error);
                fileTree.innerHTML = '<p class="text-danger">Could not load file tree.</p>';
            });
    }

    diffForm.addEventListener('submit', async (event: Event): Promise<void> => {
        event.preventDefault();

        const startCommit = startCommitInput.value;
        const endCommit = endCommitInput.value;
        const selectedFiles = getSelectedFiles();

        if (!startCommit || !endCommit || selectedFiles.length === 0) {
            alert('Please fill in all fields and select at least one file.');
            return;
        }

        try {
            const response = await fetch('/api/diff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ startCommit, endCommit, files: selectedFiles } as DiffRequest)
            });

            if (!response.ok) {
                const errorData = await response.json() as { error: string };
                throw new Error(errorData.error);
            }

            const diffs = await response.json() as DiffResponse;
            displayDiffs(diffs);

            // Save data after successful diff generation
            localStorage.setItem(`startCommit_${repoPath}`, startCommit);
            localStorage.setItem(`endCommit_${repoPath}`, endCommit);
            localStorage.setItem(`selectedFiles_${repoPath}`, JSON.stringify(selectedFiles));

        } catch (error) {
            console.error('Error fetching diff:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            diffSummary.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;
        }
    });

    function buildFileTree(files: string[], container: HTMLElement): void {
        const tree: FileTree = {};

        files.forEach((file: string) => {
            let currentLevel = tree;
            const parts = file.split('/');
            parts.forEach((part: string, index: number) => {
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

    function createTreeHtml(tree: FileTree, path: string = ''): string {
        let html = '<ul class="list-unstyled">';
        for (const key in tree) {
            const newPath = path ? `${path}/${key}` : key;
            if (tree[key].isFile) {
                html += `<li><input type="checkbox" value="${newPath}" class="mr-2">${key}</li>`;
            } else {
                html += `<li><strong>${key}</strong>${createTreeHtml(tree[key], newPath)}</li>`;
            }
        }
        html += '</ul>';
        return html;
    }

    function getSelectedFiles(): string[] {
        const checkboxes = document.querySelectorAll('#file-tree input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
        return Array.from(checkboxes).map((checkbox: HTMLInputElement) => checkbox.value);
    }

    function displayDiffs(diffs: DiffResponse): void {
        diffSummary.innerHTML = '';
        for (const file in diffs) {
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
            diffSummary.appendChild(diffContainer);
        }
    }

    // New function to apply saved selections
    function applySavedSelections(filesToSelect: string[]): void {
        if (!filesToSelect || filesToSelect.length === 0) {
            return;
        }
        // Wait for the file tree to be rendered before trying to select checkboxes
        // This is a simple delay, a more robust solution might use MutationObserver
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#file-tree input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach((checkbox: HTMLInputElement) => {
                if (filesToSelect.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
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
        return diff.split('\n').map((line: string) => {
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