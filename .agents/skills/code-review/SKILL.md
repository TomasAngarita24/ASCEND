---
name: code-review
description: Reviews code changes for correctness, bugs, security issues, maintainability, performance problems, regressions, and unnecessary complexity. Use when reviewing diffs, pull requests, completed changes, or before merging.
---

# Code Review

## Review order
1. Correctness
2. Security
3. Regression risk
4. Error handling
5. Maintainability
6. Tests
7. Performance
8. Style

## Rules
- Review the actual diff and relevant surrounding code.
- Do not criticize code merely because it differs from personal preferences.
- Identify concrete problems and explain their impact.
- Prioritize actionable findings.
- Distinguish blocking issues from minor suggestions.
- Look for edge cases and failure paths.
- Check authorization boundaries and input validation.
- Check whether tests adequately cover changed behavior.
- Check for duplicated logic and unnecessary complexity.
- Check for accidental unrelated changes.
- Check for secrets or sensitive data.
- Check dependency changes for unnecessary additions.
- Check backwards compatibility where relevant.

## Feedback
For each significant finding:
- State the problem.
- Explain why it matters.
- Point to the relevant code or behavior.
- Suggest a concise fix when possible.

Do not invent issues without evidence.

## Comments
Keep review comments concise. Do not flood the review with stylistic comments when the code is already clear.
