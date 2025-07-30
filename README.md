# PickDiff

A simple frontend web application that runs locally and provides a user-friendly interface to display a visual diff of selected files between two commits in a Git repository.

## Problem Solved

Traditional `git diff` commands can be difficult to read and manage, especially when focusing on specific file changes across different commits. This tool aims to simplify the process by offering a graphical interface to select files and visualize their differences.

![Screenshot of PickDiff](./images/pickdiff-screenshot.png)

## Features

- Select start and end commits for comparison.
- Browse and select specific files from the repository to diff.
- View a color-coded, line-by-line diff for selected files.

## Technologies Used

- **Backend:** Node.js with Express.js
- **Git Integration:** `simple-git` library
- **Frontend:** HTML, CSS (Bootstrap), JavaScript

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

After installation, you can start the application. By default, it will use the current working directory as the Git repository.

```bash
npm start
```

Alternatively, you can specify a different repository path by providing it as a command-line argument:

```bash
npm start -- /path/to/your/repo
```

For development with automatic server restarts on file changes, use:

```bash
npm run dev
```

In all cases, the application will be accessible in your web browser, usually at `http://localhost:3000`.

## Testing

This project includes comprehensive test coverage using Jest for unit and integration tests, and Playwright for end-to-end tests.

### Unit and Integration Tests

#### Running Unit and Integration Tests

```bash
# Run all unit and integration tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit and integration tests with coverage report
npm run test:coverage

# Run all tests (unit + integration + e2e)
npm run test:all
```

#### Test Structure

- **Unit Tests** (`tests/unit/`): Test the backend API endpoints with mocked dependencies
- **Integration Tests** (`tests/integration/`): Test the complete backend workflow using real server instances and actual git operations

### End-to-End Tests

#### Setting up Playwright

For end-to-end tests, you'll need to install Playwright browsers:

```bash
npx playwright install
```

#### Running End-to-End Tests

```bash
# Run end-to-end tests (requires Playwright browsers)
npm run test:e2e

# Run end-to-end tests with UI mode
npm run test:e2e:ui
```

#### E2E Test Structure

- **End-to-End Tests** (`tests/e2e/`): Test the complete application workflow using Playwright with real browser automation

### CI/CD

The project includes GitHub Actions workflows that run tests automatically on pull requests and pushes to the main branch. The workflow runs tests on multiple Node.js versions and generates coverage reports.

## Usage

1.  Start the application using one of the methods above.
2.  Open your web browser and navigate to `http://localhost:3000`.
3.  The repository path being used will be displayed at the top of the page.
4.  Enter the **Start Commit** hash and **End Commit** hash in the respective input fields. These can be full commit hashes or any Git reference (e.g., `HEAD~1`, `main`, `develop`).
5.  The file tree will display all tracked files in your repository. Select the files you wish to compare by checking the boxes next to their names.
6.  Click the "Generate Summary" button.
7.  The application will display the diffs for the selected files, with additions highlighted in green and deletions in red.

## License

This project is licensed under the [MIT License](./LICENSE).
