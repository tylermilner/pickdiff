import express, { Request, Response, Application } from 'express';
import { SimpleGit } from 'simple-git';
import * as path from 'path';

const simpleGit = require('simple-git');

interface DiffRequest {
  startCommit: string;
  endCommit: string;
  files: string[];
}

interface DiffResponse {
  [fileName: string]: string;
}

interface RepoPathResponse {
  path: string;
}

function createApp(git: SimpleGit, repoPath: string): Application {
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  app.get('/api/repo-path', (req: Request, res: Response<RepoPathResponse>) => {
    res.json({ path: repoPath });
  });

  app.get('/api/files', async (req: Request, res: Response<string[] | { error: string }>) => {
    try {
      // Using git ls-files to get all tracked files
      const files = (await git.raw(['ls-files'])).split('\n').filter(Boolean);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/diff', async (req: Request<{}, DiffResponse | { error: string }, DiffRequest>, res: Response<DiffResponse | { error: string }>) => {
    const { startCommit, endCommit, files } = req.body;

    if (!startCommit || !endCommit || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    try {
      const diffs: DiffResponse = {};
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
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return app;
}

// Only start the server if this file is run directly
if (require.main === module) {
  const port: number = parseInt(process.env.PORT || '3000', 10);
  const repoPath: string = process.argv[2] || process.cwd();
  const git: SimpleGit = simpleGit(repoPath);
  const app = createApp(git, repoPath);
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Using repository at: ${repoPath}`);
  });
}

export { createApp };