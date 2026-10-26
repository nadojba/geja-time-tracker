# Geja Time Tracker - Productivity Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a extensão com lançamentos pendentes em lote, histórico e relatórios, filtros avançados de chamados, atalhos, notificações, exportação de preferências e reconciliação mais robusta, sem adicionar nome de chamado ou projeto ao widget injetado.

**Architecture:** Preservar o service worker como único contexto para API Redmine, persistência e operações de timer. Reutilizar a aplicação React compartilhada pelo popup e Side Panel, extraindo componentes quando uma tela crescer demais. O content script continuará limitado à interface do widget e à troca de mensagens, sem acesso a credenciais.

**Tech Stack:** WXT, Manifest V3, React, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand quando necessário, Chrome Storage/IndexedDB conforme a necessidade de volume, Vitest, React Testing Library, ESLint e Prettier.

**Spec:** `docs/superpowers/specs/2026-10-22-redmine-time-tracker-design.md` e os requisitos consolidados em `docs/IMPLEMENTATION_STATUS.md`.

## Global Constraints

- Não mostrar nome do chamado ou projeto dentro do widget injetado; essas informações já existem na página do Redmine.
- Uma sessão encerrada nunca deve ser mesclada, apagada ou retomada automaticamente.
- Sessões e lançamentos devem permanecer isolados por `accountId`.
- Chamadas autenticadas ao Redmine ficam no service worker; content scripts não recebem API Keys.
- Nenhum POST de lançamento deve ser repetido cegamente após timeout ou resultado desconhecido.
- Preferências desmarcadas devem desativar efetivamente o comportamento correspondente, e mudanças devem ser persistidas.
- O idioma padrão da interface permanece português brasileiro.
- Toda nova funcionalidade deve ter teste automatizado e não pode criar apontamentos reais durante a suíte.

## Review Focus

- Lançamento em lote com sessões de chamados, datas e atividades diferentes deve separar apontamentos e nunca somar sessões incompatíveis — cobrir em `tests/services/repository.test.ts` e testes de integração de mensagens.
- Timeout depois de POST deve preservar a sessão como `reconciliation_required` e impedir duplicidade — cobrir no client/background mockado.
- Revogação de permissão, troca de servidor, porta customizada e subdiretório devem continuar funcionando — cobrir em `tests/services/host-permissions.test.ts`.
- Exportação/importação não pode incluir API Key nem misturar sessões de contas — cobrir em testes de serialização e isolamento.
- Atalhos, notificações e filtros não podem operar sobre um chamado ou sessão de outra conta — cobrir em testes de comandos e seletores.

