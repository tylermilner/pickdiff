const express = require('express');
const simpleGit = require('simple-git');
const path = require('path');

const app = express();
const port = 3000;

// Check for a repository path from the command line
const repoPath = process.argv[2] || process.cwd();

// Use the provided path or the current working directory for git operations
const git = simpleGit(repoPath);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/repo-path', (req, res) => {
  res.json({ path: repoPath });
});

app.get('/api/files', async (req, res) => {
  try {
    // Using git ls-files to get all tracked files
    const files = (await git.raw(['ls-files'])).split('\n').filter(Boolean);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/diff', async (req, res) => {
    const { startCommit, endCommit, files } = req.body;

    if (!startCommit || !endCommit || !files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }

    try {
        const diffs = {};
        for (const file of files) {
            let diff = await git.diff([`${startCommit}..${endCommit}`, '--', file]);

            if (!diff) { // If diff is empty, it means the file is either new or unchanged
                const fileContent = await git.show([`${endCommit}:${file}`]);
                diff = fileContent.split('\n').map(line => `+${line}`).join('\n');
            }
            diffs[file] = diff;
        }
        res.json(diffs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Using repository at: ${repoPath}`);
});
