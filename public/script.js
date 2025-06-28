document.addEventListener('DOMContentLoaded', () => {
    const fileTree = document.getElementById('file-tree');
    const diffForm = document.getElementById('diff-form');
    const diffSummary = document.getElementById('diff-summary');

    const startCommitInput = document.getElementById('start-commit');
    const endCommitInput = document.getElementById('end-commit');

    // Load saved data on page load
    const savedStartCommit = localStorage.getItem('startCommit');
    const savedEndCommit = localStorage.getItem('endCommit');
    let savedSelectedFiles = [];
    try {
        savedSelectedFiles = JSON.parse(localStorage.getItem('selectedFiles')) || [];
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
        .then(response => response.json())
        .then(files => {
            buildFileTree(files, fileTree);
            // Apply saved selections after the tree is built
            applySavedSelections(savedSelectedFiles);
        })
        .catch(error => {
            console.error('Error fetching files:', error);
            fileTree.innerHTML = '<p class="text-danger">Could not load file tree.</p>';
        });

    diffForm.addEventListener('submit', async (event) => {
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
                body: JSON.stringify({ startCommit, endCommit, files: selectedFiles })
            });

            if (!response.ok) {
                throw new Error((await response.json()).error);
            }

            const diffs = await response.json();
            displayDiffs(diffs);

            // Save data after successful diff generation
            localStorage.setItem('startCommit', startCommit);
            localStorage.setItem('endCommit', endCommit);
            localStorage.setItem('selectedFiles', JSON.stringify(selectedFiles));

        } catch (error) {
            console.error('Error fetching diff:', error);
            diffSummary.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    });

    function buildFileTree(files, container) {
        const tree = {};

        files.forEach(file => {
            let currentLevel = tree;
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

    function createTreeHtml(tree, path = '') {
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

    function getSelectedFiles() {
        const checkboxes = document.querySelectorAll('#file-tree input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    function displayDiffs(diffs) {
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
    function applySavedSelections(filesToSelect) {
        if (!filesToSelect || filesToSelect.length === 0) {
            return;
        }
        // Wait for the file tree to be rendered before trying to select checkboxes
        // This is a simple delay, a more robust solution might use MutationObserver
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#file-tree input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (filesToSelect.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
        }, 100); // Small delay to ensure elements are rendered
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDiff(diff) {
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