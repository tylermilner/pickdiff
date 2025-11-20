# Contributing to PickDiff

Thank you for your interest in contributing to PickDiff! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected to see
- **Include screenshots** if relevant
- **Include your environment details**: OS, Node.js version, npm version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our [style guidelines](#style-guidelines)
3. **Add tests** if you've added code that should be tested
4. **Ensure the test suite passes** by running `npm run test:all`
5. **Commit your changes** - the pre-commit hook will automatically run the linter and fix issues
6. **Update documentation** if needed
7. **Write a clear commit message** following our guidelines
8. **Submit the pull request**

## Development Setup

1. **Clone your fork** of the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pickdiff.git
   cd pickdiff
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   This will also set up Git hooks (via husky) that automatically run the linter before each commit.

3. **Install Playwright browsers** (for E2E tests):
   ```bash
   npx playwright install
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Run tests** to verify everything works:
   ```bash
   npm run test:all
   ```

### Local Development

- Run the dev server (watching for changes), optionally specifying a repository path:
   ```bash
   npm run dev:watch -- /path/to/your/repo
   ```

- Clean the build directory:
   ```bash
   npm run clean
   ```

### Project Structure

The project uses TypeScript for both backend and frontend.

- Backend source: `src/server.ts`
- Backend output: `dist/server.js`
- Frontend source: `frontend/script.ts`
- Frontend output: `public/script.js`

Notes:
- The `dist/` directory and `public/script.js` are generated artifacts; do not edit them directly.
- Builds:
   - `npm run build` compiles both backend and frontend
   - `npm run build:backend` compiles backend only
   - `npm run build:frontend` compiles frontend only

## Style Guidelines

### Code Style

- This project uses **[Biome](https://biomejs.dev/)** for linting and formatting
- Use **TypeScript** for all new code (both backend and frontend)
- Use ES6 imports with `node:` prefix for Node.js built-ins (e.g., `node:path`)
- Follow existing code patterns and conventions

**Git Pre-commit Hook**: A pre-commit hook is automatically installed when you run `npm install`. This hook runs `lint-staged` which automatically lints and fixes all staged files before each commit. If there are linting errors that cannot be auto-fixed, the commit will be blocked.

Run the linter to check for issues:
```bash
npm run lint
```

Automatically fix linting and formatting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider using conventional commit format (e.g., `feat:`, `fix:`, `docs:`)

## Testing

We use different testing strategies for different parts of the application:

### Unit Tests
Test individual components with mocked dependencies:
```bash
npm run test:unit
```

### Integration Tests
Test complete workflows with real server and git operations:
```bash
npm run test:integration
```

### End-to-End Tests
Test the full application in a real browser (make sure the Playwright browsers are installed first, see [Development Setup](#development-setup) above):
```bash
npm run test:e2e
```

Run end-to-end tests with UI mode:
```bash
npm run test:e2e:ui
```

### All Tests
Run all test suites:
```bash
npm run test:all
```

### Watch Mode

Run tests in watch mode (automatically re-run when files change):
```bash
npm run test:watch
```

### Coverage
Generate test coverage report:
```bash
npm run test:coverage
```

### CI/CD

The project includes GitHub Actions workflows that run tests automatically on pull requests and pushes to the main branch. The workflow runs tests on multiple Node.js versions and generates coverage reports.

## Additional Resources

- [README.md](README.md) - Project overview and setup instructions
- [LICENSE](LICENSE) - MIT License
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting

Thank you for contributing to PickDiff! 🎉
