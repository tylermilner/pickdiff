import type { Express } from "express";
import type { SimpleGit } from "simple-git";
import request from "supertest";
import { createApp, stripDiffHeaders } from "../../src/server";

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
          return Promise.resolve(
            `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
          );
        }
        if (argsArray.includes("file2.js")) {
          return Promise.resolve(
            `diff --git a/file2.js b/file2.js
index 123456..789abc 100644
--- a/file2.js
+++ b/file2.js
@@ -1 +1,2 @@
+added line`,
          );
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
      expect(response.body.diffs["file1.js"]).toEqual([
        { content: "-old line", oldLineNumber: 1 },
        { content: "+new line", newLineNumber: 1 },
      ]);
      expect(response.body.diffs["file2.js"]).toEqual([
        { content: "+added line", newLineNumber: 1 },
      ]);
      expect(response.body.excludedFiles).toEqual([]);
      expect(mockGit.diff).toHaveBeenCalledTimes(2);
    });

    it("should handle new files with empty diff", async () => {
      // Arrange
      // Mock cat-file check for end commit (file exists)
      mockGit.raw.mockImplementation((...args: unknown[]) => {
        const argsArray = args.flat();
        if (argsArray.includes("def456:newfile.js")) {
          return Promise.resolve(""); // File exists in end commit
        }
        if (argsArray.includes("abc123:newfile.js")) {
          // File doesn't exist in start commit (new file)
          return Promise.reject(new Error("path does not exist"));
        }
        return Promise.resolve("");
      });
      mockGit.diff.mockResolvedValue(""); // Empty diff
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
      expect(response.body.diffs["newfile.js"]).toEqual([
        { content: "+line1", newLineNumber: 1 },
        { content: "+line2", newLineNumber: 2 },
        { content: "+line3", newLineNumber: 3 },
      ]);
      expect(response.body.excludedFiles).toEqual([]);
      expect(mockGit.show).toHaveBeenCalledWith(["def456:newfile.js"]);
    });

    it("should handle unchanged files with NO_CHANGES marker", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // File exists in both commits
      mockGit.diff.mockResolvedValue(""); // Empty diff (unchanged)

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["unchanged.js"],
        })
        .expect(200);

      // Assert
      expect(response.body.diffs["unchanged.js"]).toEqual([
        { content: "NO_CHANGES" },
      ]);
      expect(response.body.excludedFiles).toEqual([]);
      expect(mockGit.show).not.toHaveBeenCalled();
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
      mockGit.raw.mockImplementation((...args: unknown[]) => {
        const argsArray = args.flat();
        if (argsArray.includes("def456:newfile.js")) {
          return Promise.resolve(""); // File exists in end commit
        }
        if (argsArray.includes("abc123:newfile.js")) {
          // File doesn't exist in start commit (new file)
          return Promise.reject(new Error("path does not exist"));
        }
        return Promise.resolve("");
      });
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

      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

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
      expect(response.body.diffs["file1.js"]).toEqual([
        { content: "-old line", oldLineNumber: 1 },
        { content: "+new line", newLineNumber: 1 },
      ]);
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

    it("should use custom contextLines when provided", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

      // Act
      const response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js"],
          contextLines: 10,
        })
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body.diffs["file1.js"]).toEqual([
        { content: "-old line", oldLineNumber: 1 },
        { content: "+new line", newLineNumber: 1 },
      ]);
      expect(mockGit.diff).toHaveBeenCalledWith([
        "abc123..def456",
        "-U10",
        "--",
        "file1.js",
      ]);
    });

    it("should default to 3 contextLines when not provided", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

      // Act
      const _response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js"],
        })
        .expect(200);

      // Assert
      expect(mockGit.diff).toHaveBeenCalledWith([
        "abc123..def456",
        "-U3",
        "--",
        "file1.js",
      ]);
    });

    it("should handle whole file context (999999)", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

      // Act
      const _response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js"],
          contextLines: 999999,
        })
        .expect(200);

      // Assert
      expect(mockGit.diff).toHaveBeenCalledWith([
        "abc123..def456",
        "-U999999",
        "--",
        "file1.js",
      ]);
    });

    it("should default to 3 when contextLines is invalid (negative)", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

      // Act
      const _response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js"],
          contextLines: -5,
        })
        .expect(200);

      // Assert
      expect(mockGit.diff).toHaveBeenCalledWith([
        "abc123..def456",
        "-U3",
        "--",
        "file1.js",
      ]);
    });

    it("should default to 3 when contextLines is invalid (string)", async () => {
      // Arrange
      mockGit.raw.mockResolvedValue(""); // cat-file check passes
      mockGit.diff.mockResolvedValue(
        `diff --git a/file1.js b/file1.js
index abc123..def456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,2 @@
-old line
+new line`,
      );

      // Act
      const _response = await request(app)
        .post("/api/diff")
        .send({
          startCommit: "abc123",
          endCommit: "def456",
          files: ["file1.js"],
          contextLines: "invalid" as unknown as number,
        })
        .expect(200);

      // Assert
      expect(mockGit.diff).toHaveBeenCalledWith([
        "abc123..def456",
        "-U3",
        "--",
        "file1.js",
      ]);
    });
  });

  describe("stripDiffHeaders", () => {
    it("should strip standard git diff headers", () => {
      // Arrange
      const diff = `diff --git a/.gitignore b/.gitignore
index 3c3629e..85b42f0 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1 +1,9 @@
 node_modules
+
+# Test coverage and reports
+coverage/
+playwright-report/
+test-results/`;

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      const expected = ` node_modules
+
+# Test coverage and reports
+coverage/
+playwright-report/
+test-results/`;
      expect(result).toBe(expected);
    });

    it("should handle diffs with multiple hunks", () => {
      // Arrange
      const diff = `diff --git a/file.txt b/file.txt
index abc123..def456 100644
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 line1
+line2
 line3
@@ -10,2 +11,3 @@
 another line
+new line
 final line`;

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      const expected = ` line1
+line2
 line3
 another line
+new line
 final line`;
      expect(result).toBe(expected);
    });

    it("should handle empty diff", () => {
      // Arrange
      const diff = "";

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      expect(result).toBe("");
    });

    it("should handle diff with only headers and no content", () => {
      // Arrange
      const diff = `diff --git a/file.txt b/file.txt
index abc123..def456 100644
--- a/file.txt
+++ b/file.txt`;

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      expect(result).toBe("");
    });

    it("should preserve deletion and addition markers", () => {
      // Arrange
      const diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,2 +1,2 @@
-old line
+new line
 context line`;

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      const expected = `-old line
+new line
 context line`;
      expect(result).toBe(expected);
    });

    it("should handle lines that start with diff/index/---/+++ in content", () => {
      // Arrange - edge case where actual content might have these patterns
      const diff = `diff --git a/file.txt b/file.txt
index abc123..def456 100644
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 some content
-index variable = 5
+index variable = 10
 more content`;

      // Act
      const result = stripDiffHeaders(diff);

      // Assert
      const expected = ` some content
-index variable = 5
+index variable = 10
 more content`;
      expect(result).toBe(expected);
    });
  });
});
