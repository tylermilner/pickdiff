import type { Express } from "express";
import type { SimpleGit } from "simple-git";
import request from "supertest";
import { createApp } from "../../src/server";

interface MockGit {
  raw: jest.Mock;
  diff: jest.Mock;
  show: jest.Mock;
}

describe("PickDiff Server API", () => {
  let app: Express;
  let mockGit: MockGit;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock git instance with proper typing
    mockGit = {
      raw: jest.fn(),
      diff: jest.fn(),
      show: jest.fn(),
    };

    // Recreate the app for each test to ensure clean state
    app = createApp(mockGit as unknown as SimpleGit, "/test/repo");
  });

  describe("GET /api/repo-path", () => {
    it("should return the repository path", async () => {
      // Act
      const response = await request(app)
        .get("/api/repo-path")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty("path");
      expect(typeof response.body.path).toBe("string");
      expect(response.body.path).toBe("/test/repo");
    });
  });

  describe("GET /api/files", () => {
    it("should return list of files when git command succeeds", async () => {
      // Arrange
      const mockFiles = "file1.js\nfile2.js\nfile3.js\n";
      mockGit.raw.mockResolvedValue(mockFiles);

      // Act
      const response = await request(app)
        .get("/api/files")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body).toEqual(["file1.js", "file2.js", "file3.js"]);
      expect(mockGit.raw).toHaveBeenCalledWith(["ls-files"]);
    });

    it("should return 500 error when git command fails", async () => {
      // Arrange
      mockGit.raw.mockRejectedValue(new Error("Git error"));

      // Act
      const response = await request(app)
        .get("/api/files")
        .expect("Content-Type", /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty("error", "Git error");
    });

    it("should filter out empty strings from file list", async () => {
      // Arrange
      const mockFiles = "file1.js\n\nfile2.js\n\n";
      mockGit.raw.mockResolvedValue(mockFiles);

      // Act
      const response = await request(app).get("/api/files").expect(200);

      // Assert
      expect(response.body).toEqual(["file1.js", "file2.js"]);
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      mockGit.raw.mockRejectedValue("String error");

      // Act
      const response = await request(app)
        .get("/api/files")
        .expect("Content-Type", /json/)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty("error", "Failed to list files");
    });
  });

  describe("POST /api/diff", () => {
    const validRequestBody = {
      startCommit: "abc123",
      endCommit: "def456",
      files: ["file1.js", "file2.js"],
    };

    it("should return diffs for specified files", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockImplementation((...args: unknown[]) => {
        const argsArray = args.flat();
        if (argsArray.includes("file1.js")) {
          return Promise.resolve("-old line\n+new line");
        }
        if (argsArray.includes("file2.js")) {
          return Promise.resolve("+added line");
        }
        return Promise.resolve("");
      });

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send(validRequestBody)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body.diffs["file1.js"]).toBe("-old line\n+new line");
      expect(response.body.diffs["file2.js"]).toBe("+added line");
      expect(response.body.excludedFiles).toEqual([]);
      expect(mockGit.diff).toHaveBeenCalledTimes(2);
    });

    it("should handle new files with empty diff", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(""); // Empty diff indicates new file
      mockGit.show.mockResolvedValue("line1\nline2\nline3");

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["newfile.js"],
        })
        .expect(200);

      // Assert
      expect(response.body.diffs["newfile.js"]).toBe("+line1\n+line2\n+line3");
      expect(response.body.excludedFiles).toEqual([]);
      expect(mockGit.show).toHaveBeenCalledWith(["def456:newfile.js"]);
    });

    it("should return 400 for missing startCommit", async () => {
      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          endCommit: "def456",
          files: ["file1.js"],
        })
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty(
        "error",
        "Missing required parameters.",
      );
    });

    it("should return 400 for missing endCommit", async () => {
      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          files: ["file1.js"],
        })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty(
        "error",
        "Missing required parameters.",
      );
    });

    it("should return 400 for missing files", async () => {
      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
        })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty(
        "error",
        "Missing required parameters.",
      );
    });

    it("should return 400 for invalid files parameter (not array)", async () => {
      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: "not-an-array",
        })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty(
        "error",
        "Missing required parameters.",
      );
    });

    it("should return 500 error when git diff fails", async () => {
      // Arrange
      mockGit.diff.mockRejectedValue(new Error("Git diff error"));

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send(validRequestBody)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty("error", "Git diff error");
    });

    it("should return 500 error when git show fails for new file", async () => {
      // Arrange
      mockGit.diff.mockResolvedValue(""); // Empty diff
      mockGit.show.mockRejectedValue(new Error("Git show error"));

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["newfile.js"],
        })
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty("error", "Git show error");
    });

    it("should handle non-Error exceptions in diff", async () => {
      // Arrange
      mockGit.diff.mockRejectedValue("String error");

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send(validRequestBody)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty("error", "Failed to get diffs");
    });

    it("should skip files that don't exist in end commit", async () => {
      // Arrange
      // Mock git.raw for cat-file checks
      mockGit.raw.mockImplementation((...args: unknown[]) => {
        const argsArray = args.flat();
        if (
          argsArray.includes("cat-file") &&
          argsArray.includes("def456:file1.js")
        ) {
          return Promise.resolve(""); // File exists in end commit
        }
        if (
          argsArray.includes("cat-file") &&
          argsArray.includes("def456:file2.js")
        ) {
          // File doesn't exist in end commit
          return Promise.reject(
            new Error("path 'file2.js' does not exist in 'def456'"),
          );
        }
        return Promise.resolve("");
      });

      mockGit.diff.mockResolvedValue("-old line\n+new line");

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js", "file2.js"],
        })
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      // Only file1.js should be in the response, file2.js should be skipped
      expect(response.body.diffs["file1.js"]).toBe("-old line\n+new line");
      expect(response.body.diffs["file2.js"]).toBeUndefined();
      expect(response.body.excludedFiles).toEqual(["file2.js"]);
      expect(Object.keys(response.body.diffs)).toHaveLength(1);
    });

    it("should return empty object when all files don't exist in end commit", async () => {
      // Arrange
      mockGit.raw.mockRejectedValue(new Error("path does not exist in commit"));

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["nonexistent1.js", "nonexistent2.js"],
        })
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body.diffs).toEqual({});
      expect(response.body.excludedFiles).toEqual([
        "nonexistent1.js",
        "nonexistent2.js",
      ]);
      expect(Object.keys(response.body.diffs)).toHaveLength(0);
    });
  });
});
