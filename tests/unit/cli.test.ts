import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  formatStdoutDiff,
  parseArgs,
  printHelp,
  printVersion,
  validateOptions,
} from "../../src/cli";
import { type DiffResult, generateMarkdown } from "../../src/diff";

describe("CLI", () => {
  describe("parseArgs", () => {
    it("should parse required --start argument", () => {
      const options = parseArgs([
        "--start",
        "abc123",
        "--end",
        "def456",
        "--files",
        "file.ts",
      ]);
      expect(options.startCommit).toBe("abc123");
    });

    it("should parse short -s argument", () => {
      const options = parseArgs([
        "-s",
        "abc123",
        "-e",
        "def456",
        "-f",
        "file.ts",
      ]);
      expect(options.startCommit).toBe("abc123");
    });

    it("should parse required --end argument", () => {
      const options = parseArgs([
        "--start",
        "abc123",
        "--end",
        "def456",
        "--files",
        "file.ts",
      ]);
      expect(options.endCommit).toBe("def456");
    });

    it("should parse short -e argument", () => {
      const options = parseArgs([
        "-s",
        "abc123",
        "-e",
        "def456",
        "-f",
        "file.ts",
      ]);
      expect(options.endCommit).toBe("def456");
    });

    it("should parse comma-separated --files", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "--files",
        "file1.ts,file2.ts,file3.ts",
      ]);
      expect(options.files).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
    });

    it("should parse short -f argument", () => {
      const options = parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts"]);
      expect(options.files).toContain("file.ts");
    });

    it("should trim whitespace from file names", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        " file1.ts , file2.ts ",
      ]);
      expect(options.files).toEqual(["file1.ts", "file2.ts"]);
    });

    it("should filter empty file names", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file1.ts,,file2.ts",
      ]);
      expect(options.files).toEqual(["file1.ts", "file2.ts"]);
    });

    it("should parse --repo argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "--repo",
        "/path/to/repo",
      ]);
      expect(options.repoPath).toBe(path.resolve("/path/to/repo"));
    });

    it("should parse short -r argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "-r",
        "/path/to/repo",
      ]);
      expect(options.repoPath).toBe(path.resolve("/path/to/repo"));
    });

    it("should use current directory as default repo path", () => {
      const options = parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts"]);
      expect(options.repoPath).toBe(process.cwd());
    });

    it("should parse --context argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "--context",
        "10",
      ]);
      expect(options.contextLines).toBe(10);
    });

    it("should parse short -c argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "-c",
        "5",
      ]);
      expect(options.contextLines).toBe(5);
    });

    it("should default to 3 context lines", () => {
      const options = parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts"]);
      expect(options.contextLines).toBe(3);
    });

    it("should parse --output markdown", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "--output",
        "markdown",
      ]);
      expect(options.output).toBe("markdown");
    });

    it("should parse --output stdout", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "--output",
        "stdout",
      ]);
      expect(options.output).toBe("stdout");
    });

    it("should parse short -o argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "-o",
        "markdown",
      ]);
      expect(options.output).toBe("markdown");
    });

    it("should default to stdout output", () => {
      const options = parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts"]);
      expect(options.output).toBe("stdout");
    });

    it("should throw for missing --start value", () => {
      expect(() => parseArgs(["--start"])).toThrow("Missing value for --start");
    });

    it("should throw for missing --end value", () => {
      expect(() => parseArgs(["-s", "abc", "--end"])).toThrow(
        "Missing value for --end",
      );
    });

    it("should throw for missing --files value", () => {
      expect(() => parseArgs(["-s", "abc", "-e", "def", "--files"])).toThrow(
        "Missing value for --files",
      );
    });

    it("should throw for missing --repo value", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "--repo"]),
      ).toThrow("Missing value for --repo");
    });

    it("should throw for missing --context value", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "--context"]),
      ).toThrow("Missing value for --context");
    });

    it("should throw for invalid --context value", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "-c", "invalid"]),
      ).toThrow("Invalid context lines value");
    });

    it("should throw for negative --context value", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "-c", "-5"]),
      ).toThrow("Invalid context lines value");
    });

    it("should throw for invalid --output format", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "-o", "invalid"]),
      ).toThrow("Invalid output format");
    });

    it("should throw for unknown argument", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(
        "Unknown argument: --unknown",
      );
    });

    it("should parse --file-list argument from file", () => {
      // Create a temporary file with file paths
      const tmpDir = path.join(os.tmpdir(), "pickdiff-test");
      const fileListPath = path.join(tmpDir, "files.txt");

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(fileListPath, "file1.ts\nfile2.ts\nfile3.ts\n");

      try {
        const options = parseArgs([
          "-s",
          "abc",
          "-e",
          "def",
          "--file-list",
          fileListPath,
        ]);
        expect(options.files).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
      } finally {
        fs.unlinkSync(fileListPath);
      }
    });

    it("should throw for non-existent file list", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-F", "/nonexistent/file.txt"]),
      ).toThrow("File not found");
    });

    it("should allow combining --files and --file-list", () => {
      const tmpDir = path.join(os.tmpdir(), "pickdiff-test");
      const fileListPath = path.join(tmpDir, "files.txt");

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(fileListPath, "file3.ts\nfile4.ts");

      try {
        const options = parseArgs([
          "-s",
          "abc",
          "-e",
          "def",
          "-f",
          "file1.ts,file2.ts",
          "-F",
          fileListPath,
        ]);
        expect(options.files).toEqual([
          "file1.ts",
          "file2.ts",
          "file3.ts",
          "file4.ts",
        ]);
      } finally {
        fs.unlinkSync(fileListPath);
      }
    });

    it("should parse --write argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "--write",
        "/path/to/output.md",
      ]);
      expect(options.outputFile).toBe(path.resolve("/path/to/output.md"));
    });

    it("should parse short -w argument", () => {
      const options = parseArgs([
        "-s",
        "abc",
        "-e",
        "def",
        "-f",
        "file.ts",
        "-w",
        "output.txt",
      ]);
      expect(options.outputFile).toBe(path.resolve("output.txt"));
    });

    it("should default to null output file", () => {
      const options = parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts"]);
      expect(options.outputFile).toBeNull();
    });

    it("should throw for missing --write value", () => {
      expect(() =>
        parseArgs(["-s", "abc", "-e", "def", "-f", "file.ts", "--write"]),
      ).toThrow("Missing value for --write");
    });
  });

  describe("validateOptions", () => {
    it("should throw if startCommit is missing", () => {
      const options = {
        repoPath: "/repo",
        startCommit: "",
        endCommit: "def456",
        files: ["file.ts"],
        contextLines: 3,
        output: "stdout" as const,
        outputFile: null,
      };
      expect(() => validateOptions(options)).toThrow(
        "Missing required argument: --start",
      );
    });

    it("should throw if endCommit is missing", () => {
      const options = {
        repoPath: "/repo",
        startCommit: "abc123",
        endCommit: "",
        files: ["file.ts"],
        contextLines: 3,
        output: "stdout" as const,
        outputFile: null,
      };
      expect(() => validateOptions(options)).toThrow(
        "Missing required argument: --end",
      );
    });

    it("should throw if files is empty", () => {
      const options = {
        repoPath: "/repo",
        startCommit: "abc123",
        endCommit: "def456",
        files: [],
        contextLines: 3,
        output: "stdout" as const,
        outputFile: null,
      };
      expect(() => validateOptions(options)).toThrow(
        "Missing required argument: --files",
      );
    });

    it("should not throw for valid options", () => {
      const options = {
        repoPath: "/repo",
        startCommit: "abc123",
        endCommit: "def456",
        files: ["file.ts"],
        contextLines: 3,
        output: "stdout" as const,
        outputFile: null,
      };
      expect(() => validateOptions(options)).not.toThrow();
    });
  });

  describe("formatStdoutDiff", () => {
    it("should format basic diff output", () => {
      const result: DiffResult = {
        diffs: {
          "file.ts": [
            { content: "-old line", oldLineNumber: 1 },
            { content: "+new line", newLineNumber: 1 },
          ],
        },
        excludedFiles: [],
      };

      const output = formatStdoutDiff(result);
      expect(output).toContain("--- a/file.ts");
      expect(output).toContain("+++ b/file.ts");
      expect(output).toContain("-old line");
      expect(output).toContain("+new line");
    });

    it("should handle no changes marker", () => {
      const result: DiffResult = {
        diffs: {
          "file.ts": [{ content: "NO_CHANGES" }],
        },
        excludedFiles: [],
      };

      const output = formatStdoutDiff(result);
      expect(output).toContain("(no changes)");
    });

    it("should include excluded files warning", () => {
      const result: DiffResult = {
        diffs: {},
        excludedFiles: ["deleted.ts", "removed.ts"],
      };

      const output = formatStdoutDiff(result);
      expect(output).toContain("# Excluded files");
      expect(output).toContain("deleted.ts");
      expect(output).toContain("removed.ts");
    });

    it("should handle multiple files", () => {
      const result: DiffResult = {
        diffs: {
          "file1.ts": [{ content: "+line1", newLineNumber: 1 }],
          "file2.ts": [{ content: "-line2", oldLineNumber: 1 }],
        },
        excludedFiles: [],
      };

      const output = formatStdoutDiff(result);
      expect(output).toContain("--- a/file1.ts");
      expect(output).toContain("--- a/file2.ts");
    });
  });

  describe("generateMarkdown", () => {
    const baseData = {
      repoPath: "/test/repo",
      startCommit: "abc123",
      endCommit: "def456",
      contextLines: 3,
    };

    it("should include header and metadata", () => {
      const result: DiffResult = {
        diffs: { "file.ts": [{ content: "+line", newLineNumber: 1 }] },
        excludedFiles: [],
      };

      const output = generateMarkdown({ ...baseData, ...result });
      expect(output).toContain("# Diff Summary");
      expect(output).toContain("## Metadata");
      expect(output).toContain("**Repository:** `/test/repo`");
      expect(output).toContain("**Start Commit:** `abc123`");
      expect(output).toContain("**End Commit:** `def456`");
      expect(output).toContain("**Context Lines:** 3");
    });

    it("should include file diffs in code blocks", () => {
      const result: DiffResult = {
        diffs: {
          "file.ts": [
            { content: "-old", oldLineNumber: 1 },
            { content: "+new", newLineNumber: 1 },
          ],
        },
        excludedFiles: [],
      };

      const output = generateMarkdown({ ...baseData, ...result });
      expect(output).toContain("### `file.ts`");
      expect(output).toContain("```diff");
      expect(output).toContain("-old");
      expect(output).toContain("+new");
      expect(output).toContain("```");
    });

    it("should handle no changes marker", () => {
      const result: DiffResult = {
        diffs: { "file.ts": [{ content: "NO_CHANGES" }] },
        excludedFiles: [],
      };

      const output = generateMarkdown({ ...baseData, ...result });
      expect(output).toContain("*No changes*");
    });

    it("should include excluded files section", () => {
      const result: DiffResult = {
        diffs: {},
        excludedFiles: ["deleted.ts"],
      };

      const output = generateMarkdown({ ...baseData, ...result });
      expect(output).toContain("## Excluded Files");
      expect(output).toContain("`deleted.ts`");
    });

    it("should show correct file count in metadata", () => {
      const result: DiffResult = {
        diffs: {
          "file1.ts": [{ content: "+a", newLineNumber: 1 }],
          "file2.ts": [{ content: "+b", newLineNumber: 1 }],
          "file3.ts": [{ content: "+c", newLineNumber: 1 }],
        },
        excludedFiles: [],
      };

      const output = generateMarkdown({ ...baseData, ...result });
      expect(output).toContain("**Files Changed:** 3");
    });
  });

  describe("printHelp", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should print help message", () => {
      printHelp();
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain("pickdiff");
      expect(output).toContain("--start");
      expect(output).toContain("--end");
      expect(output).toContain("--files");
      expect(output).toContain("--help");
    });
  });

  describe("printVersion", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should print version", () => {
      printVersion();
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain("pickdiff");
    });
  });
});
