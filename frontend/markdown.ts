/**
 * Markdown export utility functions
 * These functions are extracted to allow for unit testing
 */

export interface DiffLine {
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface MarkdownExportData {
  repoPath: string;
  startCommit: string;
  endCommit: string;
  contextLines: number;
  diffs: { [file: string]: DiffLine[] };
  excludedFiles: string[];
}

/**
 * Generate markdown content from the diff data
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

  for (const file in data.diffs) {
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

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
