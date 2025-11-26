#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import simpleGit from "simple-git";
import { type DiffResult, generateDiffs, generateMarkdown } from "./diff.js";

/**
 * CLI options for pickdiff.
 */
interface CliOptions {
  repoPath: string;
  startCommit: string;
  endCommit: string;
  files: string[];
  contextLines: number;
  output: "markdown" | "stdout";
  outputFile: string | null;
}

/**
 * Parse command-line arguments and return CLI options.
 * @param args Command-line arguments (process.argv.slice(2))
 * @returns Parsed CLI options
 */
export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    repoPath: process.cwd(),
    startCommit: "",
    endCommit: "",
    files: [],
    contextLines: 3,
    output: "stdout",
    outputFile: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case "--repo":
      case "-r":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        options.repoPath = path.resolve(args[i]);
        break;

      case "--start":
      case "-s":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        options.startCommit = args[i];
        break;

      case "--end":
      case "-e":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        options.endCommit = args[i];
        break;

      case "--files":
      case "-f":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        // Parse comma-separated file list
        options.files.push(
          ...args[i]
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
        );
        break;

      case "--file-list":
      case "-F": {
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        // Read files from a file (one per line)
        const filePath = path.resolve(args[i]);
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        const fileContent = fs.readFileSync(filePath, "utf-8");
        options.files.push(
          ...fileContent
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
        );
        break;
      }

      case "--context":
      case "-c": {
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        const contextLines = Number.parseInt(args[i], 10);
        if (Number.isNaN(contextLines) || contextLines < 0) {
          throw new Error(`Invalid context lines value: ${args[i]}`);
        }
        options.contextLines = contextLines;
        break;
      }

      case "--output":
      case "-o":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        if (args[i] !== "markdown" && args[i] !== "stdout") {
          throw new Error(
            `Invalid output format: ${args[i]}. Must be 'markdown' or 'stdout'`,
          );
        }
        options.output = args[i] as "markdown" | "stdout";
        break;

      case "--write":
      case "-w":
        i++;
        if (i >= args.length) {
          throw new Error(`Missing value for ${arg}`);
        }
        options.outputFile = path.resolve(args[i]);
        break;

      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;

      case "--version":
      case "-v":
        printVersion();
        process.exit(0);
        break;

      default:
        // Unknown argument
        throw new Error(`Unknown argument: ${arg}`);
    }

    i++;
  }

  return options;
}

/**
 * Validate CLI options and throw if required options are missing.
 * @param options CLI options to validate
 */
export function validateOptions(options: CliOptions): void {
  if (!options.startCommit) {
    throw new Error("Missing required argument: --start (-s)");
  }
  if (!options.endCommit) {
    throw new Error("Missing required argument: --end (-e)");
  }
  if (options.files.length === 0) {
    throw new Error(
      "Missing required argument: --files (-f) or --file-list (-F)",
    );
  }
}

/**
 * Print help message.
 */
export function printHelp(): void {
  console.log(`
pickdiff - Generate diffs between Git commits for specific files

Usage:
  pickdiff [options]

Required Options:
  -s, --start <commit>     Start commit (base commit)
  -e, --end <commit>       End commit (target commit)
  -f, --files <files>      Comma-separated list of files to diff
  -F, --file-list <path>   Path to file containing list of files (one per line)

  Note: At least one of --files or --file-list is required. Both can be used
  together to combine file lists.

Optional:
  -r, --repo <path>        Repository path (default: current directory)
  -c, --context <lines>    Number of context lines (default: 3)
  -o, --output <format>    Output format: 'stdout' (raw diff) or 'markdown' (default: stdout)
  -w, --write <file>       Write output to file instead of terminal
  -h, --help               Show this help message
  -v, --version            Show version

Examples:
  pickdiff -s HEAD~5 -e HEAD -f src/index.ts,src/utils.ts
  pickdiff --start abc123 --end def456 --file-list files.txt --output markdown
  pickdiff -r /path/to/repo -s main -e feature-branch -f README.md
  pickdiff -s HEAD~5 -e HEAD -f src/index.ts -o markdown -w diff.md
`);
}

/**
 * Print version information.
 */
export function printVersion(): void {
  // Read version from package.json
  try {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    console.log(`pickdiff v${packageJson.version}`);
  } catch {
    console.log("pickdiff (version unknown)");
  }
}

/**
 * Format diff output for stdout (raw diff format).
 * @param diffs The diff result containing file diffs
 * @returns Formatted diff string
 */
export function formatStdoutDiff(diffs: DiffResult): string {
  const lines: string[] = [];

  for (const file of Object.keys(diffs.diffs)) {
    const diffLines = diffs.diffs[file];

    // Add file header
    lines.push(`--- a/${file}`);
    lines.push(`+++ b/${file}`);

    // Check for no changes marker
    if (diffLines.length === 1 && diffLines[0].content === "NO_CHANGES") {
      lines.push("(no changes)");
      lines.push("");
      continue;
    }

    // Output diff lines
    for (const diffLine of diffLines) {
      lines.push(diffLine.content);
    }
    lines.push("");
  }

  // Add excluded files warning if any
  if (diffs.excludedFiles.length > 0) {
    lines.push("");
    lines.push("# Excluded files (not found in end commit):");
    for (const file of diffs.excludedFiles) {
      lines.push(`#   ${file}`);
    }
  }

  return lines.join("\n");
}

/**
 * Main CLI entry point.
 * @param args Command-line arguments (defaults to process.argv.slice(2))
 */
export async function main(
  args: string[] = process.argv.slice(2),
): Promise<void> {
  try {
    // Show help if no arguments provided
    if (args.length === 0) {
      printHelp();
      process.exit(0);
    }

    // Parse and validate arguments
    const options = parseArgs(args);
    validateOptions(options);

    // Initialize git
    const git = simpleGit(options.repoPath);

    // Verify repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error(`Not a git repository: ${options.repoPath}`);
    }

    // Generate diffs
    const result = await generateDiffs(
      git,
      options.startCommit,
      options.endCommit,
      options.files,
      options.contextLines,
    );

    // Format and output
    let output: string;
    if (options.output === "markdown") {
      output = generateMarkdown({
        repoPath: options.repoPath,
        startCommit: options.startCommit,
        endCommit: options.endCommit,
        contextLines: options.contextLines,
        diffs: result.diffs,
        excludedFiles: result.excludedFiles,
      });
    } else {
      output = formatStdoutDiff(result);
    }

    // Write to file or stdout
    if (options.outputFile) {
      fs.writeFileSync(options.outputFile, output, "utf-8");
      console.log(`Output written to: ${options.outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
}
