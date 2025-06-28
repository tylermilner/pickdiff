# Git Changes Summary

A simple frontend web application that runs locally and provides a user-friendly interface to display a visual diff of selected files between two commits in a Git repository.

## Problem Solved

Traditional `git diff` commands can be difficult to read and manage, especially when focusing on specific file changes across different commits. This tool aims to simplify the process by offering a graphical interface to select files and visualize their differences.

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
    cd git-changes-summary
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## How to Run

After installation, you can start the application:

### Development

For development with automatic server restarts on file changes, use:

```bash
npm run dev
```

### Production

To run the application in a production environment:

```bash
npm start
```

In both cases, the application will be accessible in your web browser, usually at `http://localhost:3000`.

## Usage

1.  Open your web browser and navigate to `http://localhost:3000`.
2.  Enter the **Start Commit** hash and **End Commit** hash in the respective input fields. These can be full commit hashes or any Git reference (e.g., `HEAD~1`, `main`, `develop`).
3.  The file tree will display all tracked files in your repository. Select the files you wish to compare by checking the boxes next to their names.
4.  Click the "Generate Summary" button.
5.  The application will display the diffs for the selected files, with additions highlighted in green and deletions in red.
