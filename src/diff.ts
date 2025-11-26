import type { SimpleGit } from "simple-git";

/**
 * Represents a single line in a diff output.
 */
export interface DiffLine {
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Result of generating diffs for multiple files.
 */
export interface DiffResult {
  diffs: Record<string, DiffLine[]>;
  excludedFiles: string[];
}

/**
 * Parse git diff output to extract line numbers and content.
 * Processes hunk headers (@@ -oldStart,oldCount +newStart,newCount @@) to track line numbers.
 * @param diff The raw diff output from git
 * @returns Array of diff lines with line numbers
 */
export function parseDiffWithLineNumbers(diff: string): DiffLine[] {
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
export function stripDiffHeaders(diff: string): string {
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

/**
 * Validate context lines parameter and return a valid value.
 * @param contextLines The context lines value to validate
 * @returns A valid context lines value (defaults to 3 if invalid)
 */
export function validateContextLines(contextLines: unknown): number {
  return typeof contextLines === "number" &&
    Number.isInteger(contextLines) &&
    contextLines > 0 &&
    contextLines <= 999999
    ? contextLines
    : 3;
}

/**
 * Generate diffs for specified files between two commits.
 * @param git The simple-git instance
 * @param startCommit The starting commit reference
 * @param endCommit The ending commit reference
 * @param files Array of file paths to diff
 * @param contextLines Number of context lines to include (default: 3)
 * @returns Object containing diffs for each file and list of excluded files
 */
export async function generateDiffs(
  git: SimpleGit,
  startCommit: string,
  endCommit: string,
  files: string[],
  contextLines = 3,
): Promise<DiffResult> {
  const validContextLines = validateContextLines(contextLines);
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
        const fileContent: string = await git.show([`${endCommit}:${file}`]);
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

  return { diffs, excludedFiles };
}

/**
 * Metadata for markdown export.
 */
export interface MarkdownExportData {
  repoPath: string;
  startCommit: string;
  endCommit: string;
  contextLines: number;
  diffs: Record<string, DiffLine[]>;
  excludedFiles: string[];
}

/**
 * Generate markdown content from the diff data.
 * NOTE: This function is duplicated in frontend/markdown.ts - keep both in sync!
 * @param data The markdown export data
 * @returns Formatted markdown string
 */
export function generateMarkdown(data: MarkdownExportData): string {
  const lines: string[] = [];

  // Header
  lines.push("# Diff Summary");
  lines.push("");

  // Metadata
  lines.push("## Metadata");
  lines.push("");
  lines.push(`- **Repository:** \`${data.repoPath}\``);
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

  for (const file of Object.keys(data.diffs)) {
    lines.push(`### \`${file}\``);
    lines.push("");

    const diffLines = data.diffs[file];

    // Check if this file has no changes
    if (diffLines.length === 1 && diffLines[0].content === "NO_CHANGES") {
      lines.push("*No changes*");
      lines.push("");
      continue;
    }

    // Create the diff content - always use 'diff' format for code blocks
    lines.push("```diff");
    for (const diffLine of diffLines) {
      lines.push(diffLine.content);
    }
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}
