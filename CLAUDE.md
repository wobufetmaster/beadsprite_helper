# Claude Code Project Configuration

## Execution Preferences

### Plan Execution
When executing implementation plans, **always use Subagent-Driven Development (option 1)**.

This means:
- Dispatch fresh subagent per task
- Code review between tasks
- Fast iteration with quality gates
- Stay in current session

Do NOT use Parallel Session execution unless explicitly requested by the user.

## Worktree Directory
Worktrees should be created in: `.worktrees/` (project-local, hidden)
