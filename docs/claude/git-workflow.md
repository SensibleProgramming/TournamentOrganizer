### Recovery: accidentally on `dev` or `main`

If you discover you are on `dev` or `main` with uncommitted (or committed-but-not-pushed) changes, **do not commit or push**. Instead:

```bash
# 1. Create a new feature branch from the current state
git checkout -b feature/<task-name>

# 2. Commit your changes there
git add <files>
git commit -m "..."

# 3. Push the feature branch
git push -u TournamentOrganizer feature/<task-name>

# 4. Check for an existing PR; create one only if none exists
gh pr list --head feature/<task-name> --base dev --json number --jq '.[0].number'
# → no output: gh pr create --base dev --title "..." --body "..."
# → has a number: push already updated the existing PR, nothing more to do
```

This applies to sub-agents running in isolated worktrees as well — **all worktree agents must start from a feature branch, never from `dev` or `main`**.

### Backlog item status (when a prompt file has a GitHub Issue link)

If the prompt file for the current task contains a `> **GitHub Issue:** [#N ...]` line, update the project board at these points:

| Step | Action |
|---|---|
| Starting work | Status → `In Progress`; assign current iteration; estimate story points |
| PR created | Status → `In Review` |
| PR merged to `dev` | Status → `Done` (set manually after verifying — do NOT auto-close) |

Board update commands (field IDs, option IDs, iteration IDs) are defined in the implement command files (`implement-next.md`, `implement-story.md`). Use `gh`'s built-in `--jq` flag — `jq` and `python3` are not available.
