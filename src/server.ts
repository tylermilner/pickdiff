import path from "node:path";
import express, { type Express, type Request, type Response } from "express";
import simpleGit, { type SimpleGit } from "simple-git";

interface DiffLine {
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Parse git diff output to extract line numbers and content.
 * Processes hunk headers (@@ -oldStart,oldCount +newStart,newCount @@) to track line numbers.
 * @param diff The raw diff output from git
 * @returns Array of diff lines with line numbers
 */
function parseDiffWithLineNumbers(diff: string): DiffLine[] {
  const lines = diff.split("\n");
  const diffLines: DiffLine[] = [];
  let oldLineNumber = 0;
  let newLineNumber = 0;
  let inContent = false;

  for (const line of lines) {
    // Parse hunk header to get starting line numbers
    if (line.startsWith("@@ ")) {
      inContent = true;
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNumber = Number.parseInt(match[1], 10);
        newLineNumber = Number.parseInt(match[2], 10);
      } else {
        // Log warning for malformed hunk header
        console.warn(`Failed to parse hunk header: ${line}`);
      }
      continue;
    }

    // Skip header lines before first hunk
    if (!inContent) {
      continue;
    }

    // Skip empty lines (e.g., from trailing newline in git output)
    if (!line) {
      continue;
    }

    // Process content lines
    if (line.startsWith("+")) {
      // Addition: only has new line number
      diffLines.push({
        content: line,
        newLineNumber: newLineNumber,
      });
      newLineNumber++;
    } else if (line.startsWith("-")) {
      // Deletion: only has old line number
      diffLines.push({
        content: line,
        oldLineNumber: oldLineNumber,
      });
      oldLineNumber++;
    } else {
      // Context line: has both line numbers
      diffLines.push({
        content: line,
        oldLineNumber: oldLineNumber,
        newLineNumber: newLineNumber,
      });
      oldLineNumber++;
      newLineNumber++;
    }
  }

  return diffLines;
}

/**
 * Strip git diff headers from diff output, keeping only the actual diff content.
 * Removes header lines like:
 * - diff --git a/file b/file
 * - index abc123..def456
 * - --- a/file
 * - +++ b/file
 * - @@ -1,3 +1,4 @@ (hunk headers - used as markers for where content begins)
 * @param diff The raw diff output from git
 * @returns The diff content without headers (only the actual +/- lines and context)
 */
function stripDiffHeaders(diff: string): string {
  const lines = diff.split("\n");
  let inContent = false;
  const contentLines: string[] = [];
  for (const line of lines) {
    // Skip all hunk header lines; first one flips us into content mode.
    if (line.startsWith("@@ ")) {
      inContent = true;
      continue; // never include the hunk header itself
    }
    // Skip non-content header lines until first hunk encountered.
    if (!inContent) {
      continue;
    }
    contentLines.push(line);
  }
  return contentLines.join("\n");
}

function createApp(git: SimpleGit, repoPath: string): Express {
  const app: Express = express();
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(express.json());

  app.get("/api/repo-path", (_req: Request, res: Response) => {
    res.json({ path: repoPath });
  });

  app.get("/api/files", async (_req: Request, res: Response) => {
    try {
      // Using git ls-files to get all tracked files
      const filesOutput: string = await git.raw(["ls-files"]);
      const files: string[] = filesOutput.split("\n").filter(Boolean);
      res.json(files);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to list files",
      });
    }
  });

  app.post("/api/diff", async (req: Request, res: Response) => {
    const {
      startCommit,
      endCommit,
      files,
      contextLines = 3, // default to 3 if not provided
    }: {
      startCommit: string;
      endCommit: string;
      files: string[];
      contextLines?: number;
    } = req.body;

    if (!startCommit || !endCommit || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    // Validate contextLines is a positive number
    const validContextLines =
      typeof contextLines === "number" && contextLines > 0 ? contextLines : 3;

    try {
      const diffs: Record<string, DiffLine[]> = {};
      const excludedFiles: string[] = [];
      for (const file of files) {
        // Check if file exists in the end commit
        try {
          await git.raw(["cat-file", "-e", `${endCommit}:${file}`]);
        } catch {
          // File doesn't exist in end commit, skip it
          excludedFiles.push(file);
          continue;
        }

        const rawDiff: string = await git.diff([
          `${startCommit}..${endCommit}`,
          `-U${validContextLines}`,
          "--",
          file,
        ]);

        let diffLines: DiffLine[];

        if (!rawDiff) {
          // If diff is empty, check if file exists in start commit
          let fileExistsInStartCommit = false;
          try {
            await git.raw(["cat-file", "-e", `${startCommit}:${file}`]);
            fileExistsInStartCommit = true;
          } catch {
            // File doesn't exist in start commit
            fileExistsInStartCommit = false;
          }

          if (fileExistsInStartCommit) {
            // File exists in both commits with no changes - use special marker
            diffLines = [{ content: "NO_CHANGES" }];
          } else {
            // File is new in end commit - show as all additions
            const fileContent: string = await git.show([
              `${endCommit}:${file}`,
            ]);
            diffLines = fileContent.split("\n").map((line, index) => ({
              content: `+${line}`,
              newLineNumber: index + 1,
            }));
          }
        } else {
          // Parse diff with line numbers
          diffLines = parseDiffWithLineNumbers(rawDiff);
        }

        diffs[file] = diffLines;
      }
      res.json({ diffs, excludedFiles });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get diffs",
      });
    }
  });

  return app;
}

// Only start the server if this file is run directly
if (require.main === module) {
  const port: number = parseInt(process.env.PORT || "3000", 10);
  const repoPath: string = process.argv[2] || process.cwd();
  const git: SimpleGit = simpleGit(repoPath);
  const app: Express = createApp(git, repoPath);
  const server = app.listen(port, async () => {
    const url = `http://localhost:${port}`;
    console.log(`Server is running on ${url}`);
    console.log(`Using repository at: ${repoPath}`);

    // Auto-open browser, but don't wait for the browser process.
    // Set NO_BROWSER=true in the environment to prevent auto-opening the browser.
    // This prevents the server process from getting tied to the browser
    // window lifecycle and allows `Ctrl+C` to exit cleanly.
    try {
      if (process.env.NO_BROWSER) {
        console.log("NO_BROWSER set — not opening browser.");
      } else {
        const open = (await import("open")).default;
        void open(url, { wait: false });
        console.log(`Browser opened to ${url}`);
      }
    } catch (error) {
      console.error(
        `Failed to open browser: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  // Graceful shutdown: ensure server closes on SIGINT/SIGTERM.
  // This allows `Ctrl+C` to stop the backend even if some child processes
  // or handlers are running.
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down server...`);
    server.close(() => {
      console.log("Server closed. Exiting process.");
      process.exit(0);
    });
    // Fallback in case server.close hangs
    setTimeout(() => {
      console.error("Forcing exit after timeout.");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export { createApp, stripDiffHeaders, parseDiffWithLineNumbers, type DiffLine };
