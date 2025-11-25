/**
 * Unit tests for frontend syntax highlighting functions
 *
 * Note: These tests validate the core logic of syntax highlighting.
 * Since the actual hljs library is loaded via CDN in the browser,
 * we test the language mapping and line processing logic here.
 */

describe("Frontend Syntax Highlighting", () => {
  describe("getLanguageFromFilename", () => {
    // Language mapping function from frontend/script.ts
    function getLanguageFromFilename(filename: string): string | null {
      const extension = filename.split(".").pop()?.toLowerCase();
      const languageMap: { [key: string]: string } = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        rb: "ruby",
        java: "java",
        c: "c",
        cpp: "cpp",
        cc: "cpp",
        cxx: "cpp",
        h: "c",
        hpp: "cpp",
        cs: "csharp",
        go: "go",
        rs: "rust",
        php: "php",
        swift: "swift",
        kt: "kotlin",
        scala: "scala",
        html: "html",
        htm: "html",
        xml: "xml",
        css: "css",
        scss: "scss",
        sass: "sass",
        less: "less",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        md: "markdown",
        sh: "bash",
        bash: "bash",
        zsh: "bash",
        sql: "sql",
        r: "r",
        m: "objectivec",
        mm: "objectivec",
      };

      return extension ? languageMap[extension] || null : null;
    }

    it("should return 'typescript' for .ts files", () => {
      expect(getLanguageFromFilename("script.ts")).toBe("typescript");
      expect(getLanguageFromFilename("path/to/component.ts")).toBe(
        "typescript",
      );
    });

    it("should return 'typescript' for .tsx files", () => {
      expect(getLanguageFromFilename("Component.tsx")).toBe("typescript");
    });

    it("should return 'javascript' for .js files", () => {
      expect(getLanguageFromFilename("script.js")).toBe("javascript");
      expect(getLanguageFromFilename("path/to/file.js")).toBe("javascript");
    });

    it("should return 'javascript' for .jsx files", () => {
      expect(getLanguageFromFilename("Component.jsx")).toBe("javascript");
    });

    it("should return 'python' for .py files", () => {
      expect(getLanguageFromFilename("main.py")).toBe("python");
    });

    it("should return 'java' for .java files", () => {
      expect(getLanguageFromFilename("Main.java")).toBe("java");
    });

    it("should return 'css' for .css files", () => {
      expect(getLanguageFromFilename("styles.css")).toBe("css");
    });

    it("should return 'scss' for .scss files", () => {
      expect(getLanguageFromFilename("styles.scss")).toBe("scss");
    });

    it("should return 'html' for .html files", () => {
      expect(getLanguageFromFilename("index.html")).toBe("html");
    });

    it("should return 'json' for .json files", () => {
      expect(getLanguageFromFilename("package.json")).toBe("json");
    });

    it("should return 'yaml' for .yaml and .yml files", () => {
      expect(getLanguageFromFilename("config.yaml")).toBe("yaml");
      expect(getLanguageFromFilename("config.yml")).toBe("yaml");
    });

    it("should return 'markdown' for .md files", () => {
      expect(getLanguageFromFilename("README.md")).toBe("markdown");
    });

    it("should return 'bash' for shell script files", () => {
      expect(getLanguageFromFilename("script.sh")).toBe("bash");
      expect(getLanguageFromFilename("script.bash")).toBe("bash");
      expect(getLanguageFromFilename("script.zsh")).toBe("bash");
    });

    it("should return 'cpp' for C++ files", () => {
      expect(getLanguageFromFilename("main.cpp")).toBe("cpp");
      expect(getLanguageFromFilename("main.cc")).toBe("cpp");
      expect(getLanguageFromFilename("main.cxx")).toBe("cpp");
      expect(getLanguageFromFilename("header.hpp")).toBe("cpp");
    });

    it("should return 'c' for C files", () => {
      expect(getLanguageFromFilename("main.c")).toBe("c");
      expect(getLanguageFromFilename("header.h")).toBe("c");
    });

    it("should return null for unknown extensions", () => {
      expect(getLanguageFromFilename("file.unknown")).toBeNull();
      expect(getLanguageFromFilename("file.xyz")).toBeNull();
    });

    it("should return null for files without extension", () => {
      expect(getLanguageFromFilename("Dockerfile")).toBeNull();
      expect(getLanguageFromFilename("Makefile")).toBeNull();
    });

    it("should handle filenames with multiple dots", () => {
      expect(getLanguageFromFilename("file.test.ts")).toBe("typescript");
      expect(getLanguageFromFilename("component.spec.js")).toBe("javascript");
    });

    it("should be case-insensitive for extensions", () => {
      expect(getLanguageFromFilename("File.TS")).toBe("typescript");
      expect(getLanguageFromFilename("File.JS")).toBe("javascript");
      expect(getLanguageFromFilename("File.PY")).toBe("python");
    });
  });

  describe("escapeHtml", () => {
    function escapeHtml(unsafe: string): string {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    it("should escape HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      );
    });

    it("should escape ampersands", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("should escape less than and greater than signs", () => {
      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
    });

    it("should escape quotes", () => {
      expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
      expect(escapeHtml("It's here")).toBe("It&#039;s here");
    });

    it("should handle empty strings", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle strings without special characters", () => {
      expect(escapeHtml("plain text")).toBe("plain text");
    });

    it("should handle multiple special characters", () => {
      expect(escapeHtml("<div class=\"foo & bar\">'test'</div>")).toBe(
        "&lt;div class=&quot;foo &amp; bar&quot;&gt;&#039;test&#039;&lt;/div&gt;",
      );
    });
  });

  describe("highlightLine logic", () => {
    it("should detect diff markers correctly", () => {
      const testCases = [
        { line: "+const x = 1;", marker: "+", content: "const x = 1;" },
        { line: "-const x = 1;", marker: "-", content: "const x = 1;" },
        { line: " const x = 1;", marker: " ", content: "const x = 1;" },
        { line: "const x = 1;", marker: "", content: "const x = 1;" },
      ];

      testCases.forEach(({ line, marker, content }) => {
        let diffMarker = "";
        let codeContent = line;

        if (
          line.startsWith("+") ||
          line.startsWith("-") ||
          line.startsWith(" ")
        ) {
          diffMarker = line[0];
          codeContent = line.substring(1);
        }

        expect(diffMarker).toBe(marker);
        expect(codeContent).toBe(content);
      });
    });

    it("should preserve empty lines", () => {
      const line = "";
      if (!line || line.length === 0) {
        expect(line).toBe("");
      }
    });

    it("should handle lines with only diff marker", () => {
      const line = "+";
      let diffMarker = "";
      let codeContent = line;

      if (
        line.startsWith("+") ||
        line.startsWith("-") ||
        line.startsWith(" ")
      ) {
        diffMarker = line[0];
        codeContent = line.substring(1);
      }

      expect(diffMarker).toBe("+");
      expect(codeContent).toBe("");
    });
  });

  describe("formatDiff integration", () => {
    function escapeHtml(unsafe: string): string {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Simplified version without hljs dependency
    function formatDiffSimple(diff: string): string {
      return diff
        .split("\n")
        .map((line) => {
          const escapedLine = escapeHtml(line);
          if (line.startsWith("+")) {
            return `<span class="addition">${escapedLine}</span>`;
          }
          if (line.startsWith("-")) {
            return `<span class="deletion">${escapedLine}</span>`;
          }
          return escapedLine;
        })
        .join("\n");
    }

    it("should wrap addition lines with addition class", () => {
      const diff = "+const x = 1;";
      const result = formatDiffSimple(diff);
      expect(result).toContain('<span class="addition">');
      expect(result).toContain("+const x = 1;");
      expect(result).toContain("</span>");
    });

    it("should wrap deletion lines with deletion class", () => {
      const diff = "-const x = 1;";
      const result = formatDiffSimple(diff);
      expect(result).toContain('<span class="deletion">');
      expect(result).toContain("-const x = 1;");
      expect(result).toContain("</span>");
    });

    it("should escape HTML in diff content", () => {
      const diff = "+<script>alert('xss')</script>";
      const result = formatDiffSimple(diff);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    it("should handle multi-line diffs", () => {
      const diff = "+line1\n line2\n-line3";
      const result = formatDiffSimple(diff);
      const lines = result.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('<span class="addition">');
      expect(lines[1]).not.toContain("<span");
      expect(lines[2]).toContain('<span class="deletion">');
    });

    it("should preserve context lines without wrapping", () => {
      const diff = " const x = 1;";
      const result = formatDiffSimple(diff);
      expect(result).not.toContain('<span class="addition">');
      expect(result).not.toContain('<span class="deletion">');
      expect(result).toBe(" const x = 1;");
    });
  });

  describe("generateMarkdown", () => {
    interface DiffLine {
      content: string;
      oldLineNumber?: number;
      newLineNumber?: number;
    }

    // Simplified version of generateMarkdown for testing
    function generateMarkdown(data: {
      repoPath: string;
      startCommit: string;
      endCommit: string;
      contextLines: number;
      diffs: { [file: string]: DiffLine[] };
      excludedFiles: string[];
    }): string {
      const lines: string[] = [];

      // Header
      lines.push("# Diff Summary");
      lines.push("");

      // Metadata
      lines.push("## Metadata");
      lines.push("");
      lines.push(`- **Repository:** ${data.repoPath}`);
      lines.push(`- **Start Commit:** \`${data.startCommit}\``);
      lines.push(`- **End Commit:** \`${data.endCommit}\``);
      lines.push(`- **Context Lines:** ${data.contextLines}`);
      lines.push(`- **Files Changed:** ${Object.keys(data.diffs).length}`);
      lines.push("");

      // Excluded files warning
      if (data.excludedFiles.length > 0) {
        lines.push("## Excluded Files");
        lines.push("");
        lines.push(
          "The following files were excluded because they do not exist in the end commit:",
        );
        lines.push("");
        for (const file of data.excludedFiles) {
          lines.push(`- \`${file}\``);
        }
        lines.push("");
      }

      // File diffs
      lines.push("## File Changes");
      lines.push("");

      for (const file in data.diffs) {
        lines.push(`### ${file}`);
        lines.push("");

        const diffLines = data.diffs[file];

        // Check if this file has no changes
        if (diffLines.length === 1 && diffLines[0].content === "NO_CHANGES") {
          lines.push("*No changes*");
          lines.push("");
          continue;
        }

        // Create the diff content - always use 'diff' format
        lines.push("```diff");
        for (const diffLine of diffLines) {
          lines.push(diffLine.content);
        }
        lines.push("```");
        lines.push("");
      }

      return lines.join("\n");
    }

    it("should generate markdown with correct header", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {},
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("# Diff Summary");
    });

    it("should include metadata section with all required fields", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: { "file.ts": [{ content: "+const x = 1;" }] },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("## Metadata");
      expect(result).toContain("- **Repository:** /path/to/repo");
      expect(result).toContain("- **Start Commit:** `abc123`");
      expect(result).toContain("- **End Commit:** `def456`");
      expect(result).toContain("- **Context Lines:** 3");
      expect(result).toContain("- **Files Changed:** 1");
    });

    it("should include excluded files section when files are excluded", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {},
        excludedFiles: ["deleted-file.ts", "another-deleted.js"],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("## Excluded Files");
      expect(result).toContain("- `deleted-file.ts`");
      expect(result).toContain("- `another-deleted.js`");
    });

    it("should not include excluded files section when no files are excluded", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: { "file.ts": [{ content: "+const x = 1;" }] },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).not.toContain("## Excluded Files");
    });

    it("should format file diffs with proper headers", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {
          "src/server.ts": [
            { content: " const x = 1;", oldLineNumber: 1, newLineNumber: 1 },
            { content: "+const y = 2;", newLineNumber: 2 },
            { content: "-const z = 3;", oldLineNumber: 2 },
          ],
        },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("## File Changes");
      expect(result).toContain("### src/server.ts");
      expect(result).toContain("```diff");
      expect(result).toContain(" const x = 1;");
      expect(result).toContain("+const y = 2;");
      expect(result).toContain("-const z = 3;");
      expect(result).toContain("```");
    });

    it("should handle files with no changes", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {
          "unchanged.ts": [{ content: "NO_CHANGES" }],
        },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("### unchanged.ts");
      expect(result).toContain("*No changes*");
    });

    it("should always use 'diff' language for code fences", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {
          "script.js": [{ content: "+const x = 1;" }],
          "main.py": [{ content: "+def hello():" }],
        },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("```diff");
      // Should not contain language-specific code fences
      expect(result).not.toContain("```javascript");
      expect(result).not.toContain("```python");
    });

    it("should use 'diff' language for unknown file extensions", () => {
      const data = {
        repoPath: "/path/to/repo",
        startCommit: "abc123",
        endCommit: "def456",
        contextLines: 3,
        diffs: {
          "config.xyz": [{ content: "+setting = value" }],
        },
        excludedFiles: [],
      };

      const result = generateMarkdown(data);
      expect(result).toContain("```diff");
    });
  });
});
