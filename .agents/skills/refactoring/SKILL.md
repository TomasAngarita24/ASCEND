---
name: refactoring
description: Improves existing code structure, readability, maintainability, and duplication without intentionally changing externally observable behavior. Use when cleaning up code, reducing technical debt, simplifying modules, or improving design.
---

# Refactoring

## Goal
Improve internal structure while preserving behavior.

## Before refactoring
- Understand current behavior.
- Identify existing tests.
- Identify public interfaces and dependencies.
- Determine the specific problem being improved.
- Define the smallest useful refactoring.

## Rules
- Preserve externally observable behavior unless the task explicitly requests a behavior change.
- Make focused changes.
- Prefer incremental refactoring.
- Avoid mixing refactoring with unrelated features.
- Avoid large rewrites when a smaller transformation works.
- Remove duplication only when the duplicated behavior is genuinely the same.
- Simplify complex control flow when behavior remains clear.
- Improve names when they are genuinely misleading.
- Do not introduce abstractions solely to eliminate a small amount of duplication.
- Do not change architecture without a concrete benefit.
- Preserve error behavior unless it is explicitly part of the refactoring goal.
- Keep compatibility in mind for public APIs.

## Verification
- Run relevant tests before and after the refactoring when possible.
- Compare behavior at important boundaries.
- Inspect the final diff for accidental changes.
- If tests are missing, state the verification limitation rather than claiming equivalence.

## Comments
Use the minimum possible comments. Remove comments made obsolete by clearer code.
