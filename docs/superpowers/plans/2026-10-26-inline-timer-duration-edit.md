# Inline Timer Duration Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a double-click on the injected Redmine widget timer to edit and persist the active session duration as `HH:MM:SS`.

**Architecture:** Keep the content script responsible only for transient edit state and validation. Add a domain operation and runtime message handled by the service worker so persisted timer state remains authoritative. For running sessions, adjust the current segment start timestamp relative to the requested total; for paused sessions, update the stored duration directly.

**Tech Stack:** React 19, TypeScript, Vitest, WXT Chrome extension runtime.

**Spec:** `docs/superpowers/specs/2026-10-26-inline-timer-duration-edit-design.md`

## Global Constraints

- The feature applies only to the active session represented by the current widget issue.
- The editor uses hours, minutes, and seconds and rejects negative values and minutes/seconds outside `0..59`.
- `Enter`/confirmation saves, `Esc` cancels, and clicking outside does not save implicitly.
- Do not change start/end time, date, issue, activity, or already-ended sessions.
- Preserve existing architecture and dependencies; the service worker remains the state authority.

## Review Focus

- Double-click while no session is active must not expose an editor; test through the component behavior or inspect the guarded event path.
- A running session must continue ticking from the edited duration; pin the segment timestamp calculation in the domain test.
- A paused session must retain its paused status and exact edited duration; pin both in the domain test.
- Invalid minutes/seconds and malformed input must show an error and avoid sending a save message; cover the validator/editor path where test infrastructure permits.
- Escape and failed persistence must leave the displayed timer controlled by the refreshed snapshot; verify the editor reset behavior in the content widget test or focused type/build validation.

### Task 1: Add domain adjustment and runtime message

**Files:**
- Modify: `src/domain/timer.ts`
- Test: `tests/domain/timer.test.ts`
- Modify: `src/services/messaging/protocol.ts`
- Modify: `src/background.ts`

**Interfaces:**
- Produces `setActiveSessionDuration(state: TimerState, durationSeconds: number, now: string): TimerState`.
- Produces runtime message `{ type: 'UPDATE_ACTIVE_SESSION_DURATION'; durationSeconds: number }`.

- [ ] **Step 1: Write failing domain tests** for a paused session preserving `status: 'paused'` while changing `durationSeconds`, and a running session whose current segment is recalculated so `getDisplayedDuration` equals the edited duration at `now` and continues increasing afterward.
- [ ] **Step 2: Run `npm test -- tests/domain/timer.test.ts` and confirm the new tests fail because the operation is missing.
- [ ] **Step 3: Implement `setActiveSessionDuration` in `src/domain/timer.ts`**, rejecting a missing/non-running-or-paused active session and negative duration; update the current segment start for running sessions and the persisted duration for paused sessions without changing session identity or status.
- [ ] **Step 4: Add the runtime message type and handle it in `src/background.ts`**, scoping the active session to the connected account, validating that it is active, applying the domain operation, persisting the account sessions, refreshing the action indicator, and returning the public state.
- [ ] **Step 5: Run `npm test -- tests/domain/timer.test.ts` and `npm run typecheck` and confirm they pass.

### Task 2: Add inline editor to the injected widget

**Files:**
- Modify: `src/entrypoints/content.tsx`

**Interfaces:**
- Consumes `UPDATE_ACTIVE_SESSION_DURATION` from Task 1.
- Produces a double-click editor with three numeric inputs, save/cancel controls, keyboard handling, and validation feedback.

- [ ] **Step 1: Add pure local helpers in `src/entrypoints/content.tsx`** to split seconds into `HH`, `MM`, `SS`, parse the three fields, and reject non-finite/negative values or minute/second values outside `0..59`.
- [ ] **Step 2: Add transient editor state to `InlineControl`**, opening only when `active` is true, initializing from `snapshot.seconds`, focusing the hours field, and resetting on cancel, refresh failure, or successful save.
- [ ] **Step 3: Replace the timer `<span>` in edit mode with three labeled inputs and compact save/cancel controls**, wiring `onDoubleClick`, `Enter`, `Escape`, and `onClick` handlers without changing the existing start/pause/stop/launch controls.
- [ ] **Step 4: Send `UPDATE_ACTIVE_SESSION_DURATION` only after valid parsing**, show an inline error for invalid input or runtime failure, and keep the editor open on failure so the user can correct or retry.
- [ ] **Step 5: Add scoped shadow-DOM styles for the editor inputs, validation message, and controls, including dark/system theme compatibility.
- [ ] **Step 6: Run `npm run typecheck` and `npm run lint`.

### Task 3: Verify the integrated extension behavior

**Files:**
- Modify: `docs/timer-behavior.md` if implementation details need documenting.

- [ ] **Step 1: Run focused tests:** `npm test -- tests/domain/timer.test.ts`.
- [ ] **Step 2: Run the full checks:** `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] **Step 3: Review `git diff` and confirm only the approved feature files and design/plan documentation changed; preserve all pre-existing dirty work.
- [ ] **Step 4: If browser automation is available, load the built extension on a Redmine issue and verify double-click, valid save, invalid input, Enter, and Escape behavior; otherwise report browser validation as unavailable rather than claiming it.

