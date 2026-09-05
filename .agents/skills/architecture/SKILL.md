---
name: architecture
description: Designs and evaluates software architecture while preserving appropriate separation of responsibilities, low coupling, high cohesion, and project conventions. Use for new modules, major features, structural changes, integrations, or architectural refactoring.
---

# Architecture

## Goal
Choose the simplest architecture that satisfies current requirements and remains maintainable.

## Rules
- Understand the existing architecture before changing it.
- Follow established project conventions unless there is a concrete reason not to.
- Keep responsibilities separated.
- Favor high cohesion and low coupling.
- Avoid circular dependencies.
- Define clear module boundaries.
- Keep business logic independent from infrastructure when the project's architecture calls for it.
- Keep external integrations behind appropriate boundaries.
- Prefer dependency direction that reduces coupling.
- Avoid premature abstraction.
- Avoid speculative extensibility.
- Do not introduce design patterns merely because they are available.
- Do not add layers that only forward calls without providing value.
- Avoid creating interfaces or factories without a concrete use case.
- Consider error handling, testability, security, and operational concerns.

## Decision process
Before a significant architectural change:
1. Identify the current structure.
2. Identify the actual problem.
3. List the smallest viable solutions.
4. Choose the simplest solution that satisfies the requirements.
5. Consider migration and regression risk.
6. Keep unrelated architecture unchanged.

## Comments
Document architectural decisions only when they are non-obvious and likely to matter later. Avoid explanatory comments in ordinary code.
