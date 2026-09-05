---
name: git-workflow
description: Performs safe Git workflows for software development, including inspecting changes, commits, branches, merges, and conflict handling. Use whenever Git operations or version-control decisions are involved.
---

# Git Workflow

## Safety
- Inspect repository status before significant Git operations.
- Preserve existing uncommitted work.
- Never discard user changes without explicit authorization.
- Never use destructive commands such as reset --hard, clean, checkout over files, or history rewriting unless explicitly authorized.
- Never commit secrets.
- Never force-push unless explicitly authorized.

## Changes
- Keep commits focused and logically coherent.
- Do not mix unrelated changes.
- Review the diff before committing.
- Avoid committing generated artifacts unless the project requires them.
- Respect the project's existing branch and commit conventions.

## Commits
When asked to create a commit:
1. Inspect status.
2. Inspect the diff.
3. Check for secrets or unrelated files.
4. Stage only intended changes.
5. Use a concise, descriptive commit message.
6. Verify the resulting status.

## Conflicts
- Understand both sides before resolving.
- Preserve intended behavior from both branches where appropriate.
- Never resolve conflicts by blindly choosing one side.
- Run relevant tests after resolution.

## Comments
Do not add comments to source code merely because a Git operation occurred.
