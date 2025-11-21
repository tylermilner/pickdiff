import { execSync } from "node:child_process";
import type { Server } from "node:http";
import path from "node:path";
import type { Express } from "express";
import simpleGit, { type SimpleGit } from "simple-git";
import request from "supertest";
import { createApp } from "../../src/server";

describe("PickDiff Integration Tests", () => {
  let app: Express;
  let server: Server;

  beforeAll(() => {
    // Use the real simpleGit and repoPath for integration
    const repoPath: string = path.join(__dirname, "../..");
    const git: SimpleGit = simpleGit(repoPath);
    app = createApp(git, repoPath);
    server = app.listen(); // Let the OS pick an available port
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe("Real API Integration", () => {
    it("should serve the main HTML page", async () => {
      // Act
      const response = await request(server).get("/").expect(200);

      // Assert
      expect(response.text).toContain("<title>PickDiff</title>");
      expect(response.text).toContain('<h1 class="text-center">PickDiff</h1>');
    });

    it("should return repository path from real git repo", async () => {
      // Act
      const response = await request(server)
        .get("/api/repo-path")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty("path");
      expect(response.body.path).toContain("pickdiff");
    });

    it("should return actual files from the repository", async () => {
      // Act
      const response = await request(server)
        .get("/api/files")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should contain some of our known files
      expect(response.body).toContain("package.json");
      expect(response.body).toContain("src/server.ts");
      expect(response.body).toContain("README.md");
    });

    it("should serve static files correctly", async () => {
      // Act
      const response = await request(server).get("/script.js").expect(200);

      // Assert
      expect(response.text).toContain("document.addEventListener");
    });

    it("should handle diff request with real commits", async () => {
      // Arrange
      // First get the actual commit history
      const commits: string[] = execSync('git log --oneline -2 --format="%H"', {
        cwd: path.join(__dirname, "../.."),
        encoding: "utf8",
      })
        .trim()
        .split("\n");

      if (commits.length < 2) {
        throw new Error(
          "Not enough commits in the repository to run this test. At least 2 commits are required.",
        );
      }

      const [endCommit, startCommit] = commits;

      // Act
      const response = await request(server)
        .post("/api/diff")
        .send({
          startCommit: startCommit,
          endCommit: endCommit,
          files: ["package.json"],
        })
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body.diffs["package.json"]).toBeDefined();
      expect(response.body.excludedFiles).toBeDefined();
    });

    it("should return 400 for invalid diff request", async () => {
      // Act
      const response = await request(server)
        .post("/api/diff")
        .send({
          startCommit: "invalid",
          // Missing endCommit and files to trigger validation error
        })
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty(
        "error",
        "Missing required parameters.",
      );
    });
  });
});
