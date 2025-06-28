## Copilot Instructions for `git-changes-summary`

This document provides specific instructions for AI tools (like GitHub Copilot) when interacting with this repository, especially concerning long-running processes and server management.

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

Due to limitations in the AI's ability to reliably execute `git commit` commands (as of 06/28/2025 when using Gemini CLI), especially with multi-line messages, the AI will prepare the staging area and then propose the commit message for the user to execute manually. The user should copy the proposed commit message and run `git commit -m "<proposed_message>"` in their terminal.
