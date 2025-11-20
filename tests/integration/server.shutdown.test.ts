import { spawn } from "node:child_process";
import path from "node:path";

describe("Server shutdown behavior", () => {
  it("should exit when receiving SIGINT", async () => {
    const repoPath = path.join(__dirname, "../..");

    // Spawn the built server from dist/ (pretest will have built this)
    const child = spawn("node", ["dist/server.js"], {
      cwd: repoPath,
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wait for the server to advertise it's running
    await new Promise<void>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes("Server is running on")) {
          cleanup();
          resolve();
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.on("error", onError);

      // Safety timeout
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Server failed to start in time"));
      }, 5000);

      function cleanup() {
        clearTimeout(timeout);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        child.off("error", onError);
      }
    });

    // Send SIGINT
    child.kill("SIGINT");

    // Wait for it to exit
    const code = await new Promise<number | null>((resolve) => {
      const onExit = (exitCode: number | null) => {
        cleanupExit();
        resolve(exitCode);
      };

      const timeout = setTimeout(() => {
        cleanupExit();
        resolve(null);
      }, 5000);

      function cleanupExit() {
        clearTimeout(timeout);
        child.off("exit", onExit);
      }

      child.on("exit", onExit);
    });

    // Ensure no orphan child remains
    if (!child.killed && child.exitCode === null) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }

    expect(code).toBe(0);
  }, 20000);
});
