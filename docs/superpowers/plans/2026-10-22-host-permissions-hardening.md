# Redmine Host Permissions Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broad mandatory host access and automatic all-HTTPS injection with explicit, origin-scoped permission requests and runtime content-script registration.

**Architecture:** Keep API calls and credentials in the service worker. The settings page requests the exact Redmine origin after explicit user action; the service worker verifies that permission before every authenticated API operation. WXT builds the content script as a runtime-registered bundle, and the service worker registers it only for the configured origin and preference state.

**Tech Stack:** WXT, Chrome Manifest V3, React, TypeScript, Vitest, Chrome `permissions` and `scripting` APIs.

**Spec:** User request to reduce Chrome Web Store broad-permission warnings while preserving configurable Redmine instances.

## Global Constraints

- No fixed Redmine domain in mandatory `host_permissions`.
- No automatic content script injection on all HTTPS sites.
- API keys remain in extension-local storage and never reach content scripts or page DOM.
- HTTPS is preferred; HTTP requires explicit user confirmation and a risk warning.
- No commit or push.

## Review Focus

- Custom ports and subdirectories: permission pattern uses the origin while API base URL preserves the path.
- Permission refusal/revocation: API and injection paths return actionable messages and do not call `fetch`.
- Server switching: old runtime registration is removed before the new origin is registered.
- HTTP configuration: explicit confirmation is required before the first authenticated request.
- Service-worker restart: registered script is reconciled from current account/preferences without broadening access.

### Task 1: Permission and URL boundary

**Files:**
- Create: `src/services/permissions/host.ts`
- Modify: `src/services/redmine/client.ts`, `src/services/messaging/protocol.ts`, `src/shared/App.tsx`
- Test: `tests/services/host-permissions.test.ts`

- [ ] Add pure URL normalization and exact-origin pattern helpers.
- [ ] Request/check permission only from explicit settings actions.
- [ ] Allow HTTP only with an explicit confirmation flag; keep HTTPS as default.
- [ ] Verify permission before `RedmineClient` requests.

### Task 2: Runtime content-script registration

**Files:**
- Modify: `src/entrypoints/content.tsx`, `src/background.ts`, `wxt.config.ts`
- Test: `tests/services/content-script-registration.test.ts`

- [ ] Configure WXT content entrypoint as runtime-registered with no manifest matches.
- [ ] Add only `scripting` to technical permissions and remove unused `tabs`.
- [ ] Register the compiled content script for the exact authorized origin.
- [ ] Unregister/reconcile on account switch, preference change, permission removal, and worker startup.

### Task 3: Manifest, documentation, and validation

**Files:**
- Modify: `docs/security.md`, `docs/IMPLEMENTATION_STATUS.md`

- [ ] Document removed, retained, and residual permissions.
- [ ] Validate generated manifest, tests, lint, typecheck, and production build.
- [ ] Confirm no credentials or broad host matches appear in the package.
