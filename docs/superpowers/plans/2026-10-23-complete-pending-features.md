# Geja Time Tracker Pending Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the highest-value pending features: real issue filtering/grouping, explicit assigned/all issue scope, Redmine projects and time-entry history, and report inputs based on real data.

**Architecture:** Keep Redmine requests centralized in the service worker and expose typed runtime messages. Put filtering, grouping, sorting, and report aggregation in pure domain/util modules so the React popup and Side Panel reuse the same behavior. Preserve local pending sessions as a distinct source from server time entries.

**Tech Stack:** WXT, React, TypeScript, Zustand-compatible existing repository layer, Vitest, React Testing Library, Chrome MV3.

**Spec:** `docs/IMPLEMENTATION_STATUS.md` and the original Redmine Time Tracker requirements in the conversation.

## Global Constraints

- Credentials remain restricted to extension contexts and authenticated requests stay in the service worker.
- Local pending sessions and server time entries must remain visibly separate.
- No automatic posting of time entries and no retry of unknown POST results.
- Existing timer/session semantics must not change.
- Preserve the dynamic host-permission and content-script strategy.
- Keep the interface in Brazilian Portuguese.

## Review Focus

- Empty issue lists and Redmine responses without optional status, priority, or version.
- Explicit switch from assigned issues to all accessible issues without silently broadening the default scope.
- Server time-entry permission failures without hiding local pending sessions.
- Duplicate local/server durations must not be added into one ambiguous total.
- Narrow Side Panel layout must remain free of horizontal overflow.

### Task 1: Issue query domain and filters

**Files:**
- Create: `src/domain/issue-filters.ts`
- Test: `tests/domain/issue-filters.test.ts`

Add pure filtering, sorting, and grouping functions for text/ID, project, status, priority, target version, active/pinned ordering, and the assigned/all scope contract.

### Task 2: Redmine project and time-entry messages

**Files:**
- Modify: `src/services/messaging/protocol.ts`
- Modify: `src/background.ts`
- Modify: `src/services/redmine/client.ts`
- Test: `tests/services/redmine-client.test.ts`

Expose typed `GET_PROJECTS` and `GET_TIME_ENTRIES` messages. Query server time entries for the authenticated user and return permission errors without changing local session state.

### Task 3: Calls panel behavior

**Files:**
- Modify: `src/shared/App.tsx`
- Modify: `src/domain/preferences.ts`
- Test: `tests/domain/preferences.test.ts`

Load assigned issues by default, add an explicit all-accessible toggle, project/status/priority/text filters, version grouping, preference-controlled sorting and pinning, and compact empty/loading/error states.

### Task 4: Hours history and report separation

**Files:**
- Modify: `src/shared/App.tsx`
- Modify: `src/utils/time-report.ts`
- Modify: `src/styles/app.css`
- Test: `tests/utils/time-report.test.ts`

Show server entries separately from local pending sessions, summarize real server totals, and include available server data in the printable report without combining sources ambiguously.

### Task 5: Documentation, full verification, and status

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

Document completed behavior, remaining Redmine-dependent validation, and run typecheck, lint, tests, and production build.
