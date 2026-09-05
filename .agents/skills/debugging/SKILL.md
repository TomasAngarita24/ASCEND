---
name: debugging
description: Investigates software bugs systematically, identifies root causes, applies minimal fixes, and verifies regressions. Use when errors, failing tests, unexpected behavior, crashes, logs, stack traces, or inconsistent results need investigation.
---

# Debugging

## Goal
Find and fix the root cause rather than masking symptoms.

## Workflow
1. Read the error, stack trace, logs, and relevant code.
2. Reproduce the problem when possible.
3. Identify the smallest failing path.
4. Form a concrete hypothesis.
5. Verify the hypothesis with targeted inspection or experiments.
6. Fix the root cause.
7. Run relevant tests.
8. Check for regressions.

## Rules
- Do not change random code hoping the error disappears.
- Do not make unrelated refactors while debugging.
- Do not suppress exceptions or warnings merely to hide the problem.
- Do not add arbitrary delays, retries, or conditionals without understanding why they are needed.
- Preserve existing behavior outside the bug.
- Prefer a small, understandable fix over a broad rewrite.
- If the problem is environmental or configuration-related, distinguish it clearly from a code defect.
- If evidence is insufficient, state what is known and what remains uncertain.

## Verification
- Reproduce the original failure before the fix when possible.
- Confirm the original failure is gone.
- Run regression tests.
- Inspect adjacent code for the same root cause when appropriate.

## Comments
Use almost no comments. Prefer code and tests that make the fix self-explanatory.
