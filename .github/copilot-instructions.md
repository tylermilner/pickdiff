## Copilot Instructions for `pickdiff`

This document provides specific instructions for AI tools (like GitHub Copilot) when interacting with this repository.

## Project Overview

PickDiff is a web application that displays visual diffs of selected files between two commits in a Git repository. It consists of:
- **Backend**: Node.js/Express server (TypeScript) that provides Git operations via API endpoints
- **Frontend**: Browser-based UI (TypeScript) for selecting commits and files, displaying diffs
- The app runs locally and can export diffs to HTML/PDF for use with LLMs

## Repository Structure

```
pickdiff/
├── src/              # Backend TypeScript source (server.ts)
├── frontend/         # Frontend TypeScript source (script.ts)
├── dist/             # Compiled backend JavaScript (gitignored, generated from src/)
├── public/           # Static assets served to browser
│   ├── index.html    # Main HTML page
│   ├── styles.css    # Styling
│   └── script.js     # Compiled frontend (gitignored, generated from frontend/)
├── tests/
│   ├── unit/         # Unit tests with mocked dependencies
│   ├── integration/  # Integration tests with real server/git operations
│   └── e2e/          # End-to-end Playwright tests
├── biome.json        # Biome linter/formatter configuration
└── package.json      # Dependencies and scripts
```

## Building and Testing

### Installation
```bash
npm install
```

### Building
```bash
npm run build              # Build both backend and frontend
npm run build:backend      # Build only backend (src/ → dist/)
npm run build:frontend     # Build only frontend (frontend/ → public/script.js)
npm run build:watch        # Watch mode for development
```

### Running the Application
```bash
npm start                  # Build and start the server (uses current directory as git repo)
npm start -- /path/to/repo # Start with specific repository path
npm run dev                # Development mode with ts-node (no build required)
npm run dev:watch          # Development mode with auto-restart on changes
```

The server runs on `http://localhost:3000` by default.

### Testing
```bash
npm test                   # Run unit and integration tests
npm run test:unit          # Run only unit tests
npm run test:integration   # Run only integration tests
npm run test:e2e           # Run end-to-end tests (requires Playwright installation)
npm run test:all           # Run all tests (unit + integration + e2e)
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

**Note**: E2E tests require Playwright browsers to be installed first:
```bash
npx playwright install
```

### Code Quality
```bash
npm run lint               # Check code with Biome
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format code with Biome
npm run type-check         # TypeScript type checking without emitting files
```

## Development Workflow

1. **Making Changes**: Edit source files in `src/` (backend) or `frontend/` (frontend)
2. **Type Checking**: Run `npm run type-check` to verify TypeScript without building
3. **Building**: Run `npm run build` or use `npm run build:watch` for automatic rebuilds
4. **Testing**: Run appropriate test suite after changes
5. **Linting**: Run `npm run lint` and fix any issues before committing
6. **Local Testing**: Use `npm run dev:watch` to run the server with auto-restart during development

## Code Style and Conventions

- **Linter/Formatter**: [Biome](https://biomejs.dev/) - fast, modern, zero-config
- **Language**: TypeScript for both backend and frontend
- **Style**: Follow Biome's default configuration
- **Imports**: Use ES6 imports, Node.js built-ins with `node:` prefix (e.g., `node:path`)
- Always run `npm run lint:fix` before committing to ensure consistent formatting

## Testing Strategy

- **Unit Tests** (`tests/unit/`): Test API endpoints with mocked dependencies (simple-git, file system)
- **Integration Tests** (`tests/integration/`): Test complete workflows with real server and git operations
- **E2E Tests** (`tests/e2e/`): Test full application flow in real browser with Playwright
- All tests use Jest except E2E which uses Playwright
- Tests automatically build the project before running (`pretest` script)

## Common Tasks

### Adding a New Feature
1. Create/modify source files in `src/` or `frontend/`
2. Add corresponding tests in `tests/unit/`, `tests/integration/`, or `tests/e2e/`
3. Run `npm run build` to compile
4. Run tests: `npm test` or `npm run test:all`
5. Run `npm run lint:fix` to ensure code quality
6. Test manually by running `npm run dev` and accessing `http://localhost:3000`

### Fixing a Bug
1. Add a failing test that reproduces the bug
2. Fix the issue in source files
3. Verify the test now passes
4. Run full test suite to ensure no regressions
5. Run linter and type-check

### Adding a Dependency
1. Install: `npm install <package>` or `npm install --save-dev <package>`
2. Update code to use the new dependency
3. Add/update tests
4. Verify build and tests still pass

## Process Management and Special Considerations

### Handling Long-Running Processes (e.g., `npm start`)

When the application's server needs to be running to perform tasks (e.g., `curl` requests to API endpoints, frontend testing), the AI tool **must not** execute `npm start` (or similar commands that start a server) in a way that blocks the terminal or prevents further commands from being issued (as of 06/28/2025 when using Gemini CLI).

Instead, if the AI needs the server to be running for subsequent operations, it should:

1.  **Start the server in a detached or background mode.** This typically involves using `&` at the end of the command (e.g., `npm start &`) or a process manager if available and configured.
2.  **Record the Process ID (PID)** of the background process if possible, to facilitate later termination.
3.  **Perform necessary operations** (e.g., `curl` requests, file modifications).
4.  **Terminate the background server process** once the operations requiring it are complete. This is crucial to avoid orphaned processes and port conflicts. Use `kill <PID>` or `killall node` (with caution) if the PID is known, or `lsof -i :<port>` to find and kill the process.

**Example Workflow for AI:**

```bash
# Start the server in the background
npm start &

# Wait a moment for the server to fully start (optional, but good practice)
sleep 5

# Perform operations that require the server
curl http://localhost:3000/api/files

# Terminate the server process
# (Assuming PID is known or can be found, e.g., using lsof)
kill $(lsof -t -i :3000)
```

### Manual Intervention

If the AI encounters a situation where it cannot reliably start or stop the server, it should inform the user and request manual intervention.

### Testing Workflow

For testing frontend changes, the AI should instruct the user to manually:

1.  Start the server (`npm start`).
2.  Open `http://localhost:3000` in their browser.
3.  Manually input commit hashes and select files to test the functionality.

The AI should avoid attempting to automate browser interactions or complex UI testing.

### Git Commit Workflow

When working with this repository:
- Make focused, atomic commits
- Write clear commit messages describing the change
- Run tests and linter before committing
- Use conventional commit format when appropriate (e.g., `feat:`, `fix:`, `docs:`)

## Key Dependencies

- **express** (v5.x): Web server framework
- **simple-git** (v3.x): Git operations library
- **TypeScript** (v5.x): Type-safe JavaScript
- **Biome**: Linting and formatting
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **ts-node**: Run TypeScript directly in development

## Known Issues and Quirks

- The `public/script.js` file is generated from `frontend/script.ts` and should not be edited directly
- The `dist/` directory is generated and gitignored - always edit source in `src/`
- E2E tests require `npx playwright install` to be run once before first use
- The server uses the current working directory as the git repository by default
- Port 3000 is used by default; ensure it's available or set `PORT` environment variable
