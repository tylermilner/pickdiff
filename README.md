# PickDiff

[![Tests](https://github.com/tylermilner/pickdiff/actions/workflows/tests.yml/badge.svg)](https://github.com/tylermilner/pickdiff/actions/workflows/tests.yml)
[![codecov](https://codecov.io/gh/tylermilner/pickdiff/branch/main/graph/badge.svg)](https://codecov.io/gh/tylermilner/pickdiff)
[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/tylermilner/pickdiff/blob/main/package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/tylermilner/pickdiff/blob/main/LICENSE)

A simple app to display a visual diff of selected files between two commits in a Git repository.

## Why?

Traditional `git diff` commands can be difficult to read and manage, especially when focusing on specific file changes across different commits. This tool aims to simplify the process by offering a graphical interface to select files and visualize their differences. Since it runs locally in the browser, it's also easy to export the output to HTML or PDF for use with LLMs or similar tools.

![Screenshot of PickDiff](./images/pickdiff-screenshot.png)

## Features

- Select start and end commits for comparison.
- Browse and select specific files from the repository to diff.
- View a color-coded, line-by-line diff for selected files.
- Easily export the diff output to HTML or PDF (via browser functionality) for further analysis or input into LLMs.

## Setup and Installation

To get this application running on your local machine, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd pickdiff
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## How to Run

After installation, you can start the application:

```bash
npm start
```

This will automatically compile the TypeScript code and start the server.

By default, it will use the current working directory as the Git repository. Alternatively, you can specify a different repository path by providing it as a command-line argument:

```bash
npm start -- /path/to/your/repo
```

Once started, the application will be accessible in your web browser at `http://localhost:3000`.

If you don't want the browser to open automatically (for example, when running in CI
or when you prefer to open a browser manually), set the `NO_BROWSER` environment
variable to `true` when starting:

```bash
NO_BROWSER=true npm start
```

## Usage

1.  Start the application using one of the methods above.
2.  Open your web browser and navigate to `http://localhost:3000` if it doesn't open automatically.
3.  The repository path being used will be displayed at the top of the page.
4.  Enter the **Start Commit** hash and **End Commit** hash in the respective input fields. These can be full commit hashes or any Git reference (e.g., `HEAD~1`, `main`, `develop`).
5.  The file tree will display all tracked files in your repository. Select the files you wish to compare by checking the boxes next to their names.
6.  Click the "Generate Summary" button.
7.  The application will display the diffs for the selected files, with additions highlighted in green and deletions in red.

Stopping the server: use Ctrl+C in the terminal where `npm start` is running. The server
now handles SIGINT/SIGTERM and will perform a graceful shutdown of the HTTP server
so you won't leave orphaned processes running after closing the browser.

## Development

For development setup, project structure, running the dev server, cleaning builds, testing, and code quality guidelines, see:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) → Development Setup, Local Development, Project Structure, Testing, and Code Style

## Technologies Used

- **Backend:** Node.js with Express.js and TypeScript
- **Git Integration:** `simple-git` library
- **Frontend:** HTML, CSS (Bootstrap), TypeScript (compiled to JavaScript)

## Community & Project Health

| Resource | Purpose |
| -------- | ------- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Guidelines for contributing (workflow, testing, style) |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) | Standards for respectful, inclusive participation |
| [`SECURITY.md`](./SECURITY.md) | How to privately report vulnerabilities |
| [`SUPPORT.md`](./SUPPORT.md) | How to get help or ask questions |
| [`CHANGELOG.md`](./CHANGELOG.md) | Version history & notable changes |

Before opening issues or PRs, please review the Code of Conduct and contribution guidelines. Security-related concerns should always follow the private reporting process in `SECURITY.md` (avoid public issues for vulnerabilities).

## License

This project is licensed under the [MIT License](./LICENSE).
