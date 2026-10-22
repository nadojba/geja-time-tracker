# Redmine Time Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Entregar uma extensão Chrome MV3 instalável, com integração real ao Redmine, sessões independentes, lançamentos pendentes, sincronização entre contextos e interface em português.

**Architecture:** WXT gera os entrypoints do service worker, popup, Side Panel e content script. O domínio é puro e testável; o service worker é a autoridade para mutações de timer e API autenticada; `chrome.storage.local` guarda configuração, estado e sessões com envelopes versionados e uma fila de operações serializadas. UI e content script comunicam-se por mensagens tipadas e nunca recebem a API Key.

**Tech Stack:** WXT, Vite, React, TypeScript, Tailwind CSS, Zustand, React Hook Form, Zod, Lucide React, Vitest, Testing Library, ESLint e Prettier.

**Spec:** Requisitos fornecidos na conversa e `docs/superpowers/specs/2026-10-22-redmine-time-tracker-design.md`.

## Global Constraints

- Interface padrão em português brasileiro.
- Manifest V3, sem backend próprio, sem CDN e sem telemetria.
- API Key somente em `chrome.storage.local` e requests autenticados no service worker.
- HTTPS obrigatório por padrão; credenciais isoladas por URL normalizada e usuário Redmine.
- `stop` encerra uma sessão; cada novo `start` cria sessão nova em zero.
- Timeout de POST com resultado desconhecido marca `reconciliation_required` e não repete automaticamente.

## Review Focus

- Reinicialização do service worker não pode perder ou mesclar sessões: testes de hidratação e persistência.
- Troca de conta não pode lançar sessão na conta errada: testes de `accountId`.
- Timeout após POST não pode duplicar apontamentos: testes de reconciliação.
- Preferências precisam alterar comportamento, não apenas renderizar checkboxes: testes de arredondamento e agrupamento.
- Content script não pode duplicar montagem nem expor credenciais: testes de detector/mounting e revisão de permissões.

### Task 1: Fundação e domínio de sessões

- Criar package WXT, TypeScript, Tailwind, lint, format e Vitest.
- Criar tipos de conta, sessão, segmentos e preferências.
- Criar reducer/serviço puro para iniciar, pausar, retomar e parar.
- Testar segunda sessão independente, pausa/retomada e arredondamento sem mutação real.

### Task 2: Persistência, concorrência e mensagens

- Criar repositório versionado em `chrome.storage.local` com lock lógico e fila no worker.
- Isolar sessões por conta e preservar histórico ao desconectar.
- Criar mensagens para snapshots e mutações.
- Testar reinício, concorrência, migração e isolamento.

### Task 3: Cliente Redmine e autenticação

- Criar client tipado com timeout, abort, paginação, cache e erros HTTP.
- Implementar `/users/current`, projetos, issues, atividades e time entries.
- Criar configuração com validação e conexão no worker.
- Testar headers, paginação, erros e reconciliação de POST.

### Task 4: Aplicação React

- Criar store/hook de snapshot, layout e abas Timer/Chamados/Horas/Configurações.
- Implementar lista agrupada, filtros, preferências reais, pendências editáveis e modal de lançamento.
- Implementar popup e Side Panel compartilhando componentes e regras.

### Task 5: Content script, build e documentação

- Criar detector de issue e mount idempotente com Shadow DOM.
- Sincronizar controle integrado com o worker.
- Adicionar documentação, status de implementação, ícones e validação completa.