### Task 1: Central de lançamentos pendentes em lote

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/services/messaging/protocol.ts`
- Modify: `src/background.ts`
- Modify: `src/shared/App.tsx`
- Modify: `src/services/storage/repository.ts` when the draft schema needs migration
- Test: `tests/domain/timer.test.ts`
- Test: `tests/services/repository.test.ts`
- Test: `tests/services/messaging.test.ts` (create if absent)

**Interfaces:**
- Consumes: `TimeSession`, `ExtensionState`, `SUBMIT_SESSION`, `UPDATE_SESSION_DRAFT`.
- Produces: `PendingSessionSelection`, `UPDATE_PENDING_SESSIONS`, `SUBMIT_SESSIONS` or equivalent typed messages; each Redmine POST remains one time entry per compatible group.

- [ ] **Step 1: Write failing tests** for selecting, deselecting, editing and deleting pending sessions, including confirmation before deletion.
- [ ] **Step 2: Write failing tests** proving grouping only occurs for equal issue, date and activity, while different issues remain separate.
- [ ] **Step 3: Implement the domain selection/grouping helpers** with stable session IDs and no mutation of recorded duration.
- [ ] **Step 4: Implement background handlers** that validate account ownership, submit each compatible group independently, preserve failures and mark unknown results for reconciliation.
- [ ] **Step 5: Add the Horas UI** for selection, batch launch, edit duration/comments/activity/date, delete confirmation and status labels.
- [ ] **Step 6: Run `npm run test`, `npm run typecheck`, and `npm run lint`** and verify no session is removed before confirmed server success.

### Task 2: Histórico, produtividade e exportação

**Files:**
- Create: `src/features/reports/aggregation.ts`
- Create: `src/features/reports/ReportsTab.tsx`
- Modify: `src/shared/App.tsx`
- Modify: `src/utils/time-report.ts`
- Test: `tests/features/reports/aggregation.test.ts`
- Test: `tests/utils/time-report.test.ts`

**Interfaces:**
- Consumes: submitted local sessions, pending sessions, `GET /time_entries.json`, current account and date range.
- Produces: typed report aggregates for day/week/month/project/issue and PDF/CSV export actions.

- [ ] **Step 1: Write failing aggregation tests** for today, week, month, project, issue, pending and submitted totals without double counting.
- [ ] **Step 2: Implement pure aggregation functions** receiving sessions and a date range, keeping server-recorded and local-pending totals separate.
- [ ] **Step 3: Add the Reports view** with readable summary cards, lightweight charts and filters.
- [ ] **Step 4: Extend PDF export** and add CSV export with account, date range, issue, project, duration and status columns.
- [ ] **Step 5: Add permission/empty/error states** when the Redmine user cannot query time entries.
- [ ] **Step 6: Run focused report tests and the full verification suite.**

### Task 3: Chamados avançados e produtividade de navegação

**Files:**
- Create: `src/features/issues/issue-filters.ts`
- Create: `src/features/issues/IssueFilters.tsx`
- Modify: `src/shared/App.tsx`
- Modify: `src/services/redmine/client.ts`
- Modify: `src/domain/preferences.ts`
- Test: `tests/features/issues/issue-filters.test.ts`
- Test: `tests/services/redmine-client.test.ts`

**Interfaces:**
- Consumes: Redmine issues, projects, statuses, target versions and current preferences.
- Produces: deterministic filtered/sorted/grouped issue collections and persisted preferences for target-version grouping, priority sorting, status, done ratio and pinned issues.

- [ ] **Step 1: Write failing tests** for text/ID/project/status/priority filters, grouping by project/version, priority sorting and pinning active/tracked issues.
- [ ] **Step 2: Implement pure issue selectors** so filtering and ordering are testable without React or Chrome APIs.
- [ ] **Step 3: Add filter controls** with Portuguese labels, clear-all action, remembered default filter and accessible keyboard focus.
- [ ] **Step 4: Render status, priority, done ratio and target version conditionally** according to persisted preferences.
- [ ] **Step 5: Add explicit support for “todos os chamados acessíveis”** only when selected and only if the API permission allows it.
- [ ] **Step 6: Run issue-focused tests and verify refresh/loading/empty/error states.**

### Task 4: Atalhos, notificações e experiência do timer

**Files:**
- Create: `src/services/notifications/timer-notifications.ts`
- Create: `src/services/commands/shortcuts.ts`
- Modify: `wxt.config.ts`
- Modify: `src/background.ts`
- Modify: `src/shared/App.tsx`
- Modify: `src/entrypoints/content.tsx`
- Modify: `src/domain/preferences.ts`
- Test: `tests/services/commands/shortcuts.test.ts`
- Test: `tests/services/notifications/timer-notifications.test.ts`

**Interfaces:**
- Consumes: centralized timer state and account-scoped active session.
- Produces: commands for start/stop/pause/launch, optional notifications and accessible feedback without exposing credentials.

- [ ] **Step 1: Write failing command tests** for start/stop/pause/launch and for commands with no configured account.
- [ ] **Step 2: Add optional commands** using Chrome Commands with documented default shortcuts and conflict-safe behavior.
- [ ] **Step 3: Add optional long-running timer notifications** with a user preference and no notification spam.
- [ ] **Step 4: Improve widget feedback** for action success, error, pending count and collapsed state without adding issue/project names.
- [ ] **Step 5: Improve empty states, focus indicators, tooltips and keyboard operation** in popup, Side Panel and widget.
- [ ] **Step 6: Verify no permission is added without a concrete feature need and run full tests/build.**

### Task 5: Backup de preferências e reconciliação operacional

**Files:**
- Create: `src/services/storage/backup.ts`
- Create: `src/services/reconciliation/reconciliation.ts`
- Modify: `src/shared/App.tsx`
- Modify: `src/background.ts`
- Modify: `src/services/storage/repository.ts`
- Modify: `docs/security.md`
- Test: `tests/services/storage/backup.test.ts`
- Test: `tests/services/reconciliation.test.ts`

**Interfaces:**
- Consumes: versioned local state, account metadata, reconciliation statuses and server-confirmed time entry IDs.
- Produces: API-Key-free export/import payloads, migration-safe restore and explicit reconciliation actions.

- [ ] **Step 1: Write failing tests** proving exports exclude API Keys and account secrets, while sessions retain account IDs and history.
- [ ] **Step 2: Implement versioned export/import** for preferences and non-secret local session data, with validation and preview before import.
- [ ] **Step 3: Implement reconciliation actions** for unknown POST results: mark resolved with a server time-entry ID, keep pending, or discard only after confirmation.
- [ ] **Step 4: Add offline/network state messages** without automatic repeated POSTs.
- [ ] **Step 5: Document account isolation, backup limitations and recovery behavior.**
- [ ] **Step 6: Run security-focused tests, full suite and build.**

### Task 6: Integrações, compatibilidade e validação de navegador

**Files:**
- Modify: `src/entrypoints/content.tsx`
- Modify: `src/services/permissions/host.ts`
- Modify: `docs/redmine-api.md`
- Create: `tests/browser/` or `tests/e2e/` when Playwright is available
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Consumes: configured Redmine URL, dynamic content-script registration and browser messaging.
- Produces: robust issue URL detection, optional context actions and a documented manual/browser verification matrix.

- [ ] **Step 1: Write URL tests** for `/issues/:id`, `/redmine/issues/:id`, custom ports and query/hash variants.
- [ ] **Step 2: Improve route detection and idempotent widget mounting** without fragile dependence on a single CSS selector.
- [ ] **Step 3: Add optional context-menu or selected-issue actions** only after confirming the required Chrome permission is justified.
- [ ] **Step 4: Add browser tests or a manual checklist** covering popup, Side Panel, two Redmine tabs, widget actions, permission revocation and reload.
- [ ] **Step 5: Update implementation status** with completed lots, real-Redmine dependencies and known limitations.
- [ ] **Step 6: Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` and inspect the final `dist/chrome-mv3`.**

## Suggested Delivery Order

1. Task 1 — pending sessions and batch launch, because it improves the main operational workflow.
2. Task 2 — reports, because it consumes the stable pending/submitted model.
3. Task 3 — issue filters and grouping, because it improves daily navigation.
4. Task 4 — shortcuts, notifications and visual feedback.
5. Task 5 — backup and reconciliation hardening.
6. Task 6 — integrations and browser validation.

Each task should be delivered as a separate reviewable lot. No new lot should change timer semantics or account isolation without updating its tests and documentation.
