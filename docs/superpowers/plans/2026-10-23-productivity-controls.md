# Controles de produtividade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add keyboard timer commands, pending-work filters, and a daily report visualization to Geja Time Tracker without changing session semantics.

**Architecture:** Manifest commands are handled by the existing WXT service worker and call the existing repository/timer operations. Domain helpers calculate filters and report series as pure functions; React only renders and composes them.

**Tech Stack:** WXT, Chrome Manifest V3, React, TypeScript, Vitest, existing Redmine client and storage repository.

**Spec:** `docs/superpowers/specs/2026-10-23-productivity-controls-design.md`

## Global Constraints

- Keep API keys in extension-controlled storage and keep authenticated Redmine calls in the service worker.
- Preserve independent timer sessions: starting after stop always creates a new session.
- Do not introduce a backend or external telemetry.
- Keep local pending time separate from server-registered time.

## Review Focus

- A keyboard command with no active session must return a clear no-op/error instead of corrupting state.
- A pending-session filter must be scoped to the active Redmine account.
- A report day with no entries must render zero, while a loading state remains distinct from zero.
- Report date grouping must use the user’s local civil date.
- The generated MV3 manifest must include commands without broadening host access.

### Task 1: Domain report series and issue filters

**Files:**
- Modify: `src/domain/reports.ts`
- Modify: `src/domain/issue-filters.ts`
- Test: `tests/domain/reports.test.ts`
- Test: `tests/domain/issue-filters.test.ts`

- [ ] Add failing tests for daily report series and pending/today issue filters.
- [ ] Implement pure helpers and run focused tests.
- [ ] Run typecheck and lint for the domain changes.

### Task 2: Keyboard commands

**Files:**
- Modify: `wxt.config.ts`
- Modify: `src/background.ts`
- Test: `tests/services/commands.test.ts`

- [ ] Add command definitions to the manifest configuration.
- [ ] Add a small command dispatcher that reads current state and routes to existing timer operations.
- [ ] Test active, paused, and empty states without calling Redmine.

### Task 3: UI filters and report chart

**Files:**
- Modify: `src/shared/App.tsx`
- Modify: `src/styles/app.css`

- [ ] Add filter controls for “com sessões pendentes” and “trabalhados hoje”.
- [ ] Render a compact daily report chart using the pure report series.
- [ ] Keep loading, empty, pending-local, and server-confirmed states visually distinct.

### Task 4: Verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

- [ ] Run the focused tests and full test suite.
- [ ] Run lint, typecheck, build, and `git diff --check`.
- [ ] Document implemented behavior and any real-Redmine validation still required.
