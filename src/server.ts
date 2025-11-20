import path from "node:path";
import express, { type Express, type Request, type Response } from "express";
import simpleGit, { type SimpleGit } from "simple-git";

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
    }: { startCommit: string; endCommit: string; files: string[] } = req.body;

    if (!startCommit || !endCommit || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    try {
      const diffs: Record<string, string> = {};
      for (const file of files) {
        let diff: string = await git.diff([
          `${startCommit}..${endCommit}`,
          "--",
          file,
        ]);

        if (!diff) {
          // If diff is empty, it means the file is either new or unchanged
          const fileContent: string = await git.show([`${endCommit}:${file}`]);
          diff = fileContent
            .split("\n")
            .map((line) => `+${line}`)
            .join("\n");
        }
        diffs[file] = diff;
      }
      res.json(diffs);
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

export { createApp };
