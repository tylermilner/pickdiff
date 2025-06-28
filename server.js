const express = require('express');
const simpleGit = require('simple-git');
const path = require('path');

const app = express();
const port = 3000;

// Use the current working directory for git operations
const git = simpleGit();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/files', async (req, res) => {
  try {
    // Using git ls-files to get all tracked files
    const files = await git.lsFiles();
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
            const diff = await git.diff([`${startCommit}..${endCommit}`, '--', file]);
            diffs[file] = diff;
        }
        res.json(diffs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
