---
name: testing
description: Designs, writes, updates, and validates automated tests for new or modified software. Use when implementing features, fixing bugs, changing behavior, or investigating test failures.
---

# Testing

## Goal
Ensure changes are verified by appropriate automated tests without weakening existing coverage.

## Rules
- Inspect existing test structure and conventions before adding tests.
- Prefer the project's existing test framework and utilities.
- Test behavior, not implementation details, unless implementation is itself the contract.
- Cover normal cases, relevant edge cases, and expected failures.
- Add regression tests for fixed bugs.
- Keep tests deterministic and isolated.
- Avoid unnecessary mocks; mock external systems only when appropriate.
- Do not duplicate tests without a clear reason.
- Do not modify production code merely to make a test easier unless the design genuinely benefits.
- Never delete or weaken a test solely because it fails after a change.
- If a test fails, determine whether the problem is in the code, the test, the environment, or an existing assumption.

## Before completion
- Run the most relevant tests.
- Run broader tests when the change could affect other areas.
- Report failures honestly.
- Do not claim tests passed if they were not executed.

## Comments
Use the minimum possible comments. Tests should communicate intent through clear names, structure, and assertions.
